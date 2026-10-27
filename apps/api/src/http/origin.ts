// S-04: mutação REST só com o header Origin da allowlist (CSRF). O browser sempre o manda em POST e DELETE; sem ele,
// ou com outro, é 403. O WS checa o próprio Origin no handshake (S-02).
import { createMiddleware } from "hono/factory";
import type { Metrics } from "../observability/metrics.ts";
import type { Logger } from "./logger.ts";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export const originGuard = (opts: { allowedOrigins: readonly string[]; logger: Logger; metrics: Metrics }) =>
  createMiddleware(async (c, next) => {
    if (SAFE.has(c.req.method)) return next();
    const origin = c.req.header("origin");
    if (origin === undefined || !opts.allowedOrigins.includes(origin)) {
      // O path, e não o routePath (que aqui é "/*"): nenhuma mutação leva token no caminho.
      opts.metrics.securityEvents.inc({ kind: "origin_not_allowed" });
      opts.logger.warn("rest_csrf_origin_mismatch", { method: c.req.method, path: c.req.path });
      return c.json({ code: "origin_not_allowed" as const, message: "Origem não permitida." }, 403);
    }
    await next();
  });
