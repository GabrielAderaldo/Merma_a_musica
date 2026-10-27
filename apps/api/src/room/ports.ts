// Portas do Game Orchestrator. O RoomActor só fala com Redis, Postgres, playlists e áudio por aqui, e os adapters
// convertem exceção em Result antes de devolver (regra da apps/api).
import type {
  Duration,
  MatchConfiguration,
  MatchId,
  PlayerUuid,
  PlaylistId,
  Result,
  Room,
  RoomId,
  RoundId,
  Song,
  Timestamp,
} from "@merma/domain";
import type { Platform } from "@merma/schema";

// Tempo e timers. Nos testes, um relógio falso avança na mão.
export type Cancel = () => void;
export type Clock = Readonly<{
  now(): Timestamp;
  schedule(delayMs: number, run: () => void): Cancel;
}>;

// IDs gerados pelo servidor (UUID v4) e a seed do sorteio das músicas.
export type Ids = Readonly<{
  roomId(): RoomId;
  matchId(): MatchId;
  roundId(): RoundId;
  seed(): string;
  inviteCode(): string;
}>;

// ADR-0009: o estado da sala em `in_match`, gravado a cada 5s em room:{invite_code}:snapshot.
export type RoomSnapshot = Readonly<{ version: 1; saved_at: Timestamp; room: Room }>;
export type StoreError = "store_unavailable" | "snapshot_corrupted";

export type SnapshotStore = Readonly<{
  save(snapshot: RoomSnapshot): Promise<Result<void, StoreError>>;
  delete(invite_code: string): Promise<Result<void, StoreError>>;
  // Todas as salas órfãs, para o RecoveryService. Snapshot ilegível é apagado pelo adapter e não volta.
  list(): Promise<Result<readonly RoomSnapshot[], StoreError>>;
}>;

// Playlist Integration vista pelo Orchestrator: as músicas tocáveis da playlist que o jogador escolheu.
export type PlaylistSongs = Readonly<{ playable_songs: number; songs: readonly Song[] }>;
export type SongSource = Readonly<{
  playlist(
    player: PlayerUuid,
    playlist_id: PlaylistId,
    platform: Platform,
  ): Promise<Result<PlaylistSongs, "no_playlists_imported" | "source_unavailable">>;
}>;

// Áudio da rodada (ADR-0004). null: a música não tem áudio e sai pela reserva (R-307).
export type ResolvedAudio = Readonly<{ audio_source: "deezer" } | { audio_source: "spotify_sdk"; spotify_uri: string }>;
export type AudioResolver = Readonly<{
  resolve(round_id: RoundId, song: Song): Promise<ResolvedAudio | null>;
  // audio_token HMAC por (player, round); reemitido ao reconectar (docs/specs/audio.md).
  token(player: PlayerUuid, round_id: RoundId): string;
}>;

// A escrita única no Postgres quando a partida chega a `completed` (ADR-0006.R1). Sem answer_text (docs/privacy.md).
export type CompletedAnswer = Readonly<{
  player_uuid: PlayerUuid;
  is_correct: boolean;
  is_near_miss: boolean;
  points: number;
  response_time: Duration | null;
}>;
export type CompletedMatch = Readonly<{
  match_id: MatchId;
  room_id: RoomId;
  config: MatchConfiguration;
  started_at: Timestamp;
  ended_at: Timestamp;
  scores: readonly Readonly<{ player_uuid: PlayerUuid; total_points: number }>[];
  rounds: readonly Readonly<{ index: number; isrc: string | null; answers: readonly CompletedAnswer[] }>[];
}>;
export type MatchRepository = Readonly<{
  saveCompleted(match: CompletedMatch): Promise<Result<void, "store_unavailable">>;
}>;
