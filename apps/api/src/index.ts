// Entrada da apps/api: lê a config, recupera as salas do snapshot, sobe o Bun.serve com o app Hono e trata o SIGTERM.
import { websocket } from "@hono/bun";
import { RedisClient } from "bun";
import pkg from "../package.json" with { type: "json" };
import { loadConfig } from "./config.ts";
import { createApp } from "./http/app.ts";
import { createLogger } from "./http/logger.ts";
import { OpenSockets } from "./http/socket.ts";
import { recoverRooms } from "./room/recovery.ts";
import { RoomRegistry } from "./room/registry.ts";
import { MemorySnapshotStore, redisSnapshotStore } from "./room/snapshot-store.ts";
import { noAudio, noMatchStore, noPlaylists, systemClock, systemIds } from "./room/system.ts";
import { type ShutdownHook, shutdown } from "./shutdown.ts";

const config = loadConfig(process.env, pkg.version);
if (!config.ok) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", event: "config_invalid", error: config.error }));
  process.exit(1);
}

const logger = createLogger({ level: config.value.logLevel });
const redis = config.value.redisUrl === null ? null : new RedisClient(config.value.redisUrl);
if (redis === null) logger.warn("snapshot_store_in_memory");
const snapshots = redis === null ? new MemorySnapshotStore() : redisSnapshotStore(redis);
const sockets = new OpenSockets();
const registry = new RoomRegistry({
  clock: systemClock,
  ids: systemIds,
  logger,
  snapshots,
  songs: noPlaylists,
  audio: noAudio,
  matches: noMatchStore,
});
const hooks: ShutdownHook[] = [{ name: "room_snapshot", run: () => registry.snapshotAll() }];
const app = createApp({ config: config.value, logger, now: Date.now, startedAt: Date.now(), registry, sockets });

// Antes de aceitar conexões (docs/architecture.md#recuperação).
const recovery = await recoverRooms({ store: snapshots, registry, clock: systemClock, logger });
logger.info("recovery_completed", recovery);

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
