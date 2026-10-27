import { describe, expect, test } from "bun:test";
import { captureLogs, fakeFetch, redirectTo, testPlaylists, withStatus } from "../testing.ts";
import { ALLOWED_HOSTS, REDIRECT_HOSTS } from "./http.ts";
import { MAX_CONCURRENT_IMPORTS } from "./importer.ts";
import { deezerTrack } from "./testing.ts";

const DEEZER = "https://api.deezer.com";
const YOUTUBE = "https://www.googleapis.com/youtube/v3";
const PLAYER = crypto.randomUUID();
// Links curtos do app da Deezer: um leva à playlist 42, o outro não existe (ADR-0026).
const SHORT = "https://link.deezer.com/s/31JZ5bXkJcJpAbqGkRvCk";
const SHORT_404 = "https://link.deezer.com/s/naoexiste";

const deezerRoutes = {
  [`${DEEZER}/playlist/42/tracks`]: {
    data: [deezerTrack(1, "Tempo Perdido", "Legião Urbana"), deezerTrack(2, "Envolver", "Anitta"), deezerTrack(1, "Tempo Perdido", "Legião Urbana")],
  },
  [`${DEEZER}/playlist/42`]: { title: "Minhas", public: true, picture_medium: "https://cdn-images.dzcdn.net/p.jpg" },
  // A busca da lista colada: só "Anitta Envolver" acha alguma coisa que confere.
  [`${DEEZER}/search?limit=5&q=anitta%20envolver`]: { data: [deezerTrack(2, "Envolver", "Anitta")] },
  [`${DEEZER}/search`]: { data: [deezerTrack(99, "Outra Coisa", "Alguém")] },
  [SHORT]: redirectTo(`https://link.deezer.com/?dest=${encodeURIComponent("https://www.deezer.com/br/playlist/42?utm_source=user_sharing")}`),
  [SHORT_404]: redirectTo("https://www.deezer.com/deezer-links-404", 302),
};

const setup = (routes: Record<string, unknown> = deezerRoutes, youtube = false) => {
  const calls: string[] = [];
  const logs = captureLogs();
  const integration = testPlaylists({ fetch: fakeFetch(routes, calls), youtube, logger: logs.logger });
  return { ...integration, calls, logs };
};

const finished = async (s: ReturnType<typeof setup>, player: string, job_id: string) => {
  await s.jobs.idle();
  return s.jobs.get(player, job_id);
};

