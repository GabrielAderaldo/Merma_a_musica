import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createRoom, Duration, InviteCode, MatchId, PlayerUuid, RoomId, Timestamp } from "@merma/domain";
import { eq } from "drizzle-orm";
import { connect, migrateDatabase } from "../db/client.ts";
import { matchRounds, matches, matchScores, roundAnswers } from "../db/schema.ts";
import { anonymizedPlayer, MemoryMatchRepository, postgresMatchRepository } from "./match-store.ts";
import type { CompletedMatch, MatchRepository } from "./ports.ts";
import { player } from "./testing.ts";

const completed = (match: string, players: readonly [PlayerUuid, PlayerUuid] = [player(1), player(2)]): CompletedMatch => {
  const match_id = MatchId(match);
  const room_id = RoomId("00000000-0000-4000-8000-000000007000");
  const invite = InviteCode("ABC123");
  const [start, end, rt] = [Timestamp(1_000_000), Timestamp(1_060_000), Duration(4_250)];
  if (!match_id.ok || !room_id.ok || !invite.ok || !start.ok || !end.ok || !rt.ok) expect.unreachable("fixture");
  const [a, b] = players;
  return {
    match_id: match_id.value,
    room_id: room_id.value,
    config: createRoom(room_id.value, invite.value).config,
    started_at: start.value,
    ended_at: end.value,
    scores: [
      { player_uuid: a, total_points: 950 },
      { player_uuid: b, total_points: 0 },
    ],
    rounds: [
      {
        index: 0,
        isrc: "BRUM71500001",
        answers: [
          { player_uuid: a, is_correct: true, is_near_miss: false, points: 950, response_time: rt.value },
          { player_uuid: b, is_correct: false, is_near_miss: true, points: 0, response_time: rt.value },
        ],
      },
      { index: 1, isrc: null, answers: [] },
    ],
  };
};

const randomPlayer = () => {
  const p = PlayerUuid(crypto.randomUUID());
  return p.ok ? p.value : expect.unreachable("uuid");
};

// LGPD (docs/privacy.md). Cada teste usa partidas e jogadores novos, para rodar no mesmo Postgres sem se misturar.
const contract = (make: () => MatchRepository, saved: string[]) => {
  test("history: as partidas do jogador, só com as respostas dele", async () => {
    const repo = make();
    const [me, other] = [randomPlayer(), randomPlayer()];
    const id = crypto.randomUUID();
    saved.push(id);
    await repo.saveCompleted(completed(id, [me, other]));
    const history = await repo.history(me);
    expect(history).toEqual({
      ok: true,
      value: [
        {
          match_id: id,
          config: completed(id).config,
          started_at: 1_000_000,
          ended_at: 1_060_000,
          total_points: 950,
          rounds: [{ round_index: 0, is_correct: true, is_near_miss: false, points: 950, response_time: 4_250 }],
        },
      ],
    });
  });

  test("anonymize troca o player_uuid pelo hash truncado; o placar fica e o do outro jogador não muda", async () => {
    const repo = make();
    const [me, other] = [randomPlayer(), randomPlayer()];
    const id = crypto.randomUUID();
    saved.push(id);
    await repo.saveCompleted(completed(id, [me, other]));
    expect(await repo.anonymize(me)).toEqual({ ok: true, value: undefined });
    expect(await repo.history(me)).toEqual({ ok: true, value: [] });
    const hashed = await repo.history(anonymizedPlayer(me));
    expect(hashed.ok && hashed.value.map((m) => m.total_points)).toEqual([950]);
    const kept = await repo.history(other);
    expect(kept.ok && kept.value.map((m) => m.rounds.length)).toEqual([1]);
  });
};

describe("MemoryMatchRepository", () => contract(() => new MemoryMatchRepository(), []));

test("anonymizedPlayer: determinístico, no formato de UUID v8 e diferente do original", () => {
  const p = "0b7c1a52-7f4e-4c2a-9d8e-3f1a2b4c5d6e";
  expect(anonymizedPlayer(p)).toBe(anonymizedPlayer(p));
  expect(anonymizedPlayer(p)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(anonymizedPlayer(p)).not.toBe(p);
});

test("Postgres fora do ar vira store_unavailable, sem exceção", async () => {
  const repo = postgresMatchRepository(connect("postgres://merma:x@127.0.0.1:1/merma"));
  expect(await repo.saveCompleted(completed("00000000-0000-4000-8000-000000009001"))).toEqual({
    ok: false,
    error: "store_unavailable",
  });
});

// Contra o Postgres de verdade quando POSTGRES_URL existe: no CI (service postgres) e em dev com `infra up postgres`.
const url = process.env["POSTGRES_URL"];
describe.skipIf(url === undefined || url === "")("postgresMatchRepository (Postgres de verdade)", () => {
  const db = connect(url ?? "");
  const id = crypto.randomUUID();
  const saved: string[] = [];

  beforeAll(async () => {
    expect(await migrateDatabase(db)).toEqual({ ok: true, value: undefined });
  });
  afterAll(async () => {
    for (const m of [id, ...saved]) await db.delete(matches).where(eq(matches.match_id, m));
    await db.$client.close();
  });
  contract(() => postgresMatchRepository(db), saved);

  test("grava partida, placar, rodadas e respostas; a segunda chamada não duplica", async () => {
    const repo = postgresMatchRepository(db);
    const match = completed(id);
    expect(await repo.saveCompleted(match)).toEqual({ ok: true, value: undefined });
    expect(await repo.saveCompleted(match)).toEqual({ ok: true, value: undefined });

    const [row] = await db.select().from(matches).where(eq(matches.match_id, id));
    expect(row?.config).toEqual(match.config);
    expect(row?.ended_at.getTime()).toBe(1_060_000);
    const scores = await db.select().from(matchScores).where(eq(matchScores.match_id, id));
    expect(scores.map((s) => s.total_points).toSorted((x, y) => x - y)).toEqual([0, 950]);
    const rounds = await db.select().from(matchRounds).where(eq(matchRounds.match_id, id));
    expect(rounds.map((r) => r.isrc).toSorted()).toEqual(["BRUM71500001", null]);
    const answers = await db.select().from(roundAnswers).where(eq(roundAnswers.match_id, id));
    expect(answers).toHaveLength(2);
    expect(answers.every((a) => a.response_time_ms === 4_250)).toBe(true);
  });

  test("migrar de novo não faz nada", async () => {
    expect(await migrateDatabase(db)).toEqual({ ok: true, value: undefined });
  });
});
