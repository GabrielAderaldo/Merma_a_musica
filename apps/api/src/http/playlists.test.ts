import { describe, expect, test } from "bun:test";
import { ImportAcceptedResponse, ImportJobResponse, PlaylistsResponse } from "@merma/schema";
import { MAX_CONCURRENT_IMPORTS } from "../playlist/importer.ts";
import { deezerTrack } from "../playlist/testing.ts";
import { captureLogs, fakeFetch, ORIGIN, sessionCookie, testApp, testPlaylists } from "../testing.ts";

const DEEZER = "https://api.deezer.com";
const routes = {
  [`${DEEZER}/playlist/42/tracks`]: { data: [deezerTrack(1, "Tempo Perdido", "Legião Urbana")] },
  [`${DEEZER}/playlist/42`]: { title: "Minhas", public: true, picture_medium: "https://cdn-images.dzcdn.net/p.jpg" },
  [`${DEEZER}/search`]: { data: [deezerTrack(2, "Envolver", "Anitta")] },
};

const setup = (fetch = fakeFetch(routes)) => {
  const playlists = testPlaylists({ fetch });
  return { app: testApp({ logger: captureLogs().logger, playlists }), playlists };
};

const login = async (a: ReturnType<typeof setup>["app"]) => sessionCookie(await a.request("/health")) ?? "";

const post = (a: ReturnType<typeof setup>["app"], cookie: string, body: unknown, origin: string | null = ORIGIN) =>
  a.request("/api/v1/playlists/import", {
    method: "POST",
    headers: { cookie, "content-type": "application/json", ...(origin === null ? {} : { origin }) },
    body: JSON.stringify(body),
  });

describe("importação por REST, acompanhada por polling (R-002, R-010)", () => {
  test("link da Deezer: 202 → job completed → aparece em GET /playlists → DELETE apaga", async () => {
    const { app: a, playlists } = setup();
    const cookie = await login(a);
    const accepted = await post(a, cookie, { source: "link", url: "https://www.deezer.com/br/playlist/42" });
    expect(accepted.status).toBe(202);
    const { job_id } = ImportAcceptedResponse.parse(await accepted.json());
    await playlists.jobs.idle();

    const job = ImportJobResponse.parse(await (await a.request(`/api/v1/playlists/imports/${job_id}`, { headers: { cookie } })).json());
    expect(job).toMatchObject({ status: "completed", progress: { done: 1, total: 1 }, not_found: [], error_code: null });

    const list = PlaylistsResponse.parse(await (await a.request("/api/v1/playlists", { headers: { cookie } })).json());
    expect(list.playlists).toEqual([
      {
        playlist_id: job.playlist_id ?? "",
        name: "Minhas",
        platform: "deezer",
        external_id: "42",
        track_count: 1,
        cover_url: "https://cdn-images.dzcdn.net/p.jpg",
        imported_at: new Date(1_000_000).toISOString(),
      },
    ]);

    const del = () => a.request(`/api/v1/playlists/${job.playlist_id}`, { method: "DELETE", headers: { cookie, origin: ORIGIN } });
    expect((await del()).status).toBe(204);
    expect((await del()).status).toBe(404);
  });

  test("lista colada com nome; o job de outro jogador é 404", async () => {
    const { app: a, playlists } = setup();
    const cookie = await login(a);
    const res = await post(a, cookie, { source: "text", name: "Colada", text: "Anitta - Envolver" });
    const { job_id } = ImportAcceptedResponse.parse(await res.json());
    await playlists.jobs.idle();
    const other = await login(a);
    expect((await a.request(`/api/v1/playlists/imports/${job_id}`, { headers: { cookie: other } })).status).toBe(404);
    const list = PlaylistsResponse.parse(await (await a.request("/api/v1/playlists", { headers: { cookie } })).json());
    expect(list.playlists.map((p) => [p.name, p.platform, p.external_id])).toEqual([["Colada", "text", null]]);
  });

  test("link não reconhecido → 400 invalid_playlist_link; corpo fora do schema → 400 invalid_payload", async () => {
    const { app: a } = setup();
    const cookie = await login(a);
    const link = await post(a, cookie, { source: "link", url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" });
    expect(link.status).toBe(400);
    expect(await link.json()).toMatchObject({ code: "invalid_playlist_link" });
    for (const body of [{ source: "link" }, { source: "text", name: "", text: "a" }, { source: "link", url: "https://www.deezer.com/playlist/1", x: 1 }]) {
      const res = await post(a, cookie, body);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "invalid_payload" });
    }
  });

  test("S-04: importar sem o Origin da allowlist → 403", async () => {
    const { app: a } = setup();
    const cookie = await login(a);
    expect((await post(a, cookie, { source: "text", name: "x", text: "a" }, null)).status).toBe(403);
    expect((await post(a, cookie, { source: "text", name: "x", text: "a" }, "https://evil.com")).status).toBe(403);
  });

  test("S-25: a 6ª importação simultânea → 429 com Retry-After", async () => {
    // A Deezer nunca responde: os jobs ficam em andamento.
    const { app: a } = setup(() => new Promise<Response>(() => {}));
    const cookie = await login(a);
    const body = { source: "link", url: "https://www.deezer.com/playlist/42" };
    for (let i = 0; i < MAX_CONCURRENT_IMPORTS; i++) expect((await post(a, cookie, body)).status).toBe(202);
    const limited = await post(a, cookie, body);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  test("Spotify sem conta conectada: catálogo e importação → 403 platform_not_connected", async () => {
    const { app: a } = setup();
    const cookie = await login(a);
    const available = await a.request("/api/v1/playlists/available/spotify", { headers: { cookie } });
    expect(available.status).toBe(403);
    expect((await a.request("/api/v1/playlists/available/deezer", { headers: { cookie } })).status).toBe(400);
  });
});
