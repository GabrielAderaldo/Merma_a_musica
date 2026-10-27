import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { MIGRATIONS_DIR } from "./client.ts";
import * as schema from "./schema.ts";

const exported: unknown[] = Object.values(schema);
const tables = exported.filter((t): t is PgTable => is(t, PgTable));
const migrations = readdirSync(MIGRATIONS_DIR, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"));

describe("ADR-0006.R2 — o Postgres não guarda answer_text (docs/privacy.md)", () => {
  test("o schema tem as tabelas do histórico e dos recordes", () => {
    expect(tables.map((t) => getTableConfig(t).name).toSorted()).toEqual([
      "match_rounds",
      "match_scores",
      "matches",
      "round_answers",
      "solo_known_songs",
      "solo_personal_bests",
      "solo_player_stats",
      "solo_playlist_stats",
    ]);
  });

  test.each(tables.map((t) => [getTableConfig(t).name, t] as const))("%s não tem answer_text nem nickname", (_, table) => {
    const columns = getTableConfig(table).columns.map((c) => c.name);
    expect(columns).not.toContain("answer_text");
    expect(columns).not.toContain("nickname");
  });

  test("nenhuma migração cria a coluna", () => {
    expect(migrations.length).toBeGreaterThan(0);
    for (const sql of migrations) expect(sql).not.toMatch(/answer_text|nickname/);
  });
});
