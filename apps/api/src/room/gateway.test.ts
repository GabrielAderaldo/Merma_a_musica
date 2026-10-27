import { afterEach, describe, expect, test } from "bun:test";
import { websocket } from "@hono/bun";
import { CloseCode, WsServerMessage } from "@merma/schema";
import type { Server } from "bun";
import { OpenSockets } from "../http/socket.ts";
import { closed, connect, sessionCookie, testApp } from "../testing.ts";
import { MAX_INVALID_PAYLOADS } from "./gateway.ts";
import { WS_RATE_LIMITS, WS_RATE_WINDOW_MS } from "./rate-limit.ts";
import { RoomRegistry } from "./registry.ts";
import { actorDeps } from "./testing.ts";

const FORGED = "11111111-1111-4111-8111-111111111111";

let server: Server<unknown> | undefined;
afterEach(async () => {
  await server?.stop(true);
  server = undefined;
});

// Servidor de verdade, com os middlewares de produção e uma sala criada.
const serve = (now?: () => number) => {
  const setup = actorDeps();
  const registry = new RoomRegistry(setup.deps);
  const sockets = new OpenSockets();
  const app = testApp({ registry, sockets, ...(now === undefined ? {} : { now }) });
  app.get("/whoami", (c) => c.json(c.get("session")));
  server = Bun.serve({ port: 0, fetch: app.fetch, websocket });
  const actor = registry.create() ?? expect.unreachable("sala");
  return { url: server.url, actor, sockets, path: `/ws/room/${actor.inviteCode}` };
};

// Mensagens do servidor, validadas pelo contrato do fio (ADR-0014.R2).
const inbox = (ws: WebSocket) => {
  const messages: WsServerMessage[] = [];
  let waiting: (() => void) | null = null;
  ws.onmessage = (event) => {
    messages.push(WsServerMessage.parse(JSON.parse(String(event.data))));
    waiting?.();
  };
  const next = async (): Promise<WsServerMessage> => {
    while (messages.length === 0) await new Promise<void>((resolve) => (waiting = resolve));
    return messages.shift() ?? expect.unreachable("mensagem");
  };
  return { next };
};

const send = (ws: WebSocket, message: unknown) => ws.send(typeof message === "string" ? message : JSON.stringify(message));

describe("WsGateway", () => {
  test("join_room entra na sala com o player_uuid da sessão e recebe room_state", async () => {
    const { url, path, actor } = serve();
    const ws = await connect(url, path);
    const box = inbox(ws);
    send(ws, { type: "join_room", nickname: "Camila" });
    const state = await box.next();
    expect(state).toMatchObject({ type: "room_state", phase: "lobby", invite_code: actor.inviteCode });
    expect(actor.state.players.map((p) => p.nickname)).toEqual(["Camila"]);
    ws.close();
  });

  test("ping antes do join responde pong; outra mensagem antes do join é illegal_state_transition", async () => {
    const { url, path, actor } = serve();
    const ws = await connect(url, path);
    const box = inbox(ws);
    send(ws, { type: "ping" });
    expect(await box.next()).toEqual({ type: "pong" });
    send(ws, { type: "player_ready" });
    expect(await box.next()).toMatchObject({ type: "error", code: "illegal_state_transition" });
    expect(actor.state.players).toEqual([]);
    ws.close();
  });

  test("sala inexistente responde 404 antes do upgrade", async () => {
    const { url } = serve();
    const res = await fetch(new URL("/ws/room/ZZZ999", url), { headers: { upgrade: "websocket", cookie: sessionCookie(await fetch(new URL("/health", url))) ?? "" } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ code: "room_not_found", message: expect.any(String) });
  });

  test("S-02: Origin fora da allowlist fecha com 1008", async () => {
    const { url, path } = serve();
    const ws = await connect(url, path, { origin: "https://evil.test" });
    expect((await closed(ws)).code).toBe(CloseCode.origin_not_allowed);
  });
});

