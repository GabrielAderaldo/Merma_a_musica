// Progression: o que uma partida solo concluída acrescenta ao histórico do jogador (R-504 a R-506).
import {
  type Duration,
  type Match,
  type MatchId,
  type PlayerUuid,
  type PlaylistId,
  playerStats,
  type Result,
  type SoloOutcome,
  type SoloStats,
  songKey,
  soloStats,
  type Timestamp,
  ok,
} from "@merma/domain";
import type { AnswerType } from "@merma/schema";

export type StoreError = "store_unavailable";

export type SoloEntry = Readonly<{
  player_uuid: PlayerUuid;
  playlist_id: PlaylistId;
  answer_type: AnswerType;
  time_per_round: Duration;
  match_id: MatchId;
  ended_at: Timestamp;
  // Sem known_songs: depende das partidas anteriores, que só o store conhece.
  stats: Omit<SoloStats, "known_songs">;
  // ms
  fastest_correct: number | null;
  response_times: readonly Duration[];
  // Chave de R-304 das músicas acertadas, para contar as distintas (R-505, R-506).
  correct_song_keys: readonly string[];
}>;

// R-504: o recorde e os números da partida que o fez. IDs como string: voltam do banco sem passar pela engine.
export type PersonalBestRecord = SoloStats &
  Readonly<{ answer_type: AnswerType; time_per_round: number; match_id: string; achieved_at: number }>;
// R-505. Tempos em ms.
export type PlaylistProgressRecord = Readonly<{
  playlist_id: string;
  max_streak: number;
  avg_response_time: number | null;
  known_songs: number;
  last_played_at: number;
  personal_bests: readonly PersonalBestRecord[];
}>;
// R-506
export type GlobalSoloRecord = Readonly<{
  max_streak: number;
  fastest_correct: number | null;
  solo_matches_completed: number;
  known_songs: number;
}>;
export type SoloProgress = Readonly<{ global_stats: GlobalSoloRecord; by_playlist: readonly PlaylistProgressRecord[] }>;

export type ProgressionStore = Readonly<{
  // Numa transação: soma a partida ao histórico e compara com o recorde anterior (compareWithPersonalBest).
  recordSolo(entry: SoloEntry): Promise<Result<SoloOutcome, StoreError>>;
  progress(player: string): Promise<Result<SoloProgress, StoreError>>;
  // null: nenhuma partida solo nessa playlist.
  playlistProgress(player: string, playlist_id: string): Promise<Result<PlaylistProgressRecord | null, StoreError>>;
}>;

// A chave de R-304 separa nome e artista com NUL, que o text do Postgres não aceita.
const storedKey = (key: string) => key.replaceAll("\u0000", "\u001f");

// null: sem participante ou sem rodada jogada (todas puladas por R-307); a partida não mexe no recorde (R-504).
export const soloEntry = (match: Match, playlist_id: PlaylistId): SoloEntry | null => {
  const participant = match.participants[0];
  const stats = soloStats(match, 0);
  if (participant === undefined || stats === null) return null;
  const played = match.rounds.filter((r) => r.state === "reveal");
  const answers = played.flatMap((r) =>
    r.answers.filter((a) => a.player_uuid === participant.player_uuid).map((a) => ({ round: r, answer: a })),
  );
  return {
    player_uuid: participant.player_uuid,
    playlist_id,
    answer_type: match.config.answer_type,
    time_per_round: match.config.time_per_round,
    match_id: match.match_id,
    ended_at: match.ended_at ?? match.started_at,
    stats: { avg_points_per_song: stats.avg_points_per_song, max_streak: stats.max_streak, avg_response_time: stats.avg_response_time },
    fastest_correct: playerStats(match, participant).fastest_correct,
    response_times: answers.map(({ answer }) => answer.response_time),
    correct_song_keys: answers.filter(({ answer }) => answer.is_correct).map(({ round }) => storedKey(songKey(round.song))),
  };
};

// A porta SoloRecords do Orchestrator (room/ports.ts), sem importá-la: a Progression não depende do room.
export const soloRecords = (store: ProgressionStore) => ({
  complete: async (match: Match, playlist_id: PlaylistId): Promise<Result<SoloOutcome | null, StoreError>> => {
    const entry = soloEntry(match, playlist_id);
    return entry === null ? ok(null) : store.recordSolo(entry);
  },
});
