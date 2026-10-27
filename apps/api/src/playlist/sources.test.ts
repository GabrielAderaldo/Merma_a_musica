import { describe, expect, test } from "bun:test";
import { fakeFetch, withStatus } from "../testing.ts";
import { tokenCipher } from "./crypto.ts";
import { ALLOWED_HOSTS, requestJson } from "./http.ts";
import { textPlaylist } from "./text.ts";
import { parseYoutubeLink, videoCandidate, youtubeClient } from "./youtube.ts";
import { z } from "zod";

describe("lista colada (R-002, R-010)", () => {
  test("uma música por linha, sem linha vazia, sem repetida e sem marcador de lista; origem text", () => {
    const list = textPlaylist("Minhas", "1. Legião Urbana - Tempo Perdido\n\n- Anitta - Envolver\r\n• anitta - envolver\n  Evidências  ", 500);
    expect(list).toMatchObject({ platform: "text", external_id: null, name: "Minhas", cover_url: null });
    expect(list.candidates.map((c) => (c.kind === "lookup" ? c.label : null))).toEqual([
      "Legião Urbana - Tempo Perdido",
      "Anitta - Envolver",
      "Evidências",
    ]);
  });

  test("para no limite de músicas por importação", () => {
    expect(textPlaylist("G", Array.from({ length: 10 }, (_, i) => `M ${i}`).join("\n"), 3).candidates).toHaveLength(3);
  });
});

describe("link do YouTube (ADR-0024)", () => {
  test.each([
    ["https://www.youtube.com/playlist?list=PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM", "PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM"],
    ["https://music.youtube.com/playlist?list=OLAK5uy_kXyz1234567890abc", "OLAK5uy_kXyz1234567890abc"],
    ["https://www.youtube.com/watch?v=abc&list=PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM", "PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM"],
    ["https://www.youtube.com/watch?v=abc", null],
    ["https://evil.com/playlist?list=PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM", null],
  ])("%s → %p", (url, id) => {
    expect(parseYoutubeLink(new URL(url))).toBe(id);
  });

  test("canal '- Topic' do YouTube Music entra como artista; vídeo sem canal (apagado ou privado) fica fora", () => {
    expect(videoCandidate("Bohemian Rhapsody", "Queen - Topic")).toEqual({
      kind: "lookup",
      label: "Bohemian Rhapsody",
      query: "Queen Bohemian Rhapsody",
      isrc: null,
    });
    expect(videoCandidate("Anitta - Envolver [Official Music Video]", "Anitta")).toMatchObject({ query: " Anitta - Envolver [Official Music Video]" });
    expect(videoCandidate("Private video", undefined)).toBeNull();
  });

  const API = "https://www.googleapis.com/youtube/v3";
  test("ADR-0024.R2: da YouTube API só saem o ID e o nome da playlist; nem a miniatura fica", async () => {
    const youtube = youtubeClient({
      fetch: fakeFetch({
        [`${API}/playlists`]: { items: [{ snippet: { title: "Hits", thumbnails: { medium: { url: "https://i.ytimg.com/x.jpg" } } } }] },
        [`${API}/playlistItems`]: { items: [{ snippet: { title: "Envolver", videoOwnerChannelTitle: "Anitta - Topic" } }] },
      }),
      apiKey: "k",
      maxSongs: 500,
    });
    const result = await youtube.playlist("PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM");
    expect(result).toEqual({
      ok: true,
      value: {
        platform: "youtube_music",
        external_id: "PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM",
        name: "Hits",
        cover_url: null,
        candidates: [{ kind: "lookup", label: "Envolver", query: "Anitta Envolver", isrc: null }],
      },
    });
  });

  test("playlist privada ou inexistente (items vazio ou 404) → playlist_not_found", async () => {
    for (const reply of [{ items: [] }, withStatus(404)]) {
      const youtube = youtubeClient({ fetch: fakeFetch({ [`${API}/playlists`]: reply }), apiKey: "k", maxSongs: 500 });
      expect(await youtube.playlist("PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM")).toEqual({ ok: false, error: "playlist_not_found" });
    }
  });
});

describe("ADR-0024.R3 — só as APIs oficiais, nunca página raspada", () => {
  test("a allowlist tem só hosts de API", () => {
    expect([...ALLOWED_HOSTS].toSorted()).toEqual(["accounts.spotify.com", "api.deezer.com", "api.spotify.com", "www.googleapis.com"]);
  });

  test.each(["https://open.spotify.com/embed/playlist/1", "https://music.youtube.com/playlist?list=PL1", "https://www.deezer.com/playlist/1"])(
    "%s é recusado sem nem chamar o fetch",
    async (url) => {
      const calls: string[] = [];
      expect(await requestJson(fakeFetch({ [url]: {} }, calls), url, z.unknown())).toEqual({ ok: false, error: "provider_unavailable" });
      expect(calls).toEqual([]);
    },
  );
});

describe("ADR-0006.R3 — refresh token cifrado com AES-256-GCM", () => {
  const KEY = Buffer.alloc(32, 7).toString("base64");

  test("cifra e decifra; o texto cifrado não contém o token e muda a cada vez (IV aleatório)", async () => {
    const cipher = await tokenCipher(KEY);
    if (cipher === null) return expect.unreachable("chave válida");
    const a = await cipher.encrypt("refresh-token-secreto");
    const b = await cipher.encrypt("refresh-token-secreto");
    expect(a).not.toContain("refresh-token-secreto");
    expect(Buffer.from(a, "base64").toString()).not.toContain("refresh-token-secreto");
    expect(a).not.toBe(b);
    expect(await cipher.decrypt(a)).toEqual({ ok: true, value: "refresh-token-secreto" });
  });

  test("outra chave ou dado adulterado não decifra", async () => {
    const cipher = await tokenCipher(KEY);
    const other = await tokenCipher(Buffer.alloc(32, 8).toString("base64"));
    if (cipher === null || other === null) return expect.unreachable("chaves válidas");
    const sealed = await cipher.encrypt("t");
    expect(await other.decrypt(sealed)).toEqual({ ok: false, error: "invalid_ciphertext" });
    const tampered = Buffer.from(sealed, "base64");
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 1;
    expect(await cipher.decrypt(tampered.toString("base64"))).toEqual({ ok: false, error: "invalid_ciphertext" });
  });

  test("chave que não tem 32 bytes é recusada", async () => {
    expect(await tokenCipher(Buffer.alloc(16).toString("base64"))).toBeNull();
    expect(await tokenCipher("")).toBeNull();
  });
});
