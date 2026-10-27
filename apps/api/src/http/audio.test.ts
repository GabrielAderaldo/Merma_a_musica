import { describe, expect, test } from "bun:test";
import { ok, PlayerUuid, type PlaylistId } from "@merma/domain";
import { ErrorResponse } from "@merma/schema";
import { previewResolver } from "../playlist/audio/resolver.ts";
import { AudioTokens } from "../playlist/audio/token.ts";
import type { DeezerClient } from "../playlist/deezer.ts";
import { MemoryIsrcCache } from "../playlist/audio/cache.ts";
import { TIMING } from "../room/actor.ts";
import { deezerAudio } from "../room/audio.ts";
import type { SongSource } from "../room/ports.ts";
import { RoomRegistry } from "../room/registry.ts";
import { actorDeps, FakeSocket, PLAYLIST, song } from "../room/testing.ts";
import { AUDIO_SECRET, sessionCookie, testApp } from "../testing.ts";

const DEEZER_ID = "3135556";
const PREVIEW = "https://cdnt-preview.dzcdn.net/api/1/1/a/b/c/0/abc.mp3";
const FRAME = [0xff, 0xfb, 0x90, 0x64, 1, 2, 3];
const TAGGED = [..."ID3".split("").map((c) => c.charCodeAt(0)), 4, 0, 0, 0, 0, 0, 2, 9, 9, ...FRAME, ..."TAG".split("").map((c) => c.charCodeAt(0)), ...Array<number>(125).fill(0)];

// A Deezer de mentira só conhece a faixa da importação: se o resolver tentasse ISRC ou busca, não acharia nada.
const deezer: DeezerClient = {
  playlist: async () => ({ ok: false, error: "provider_unavailable" }),
  byIsrc: async () => ok(null),
  search: async () => ok([]),
  preview: async (id) => ok(id === DEEZER_ID ? PREVIEW : null),
};

// Músicas da playlist com o deezer_id da importação, como o playlistSongs entrega.
const songs: SongSource = {
  playlist: async (owner, _id: PlaylistId) => {
    const list = Array.from({ length: 5 }, (_, i) => ({ ...song(owner, `Musica ${i}`, "Artista"), deezer_id: DEEZER_ID }));
    return ok({ platform: "deezer" as const, playable_songs: list.length, songs: list });
  },
};

// Dois jogadores, cada um com a sessão de verdade do app, numa sala parada no grace period da 1ª rodada.
const playing = async (opts: { now?: () => number } = {}) => {
  const setup = actorDeps();
  const tokens = new AudioTokens(AUDIO_SECRET);
  const previews = previewResolver({
    deezer,
    cache: new MemoryIsrcCache(),
    fetch: async (url) => (url === PREVIEW ? new Response(new Uint8Array(TAGGED)) : new Response(null, { status: 404 })),
  });
  const registry = new RoomRegistry({ ...setup.deps, songs, audio: deezerAudio({ previews, tokens }) });
  const app = testApp({ registry, audioTokens: tokens, now: opts.now ?? (() => setup.clock.now()) });
  const actor = registry.create() ?? expect.unreachable("sala");
  const players = [];
  for (const nickname of ["P1", "P2"]) {
    const cookie = sessionCookie(await app.request("/health")) ?? expect.unreachable("cookie");
    const uuid = PlayerUuid(decodeURIComponent(cookie).split("=")[1]?.split(":")[1] ?? "");
    if (!uuid.ok) return expect.unreachable("player_uuid do cookie");
    const socket = new FakeSocket();
    await actor.join(uuid.value, nickname, socket);
    await actor.receive(uuid.value, { type: "select_playlist", playlist_id: PLAYLIST }, socket);
    players.push({ uuid: uuid.value, cookie, socket });
  }
  const [a, b] = players;
  if (a === undefined || b === undefined) return expect.unreachable("jogadores");
  const config = { time_per_round: 10, total_songs: 2, answer_type: "song", allow_repeats: true, scoring_rule: "simple", game_mode: "multiplayer" } as const;
  await actor.receive(a.uuid, { type: "configure_match", config }, a.socket);
  await actor.receive(a.uuid, { type: "start_game" }, a.socket);
  const advance = (ms: number) => setup.clock.advance(ms, () => actor.idle());
  await advance(TIMING.countdownMs);
  const tokenOf = (p: typeof a) => {
    const audio = p.socket.last("round_starting")?.audio;
    return audio?.audio_source === "deezer" ? audio.audio_token : expect.unreachable("audio_token");
  };
  const get = (token: string, cookie: string, headers: Record<string, string> = {}, method = "GET") =>
    app.request(`/api/v1/audio/${token}`, { method, headers: { cookie, ...headers } });
  return { a, b, tokenOf, get, advance, actor };
};

