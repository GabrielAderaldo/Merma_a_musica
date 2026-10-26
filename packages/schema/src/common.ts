// Enums e modelos compartilhados pelo fio. snake_case, enums em minúsculo, tempo em segundos inteiros (ADR-0014).
import { z } from "zod";

export const Phase = z.enum(["lobby", "countdown", "playing", "reveal", "results"]);
export const AnswerType = z.enum(["song", "artist", "both"]);
export const ScoringRule = z.enum(["simple", "speed_bonus"]);
export const GameMode = z.enum(["multiplayer", "solo"]);
export const ConnectionStatus = z.enum(["connected", "reconnecting", "disconnected"]);
export const Platform = z.enum(["spotify", "deezer", "youtube_music"]);
export const AudioSource = z.enum(["deezer", "spotify_sdk"]);

export const ErrorCode = z.enum([
  "unauthenticated",
  "not_host",
  "host_is_always_ready",
  "room_full",
  "room_not_found",
  "round_not_accepting_answers",
  "round_not_accepting_skip",
  "player_not_in_match",
  "player_already_voted",
  "player_not_answered_yet",
  "rate_limited",
  "invalid_payload",
  "internal_error",
]);

// R-005
export const MAX_PLAYERS = 20;

export const PlayerUuid = z.uuidv4().meta({ description: "Emitido pelo servidor no cookie __Host-session (ADR-0013)." });
export const RoomId = z.uuid();
export const MatchId = z.uuid();
export const PlaylistId = z.uuid();
export const InviteCode = z.string().regex(/^[A-Z0-9]{6}$/, "6 caracteres [A-Z0-9] (R-004)");
export const Nickname = z.string().min(1).max(32);
// Contadores e pontos.
const Count = z.int().nonnegative();

// R-401. Os defaults e o range de total_songs (R-302, R-502) são regra do domínio, não do fio.
export const MatchConfiguration = z.object({
  time_per_round: z.int().min(10).max(60),
  total_songs: z.int().min(1),
  answer_type: AnswerType,
  allow_repeats: z.boolean(),
  scoring_rule: ScoringRule,
  game_mode: GameMode,
});

export const SongRange = z.object({ min: z.int().min(1), max: z.int().min(1) });

export const Player = z.object({
  player_uuid: PlayerUuid,
  nickname: Nickname,
  is_host: z.boolean(),
  ready: z.boolean(),
  afk: z.boolean(),
  connection_status: ConnectionStatus,
  has_playlist: z.boolean(),
  platform: Platform.nullable(),
});

// Placar acumulado por jogador.
export const Scores = z.record(PlayerUuid, Count);

// Áudio da rodada: token do proxy (Deezer) ou URI do Spotify Web Playback SDK (R-801).
export const RoundAudio = z.discriminatedUnion("audio_source", [
  z.object({ audio_source: z.literal("deezer"), audio_token: z.string().min(1) }),
  z.object({ audio_source: z.literal("spotify_sdk"), spotify_uri: z.string().startsWith("spotify:track:") }),
]);

// Revelação (R-130). isrc e album podem faltar na importação (NormalizedSong).
export const RevealedSong = z.object({
  isrc: z.string().nullable(),
  name: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  cover_url: z.url().nullable(),
  contributed_by: Nickname,
  source_platform: Platform,
});

export const RoundAnswer = z.object({
  player_uuid: PlayerUuid,
  nickname: Nickname,
  answer_text: z.string().nullable().meta({ description: "null se não respondeu" }),
  is_correct: z.boolean(),
  is_near_miss: z.boolean(),
  points_earned: Count,
  response_time: z.number().nonnegative().nullable().meta({ description: "Segundos desde timer_started; null se não respondeu" }),
});

export const RankingEntry = z.object({
  position: z.int().min(1).meta({ description: "Empate persistente divide a posição (R-204)" }),
  player_uuid: PlayerUuid,
  nickname: Nickname,
  total_points: Count,
  correct_answers: Count,
  max_streak: Count,
  avg_response_time: z.number().nonnegative().nullable(),
});

// R-702: um destaque é de um jogador, com o valor que o rendeu; null se ninguém se qualificou.
const Highlight = z
  .object({ player_uuid: PlayerUuid, nickname: Nickname, value: z.number().nonnegative() })
  .nullable();
export const Highlights = z.object({
  best_streak: Highlight,
  fastest_answer: Highlight,
  most_correct: Highlight,
  near_miss_champion: Highlight,
});

// R-704 e R-504/R-505: a partida solo comparada com o recorde anterior (null na 1ª partida da playlist).
const SoloStats = z.object({
  avg_points_per_song: z.number().min(0).max(1000),
  max_streak: Count,
  avg_response_time: z.number().nonnegative().nullable(),
  known_songs: Count,
});
export const SoloComparison = z.object({
  current: SoloStats,
  previous_best: SoloStats.nullable(),
  is_new_personal_best: z.boolean(),
});

export const AutocompleteResult = z.object({ text: z.string(), kind: z.enum(["song", "artist"]) });
