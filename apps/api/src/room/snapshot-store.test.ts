import { describe, expect, test } from "bun:test";
import { createRoom, InviteCode, RoomId, Timestamp } from "@merma/domain";
import { RedisClient } from "bun";
import type { RoomSnapshot, SnapshotStore } from "./ports.ts";
import { MemorySnapshotStore, parseSnapshot, redisSnapshotStore, SNAPSHOT_TTL_SECONDS } from "./snapshot-store.ts";

const snapshot = (code: string): RoomSnapshot => {
  const invite = InviteCode(code);
  const id = RoomId("00000000-0000-4000-8000-000000007000");
  const at = Timestamp(1_000_000);
  if (!invite.ok || !id.ok || !at.ok) expect.unreachable("fixture");
  return { version: 1, saved_at: at.value, room: createRoom(id.value, invite.value) };
};

test.each(["{", "null", '{"version":2,"saved_at":1,"room":{"invite_code":"ABC123"}}', '{"version":1,"room":{}}'])(
  "parseSnapshot recusa %s como corrompido",
  (raw) => {
    expect(parseSnapshot(raw)).toEqual({ ok: false, error: "snapshot_corrupted" });
  },
);

// O mesmo contrato para os dois adapters.
const contract = (name: string, make: () => Promise<{ store: SnapshotStore; corrupt: (code: string) => Promise<void> }>) =>
  describe(name, () => {
    test("save → list → delete, e snapshot corrompido some da listagem", async () => {
      const { store, corrupt } = await make();
      await store.save(snapshot("SNP001"));
      await store.save(snapshot("SNP002"));
      await corrupt("SNP003");
      const listed = await store.list();
      expect(listed.ok && listed.value.map((s): string => s.room.invite_code).toSorted()).toEqual(["SNP001", "SNP002"]);
      await store.delete("SNP001");
      await store.delete("SNP002");
      const empty = await store.list();
      expect(empty.ok && empty.value.filter((s) => s.room.invite_code.startsWith("SNP"))).toEqual([]);
    });
  });

contract("MemorySnapshotStore", async () => {
  const store = new MemorySnapshotStore();
  return { store, corrupt: async (code) => void store.entries.set(`room:${code}:snapshot`, "{") };
});

// Contra o Redis da ~/.infra quando REDIS_URL existe (`infra up redis`). O CI ainda não tem Redis.
const url = process.env["REDIS_URL"];
describe.skipIf(url === undefined || url === "")("redisSnapshotStore (Redis de verdade)", () => {
  const redis = new RedisClient(url);
  contract("contrato", async () => ({
    store: redisSnapshotStore(redis),
    corrupt: async (code) => void (await redis.set(`room:${code}:snapshot`, "{")),
  }));

  test("ADR-0009: a chave é room:{invite_code}:snapshot, com TTL de 30 min", async () => {
    await redisSnapshotStore(redis).save(snapshot("SNP009"));
    const ttl = await redis.ttl("room:SNP009:snapshot");
    expect(ttl).toBeGreaterThan(SNAPSHOT_TTL_SECONDS - 5);
    expect(ttl).toBeLessThanOrEqual(SNAPSHOT_TTL_SECONDS);
    await redis.del("room:SNP009:snapshot");
  });
});

test("Redis fora do ar vira store_unavailable, sem exceção", async () => {
  const redis = new RedisClient("redis://127.0.0.1:1", { autoReconnect: false, connectionTimeout: 200 });
  const store = redisSnapshotStore(redis);
  expect(await store.save(snapshot("SNP010"))).toEqual({ ok: false, error: "store_unavailable" });
  expect(await store.list()).toEqual({ ok: false, error: "store_unavailable" });
  redis.close();
});