// Status e código do erro, validado pelo contrato.
const failure = async (res: Response) => [res.status, ErrorResponse.parse(await res.json()).code];

describe("proxy GET /api/v1/audio/{audio_token} (ADR-0025)", () => {
  test("ADR-0025.R1 / S-10: 200 com o MP3 sem ID3, no-store, e nenhum dado da Deezer no fio antes de round_ended", async () => {
    const { a, tokenOf, get } = await playing();
    const res = await get(tokenOf(a), a.cookie);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("cache-control")).toBe("no-store, private");
    expect(res.headers.get("content-length")).toBe(String(FRAME.length));
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual(FRAME);
    const wire = JSON.stringify(a.socket.sent);
    expect(wire).not.toContain(DEEZER_ID);
    expect(wire).not.toContain("dzcdn");
    expect(wire).not.toContain("deezer_id");
  });

  test("ADR-0025.R2 / S-13: Range → 416 antes de consumir o token, que continua valendo", async () => {
    const { a, tokenOf, get } = await playing();
    expect((await get(tokenOf(a), a.cookie, { range: "bytes=0-99" })).status).toBe(416);
    expect((await get(tokenOf(a), a.cookie, { "if-range": "x", range: "bytes=0-" })).status).toBe(416);
    expect((await get(tokenOf(a), a.cookie)).status).toBe(200);
  });

  test("HEAD não consome o token", async () => {
    const { a, tokenOf, get } = await playing();
    expect((await get(tokenOf(a), a.cookie, {}, "HEAD")).status).toBe(405);
    expect((await get(tokenOf(a), a.cookie)).status).toBe(200);
  });

  test("ADR-0025.R3 / S-11: token de outro jogador → 401 player_mismatch, sem consumir", async () => {
    const { a, b, tokenOf, get } = await playing();
    expect(await failure(await get(tokenOf(a), b.cookie))).toEqual([401, "player_mismatch"]);
    expect((await get(tokenOf(a), a.cookie)).status).toBe(200);
  });

  test("S-11: token adulterado → 401 invalid_signature; lixo → 401 malformed", async () => {
    const { a, tokenOf, get } = await playing();
    const [mac, payload] = tokenOf(a).split(".");
    const bad = await get(`${mac?.slice(0, -2)}AA.${payload}`, a.cookie);
    expect(await failure(bad)).toEqual([401, "invalid_signature"]);
    const junk = await get("lixo", a.cookie);
    expect(await failure(junk)).toEqual([401, "malformed"]);
  });

  test("ADR-0025.R3 / S-12: token reusado → 410 token_already_used", async () => {
    const { a, tokenOf, get } = await playing();
    expect((await get(tokenOf(a), a.cookie)).status).toBe(200);
    const again = await get(tokenOf(a), a.cookie);
    expect(await failure(again)).toEqual([410, "token_already_used"]);
  });

  test("S-14: token depois do prazo → 410 expired", async () => {
    let now = 0;
    const { a, tokenOf, get } = await playing({ now: () => now });
    now = Number.MAX_SAFE_INTEGER;
    const res = await get(tokenOf(a), a.cookie);
    expect(await failure(res)).toEqual([410, "expired"]);
  });

  test("S-14: rodada encerrada → 410 round_expired, mesmo com o token no prazo", async () => {
    const { b, tokenOf, get, advance } = await playing({ now: () => 0 });
    await advance(TIMING.gracePeriodMs + 10_000);
    expect(b.socket.of("round_ended")).toHaveLength(1);
    const res = await get(tokenOf(b), b.cookie);
    expect(await failure(res)).toEqual([410, "round_expired"]);
  });
});