describe("importação (R-002, R-010)", () => {
  test("LGPD: forget no meio da importação some com o job, e a playlist não é gravada", async () => {
    const s = setup();
    const player = crypto.randomUUID();
    const started = await s.jobs.start(player, { source: "link", url: "https://www.deezer.com/br/playlist/42" });
    if (!started.ok) return expect.unreachable(started.error);
    s.jobs.forget(player);
    expect(await finished(s, player, started.value)).toBeNull();
    expect(await s.store.list(player)).toEqual({ ok: true, value: [] });
  });

  test("link da Deezer: grava as músicas sem repetir, com a capa da playlist", async () => {
    const s = setup();
    const started = await s.jobs.start(PLAYER, { source: "link", url: "https://www.deezer.com/br/playlist/42" });
    if (!started.ok) return expect.unreachable(started.error);
    const job = await finished(s, PLAYER, started.value);
    expect(job).toMatchObject({ status: "completed", progress: { done: 3, total: 3 }, not_found: [], error_code: null });
    const list = await s.store.list(PLAYER);
    expect(list.ok && list.value.map((p) => [p.playlist_id, p.platform, p.name, p.track_count, p.cover_url])).toEqual([
      [job?.playlist_id ?? null, "deezer", "Minhas", 2, "https://cdn-images.dzcdn.net/p.jpg"],
    ]);
  });

  test("R-010, ADR-0026.R1: lista colada grava o que a Deezer achou, com o nome dela, e devolve as linhas que ficaram de fora", async () => {
    const s = setup();
    const player = crypto.randomUUID();
    const started = await s.jobs.start(player, { source: "text", name: "Colada", text: "Anitta - Envolver\nUma música que não existe" });
    if (!started.ok) return expect.unreachable(started.error);
    const job = await finished(s, player, started.value);
    expect(job).toMatchObject({ status: "completed", not_found: ["Uma música que não existe"] });
    const songs = await s.store.songs(player, job?.playlist_id ?? "");
    expect(songs.ok && songs.value).toEqual({
      platform: "text",
      songs: [
        {
          deezer_id: "2",
          isrc: "BRXXX2600002",
          name: "Envolver",
          artist: "Anitta",
          album: "Envolver (Álbum)",
          cover_url: "https://cdn-images.dzcdn.net/2.jpg",
        },
      ],
    });
    // Sem capa da fonte, vale a da 1ª música achada.
    const list = await s.store.list(player);
    expect(list.ok && list.value[0]?.cover_url).toBe("https://cdn-images.dzcdn.net/2.jpg");
  });

  test("R-010, ADR-0026.R1: nada achado → failed com no_songs_found, sem gravar playlist", async () => {
    const s = setup();
    const player = crypto.randomUUID();
    const started = await s.jobs.start(player, { source: "text", name: "Nada", text: "xyz\nabc" });
    if (!started.ok) return expect.unreachable(started.error);
    expect(await finished(s, player, started.value)).toMatchObject({ status: "failed", error_code: "no_songs_found", not_found: ["xyz", "abc"] });
    expect(await s.store.list(player)).toEqual({ ok: true, value: [] });
  });

  test("ADR-0026.R2: link do YouTube grava só o resolvido na Deezer; do YouTube ficam o ID e o nome", async () => {
    const s = setup(
      {
        ...deezerRoutes,
        [`${YOUTUBE}/playlists`]: { items: [{ snippet: { title: "Do YouTube", thumbnails: { medium: { url: "https://i.ytimg.com/x.jpg" } } } }] },
        [`${YOUTUBE}/playlistItems`]: {
          items: [{ snippet: { title: "Anitta - Envolver [Official Music Video]", videoOwnerChannelTitle: "Anitta" } }],
        },
      },
      true,
    );
    const player = crypto.randomUUID();
    const started = await s.jobs.start(player, { source: "link", url: "https://music.youtube.com/playlist?list=PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM" });
    if (!started.ok) return expect.unreachable(started.error);
    const job = await finished(s, player, started.value);
    const list = await s.store.list(player);
    expect(list.ok && list.value[0]).toMatchObject({
      platform: "youtube_music",
      external_id: "PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM",
      name: "Do YouTube",
      cover_url: "https://cdn-images.dzcdn.net/2.jpg",
    });
    const songs = await s.store.songs(player, job?.playlist_id ?? "");
    expect(songs.ok && songs.value?.songs.map((x) => [x.deezer_id, x.name, x.artist])).toEqual([["2", "Envolver", "Anitta"]]);
  });

  test.each(["https://www.deezer.com/playlist/42", SHORT])("ADR-0026.R3: importar %s só chama hosts da allowlist", async (url) => {
    const s = setup();
    const started = await s.jobs.start(PLAYER, { source: "link", url });
    if (!started.ok) return expect.unreachable(started.error);
    await s.jobs.idle();
    expect(s.calls.length).toBeGreaterThan(0);
    for (const call of s.calls) expect([...ALLOWED_HOSTS, ...REDIRECT_HOSTS]).toContain(new URL(call).hostname);
  });

  test("ADR-0026.R5: link curto importa a playlist para onde ele leva", async () => {
    const s = setup();
    const started = await s.jobs.start(PLAYER, { source: "link", url: SHORT });
    if (!started.ok) return expect.unreachable(started.error);
    expect(await finished(s, PLAYER, started.value)).toMatchObject({ status: "completed", error_code: null });
    expect(s.calls[0]).toBe(SHORT);
    expect(s.calls.filter((c) => c.startsWith("https://link.deezer.com"))).toHaveLength(1);
  });

  test("link curto com o link.deezer.com fora do ar → provider_unavailable, antes de criar o job", async () => {
    expect(await setup({ ...deezerRoutes, [SHORT]: withStatus(503) }).jobs.start(PLAYER, { source: "link", url: SHORT })).toEqual({
      ok: false,
      error: "provider_unavailable",
    });
  });

  test.each([
    ["https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"],
    ["https://www.deezer.com/br/album/1"],
    ["http://www.deezer.com/playlist/42"],
    [SHORT_404],
  ])("link não reconhecido (%s) → invalid_playlist_link, antes de criar o job", async (url) => {
    expect(await setup().jobs.start(PLAYER, { source: "link", url })).toEqual({ ok: false, error: "invalid_playlist_link" });
  });

  test("YouTube sem chave e Spotify sem app → provider_unavailable", async () => {
    const s = setup();
    expect(await s.jobs.start(PLAYER, { source: "link", url: "https://www.youtube.com/playlist?list=PL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM" })).toEqual({
      ok: false,
      error: "provider_unavailable",
    });
    expect(await s.jobs.start(PLAYER, { source: "spotify", external_id: "abc" })).toEqual({ ok: false, error: "provider_unavailable" });
  });

  test("playlist privada → failed com playlist_not_found; Deezer fora → provider_unavailable", async () => {
    const s = setup({ [`${DEEZER}/playlist/7`]: { title: "P", public: false }, [`${DEEZER}/playlist/8`]: withStatus(500) });
    const player = crypto.randomUUID();
    for (const [id, error] of [["7", "playlist_not_found"], ["8", "provider_unavailable"]] as const) {
      const started = await s.jobs.start(player, { source: "link", url: `https://www.deezer.com/playlist/${id}` });
      if (!started.ok) return expect.unreachable(started.error);
      expect(await finished(s, player, started.value)).toMatchObject({ status: "failed", error_code: error });
    }
    expect(s.logs.lines.filter((l) => l["event"] === "playlist_import_failed")).toHaveLength(2);
  });

  test("S-25: a 6ª importação simultânea do mesmo jogador → rate_limited; outro jogador não é afetado", async () => {
    // A Deezer nunca responde, então os jobs ficam em andamento.
    const s = testPlaylists({ fetch: () => new Promise<Response>(() => {}) });
    const player = crypto.randomUUID();
    for (let i = 0; i < MAX_CONCURRENT_IMPORTS; i++) {
      expect((await s.jobs.start(player, { source: "link", url: "https://www.deezer.com/playlist/42" })).ok).toBe(true);
    }
    expect(await s.jobs.start(player, { source: "link", url: "https://www.deezer.com/playlist/42" })).toEqual({ ok: false, error: "rate_limited" });
    expect((await s.jobs.start(crypto.randomUUID(), { source: "text", name: "x", text: "a" })).ok).toBe(true);
  });

  test("job de outro jogador vale como inexistente; job terminado some depois de 10 min", async () => {
    let now = 1_000_000;
    const s = testPlaylists({ fetch: fakeFetch(deezerRoutes), now: () => now });
    const player = crypto.randomUUID();
    const started = await s.jobs.start(player, { source: "link", url: "https://www.deezer.com/playlist/42" });
    if (!started.ok) return expect.unreachable(started.error);
    await s.jobs.idle();
    expect(s.jobs.get(crypto.randomUUID(), started.value)).toBeNull();
    expect(s.jobs.get(player, started.value)?.status).toBe("completed");
    now += 10 * 60_000 + 1;
    expect(s.jobs.get(player, started.value)).toBeNull();
  });
});
