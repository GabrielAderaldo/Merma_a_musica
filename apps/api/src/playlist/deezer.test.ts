import { describe, expect, test } from "bun:test";
import { fakeFetch, withStatus } from "../testing.ts";
import { DeezerThrottle, deezerClient, parseDeezerLink } from "./deezer.ts";
import { deezerTrack } from "./testing.ts";

const API = "https://api.deezer.com";

const client = (routes: Record<string, unknown>, maxSongs = 500) =>
  deezerClient({ fetch: fakeFetch(routes), throttle: new DeezerThrottle({ limit: 1_000_000 }), maxSongs });

describe("parseDeezerLink", () => {
  test.each([
    ["https://www.deezer.com/playlist/1313621735", "1313621735"],
    ["https://www.deezer.com/br/playlist/1313621735", "1313621735"],
    ["https://deezer.com/pt-br/playlist/1313621735/", "1313621735"],
    ["https://www.deezer.com/br/album/302127", null],
    ["https://www.deezer.com/br/playlist/abc", null],
    ["https://evil.com/playlist/1313621735", null],
    ["https://link.deezer.com/s/31JZ5bXkJcJpAbqGkRvCk", null],
  ])("%s → %p", (url, id) => {
    expect(parseDeezerLink(new URL(url))).toBe(id);
  });
});

describe("deezerClient.playlist — link público, sem login (R-002)", () => {
  test("R-010: as faixas vêm já como achadas na Deezer, com ISRC, paginadas e sem as que ela não toca", async () => {
    const deezer = client({
      [`${API}/playlist/42/tracks?index=0`]: {
        data: [deezerTrack(1, "Tempo Perdido", "Legião Urbana"), deezerTrack(2, "Bloqueada", "X", { readable: false })],
        next: `${API}/playlist/42/tracks?index=100`,
      },
      [`${API}/playlist/42/tracks?index=100`]: { data: [deezerTrack(3, "Evidências", "Chitãozinho & Xororó")] },
      [`${API}/playlist/42`]: { title: "Minhas", public: true, picture_medium: "https://cdn-images.dzcdn.net/p.jpg" },
    });
    const result = await deezer.playlist("42");
    if (!result.ok) return expect.unreachable(result.error);
    expect(result.value).toMatchObject({ platform: "deezer", external_id: "42", name: "Minhas", cover_url: "https://cdn-images.dzcdn.net/p.jpg" });
    expect(result.value.candidates.map((c) => (c.kind === "found" ? [c.song.deezer_id, c.song.isrc, c.song.name] : null))).toEqual([
      ["1", "BRXXX2600001", "Tempo Perdido"],
      ["3", "BRXXX2600003", "Evidências"],
    ]);
  });

  test("playlist privada ou inexistente (erro 800) → playlist_not_found", async () => {
    expect(await client({ [`${API}/playlist/7`]: { title: "Privada", public: false } }).playlist("7")).toEqual({
      ok: false,
      error: "playlist_not_found",
    });
    expect(await client({ [`${API}/playlist/8`]: { error: { type: "DataException", message: "no data", code: 800 } } }).playlist("8")).toEqual({
      ok: false,
      error: "playlist_not_found",
    });
  });

  test("Deezer fora do ar → provider_unavailable", async () => {
    expect(await client({ [`${API}/playlist/9`]: withStatus(500) }).playlist("9")).toEqual({ ok: false, error: "provider_unavailable" });
  });

  test("para no limite de músicas por importação", async () => {
    const page = { data: [1, 2, 3].map((i) => deezerTrack(i, `M${i}`, "A")), next: `${API}/playlist/5/tracks?index=100` };
    const result = await client({ [`${API}/playlist/5/tracks`]: page, [`${API}/playlist/5`]: { title: "G", public: true } }, 2).playlist("5");
    expect(result.ok && result.value.candidates.length).toBe(2);
  });
});

describe("ADR-0004.R4 — 50 requisições a cada 5s ao Deezer, com fila que espera", () => {
  test("a 4ª requisição de uma janela de 3 espera a janela abrir, e as seguintes saem na ordem", async () => {
    let now = 0;
    const waits: number[] = [];
    const throttle = new DeezerThrottle({
      limit: 3,
      windowMs: 5_000,
      now: () => now,
      sleep: async (ms) => {
        waits.push(ms);
        now += ms;
      },
    });
    const order: number[] = [];
    await Promise.all([1, 2, 3, 4, 5].map((i) => throttle.acquire().then(() => order.push(i))));
    expect(order).toEqual([1, 2, 3, 4, 5]);
    expect(waits).toEqual([5_000]); // a 4ª espera; a 5ª cabe na mesma nova janela
  });
});
