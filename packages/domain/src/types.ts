// O agregado Room (lobby + partida atual) e os erros da engine.
// Estados e transições: docs/architecture.md#máquinas-de-estado. Tudo é serializável em JSON (snapshot, ADR-0009).
import type { AnswerType, ConnectionStatus, GameMode, Platform, ScoringRule } from "@merma/schema";
import type { Duration, InviteCode, MatchId, PlayerUuid, PlaylistId, RoomId, RoundId, Timestamp } from "./brand.ts";
import type { Pool, Song } from "./pool.ts";
import type { InternalDomainError } from "./result.ts";

export type RoomState = "empty" | "lobby" | "in_match" | "finished" | "terminated";
export type MatchState = "countdown" | "in_progress" | "completed" | "persisted";
export type RoundState = "resolving" | "streaming" | "grace_period" | "timer_running" | "reveal";
export type RoundEndReason = "timer_expired" | "majority_skip";
export type LeaveReason = "voluntary" | "timeout";

// R-401. No domínio o tempo é Duration (ms); a conversão de/para segundos fica na borda da apps/api.
export type MatchConfiguration = Readonly<{
  time_per_round: Duration;
  total_songs: number;
  answer_type: AnswerType;
  allow_repeats: boolean;
  scoring_rule: ScoringRule;
  game_mode: GameMode;
}>;

// Playlist escolhida no lobby. `playable_songs` define o range do solo (R-502).
export type PlaylistSelection = Readonly<{ playlist_id: PlaylistId; platform: Platform; playable_songs: number }>;

export type RoomPlayer = Readonly<{
  player_uuid: PlayerUuid;
  nickname: string;
  ready: boolean;
  afk: boolean;
  connection_status: ConnectionStatus;
  // Desde quando está conectado sem interrupção: decide o novo host (R-603).
  connected_since: Timestamp;
  // Plataforma conectada por OAuth (R-006), não a da playlist.
  platform: Platform | null;
  playlist: PlaylistSelection | null;
}>;

export type Answer = Readonly<{
  player_uuid: PlayerUuid;
  answer_text: string;
  submitted_at: Timestamp;
  // Desde timer_started, limitado a time_per_round (R-202).
  response_time: Duration;
  // I-R-4: false e 0 até a rodada entrar em reveal.
  is_correct: boolean;
  is_near_miss: boolean;
  points_earned: number;
}>;

export type Round = Readonly<{
  round_id: RoundId;
  index: number;
  song: Song;
  state: RoundState;
  timer_started_at: Timestamp | null;
  answers: readonly Answer[];
  skip_votes: readonly PlayerUuid[];
  end_reason: RoundEndReason | null;
}>;

// Quem estava na sala quando a partida começou. Fica na partida mesmo se sair da sala.
export type Participant = Readonly<{
  player_uuid: PlayerUuid;
  nickname: string;
  current_streak: number;
  best_streak: number;
}>;

export type Match = Readonly<{
  match_id: MatchId;
  state: MatchState;
  config: MatchConfiguration;
  participants: readonly Participant[];
  pool: Pool;
  rounds: readonly Round[];
  current_round_index: number | null;
  total_rounds: number;
  scores: Readonly<Record<PlayerUuid, number>>;
  started_at: Timestamp;
  ended_at: Timestamp | null;
}>;

export type Room = Readonly<{
  room_id: RoomId;
  invite_code: InviteCode;
  state: RoomState;
  host_uuid: PlayerUuid | null;
  players: readonly RoomPlayer[];
  config: MatchConfiguration;
  // false: total_songs acompanha o default (máximo do range, R-302), mesmo com gente entrando e saindo.
  total_songs_customized: boolean;
  match: Match | null;
}>;

export const DOMAIN_ERRORS = [
  "illegal_state_transition",
  "room_not_found",
  "room_full",
  "player_not_in_room",
  "not_host",
  "host_is_always_ready",
  "host_still_connected",
  "no_eligible_host",
  "time_per_round_out_of_range",
  "total_songs_out_of_range",
  "solo_requires_single_player",
  "no_playlists_imported",
  "not_enough_unique_songs",
  "player_not_in_match",
  "round_not_accepting_answers",
  "round_not_accepting_skip",
  "player_already_voted",
  "player_not_answered_yet",
  "internal_error",
] as const satisfies readonly (string | InternalDomainError)[];
// InternalDomainError ("internal_error") está na lista e no fio.
export type DomainError = (typeof DOMAIN_ERRORS)[number];

// Erros que o cliente não consegue provocar: só a orquestração chama essas funções, ou o Zod barra antes
// (time_per_round). Não existem no fio; se escaparem, a apps/api responde internal_error. Os demais são ErrorCode 1:1.
export const INTERNAL_ONLY_ERRORS: readonly DomainError[] = [
  "player_not_in_room",
  "host_still_connected",
  "no_eligible_host",
  "time_per_round_out_of_range",
];
