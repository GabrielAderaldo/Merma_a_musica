// Stub da apps/api para a PoC do ADR-0017: exercita Postgres, Redis, WebSocket e a flag do S-27 na imagem distroless.
// MERMA_POC_BREAK=1 faz o /api/health falhar, para testar o rollback do `podman auto-update`.
import { RedisClient, SQL } from "bun";

const secret = async (name: string): Promise<string> =>
  encodeURIComponent((await Bun.file(`/run/secrets/${name}`).text()).trim());

const sql = new SQL(`postgres://merma:${await secret("pg_password")}@127.0.0.1:5432/merma`);
const redis = new RedisClient(`redis://:${await secret("redis_password")}@127.0.0.1:6379`);
const broken = process.env["MERMA_POC_BREAK"] === "1";

let codegenBlocked = false;
try {
  new Function("return 1");
} catch {
  codegenBlocked = true;
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 3000,
  async fetch(req, server) {
    const { pathname } = new URL(req.url);
    if (pathname === "/ws/echo") {
      return server.upgrade(req) ? undefined : new Response("upgrade falhou", { status: 400 });
    }
    if (pathname === "/api/health") {
      if (broken) return Response.json({ ok: false, reason: "MERMA_POC_BREAK" }, { status: 500 });
      const [row] = await sql`select version() as pg`;
      const pong = await redis.send("PING", []);
      return Response.json({ ok: true, bun: Bun.version, pg: row?.pg, redis: pong, codegenBlocked });
    }
    return new Response("not found", { status: 404 });
  },
  websocket: {
    message(ws, message) {
      ws.send(message);
    },
  },
});

// Como PID 1 do container, um processo sem handler ignora o SIGTERM, e o podman só derruba com SIGKILL 10s depois.
// Na apps/api real, este é o ponto de gravar o snapshot das salas antes de sair (ADR-0009).
process.on("SIGTERM", async () => {
  await server.stop();
  redis.close();
  await sql.close();
  process.exit(0);
});
