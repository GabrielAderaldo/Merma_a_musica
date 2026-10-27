// Rotas REST das playlists do jogador (R-002, R-010, ADR-0024): importar por link, lista ou Spotify, acompanhar o job
// por polling, listar e apagar.
import { createRoute, z } from "@hono/zod-openapi";
import {
  AvailablePlaylistsResponse,
  ErrorResponse,
  ImportAcceptedResponse,
  ImportJobId,
  ImportJobResponse,
  ImportPlaylistRequest,
  PlaylistId,
  PlaylistsResponse,
} from "@merma/schema";
import type { SpotifyAuth } from "../playlist/accounts.ts";
import type { ImportJobs } from "../playlist/importer.ts";
import type { PlaylistRecord, PlaylistStore } from "../playlist/store.ts";
import type { OpenApiApp } from "./app.ts";
import type { Logger } from "./logger.ts";

const json = <S extends z.ZodType>(schema: S, description: string) => ({
  description,
  content: { "application/json": { schema } },
});
const unavailable = json(ErrorResponse, "Postgres fora do ar");

const listRoute = createRoute({
  method: "get",
  path: "/api/v1/playlists",
  responses: { 200: json(PlaylistsResponse, "As playlists do jogador, da mais recente"), 503: unavailable },
});

const availableRoute = createRoute({
  method: "get",
  path: "/api/v1/playlists/available/{platform}",
  request: { params: z.object({ platform: z.literal("spotify") }) },
  responses: {
    200: json(AvailablePlaylistsResponse, "As playlists que a conta do Spotify pode importar"),
    400: json(ErrorResponse, "Só o Spotify tem catálogo por conta (R-002)"),
    403: json(ErrorResponse, "Spotify não conectado"),
    502: json(ErrorResponse, "Spotify fora do ar"),
  },
});

const importRoute = createRoute({
  method: "post",
  path: "/api/v1/playlists/import",
  request: { body: { content: { "application/json": { schema: ImportPlaylistRequest } }, required: true } },
  responses: {
    202: json(ImportAcceptedResponse, "Importação aceita; acompanhe por GET /api/v1/playlists/imports/{job_id}"),
    400: json(ErrorResponse, "Corpo inválido ou link não reconhecido"),
    403: json(ErrorResponse, "Spotify não conectado"),
    429: json(ErrorResponse, "Já há 5 importações em andamento (S-25), com Retry-After"),
    503: json(ErrorResponse, "Fonte não configurada nesta instância (YouTube sem chave, Spotify sem app)"),
  },
});

const jobRoute = createRoute({
  method: "get",
  path: "/api/v1/playlists/imports/{job_id}",
  request: { params: z.object({ job_id: ImportJobId }) },
  responses: {
    200: json(ImportJobResponse, "Estado da importação"),
    400: json(ErrorResponse, "job_id fora do formato"),
    404: json(ErrorResponse, "Importação inexistente, de outro jogador ou expirada"),
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/api/v1/playlists/{playlist_id}",
  request: { params: z.object({ playlist_id: PlaylistId }) },
  responses: {
    204: { description: "Playlist apagada" },
    400: json(ErrorResponse, "playlist_id fora do formato"),
    404: json(ErrorResponse, "Playlist inexistente ou de outro jogador"),
    503: unavailable,
  },
});

const STORE_DOWN = { code: "internal_error" as const, message: "Tente de novo." };
// Retry-After do S-25: uma importação comum termina em segundos.
const IMPORT_RETRY_AFTER_SECONDS = 10;

export const toWirePlaylist = (p: PlaylistRecord): z.infer<typeof PlaylistsResponse>["playlists"][number] => ({
  playlist_id: p.playlist_id,
  name: p.name,
  platform: p.platform,
  external_id: p.external_id,
  track_count: p.track_count,
  cover_url: p.cover_url,
  imported_at: new Date(p.imported_at).toISOString(),
});

export type PlaylistRouteDeps = Readonly<{ store: PlaylistStore; jobs: ImportJobs; spotify: SpotifyAuth | null; logger: Logger }>;

export const playlistRoutes = (app: OpenApiApp, deps: PlaylistRouteDeps) =>
  app
    .openapi(listRoute, async (c) => {
      const list = await deps.store.list(c.get("session").player_uuid);
      if (!list.ok) return c.json(STORE_DOWN, 503);
      return c.json({ playlists: list.value.map(toWirePlaylist) }, 200);
    })
    .openapi(availableRoute, async (c) => {
      if (deps.spotify === null) return c.json({ code: "platform_not_connected" as const, message: "Conecte o Spotify antes." }, 403);
      const { accounts } = deps.spotify;
      const token = await accounts.accessToken(c.get("session").player_uuid);
      if (!token.ok && token.error === "platform_not_connected") {
        return c.json({ code: "platform_not_connected" as const, message: "Conecte o Spotify antes." }, 403);
      }
      const available = token.ok ? await accounts.client.available(token.value) : null;
      if (available === null || !available.ok) {
        return c.json({ code: "provider_unavailable" as const, message: "O Spotify está fora do ar. Tente de novo." }, 502);
      }
      return c.json({ playlists: [...available.value] }, 200);
    })
    .openapi(importRoute, async (c) => {
      const started = await deps.jobs.start(c.get("session").player_uuid, c.req.valid("json"));
      if (started.ok) return c.json({ job_id: started.value }, 202);
      switch (started.error) {
        case "invalid_playlist_link":
          return c.json({ code: started.error, message: "Cole o link de uma playlist pública da Deezer ou do YouTube." }, 400);
        case "platform_not_connected":
          return c.json({ code: started.error, message: "Conecte o Spotify antes." }, 403);
        case "rate_limited":
          c.header("Retry-After", String(IMPORT_RETRY_AFTER_SECONDS));
          return c.json({ code: started.error, message: "Espere uma importação terminar." }, 429);
        case "provider_unavailable":
          return c.json({ code: started.error, message: "Essa fonte não está disponível agora." }, 503);
      }
    })
    .openapi(jobRoute, (c) => {
      const job = deps.jobs.get(c.get("session").player_uuid, c.req.valid("param").job_id);
      if (job === null) return c.json({ code: "import_not_found" as const, message: "Importação não encontrada." }, 404);
      const { job_id, status, progress, playlist_id, not_found, error_code } = job;
      return c.json({ job_id, status, progress, playlist_id, not_found, error_code }, 200);
    })
    .openapi(deleteRoute, async (c) => {
      const { player_uuid } = c.get("session");
      const deleted = await deps.store.delete(player_uuid, c.req.valid("param").playlist_id);
      if (!deleted.ok) return c.json(STORE_DOWN, 503);
      if (!deleted.value) return c.json({ code: "playlist_not_found" as const, message: "Playlist não encontrada." }, 404);
      deps.logger.info("playlist_deleted", { player_uuid });
      return c.body(null, 204);
    });
