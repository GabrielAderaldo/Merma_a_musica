// App Hono da apps/api: middlewares na ordem do ADR-0002 e as rotas REST, com o openapi.json gerado delas.
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { HealthResponse } from "@merma/schema";
import { cors } from "hono/cors";
import { requestId, type RequestIdVariables } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { Config } from "../config.ts";
import type { ProgressionStore } from "../progression/solo.ts";
import type { RoomRegistry } from "../room/registry.ts";
import { authRoutes } from "./auth.ts";
import type { Logger } from "./logger.ts";
import { originGuard } from "./origin.ts";
import { playlistRoutes, type PlaylistRouteDeps } from "./playlists.ts";
import { roomRoutes } from "./rooms.ts";
import { session, type SessionVariables } from "./session.ts";
import { soloRoutes } from "./solo.ts";
import type { OpenSockets } from "./socket.ts";

export type AppEnv = { Variables: RequestIdVariables & SessionVariables };
export type OpenApiApp = OpenAPIHono<AppEnv>;

export type AppDeps = {
  config: Pick<Config, "sessionSecret" | "allowedOrigins" | "version">;
  logger: Logger;
  now: () => number;
  startedAt: number;
  registry: RoomRegistry;
  sockets: OpenSockets;
  progression: ProgressionStore;
  playlists: Omit<PlaylistRouteDeps, "logger">;
};

const health = createRoute({
  method: "get",
  path: "/health",
  responses: {
    200: { description: "No ar", content: { "application/json": { schema: HealthResponse } } },
  },
});

export const createApp = (deps: AppDeps) => {
  // Entrada fora do schema vira o ErrorResponse do contrato, não o corpo padrão do zod-openapi (ADR-0002.R3).
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) return c.json({ code: "invalid_payload" as const, message: "Requisição inválida." }, 400);
    },
  });

  // ADR-0002: secureHeaders → cors (allowlist) → requestId → session → rateLimit → handler, com o Origin das
  // mutações (S-04) checado antes do rateLimit. O rateLimit fica nas rotas que o S-25 limita (POST /rooms, importação).
  app.use(secureHeaders());
  app.use(cors({ origin: deps.config.allowedOrigins, credentials: true }));
  // O trace_id é sempre do servidor: um X-Request-Id vindo do cliente é ignorado.
  app.use(requestId({ headerName: "" }));
  app.use(session({ secret: deps.config.sessionSecret, now: deps.now }));
  app.use(originGuard({ allowedOrigins: deps.config.allowedOrigins, logger: deps.logger }));
  app.use(async (c, next) => {
    const start = deps.now();
    await next();
    // routePath, e não o path: o path do proxy de áudio carrega o audio_token (ADR-0010.R1).
    deps.logger.info("http_request", {
      trace_id: c.get("requestId"),
      player_uuid: c.get("session").player_uuid,
      method: c.req.method,
      route: c.req.routePath,
      status: c.res.status,
      duration_ms: deps.now() - start,
    });
  });

  app.onError((error, c) => {
    deps.logger.error("unhandled_error", { trace_id: c.get("requestId"), route: c.req.routePath, error });
    return c.json({ code: "internal_error", message: "erro interno" }, 500);
  });

  roomRoutes(app, {
    registry: deps.registry,
    sockets: deps.sockets,
    logger: deps.logger,
    allowedOrigins: deps.config.allowedOrigins,
    now: deps.now,
  });
  soloRoutes(app, { progression: deps.progression });
  authRoutes(app, { spotify: deps.playlists.spotify, secret: deps.config.sessionSecret, now: deps.now, logger: deps.logger });
  playlistRoutes(app, { ...deps.playlists, logger: deps.logger });

  // Postgres e Redis entram no corpo (503 se fora) quando os adapters existirem.
  return app.openapi(health, (c) =>
    c.json(
      {
        status: "ok" as const,
        uptime_seconds: Math.floor((deps.now() - deps.startedAt) / 1000),
        version: deps.config.version,
      },
      200,
    ),
  );
};

export type App = ReturnType<typeof createApp>;
