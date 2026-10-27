// Rate limit REST por player_uuid, em janela fixa e em memória (um processo, ADR-0002). S-25.
import { createMiddleware } from "hono/factory";
import type { Metrics } from "../observability/metrics.ts";
import type { SessionVariables } from "./session.ts";

export const rateLimit = (opts: { limit: number; windowMs: number; now: () => number; metrics: Metrics }) => {
  const windows = new Map<string, { start: number; count: number }>();
  return createMiddleware<{ Variables: SessionVariables }>(async (c, next) => {
    const now = opts.now();
    const player = c.get("session").player_uuid;
    // Janelas vencidas saem a cada passagem, para o Map não crescer sem limite.
    for (const [key, w] of windows) if (now - w.start >= opts.windowMs) windows.delete(key);
    const window = windows.get(player) ?? { start: now, count: 0 };
    if (window.count >= opts.limit) {
      opts.metrics.securityEvents.inc({ kind: "rest_rate_limited" });
      c.header("Retry-After", String(Math.ceil((window.start + opts.windowMs - now) / 1000)));
      return c.json({ code: "rate_limited" as const, message: "Muitas requisições. Tente mais tarde." }, 429);
    }
    windows.set(player, { start: window.start, count: window.count + 1 });
    await next();
  });
};
