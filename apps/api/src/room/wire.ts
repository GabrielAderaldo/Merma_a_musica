// Domínio → fio. No domínio o tempo é ms (Duration); no fio, segundos (ADR-0014). Os tipos de saída são os do
// packages/schema, então uma mensagem fora do contrato não compila (ADR-0014.R3).
import {
  currentRound,
  derivePhase,
  matchResult,
  seconds,
  songRange,
  type DomainError,
  type Match,
  type MatchConfiguration,
  type PlayerUuid,
  type Room,
  type RoomPlayer,
  type Round,
  type SoloOutcome,
  type SoloStats,
} from "@merma/domain";
import { ErrorCode, type WsClientMessage, type WsServerMessage } from "@merma/schema";
import type { ResolvedAudio } from "./ports.ts";

type Msg<T extends WsServerMessage["type"]> = Extract<WsServerMessage, { type: T }>;
type WirePlayer = Msg<"player_joined">["player"];
type WireConfig = Msg<"config_updated">["config"];
type WireAudio = Msg<"round_starting">["audio"];

const toSeconds = (ms: number) => ms / 1000;

export const toWireConfig = (config: MatchConfiguration): WireConfig => ({
  ...config,
  time_per_round: Math.round(toSeconds(config.time_per_round)),
});

export const fromWireConfig = (config: Extract<WsClientMessage, { type: "configure_match" }>["config"]): MatchConfiguration => ({
  ...config,
  time_per_round: seconds(config.time_per_round),
});

export const toWirePlayer = (room: Room, p: RoomPlayer): WirePlayer => ({
  player_uuid: p.player_uuid,
  nickname: p.nickname,
  is_host: p.player_uuid === room.host_uuid,
  ready: p.ready,
  afk: p.afk,
  connection_status: p.connection_status,
  has_playlist: p.playlist !== null,
  platform: p.platform,
});

export const toWireAudio = (audio: ResolvedAudio, token: () => string): WireAudio =>
  audio.audio_source === "deezer" ? { audio_source: "deezer", audio_token: token() } : audio;

// Só existe com alguém na sala: quem recebe o room_state está nela, e a sala com gente sempre tem host.
export const roomState = (room: Room, host: PlayerUuid, audio?: WireAudio): Msg<"room_state"> => {
  const match = room.match;
  const round = match === null ? undefined : currentRound(match);
  return {
    type: "room_state",
    room_id: room.room_id,
    invite_code: room.invite_code,
    phase: derivePhase(room),
    host_player_uuid: host,
    config: toWireConfig(room.config),
    players: room.players.map((p) => toWirePlayer(room, p)),
    song_range: songRange(room),
    ...(match === null ? {} : { total_rounds: Math.max(1, match.total_rounds) }),
    ...(round === undefined ? {} : { current_round_index: round.index }),
    ...(audio === undefined ? {} : { audio }),
  };
};

const nicknameOf = (match: Match, player: PlayerUuid) =>
  match.participants.find((p) => p.player_uuid === player)?.nickname ?? "jogador";

// R-130: todos os participantes aparecem, inclusive quem não respondeu (answer_text null).
export const roundEnded = (match: Match, round: Round): Msg<"round_ended"> => ({
  type: "round_ended",
  round_index: round.index,
  end_reason: round.end_reason ?? "timer_expired",
  song: {
    isrc: round.song.isrc,
    name: round.song.name,
    artist: round.song.artist,
    album: round.song.album,
    cover_url: round.song.cover_url,
    contributed_by: nicknameOf(match, round.song.contributed_by),
    source_platform: round.song.source_platform,
  },
  answers: match.participants.map((p) => {
    const answer = round.answers.find((a) => a.player_uuid === p.player_uuid);
    return {
      player_uuid: p.player_uuid,
      nickname: p.nickname,
      answer_text: answer?.answer_text ?? null,
      is_correct: answer?.is_correct ?? false,
      is_near_miss: answer?.is_near_miss ?? false,
      points_earned: answer?.points_earned ?? 0,
      response_time: answer === undefined ? null : toSeconds(answer.response_time),
    };
  }),
  scores: { ...match.scores },
  next_round_in_seconds: 3,
});

type WireSoloStats = NonNullable<Msg<"game_ended">["solo_comparison"]>["current"];
const toWireSoloStats = (s: SoloStats): WireSoloStats => ({
  avg_points_per_song: s.avg_points_per_song,
  max_streak: s.max_streak,
  avg_response_time: s.avg_response_time === null ? null : toSeconds(s.avg_response_time),
  known_songs: s.known_songs,
});

// R-701 e R-702; no solo, a comparação com o recorde (R-704) que a Progression devolveu.
export const gameEnded = (match: Match, solo: SoloOutcome | null = null): Msg<"game_ended"> => {
  const result = matchResult(match);
  const highlight = (h: (typeof result.highlights)["best_streak"], scale = 1) =>
    h === null ? null : { player_uuid: h.player_uuid, nickname: h.nickname, value: h.value * scale };
  return {
    type: "game_ended",
    match_id: result.match_id,
    final_scores: { ...result.final_scores },
    ranking: result.ranking.map((r) => ({
      position: r.position,
      player_uuid: r.player_uuid,
      nickname: r.nickname,
      total_points: r.total_points,
      correct_answers: r.correct_answers,
      max_streak: r.max_streak,
      avg_response_time: r.avg_response_time === null ? null : toSeconds(r.avg_response_time),
    })),
    highlights: {
      best_streak: highlight(result.highlights.best_streak),
      fastest_answer: highlight(result.highlights.fastest_answer, 1 / 1000),
      most_correct: highlight(result.highlights.most_correct),
      near_miss_champion: highlight(result.highlights.near_miss_champion),
    },
    ...(solo === null
      ? {}
      : {
          solo_comparison: {
            current: toWireSoloStats(solo.current),
            previous_best: solo.previous_best === null ? null : toWireSoloStats(solo.previous_best),
            is_new_personal_best: solo.is_new_personal_best,
          },
        }),
    return_to_lobby_in_seconds: 5,
  };
};

const MESSAGES: Record<ErrorCode, string> = {
  unauthenticated: "Sessão ausente.",
  not_host: "Só o host pode fazer isso.",
  host_is_always_ready: "O host está sempre pronto.",
  room_full: "A sala está cheia.",
  room_not_found: "Sala não encontrada.",
  round_not_accepting_answers: "A rodada não está aceitando respostas.",
  round_not_accepting_skip: "A rodada não está aceitando pulo.",
  player_not_in_match: "Você não está nesta partida.",
  player_already_voted: "Você já votou para pular.",
  player_not_answered_yet: "Responda antes de votar para pular.",
  total_songs_out_of_range: "Número de músicas fora do permitido.",
  solo_requires_single_player: "O modo solo exige um único jogador.",
  no_playlists_imported: "Ninguém escolheu uma playlist com músicas.",
  not_enough_unique_songs: "Não há músicas diferentes suficientes.",
  illegal_state_transition: "Ação indisponível agora.",
  personal_best_not_found: "Nenhuma partida solo nessa playlist ainda.",
  rate_limited: "Muitas mensagens. Espere um pouco.",
  invalid_payload: "Mensagem inválida.",
  internal_error: "Erro interno.",
};

// Os erros internos da engine (INTERNAL_ONLY_ERRORS) não existem no fio: viram internal_error.
export const toErrorCode = (error: DomainError): ErrorCode => {
  const code = ErrorCode.safeParse(error);
  return code.success ? code.data : "internal_error";
};

export const errorMessage = (code: ErrorCode): Msg<"error"> => ({ type: "error", code, message: MESSAGES[code] });
