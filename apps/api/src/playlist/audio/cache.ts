// Cache ISRC → faixa da Deezer (ADR-0025.R5): Redis, compartilhado entre nodes e sobrevivendo a deploy. É a porta
// IsrcCache da regra da apps/api; trocar o Redis pelo Postgres foi adiado, não descartado (ADR-0021).
import type { RedisClient } from "bun";
import { err, ok, type Result } from "../result.ts";

export const ISRC_TTL_SECONDS = 24 * 60 * 60;
export const isrcKey = (isrc: string) => `isrc:${isrc}:deezer`;

export type CacheError = "cache_unavailable";
export type IsrcCache = Readonly<{
  get(isrc: string): Promise<Result<string | null, CacheError>>;
  set(isrc: string, deezer_id: string): Promise<Result<void, CacheError>>;
}>;

// O RedisClient lança em falha de rede; aqui vira Result (regra da apps/api).
const attempt = async <T>(run: () => Promise<T>): Promise<Result<T, CacheError>> => {
  try {
    return ok(await run());
  } catch {
    return err("cache_unavailable");
  }
};

export const redisIsrcCache = (redis: RedisClient): IsrcCache => ({
  get: (isrc) => attempt(() => redis.get(isrcKey(isrc))),
  set: (isrc, deezer_id) =>
    attempt(async () => {
      await redis.set(isrcKey(isrc), deezer_id, "EX", ISRC_TTL_SECONDS);
    }),
});

// Dev sem Redis e testes. Sem TTL: o processo não vive 24h em dev.
export class MemoryIsrcCache implements IsrcCache {
  readonly entries = new Map<string, string>();

  get = async (isrc: string): Promise<Result<string | null, CacheError>> => ok(this.entries.get(isrcKey(isrc)) ?? null);

  set = async (isrc: string, deezer_id: string): Promise<Result<void, CacheError>> => {
    this.entries.set(isrcKey(isrc), deezer_id);
    return ok(undefined);
  };
}
