// WsGateway: o handshake de /ws/room/{invite_code} e a borda das mensagens. Toda mensagem do cliente passa pelo Zod
// antes de chegar ao RoomActor (ADR-0002.R3, ADR-0014.R2); a identidade vem só da sessão (ADR-0013.R1).
import { upgradeWebSocket } from "@hono/bun";
import type { PlayerUuid } from "@merma/domain";
import { CloseCode, InviteCode, WsClientMessage } from "@merma/schema";
import type { Context, Next } from "hono";
import type { WSContext } from "hono/ws";
import type { Logger } from "../http/logger.ts";
import { type OpenSockets, serverSocket, type ServerSocket } from "../http/socket.ts";
import type { RoomActor } from "./actor.ts";
import { WsRateLimiter } from "./rate-limit.ts";
import type { RoomRegistry } from "./registry.ts";
import { errorMessage } from "./wire.ts";

// S-24: um cliente com bug não cai na 1ª mensagem ruim, só na 3ª.
export const MAX_INVALID_PAYLOADS = 3;

export type GatewayDeps = Readonly<{
  registry: RoomRegistry;
  sockets: OpenSockets;
  logger: Logger;
  allowedOrigins: readonly string[];
  now: () => number;
}>;

type Env = { Variables: { session: { player_uuid: PlayerUuid } } };

const parse = (data: unknown): WsClientMessage | null => {
  if (typeof data !== "string") return null;
  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    return null;
  }
  const message = WsClientMessage.safeParse(json);
  return message.success ? message.data : null;
};

// Uma conexão: o jogador da sessão, a sala e quantos payloads inválidos já mandou.
class Connection {
  readonly #player: PlayerUuid;
  readonly #actor: RoomActor;
  readonly #socket: ServerSocket;
  readonly #limiter: WsRateLimiter;
  #joined = false;
  #invalid = 0;

  constructor(player: PlayerUuid, actor: RoomActor, socket: ServerSocket, limiter: WsRateLimiter) {
    this.#player = player;
    this.#actor = actor;
    this.#socket = socket;
    this.#limiter = limiter;
  }

  get socket(): ServerSocket {
    return this.#socket;
  }

  receive(data: unknown): void {
    const message = parse(data);
    if (message === null) {
      this.#invalid++;
      if (this.#invalid >= MAX_INVALID_PAYLOADS) return this.#socket.close(CloseCode.invalid_payload_repeated, "invalid_payload");
      return this.#socket.send(JSON.stringify(errorMessage("invalid_payload")));
    }
    // S-23: o limite conta por tipo de mensagem, então vem depois do Zod e antes de tudo o mais.
    const verdict = this.#limiter.check(this.#player, this.#actor.roomId, message.type);
    if (verdict === "close") return this.#socket.close(CloseCode.rate_limited_repeated, "rate_limited");
    if (verdict === "rate_limited") return this.#socket.send(JSON.stringify(errorMessage("rate_limited")));
    if (verdict === "dropped") return;
    if (message.type === "ping") return this.#socket.send(JSON.stringify({ type: "pong" }));
    if (message.type === "join_room") {
      if (this.#joined) return this.#socket.send(JSON.stringify(errorMessage("illegal_state_transition")));
      // Otimista: o que vier logo depois do join entra na fila atrás dele. Se a sala recusar (room_full), o
      // actor ignora esse socket e o jogador pode tentar de novo.
      this.#joined = true;
      void this.#actor.join(this.#player, message.nickname, this.#socket).then((joined) => {
        if (!joined) this.#joined = false;
      });
      return;
    }
    // Antes do join_room o jogador não está na sala.
    if (!this.#joined) return this.#socket.send(JSON.stringify(errorMessage("illegal_state_transition")));
    void this.#actor.receive(this.#player, message, this.#socket);
  }

  closed(): void {
    if (this.#joined) void this.#actor.disconnect(this.#player, this.#socket);
  }
}

export const roomSocketHandler = (deps: GatewayDeps) => {
  const limiter = new WsRateLimiter(deps.now);
  return async (c: Context<Env>, next: Next) => {
    const code = InviteCode.safeParse(c.req.param("invite_code"));
    const actor = code.success ? deps.registry.get(code.data) : undefined;
    if (actor === undefined) return c.json({ code: "room_not_found", message: "Sala não encontrada." }, 404);
    const player = c.get("session").player_uuid;
    // S-02: o cookie SameSite=Strict não protege o WS de outro site; o Origin precisa estar na allowlist.
    const origin = c.req.header("origin");
    const originAllowed = origin !== undefined && deps.allowedOrigins.includes(origin);
    let connection: Connection | undefined;
    const handler = upgradeWebSocket(() => ({
      onOpen: (_event, ws: WSContext) => {
        const socket = serverSocket(ws);
        if (!originAllowed) return socket.close(CloseCode.origin_not_allowed, "origin_not_allowed");
        deps.sockets.add(socket);
        connection = new Connection(player, actor, socket, limiter);
      },
      onMessage: (event) => connection?.receive(event.data),
      onClose: () => {
        if (connection === undefined) return;
        deps.sockets.delete(connection.socket);
        connection.closed();
      },
    }));
    return handler(c, next);
  };
};
