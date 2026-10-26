// Resultado da partida: ranking (R-701, R-204), destaques (R-702) e comparação do solo (R-504, R-704).
import type { MatchId, PlayerUuid } from "./brand.ts";
import type { Match, Participant } from "./types.ts";

export type PlayerStats = Readonly<{
  player_uuid: PlayerUuid;
  nickname: string;
  total_points: number;
  correct_answers: number;
  near_misses: number;
  max_streak: number;
  // Em ms; null se não respondeu nenhuma rodada.
  avg_response_time: number | null;
  fastest_correct: number | null;
}>;

export type RankingEntry = PlayerStats & Readonly<{ position: number }>;

export type Highlight = Readonly<{ player_uuid: PlayerUuid; nickname: string; value: number }> | null;
export type Highlights = Readonly<{
  best_streak: Highlight;
  fastest_answer: Highlight;
  most_correct: Highlight;
  near_miss_champion: Highlight;
}>;

export type MatchResult = Readonly<{
  match_id: MatchId;
  final_scores: Readonly<Record<PlayerUuid, number>>;
  ranking: readonly RankingEntry[];
  highlights: Highlights;
}>;

const average = (values: readonly number[]): number | null =>
  values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;

export const playerStats = (match: Match, participant: Participant): PlayerStats => {
  const answers = match.rounds
    .filter((r) => r.state === "reveal")
    .flatMap((r) => r.answers.filter((a) => a.player_uuid === participant.player_uuid));
  const correctTimes = answers.filter((a) => a.is_correct).map((a) => a.response_time);
  return {
    player_uuid: participant.player_uuid,
    nickname: participant.nickname,
    total_points: match.scores[participant.player_uuid] ?? 0,
    correct_answers: correctTimes.length,
    near_misses: answers.filter((a) => a.is_near_miss).length,
    max_streak: participant.best_streak,
    avg_response_time: average(answers.map((a) => a.response_time)),
    fastest_correct: correctTimes.length === 0 ? null : Math.min(...correctTimes),
  };
};

// R-204: pontos, depois maior streak; empate persistente divide a posição (1, 1, 3).
export const rank = (stats: readonly PlayerStats[]): readonly RankingEntry[] => {
  const sorted = stats.toSorted((a, b) => b.total_points - a.total_points || b.max_streak - a.max_streak);
  return sorted.map((s, i) => {
    const first = sorted.findIndex((o) => o.total_points === s.total_points && o.max_streak === s.max_streak);
    return { ...s, position: (first === -1 ? i : first) + 1 };
  });
};

// R-702: um destaque por categoria; empate fica com quem está melhor no ranking. Sem ninguém qualificado, null.
const pick = (
  ranking: readonly RankingEntry[],
  value: (s: PlayerStats) => number | null,
  better: (a: number, b: number) => boolean,
): Highlight => {
  let best: Highlight = null;
  for (const s of ranking) {
    const v = value(s);
    if (v !== null && (best === null || better(v, best.value))) {
      best = { player_uuid: s.player_uuid, nickname: s.nickname, value: v };
    }
  }
  return best;
};
const positive = (n: number) => (n > 0 ? n : null);
const greater = (a: number, b: number) => a > b;

export const computeHighlights = (ranking: readonly RankingEntry[]): Highlights => ({
  best_streak: pick(ranking, (s) => positive(s.max_streak), greater),
  fastest_answer: pick(ranking, (s) => s.fastest_correct, (a, b) => a < b),
  most_correct: pick(ranking, (s) => positive(s.correct_answers), greater),
  near_miss_champion: pick(ranking, (s) => positive(s.near_misses), greater),
});

export const matchResult = (match: Match): MatchResult => {
  const ranking = rank(match.participants.map((p) => playerStats(match, p)));
  return { match_id: match.match_id, final_scores: match.scores, ranking, highlights: computeHighlights(ranking) };
};

// R-504, R-505: números do solo. `known_songs` depende do histórico, que a Progression (apps/api) conhece.
export type SoloStats = Readonly<{
  avg_points_per_song: number;
  max_streak: number;
  avg_response_time: number | null;
  known_songs: number;
}>;

// R-504: média = pontos ÷ rodadas jogadas (total_rounds já desconta as puladas por R-307).
// Sem rodada jogada, não há média e o recorde não muda.
export const soloStats = (match: Match, known_songs: number): SoloStats | null => {
  const participant = match.participants[0];
  if (participant === undefined || match.total_rounds === 0) return null;
  const stats = playerStats(match, participant);
  return {
    avg_points_per_song: stats.total_points / match.total_rounds,
    max_streak: stats.max_streak,
    avg_response_time: stats.avg_response_time,
    known_songs,
  };
};

export type SoloOutcome = Readonly<{
  current: SoloStats;
  previous_best: SoloStats | null;
  // Supera a média anterior; a 1ª partida da playlist vira o recorde (a UI distingue por previous_best null, R-507).
  is_new_personal_best: boolean;
}>;

export const compareWithPersonalBest = (current: SoloStats, previous: SoloStats | null): SoloOutcome => ({
  current,
  previous_best: previous,
  is_new_personal_best: previous === null || current.avg_points_per_song > previous.avg_points_per_song,
});
