// Portas do Game Orchestrator. O RoomActor só fala com Redis, Postgres, playlists e áudio por aqui, e os adapters
// convertem exceção em Result antes de devolver (regra da apps/api).
import type {
  Duration,
  Match,
  MatchConfiguration,
  MatchId,
  PlayerUuid,
  PlaylistId,
  Result,
  Room,
  RoomId,
  RoundId,
  Song,
  SoloOutcome,
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

// Playlist Integration vista pelo Orchestrator: as músicas tocáveis da playlist que o jogador escolheu, e a origem
// dela (R-006, R-010). Playlist de outro jogador ou apagada vale como não importada.
export type PlaylistSongs = Readonly<{ platform: Platform; playable_songs: number; songs: readonly Song[] }>;
export type SongSource = Readonly<{
  playlist(
    player: PlayerUuid,
    playlist_id: PlaylistId,
  ): Promise<Result<PlaylistSongs, "no_playlists_imported" | "source_unavailable">>;
}>;

// Áudio da rodada (ADR-0004). null: a música não tem áudio e sai pela reserva (R-307). O MP3 já vem sem ID3 e fica
// na memória do actor até round_ended: um download serve a sala toda. O fallback spotify_sdk (R-801) só existe no
// tipo: com a ADR-0024 toda música importada já está na Deezer, então nenhum resolver o produz.
export type ResolvedAudio = Readonly<
  { audio_source: "deezer"; mp3: Uint8Array<ArrayBuffer> } | { audio_source: "spotify_sdk"; spotify_uri: string }
>;
export type AudioResolver = Readonly<{
  resolve(round_id: RoundId, song: Song): Promise<ResolvedAudio | null>;
  // audio_token HMAC de (player, round, expiry), com expires_at em Unix ms (playlist/audio/token.ts).
  token(player: PlayerUuid, round_id: RoundId, expires_at: number): string;
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
  // LGPD (docs/privacy.md): as partidas em que o jogador aparece, e a troca do player_uuid dele pelo hash truncado
  // (decidido em 2026-10-27: o mesmo tratamento do jogador inativo). O placar e as respostas ficam, sem a identidade.
  history(player: string): Promise<Result<readonly PlayerMatchRecord[], "store_unavailable">>;
  anonymize(player: string): Promise<Result<void, "store_unavailable">>;
}>;

export type PlayerMatchRecord = Readonly<{
  match_id: string;
  config: MatchConfiguration;
  started_at: number;
  ended_at: number;
  total_points: number;
  rounds: readonly Readonly<{ round_index: number; is_correct: boolean; is_near_miss: boolean; points: number; response_time: number | null }>[];
}>;

// Progression vista pelo Orchestrator: no solo, soma a partida ao histórico e compara com o recorde (R-504, R-704).
// Também só em `completed` (ADR-0006.R1). null: nenhuma rodada jogada, o recorde não muda.
export type SoloRecords = Readonly<{
  complete(match: Match, playlist_id: PlaylistId): Promise<Result<SoloOutcome | null, "store_unavailable">>;
}>;
