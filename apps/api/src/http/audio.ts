// Proxy de áudio GET /api/v1/audio/{audio_token} (ADR-0004). As checagens seguem uma ordem fixa: sessão, Range (antes
// de consumir o token, S-13), HMAC e jogador (S-11), prazo (S-14), rodada, uso único (S-12) e MP3 pronto.
import { createRoute, z } from "@hono/zod-openapi";
import { type ErrorCode, ErrorResponse } from "@merma/schema";
import type { AudioTokens } from "../playlist/audio/token.ts";
import type { RoomRegistry } from "../room/registry.ts";
import { errorText } from "../room/wire.ts";
import type { OpenApiApp } from "./app.ts";

const json = <S extends z.ZodType>(schema: S, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

const audioRoute = createRoute({
  method: "get",
  path: "/api/v1/audio/{audio_token}",
  request: { params: z.object({ audio_token: z.string().min(1).max(512) }) },
  responses: {
    200: {
      description: "O preview de 30s da rodada, sem ID3 (S-10). Uso único: a revelação toca o blob já baixado (R-131).",
      content: { "audio/mpeg": { schema: z.string().meta({ format: "binary" }) } },
    },
    401: json(ErrorResponse, "Token malformado, adulterado ou de outro jogador (S-11)"),
    405: json(ErrorResponse, "HEAD não é atendido: só o GET entrega o áudio"),
    410: json(ErrorResponse, "Token expirado (S-14), rodada encerrada ou token já usado (S-12)"),
    416: json(ErrorResponse, "Requisição com Range (S-13)"),
    503: json(ErrorResponse, "O MP3 da rodada ainda não está pronto"),
  },
});

export const audioRoutes = (app: OpenApiApp, deps: { registry: RoomRegistry; tokens: AudioTokens; now: () => number }) =>
  app.openapi(audioRoute, async (c) => {
    const fail = <S extends 401 | 405 | 410 | 416 | 503>(code: ErrorCode, status: S) =>
      c.json({ code, message: errorText(code) }, status, { "Cache-Control": "no-store, private" });
    // O Hono responde HEAD com o handler do GET, que consumiria o token sem entregar o áudio.
    if (c.req.method === "HEAD") return fail("illegal_state_transition", 405);
    // ADR-0004.R2: antes de qualquer coisa que consuma o token.
    if (c.req.header("range") !== undefined || c.req.header("if-range") !== undefined) {
      return fail("partial_request_not_supported", 416);
    }
    const player = c.get("session").player_uuid;
    const claims = deps.tokens.verify(c.req.valid("param").audio_token, player, deps.now());
    if (!claims.ok) return fail(claims.error, claims.error === "expired" ? 410 : 401);
    const actor = deps.registry.byPlayingRound(claims.value.round_id);
    if (actor === undefined) return fail("round_expired", 410);
    const mp3 = await actor.takeAudio(player, claims.value.round_id, c.req.valid("param").audio_token);
    if (!mp3.ok) return fail(mp3.error, mp3.error === "audio_not_ready" ? 503 : 410);
    // Bytes em memória, nunca Bun.file: desde a 1.4.3 o Bun.serve atende Range e If-Range sozinho num arquivo (S-13).
    return c.body(mp3.value, 200, {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(mp3.value.length),
      "Cache-Control": "no-store, private",
    });
  });
