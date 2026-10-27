// Schema Drizzle do Postgres (ADR-0006). Por enquanto só o histórico de partidas: a escrita única em `completed`
// (docs/architecture.md). Sem answer_text nem nickname (docs/privacy.md); o schema.test.ts confere.
import type { MatchConfiguration } from "@merma/domain";
import { boolean, foreignKey, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const instant = () => timestamp({ withTimezone: true, mode: "date" }).notNull();

export const matches = pgTable("matches", {
  match_id: uuid().primaryKey(),
  room_id: uuid().notNull(),
  // Como a engine guarda: time_per_round em ms (Duration).
  config: jsonb().$type<MatchConfiguration>().notNull(),
  started_at: instant(),
  ended_at: instant(),
});

export const matchScores = pgTable(
  "match_scores",
  {
    match_id: uuid()
      .notNull()
      .references(() => matches.match_id, { onDelete: "cascade" }),
    player_uuid: uuid().notNull(),
    total_points: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.match_id, t.player_uuid] })],
);

export const matchRounds = pgTable(
  "match_rounds",
  {
    match_id: uuid()
      .notNull()
      .references(() => matches.match_id, { onDelete: "cascade" }),
    round_index: integer().notNull(),
    isrc: text(),
  },
  (t) => [primaryKey({ columns: [t.match_id, t.round_index] })],
);

// Uma linha por jogador que respondeu na rodada. Quem não respondeu não tem linha.
export const roundAnswers = pgTable(
  "round_answers",
  {
    match_id: uuid().notNull(),
    round_index: integer().notNull(),
    player_uuid: uuid().notNull(),
    is_correct: boolean().notNull(),
    is_near_miss: boolean().notNull(),
    points: integer().notNull(),
    // Milissegundos (Duration); null se não respondeu.
    response_time_ms: integer(),
  },
  (t) => [
    primaryKey({ columns: [t.match_id, t.round_index, t.player_uuid] }),
    foreignKey({ columns: [t.match_id, t.round_index], foreignColumns: [matchRounds.match_id, matchRounds.round_index] }).onDelete(
      "cascade",
    ),
  ],
);