describe("ADR-0002.R3 / ADR-0014.R2 — toda mensagem do cliente passa pelo Zod antes do handler (S-24)", () => {
  test.each([
    ["JSON quebrado", "{"],
    ["type desconhecido", { type: "kick_player" }],
    ["campo a mais", { type: "join_room", nickname: "Zé", player_uuid: FORGED }],
    ["campo errado", { type: "join_room", nickname: 7 }],
  ])("%s → error invalid_payload, sem chegar ao RoomActor", async (_name, payload) => {
    const { url, path, actor } = serve();
    const ws = await connect(url, path);
    const box = inbox(ws);
    send(ws, payload);
    expect(await box.next()).toEqual({ type: "error", code: "invalid_payload", message: expect.any(String) });
    expect(actor.state.players).toEqual([]);
    ws.close();
  });

  test(`${MAX_INVALID_PAYLOADS} payloads inválidos fecham com 1003`, async () => {
    const { url, path } = serve();
    const ws = await connect(url, path);
    const box = inbox(ws);
    const event = closed(ws);
    send(ws, "{");
    send(ws, "{");
    expect((await box.next()).type).toBe("error");
    expect((await box.next()).type).toBe("error");
    send(ws, "{");
    expect((await event).code).toBe(CloseCode.invalid_payload_repeated);
  });
});

describe("S-23 — rate limit do WS", () => {
  test("estourar o limite responde rate_limited uma vez por janela; a 3ª violação fecha com 4029", async () => {
    let now = 1_000_000;
    const { url, path } = serve(() => now);
    const ws = await connect(url, path);
    const box = inbox(ws);
    const event = closed(ws);
    const flood = () => {
      for (let i = 0; i < WS_RATE_LIMITS.other + 5; i++) send(ws, { type: "ping" });
    };
    const drain = async () => {
      const got: string[] = [];
      for (let i = 0; i < WS_RATE_LIMITS.other + 1; i++) {
        const m = await box.next();
        got.push(m.type === "error" ? m.code : m.type);
      }
      return got;
    };
    flood();
    // Os 5 pings além do limite viram um único erro; os 4 restantes caem em silêncio.
    expect(await drain()).toEqual([...Array<string>(WS_RATE_LIMITS.other).fill("pong"), "rate_limited"]);
    now += WS_RATE_WINDOW_MS;
    flood();
    expect((await drain()).at(-1)).toBe("rate_limited");
    now += WS_RATE_WINDOW_MS;
    flood();
    expect((await event).code).toBe(CloseCode.rate_limited_repeated);
  });
});

describe("ADR-0013.R1 — no WS, o player_uuid vem só da sessão (S-01)", () => {
  test("?player_uuid= forjado no handshake é ignorado", async () => {
    const { url, path, actor } = serve();
    const cookie = sessionCookie(await fetch(new URL("/health", url))) ?? "";
    const own = (await (await fetch(new URL("/whoami", url), { headers: { cookie } })).json()) as { player_uuid: string };
    const ws = await connect(url, `${path}?player_uuid=${FORGED}`, { cookie });
    const box = inbox(ws);
    send(ws, { type: "join_room", nickname: "Zé" });
    await box.next();
    expect(actor.state.players.map((p): string => p.player_uuid)).toEqual([own.player_uuid]);
    expect(own.player_uuid).not.toBe(FORGED);
    ws.close();
  });
});

describe("ADR-0017.R8 — os sockets da sala entram no OpenSockets do desligamento", () => {
  test("closeAll fecha a conexão da sala com 1001", async () => {
    const { url, path, sockets } = serve();
    const ws = await connect(url, path);
    const event = closed(ws);
    await Bun.sleep(10); // o onOpen do servidor roda depois do open do cliente
    expect(sockets.size).toBe(1);
    sockets.closeAll(CloseCode.server_shutdown, "server_shutdown");
    expect((await event).code).toBe(1001);
  });
});
