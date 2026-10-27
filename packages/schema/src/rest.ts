// Corpos das rotas REST (ADR-0014). Entram aqui junto com a rota da apps/api, que gera o openapi.json.
import { z } from "zod";
import { ErrorCode, InviteCode, MAX_PLAYERS, Phase, PlayerUuid, RoomId } from "./common.ts";

export const HealthResponse = z.object({
  status: z.enum(["ok", "unavailable"]), // unavailable vem com 503

  uptime_seconds: z.number().int().nonnegative(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;

// Todo erro REST. 429 vem com Retry-After.
export const ErrorResponse = z.object({ code: ErrorCode, message: z.string().meta({ description: "pt-BR" }) });

// POST /api/v1/rooms (R-004): o criador é o host. 429 depois de 10 salas por hora (S-25).
export const CreateRoomResponse = z.object({
  room_id: RoomId,
  invite_code: InviteCode,
  host_player_uuid: PlayerUuid,
});

// GET /api/v1/rooms/{invite_code}: o que a tela "Entrar em sala" mostra antes de abrir o WS.
export const RoomSummaryResponse = z.object({
  invite_code: InviteCode,
  phase: Phase,
  player_count: z.int().nonnegative().max(MAX_PLAYERS),
  max_players: z.literal(MAX_PLAYERS),
});
