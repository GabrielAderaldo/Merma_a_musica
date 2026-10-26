// Validação da resposta (R-111 a R-114) e pontuação (R-201, R-202). Roda só no servidor (ADR-0007).
import type { AnswerType, ScoringRule } from "@merma/schema";
import type { Duration } from "./brand.ts";

// R-111: lista fechada; `los` e `las` não entram.
const ARTICLES = new Set(["o", "a", "os", "as", "the", "el", "la"]);

// R-111, na ordem: minúsculas → acentos → () e [] → artigos → espaços.
export const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .split(/\s+/)
    .filter((word) => word !== "" && !ARTICLES.has(word))
    .join(" ");

// Iterativo, O(m·n) em tempo e O(min(m, n)) em espaço. Compara code points, não unidades UTF-16.
export const levenshtein = (a: string, b: string): number => {
  const [long, short] = a.length >= b.length ? [[...a], [...b]] : [[...b], [...a]];
  let prev = Array.from({ length: short.length + 1 }, (_, i) => i);
  for (let i = 1; i <= long.length; i++) {
    const curr = [i];
    for (let j = 1; j <= short.length; j++) {
      const cost = long[i - 1] === short[j - 1] ? 0 : 1;
      curr[j] = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = curr;
  }
  return prev[short.length] ?? 0;
};

// R-112
export const matchThreshold = (normalizedTarget: string): number =>
  Math.max(1, Math.floor([...normalizedTarget].length * 0.15));

export type Evaluation = Readonly<{
  matched: boolean;
  near_miss: boolean;
  distance: number;
  normalized_input: string;
  normalized_target: string;
}>;

const evaluateAgainst = (normalizedInput: string, target: string): Evaluation => {
  const normalizedTarget = normalize(target);
  const distance = levenshtein(normalizedInput, normalizedTarget);
  const limit = matchThreshold(normalizedTarget);
  // R-112: com um dos lados vazio, não acerta (e não há "quase" acerto).
  const comparable = normalizedInput !== "" && normalizedTarget !== "";
  const matched = comparable && distance <= limit;
  return {
    matched,
    near_miss: comparable && !matched && distance <= limit + 2, // R-113
    distance,
    normalized_input: normalizedInput,
    normalized_target: normalizedTarget,
  };
};

export const evaluateAnswer = (
  text: string,
  song: Readonly<{ name: string; artist: string }>,
  answerType: AnswerType,
): Evaluation => {
  const input = normalize(text);
  if (answerType === "song") return evaluateAgainst(input, song.name);
  if (answerType === "artist") return evaluateAgainst(input, song.artist);
  // R-114: música, depois artista; sem acerto, vale o mais próximo.
  const bySong = evaluateAgainst(input, song.name);
  if (bySong.matched) return bySong;
  const byArtist = evaluateAgainst(input, song.artist);
  if (byArtist.matched) return byArtist;
  return byArtist.distance < bySong.distance ? byArtist : bySong;
};

// R-201 e R-202. `responseTime` é limitado a `timePerRound`; sem acerto, 0.
export const calculatePoints = (
  rule: ScoringRule,
  matched: boolean,
  responseTime: Duration | null,
  timePerRound: Duration,
): number => {
  if (!matched || responseTime === null) return 0;
  if (rule === "simple") return 1;
  const ratio = Math.min(responseTime, timePerRound) / timePerRound;
  return Math.round(Math.max(100, 1000 - ratio * 900));
};
