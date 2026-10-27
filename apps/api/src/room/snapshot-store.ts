// Adapters do SnapshotStore: Redis (produção, ADR-0009) e memória (testes). A chave é room:{invite_code}:snapshot.
import { err, ok, type Result } from "@merma/domain";
import type { RedisClient } from "bun";
import type { RoomSnapshot, SnapshotStore, StoreError } from "./ports.ts";

// TTL de 30 min (ADR-0009). Apagado na hora ao persistir a partida.
export const SNAPSHOT_TTL_SECONDS = 30 * 60;
const key = (invite_code: string) => `room:${invite_code}:snapshot`;
const PATTERN = "room:*:snapshot";

// O snapshot é escrito por este processo com JSON.stringify(Room): basta conferir a versão e a identidade.
// O Room não tem schema Zod (não é contrato de fio); um formato diferente é tratado como corrompido.
export const parseSnapshot = (raw: string): Result<RoomSnapshot, "snapshot_corrupted"> => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return err("snapshot_corrupted");
  }
  if (typeof value !== "object" || value === null) return err("snapshot_corrupted");
  const s = value as Partial<RoomSnapshot>;
  const valid = s.version === 1 && typeof s.saved_at === "number" && typeof s.room?.invite_code === "string";
  return valid ? ok(s as RoomSnapshot) : err("snapshot_corrupted");
};

// O RedisClient lança em falha de rede; aqui vira Result (regra da apps/api).
const attempt = async <T>(run: () => Promise<T>): Promise<Result<T, StoreError>> => {
  try {
    return ok(await run());
  } catch {
    return err("store_unavailable");
  }
};

export const redisSnapshotStore = (redis: RedisClient): SnapshotStore => ({
  save: (snapshot) =>
    attempt(async () => {
      await redis.set(key(snapshot.room.invite_code), JSON.stringify(snapshot), "EX", SNAPSHOT_TTL_SECONDS);
    }),
  delete: (invite_code) =>
    attempt(async () => {
      await redis.del(key(invite_code));
    }),
  list: () =>
    attempt(async () => {
      const keys: string[] = [];
      let cursor = "0";
      do {
        const [next, batch] = await redis.scan(cursor, "MATCH", PATTERN);
        keys.push(...batch);
        cursor = next;
      } while (cursor !== "0");
      const snapshots: RoomSnapshot[] = [];
      for (const k of keys) {
        const raw = await redis.get(k);
        const parsed = raw === null ? err("snapshot_corrupted" as const) : parseSnapshot(raw);
        if (parsed.ok) snapshots.push(parsed.value);
        else await redis.del(k);
      }
      return snapshots;
    }),
});

// Mesma serialização do Redis, para os testes pegarem o que não sobrevive a JSON.
export class MemorySnapshotStore implements SnapshotStore {
  readonly entries = new Map<string, string>();
  saves = 0;

  save = async (snapshot: RoomSnapshot): Promise<Result<void, StoreError>> => {
    this.saves++;
    this.entries.set(key(snapshot.room.invite_code), JSON.stringify(snapshot));
    return ok(undefined);
  };

  delete = async (invite_code: string): Promise<Result<void, StoreError>> => {
    this.entries.delete(key(invite_code));
    return ok(undefined);
  };

  list = async (): Promise<Result<readonly RoomSnapshot[], StoreError>> => {
    const snapshots: RoomSnapshot[] = [];
    for (const [k, raw] of this.entries) {
      const parsed = parseSnapshot(raw);
      if (parsed.ok) snapshots.push(parsed.value);
      else this.entries.delete(k);
    }
    return ok(snapshots);
  };

  get(invite_code: string): RoomSnapshot | undefined {
    const raw = this.entries.get(key(invite_code));
    const parsed = raw === undefined ? undefined : parseSnapshot(raw);
    return parsed?.ok ? parsed.value : undefined;
  }
}
