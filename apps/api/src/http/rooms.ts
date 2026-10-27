// Rotas REST da sala (docs/specs/rest.md até nascerem aqui) e o WebSocket /ws/room/{invite_code}.
import { createRoute, z } from "@hono/zod-openapi";
import { CreateRoomResponse, ErrorResponse, InviteCode, MAX_PLAYERS, RoomSummaryResponse } from "@merma/schema";
import { roomSocketHandler, type GatewayDeps } from "../room/gateway.ts";
import { rateLimit } from "./rate-limit.ts";
import type { OpenApiApp } from "./app.ts";

// S-25: 10 salas por hora por player_uuid.
export const CREATE_ROOM_LIMIT = { limit: 10, windowMs: 60 * 60_000 };

const json = <S extends z.ZodType>(schema: S, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

const createRoomRoute = createRoute({
  method: "post",
  path: "/api/v1/rooms",
  responses: {
    201: json(CreateRoomResponse, "Sala criada; quem criou é o host (R-004)"),
    429: json(ErrorResponse, "Mais de 10 salas na última hora (S-25), com Retry-After"),
    503: json(ErrorResponse, "Não foi possível gerar um invite_code livre"),
  },
});

const roomSummaryRoute = createRoute({
  method: "get",
  path: "/api/v1/rooms/{invite_code}",
  request: { params: z.object({ invite_code: InviteCode }) },
  responses: {
    200: json(RoomSummaryResponse, "Resumo da sala"),
    400: json(ErrorResponse, "invite_code fora do formato"),
    404: json(ErrorResponse, "Sala não existe ou já terminou"),
  },
});

export const roomRoutes = (app: OpenApiApp, deps: GatewayDeps & { now: () => number }) => {
  // ADR-0002: session → rateLimit → handler.
  app.post(createRoomRoute.path, rateLimit({ ...CREATE_ROOM_LIMIT, now: deps.now }));
  app.get("/ws/room/:invite_code", roomSocketHandler(deps));
  return app
    .openapi(createRoomRoute, (c) => {
      const actor = deps.registry.create();
      if (actor === null) return c.json({ code: "internal_error" as const, message: "Tente de novo." }, 503);
      deps.logger.info("room_created", { invite_code: actor.inviteCode });
      return c.json(
        { room_id: actor.roomId, invite_code: actor.inviteCode, host_player_uuid: c.get("session").player_uuid },
        201,
      );
    })
    .openapi(roomSummaryRoute, (c) => {
      const actor = deps.registry.get(c.req.valid("param").invite_code);
      if (actor === undefined) return c.json({ code: "room_not_found" as const, message: "Sala não encontrada." }, 404);
      return c.json({ ...actor.summary(), max_players: MAX_PLAYERS } as const, 200);
    });
};
