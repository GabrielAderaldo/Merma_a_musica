// GET /metrics no formato do Prometheus, com Bearer METRICS_AUTH_TOKEN (ADR-0010). Sem o token configurado, a rota
// não existe (404). Fica antes da sessão: quem coleta não é jogador e não ganha cookie.
import { timingSafeEqual } from "node:crypto";
import type { Metrics } from "../observability/metrics.ts";
import type { OpenApiApp } from "./app.ts";

const sameToken = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const metricsRoute = (app: OpenApiApp, deps: { metrics: Metrics; token: string | null }) => {
  const { token } = deps;
  if (token === null) return;
  app.get("/metrics", (c) => {
    const auth = c.req.header("authorization") ?? "";
    if (!auth.startsWith("Bearer ") || !sameToken(auth.slice("Bearer ".length), token)) {
      return c.json({ code: "unauthenticated" as const, message: "Token inválido." }, 401, { "WWW-Authenticate": "Bearer" });
    }
    return c.body(deps.metrics.render(), 200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8", "Cache-Control": "no-store" });
  });
};
