// Corpos das rotas REST (ADR-0014). Entram aqui junto com a rota da apps/api, que gera o openapi.json.
import { z } from "zod";

export const HealthResponse = z.object({
  status: z.enum(["ok", "unavailable"]), // unavailable vem com 503

  uptime_seconds: z.number().int().nonnegative(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
