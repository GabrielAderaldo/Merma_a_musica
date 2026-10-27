import { afterEach, describe, expect, test } from "bun:test";
import { upgradeWebSocket, websocket } from "@hono/bun";
import { CloseCode } from "@merma/schema";
import type { Server } from "bun";
import { closed, connect, testApp } from "../testing.ts";
import { OpenSockets, serverSocket } from "./socket.ts";

let server: Server<unknown> | undefined;
afterEach(async () => {
  await server?.stop(true);
  server = undefined;
});

// Servidor de verdade com o app e os middlewares de produção, mais uma rota de WS que fecha com o código pedido.
const serve = (sockets = new OpenSockets()) => {
  const app = testApp();
  app.get(
    "/ws/test",
    upgradeWebSocket(() => ({
      onOpen: (_event, ws) => sockets.add(serverSocket(ws)),
      onMessage: (event, ws) => {
        const code = Number(event.data) as CloseCode;
        serverSocket(ws).close(code, `fechado com ${code}`);
      },
    })),
  );
  server = Bun.serve({ port: 0, fetch: app.fetch, websocket });
  return { url: server.url, sockets };
};

describe("ADR-0018.R6 — todo close() do servidor leva o código", () => {
  test.each(Object.entries(CloseCode))("%s chega ao cliente como %d, não 1005", async (_name, code) => {
    const { url } = serve();
    const ws = await connect(url, "/ws/test");
    const event = closed(ws);
    ws.send(String(code));
    expect((await event).code).toBe(code);
  });

  test("OpenSockets.closeAll fecha todas as conexões com o código dado", async () => {
    const { url, sockets } = serve();
    const clients = await Promise.all([connect(url, "/ws/test"), connect(url, "/ws/test")]);
    const events = clients.map(closed);
    await Bun.sleep(10); // o onOpen do servidor roda depois do open do cliente
    expect(sockets.size).toBe(2);
    sockets.closeAll(CloseCode.server_shutdown, "server_shutdown");
    expect((await Promise.all(events)).map((e) => e.code)).toEqual([1001, 1001]);
    expect(sockets.size).toBe(0);
  });
});
