// Adapter Postgres do MatchRepository (ADR-0006): a partida concluída numa transação só, sem answer_text.
import { err, ok } from "@merma/domain";
import type { Database } from "../db/client.ts";
import { matchRounds, matches, matchScores, roundAnswers } from "../db/schema.ts";
import type { MatchRepository } from "./ports.ts";

export const postgresMatchRepository = (db: Database): MatchRepository => ({
  saveCompleted: async (match) => {
    try {
      await db.transaction(async (tx) => {
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
      });
      return ok(undefined);
    } catch {
      // O driver lança em falha de rede ou de constraint; aqui vira Result (regra da apps/api).
      return err("store_unavailable");
    }
  },
});
