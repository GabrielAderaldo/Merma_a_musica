// Entrada da apps/api: lê a config, sobe o Bun.serve com o app Hono e trata o SIGTERM.
import { websocket } from "@hono/bun";
import pkg from "../package.json" with { type: "json" };
import { loadConfig } from "./config.ts";
import { createApp } from "./http/app.ts";
import { createLogger } from "./http/logger.ts";
import { OpenSockets } from "./http/socket.ts";
import { type ShutdownHook, shutdown } from "./shutdown.ts";

const config = loadConfig(process.env, pkg.version);
if (!config.ok) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", event: "config_invalid", error: config.error }));
  process.exit(1);
}

const logger = createLogger({ level: config.value.logLevel });
const sockets = new OpenSockets();
const hooks: ShutdownHook[] = [];
const app = createApp({ config: config.value, logger, now: Date.now, startedAt: Date.now() });

const server = Bun.serve({
  hostname: config.value.hostname,
  port: config.value.port,
  fetch: app.fetch,
  websocket,
});
logger.info("server_started", { port: server.port, version: config.value.version });

process.once("SIGTERM", () => {
  void shutdown({ hooks, sockets, server, logger, exit: (code) => process.exit(code) });
});
