// App Hono da apps/api: middlewares na ordem do ADR-0002 e as rotas REST, com o openapi.json gerado delas.
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { HealthResponse } from "@merma/schema";
import { cors } from "hono/cors";
import { requestId, type RequestIdVariables } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { Config } from "../config.ts";
import type { Logger } from "./logger.ts";
import { session, type SessionVariables } from "./session.ts";

export type AppEnv = { Variables: RequestIdVariables & SessionVariables };

export type AppDeps = {
  config: Pick<Config, "sessionSecret" | "allowedOrigins" | "version">;
  logger: Logger;
  now: () => number;
  startedAt: number;
};

const health = createRoute({
  method: "get",
  path: "/health",
  responses: {
    200: { description: "No ar", content: { "application/json": { schema: HealthResponse } } },
  },
});

export const createApp = (deps: AppDeps) => {
  const app = new OpenAPIHono<AppEnv>();

  // ADR-0002: secureHeaders → cors (allowlist) → requestId → session → rateLimit → handler.
  // O rateLimit entra com as primeiras rotas que o S-25 limita (POST /rooms, importação).
  app.use(secureHeaders());
  app.use(cors({ origin: deps.config.allowedOrigins, credentials: true }));
  // O trace_id é sempre do servidor: um X-Request-Id vindo do cliente é ignorado.
  app.use(requestId({ headerName: "" }));
  app.use(session({ secret: deps.config.sessionSecret, now: deps.now }));
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
