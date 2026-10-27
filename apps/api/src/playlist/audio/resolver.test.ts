import { describe, expect, test } from "bun:test";
import { RedisClient } from "bun";
import { fakeFetch, withStatus } from "../../testing.ts";
import { DeezerThrottle, deezerClient } from "../deezer.ts";
import type { Fetch } from "../http.ts";
import { deezerTrack } from "../testing.ts";
import { ISRC_TTL_SECONDS, type IsrcCache, MemoryIsrcCache, redisIsrcCache } from "./cache.ts";
import { type AudioSong, previewResolver } from "./resolver.ts";

const API = "https://api.deezer.com";
const CDN = "https://cdnt-preview.dzcdn.net/api/1/1/a/b/c/0/abc.mp3?hdnea=exp=1";
const FRAME = [0xff, 0xfb, 0x90, 0x64, 1, 2, 3];
const TAGGED = new Uint8Array([..."ID3".split("").map((c) => c.charCodeAt(0)), 4, 0, 0, 0, 0, 0, 2, 9, 9, ...FRAME]);

// A API responde JSON pelo fakeFetch; o CDN, os bytes do MP3.
const fetchWith = (routes: Record<string, unknown>, calls: string[] = [], mp3: Response = new Response(TAGGED)): Fetch => {
  const api = fakeFetch(routes, calls);
  return async (url, init) => {
    if (!url.startsWith("https://cdnt-preview.dzcdn.net/")) return api(url, init);
    calls.push(url);
    return mp3;
  };
};

const resolver = (fetch: Fetch, cache: IsrcCache = new MemoryIsrcCache()) =>
  previewResolver({ deezer: deezerClient({ fetch, throttle: new DeezerThrottle({ limit: 1_000_000 }), maxSongs: 0 }), cache, fetch });

const track = (id: number, extra: Record<string, unknown> = {}) => deezerTrack(id, "Tempo Perdido", "Legião Urbana", { preview: CDN, ...extra });
const song = (extra: Partial<AudioSong> = {}): AudioSong => ({ deezer_id: null, isrc: null, name: "Tempo Perdido", artist: "Legião Urbana", ...extra });

describe("previewResolver (ADR-0004, R-801)", () => {
  test("com o deezer_id da importação: pega o preview da faixa direto, sem ISRC nem busca", async () => {
    const calls: string[] = [];
    const mp3 = await resolver(fetchWith({ [`${API}/track/7`]: track(7) }, calls)).resolve(song({ deezer_id: "7", isrc: "BRXXX2600007" }));
    expect(mp3 === null ? null : [...mp3]).toEqual(FRAME);
    expect(calls).toEqual([`${API}/track/7`, CDN]);
  });

  test("S-10: o MP3 sai sem a tag ID3", async () => {
    const mp3 = await resolver(fetchWith({ [`${API}/track/7`]: track(7) })).resolve(song({ deezer_id: "7" }));
    expect(String.fromCharCode(...(mp3 ?? []).slice(0, 3))).not.toBe("ID3");
  });

  test("ADR-0004.R5: ISRC no cache não chama a Deezer para achar a faixa", async () => {
    const cache = new MemoryIsrcCache();
    await cache.set("BRXXX2600001", "1");
    const calls: string[] = [];
    await resolver(fetchWith({ [`${API}/track/1`]: track(1) }, calls), cache).resolve(song({ isrc: "BRXXX2600001" }));
    expect(calls).toEqual([`${API}/track/1`, CDN]);
  });

  test("ADR-0004.R5: ISRC fora do cache vai à Deezer e grava isrc:{isrc}:deezer", async () => {
    const cache = new MemoryIsrcCache();
    const routes = { [`${API}/track/isrc:BRXXX2600001`]: track(1), [`${API}/track/1`]: track(1) };
    expect(await resolver(fetchWith(routes), cache).resolve(song({ isrc: "BRXXX2600001" }))).not.toBeNull();
    expect([...cache.entries]).toEqual([["isrc:BRXXX2600001:deezer", "1"]]);
  });

  test("sem ISRC: busca por nome e artista, e só aceita o que bate (mesma regra da importação, R-010)", async () => {
    const calls: string[] = [];
    const routes = { [`${API}/search`]: { data: [deezerTrack(2, "Outra", "Banda"), track(3)] }, [`${API}/track/3`]: track(3) };
    expect(await resolver(fetchWith(routes, calls)).resolve(song())).not.toBeNull();
    expect(calls).toContain(`${API}/track/3`);
  });

  test("ISRC desconhecido (erro 800) cai na busca", async () => {
    const routes = {
      [`${API}/track/isrc:`]: { error: { type: "DataException", message: "no data", code: 800 } },
      [`${API}/search`]: { data: [track(3)] },
      [`${API}/track/3`]: track(3),
    };
    expect(await resolver(fetchWith(routes)).resolve(song({ isrc: "BRXXX2600009" }))).not.toBeNull();
  });

  test.each([
    ["nada na busca", { [`${API}/search`]: { data: [] } }, song()],
    ["faixa sem preview", { [`${API}/track/7`]: track(7, { preview: "" }) }, song({ deezer_id: "7" })],
    ["faixa que não toca na região", { [`${API}/track/7`]: track(7, { readable: false }) }, song({ deezer_id: "7" })],
    ["preview fora do CDN da Deezer", { [`${API}/track/7`]: track(7, { preview: "https://evil.example/a.mp3" }) }, song({ deezer_id: "7" })],
    ["Deezer fora do ar", { [`${API}/track/7`]: withStatus(502) }, song({ deezer_id: "7" })],
  ])("R-307: %s → null, e a música sai pela reserva", async (_name, routes, input) => {
    expect(await resolver(fetchWith(routes)).resolve(input)).toBeNull();
  });

  test("CDN respondendo erro → null", async () => {
    const fetch = fetchWith({ [`${API}/track/7`]: track(7) }, [], new Response("x", { status: 403 }));
    expect(await resolver(fetch).resolve(song({ deezer_id: "7" }))).toBeNull();
  });
});

// Contra o Redis de verdade quando REDIS_URL existe: no CI (service redis) e em dev com `infra up redis`.
const url = process.env["REDIS_URL"];
describe.skipIf(url === undefined || url === "")("redisIsrcCache (Redis de verdade)", () => {
  test("ADR-0004.R5: a chave é isrc:{isrc}:deezer, com TTL de 24h", async () => {
    const redis = new RedisClient(url);
    const cache = redisIsrcCache(redis);
    await cache.set("BRTST2600001", "42");
    expect(await cache.get("BRTST2600001")).toEqual({ ok: true, value: "42" });
    const ttl = await redis.ttl("isrc:BRTST2600001:deezer");
    expect(ttl).toBeGreaterThan(ISRC_TTL_SECONDS - 5);
    expect(ttl).toBeLessThanOrEqual(ISRC_TTL_SECONDS);
    await redis.del("isrc:BRTST2600001:deezer");
    redis.close();
  });
});

test("Redis fora do ar: o cache vira cache_unavailable e o resolver segue pela Deezer", async () => {
  const redis = new RedisClient("redis://127.0.0.1:1", { autoReconnect: false, connectionTimeout: 200 });
  const cache = redisIsrcCache(redis);
  expect(await cache.get("BRXXX2600001")).toEqual({ ok: false, error: "cache_unavailable" });
  const routes = { [`${API}/track/isrc:BRXXX2600001`]: track(1), [`${API}/track/1`]: track(1) };
  expect(await resolver(fetchWith(routes), cache).resolve(song({ isrc: "BRXXX2600001" }))).not.toBeNull();
  redis.close();
});
