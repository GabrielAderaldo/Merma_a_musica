import { describe, expect, test } from "bun:test";
import { fakeFetch, withStatus } from "../testing.ts";
import { DeezerThrottle, deezerClient } from "./deezer.ts";
import { matches, resolveCandidate, searchText } from "./resolve.ts";
import { deezerTrack } from "./testing.ts";
import type { StoredSong } from "./types.ts";

const stored = (name: string, artist: string): StoredSong => ({ deezer_id: "1", isrc: null, name, artist, album: null, cover_url: null });

describe("R-010 — o resultado da busca só vale se título e artista aparecem no que o jogador trouxe", () => {
  // Casos do spike de 2026-10-26, com o 1º resultado que a busca da Deezer devolveu.
  test.each([
    ["Queen – Bohemian Rhapsody (Official Video Remastered)", "Bohemian Rhapsody (Remastered 2011)", "Queen", true],
    ["Marília Mendonça - Infiel (DVD Realidade)", "Infiel (Ao Vivo)", "Marília Mendonça", true],
    ["Tim Maia - Descobridor dos Sete Mares (Ao Vivo)", "O Descobridor dos Sete Mares", "Tim Maia", true],
    ["Anitta Envolver", "Envolver", "Anitta", true],
    ["Legião Urbana - Tempo Perdido", "Tempo Perdido", "Legião Urbana", true],
    ["Tempo Perdido", "Tempo Perdido", "Legião Urbana", false], // sem artista não há como confirmar
    ["musica aleatoria qualquer", "Boston", "Stella Lefty", false],
    ["Queen - Bohemian", "Bohemian Rhapsody", "Queen", false],
  ])("%p × %p de %p → %p", (query, name, artist, expected) => {
    expect(matches(query, stored(name, artist))).toBe(expected);
  });

  test("searchText tira acento, parênteses, colchetes e pontuação", () => {
    expect(searchText("Anitta - Envolver [Official Music Video]")).toBe("anitta envolver");
    expect(searchText("Chitãozinho & Xororó — Evidências (Ao Vivo)")).toBe("chitaozinho xororo evidencias");
  });
});

describe("resolveCandidate", () => {
  const API = "https://api.deezer.com";
  const deezer = (routes: Record<string, unknown>, calls: string[] = []) =>
    deezerClient({ fetch: fakeFetch(routes, calls), throttle: new DeezerThrottle({ limit: 1_000_000 }), maxSongs: 500 });

  test("R-010: com ISRC, acha pelo ISRC e nem busca", async () => {
    const calls: string[] = [];
    const client = deezer({ [`${API}/track/isrc:GBUM71029604`]: deezerTrack(9, "Bohemian Rhapsody", "Queen") }, calls);
    const found = await resolveCandidate(client, { kind: "lookup", label: "Queen - Bohemian", query: "x", isrc: "GBUM71029604" });
    expect(found.ok && found.value?.deezer_id).toBe("9");
    expect(calls).toHaveLength(1);
  });

  test("R-010: ISRC que a Deezer não tem cai na busca, que pula o resultado que não confere", async () => {
    const client = deezer({
      [`${API}/track/isrc:`]: { error: { code: 800 } },
      [`${API}/search`]: { data: [deezerTrack(1, "Outra", "Alguém"), deezerTrack(2, "Envolver", "Anitta")] },
    });
    const found = await resolveCandidate(client, { kind: "lookup", label: "l", query: "Anitta - Envolver", isrc: "BRXXX0000000" });
    expect(found.ok && found.value?.deezer_id).toBe("2");
  });

  test("R-010: nada confere → null (a música fica de fora)", async () => {
    const client = deezer({ [`${API}/search`]: { data: [deezerTrack(1, "Outra", "Alguém")] } });
    expect(await resolveCandidate(client, { kind: "lookup", label: "l", query: "Anitta Envolver", isrc: null })).toEqual({ ok: true, value: null });
  });

  test("Deezer fora do ar → provider_unavailable", async () => {
    const client = deezer({ [`${API}/search`]: withStatus(502) });
    expect(await resolveCandidate(client, { kind: "lookup", label: "l", query: "Anitta Envolver", isrc: null })).toEqual({
      ok: false,
      error: "provider_unavailable",
    });
  });
});
