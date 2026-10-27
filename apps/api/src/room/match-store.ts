// Adapters do MatchRepository (ADR-0006): Postgres em produção, com a partida concluída numa transação só e sem
// answer_text, e memória nos testes. Os dois passam pelo mesmo teste de contrato (match-store.test.ts).
import { err, ok } from "@merma/domain";
import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import { matchRounds, matches, matchScores, roundAnswers } from "../db/schema.ts";
import type { CompletedMatch, MatchRepository, PlayerMatchRecord } from "./ports.ts";

// O player_uuid trocado na anonimização (docs/privacy.md): SHA-256 truncado em 128 bits, no formato de UUID v8
// (RFC 9562), para caber na coluna uuid. Determinístico: o mesmo jogador vira sempre o mesmo valor.
export const anonymizedPlayer = (player: string): string => {
  const bytes = new Bun.CryptoHasher("sha256").update(player).digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const recordOf = (match: CompletedMatch, player: string): PlayerMatchRecord | null => {
  const score = match.scores.find((s) => s.player_uuid === player);
  if (score === undefined) return null;
  return {
    match_id: match.match_id,
    config: match.config,
    started_at: match.started_at,
    ended_at: match.ended_at,
    total_points: score.total_points,
    rounds: match.rounds.flatMap((r) =>
      r.answers
        .filter((a) => a.player_uuid === player)
        .map((a) => ({ round_index: r.index, is_correct: a.is_correct, is_near_miss: a.is_near_miss, points: a.points, response_time: a.response_time })),
    ),
  };
};

export class MemoryMatchRepository implements MatchRepository {
  readonly #matches = new Map<string, CompletedMatch>();

  saveCompleted = async (match: CompletedMatch) => {
    if (!this.#matches.has(match.match_id)) this.#matches.set(match.match_id, match);
    return ok(undefined);
  };

  history = async (player: string) =>
    ok(
      [...this.#matches.values()]
        .map((m) => recordOf(m, player))
        .filter((r) => r !== null)
        .toSorted((a, b) => b.ended_at - a.ended_at),
    );

  anonymize = async (player: string) => {
    const hashed = anonymizedPlayer(player);
    const swap = <T extends { player_uuid: string }>(x: T): T => (x.player_uuid === player ? { ...x, player_uuid: hashed } : x);
    for (const [id, m] of this.#matches) {
      this.#matches.set(id, {
        ...m,
        scores: m.scores.map(swap),
        rounds: m.rounds.map((r) => ({ ...r, answers: r.answers.map(swap) })),
      } as CompletedMatch);
    }
    return ok(undefined);
  };
}

// O driver lança em falha de rede ou de constraint; aqui vira Result (regra da apps/api).
const attempt = async <T>(run: () => Promise<T>) => {
  try {
    return ok(await run());
  } catch {
    return err("store_unavailable" as const);
  }
};

export const postgresMatchRepository = (db: Database): MatchRepository => ({
  saveCompleted: (match) =>
    attempt(() =>
      db.transaction(async (tx) => {
        // Idempotente: uma segunda chamada com o mesmo match_id não grava nada.
        const inserted = await tx
          .insert(matches)
          .values({
            match_id: match.match_id,
            room_id: match.room_id,
            config: match.config,
            started_at: new Date(match.started_at),
            ended_at: new Date(match.ended_at),
          })
          .onConflictDoNothing()
          .returning({ match_id: matches.match_id });
        if (inserted.length === 0) return;
        const { match_id } = match;
        if (match.scores.length > 0) await tx.insert(matchScores).values(match.scores.map((s) => ({ match_id, ...s })));
        if (match.rounds.length === 0) return;
        await tx.insert(matchRounds).values(match.rounds.map((r) => ({ match_id, round_index: r.index, isrc: r.isrc })));
        const answers = match.rounds.flatMap((r) =>
          r.answers.map((a) => ({
            match_id,
            round_index: r.index,
            player_uuid: a.player_uuid,
            is_correct: a.is_correct,
            is_near_miss: a.is_near_miss,
            points: a.points,
            response_time_ms: a.response_time,
          })),
        );
        if (answers.length > 0) await tx.insert(roundAnswers).values(answers);
      }),
    ),

  history: (player) =>
    attempt(async () => {
      const played = await db
        .select({
          match_id: matches.match_id,
          config: matches.config,
          started_at: matches.started_at,
          ended_at: matches.ended_at,
          total_points: matchScores.total_points,
        })
        .from(matchScores)
        .innerJoin(matches, eq(matches.match_id, matchScores.match_id))
        .where(eq(matchScores.player_uuid, player));
      if (played.length === 0) return [];
      const answers = await db
        .select()
        .from(roundAnswers)
        .where(and(eq(roundAnswers.player_uuid, player), inArray(roundAnswers.match_id, played.map((m) => m.match_id))))
        .orderBy(roundAnswers.match_id, roundAnswers.round_index);
      return played
        .map((m) => ({
          ...m,
          started_at: m.started_at.getTime(),
          ended_at: m.ended_at.getTime(),
          rounds: answers
            .filter((a) => a.match_id === m.match_id)
            .map((a) => ({
              round_index: a.round_index,
              is_correct: a.is_correct,
              is_near_miss: a.is_near_miss,
              points: a.points,
              response_time: a.response_time_ms,
            })),
        }))
        .toSorted((a, b) => b.ended_at - a.ended_at);
    }),

  anonymize: (player) =>
    attempt(() =>
      db.transaction(async (tx) => {
        const hashed = anonymizedPlayer(player);
        await tx.update(matchScores).set({ player_uuid: hashed }).where(eq(matchScores.player_uuid, player));
        await tx.update(roundAnswers).set({ player_uuid: hashed }).where(eq(roundAnswers.player_uuid, player));
      }),
    ),
});
