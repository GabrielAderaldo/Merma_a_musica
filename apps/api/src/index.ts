// Entrada da apps/api: lê a config, migra o Postgres, recupera as salas do snapshot, sobe o Bun.serve com o app Hono
// e trata o SIGTERM.
import { websocket } from "@hono/bun";
import { RedisClient } from "bun";
import pkg from "../package.json" with { type: "json" };
import { loadConfig } from "./config.ts";
import { connect, migrateDatabase } from "./db/client.ts";
import { createApp } from "./http/app.ts";
import { createLogger } from "./http/logger.ts";
import { OpenSockets } from "./http/socket.ts";
import { countDeezerRequests, timed } from "./observability/instrument.ts";
import { createMetrics } from "./observability/metrics.ts";
import { noReporter, sentryReporter } from "./observability/sentry.ts";
import { MemoryAccountStore, MemoryPlaylistStore, postgresAccountStore, postgresPlaylistStore } from "./playlist/store.ts";
import { MemoryIsrcCache, redisIsrcCache } from "./playlist/audio/cache.ts";
import { previewResolver } from "./playlist/audio/resolver.ts";
import { AudioTokens } from "./playlist/audio/token.ts";
import { DeezerThrottle, deezerClient } from "./playlist/deezer.ts";
import { playlistIntegration } from "./playlist/system.ts";
import { soloRecords } from "./progression/solo.ts";
import { MemoryProgressionStore, postgresProgressionStore } from "./progression/store.ts";
import { deezerAudio } from "./room/audio.ts";
import { postgresMatchRepository } from "./room/match-store.ts";
import { playlistSongs } from "./room/playlist-songs.ts";
import { recoverRooms } from "./room/recovery.ts";
import { RoomRegistry } from "./room/registry.ts";
import { MemorySnapshotStore, redisSnapshotStore } from "./room/snapshot-store.ts";
import { noMatchStore, systemClock, systemIds } from "./room/system.ts";
import { type ShutdownHook, shutdown } from "./shutdown.ts";

const config = loadConfig(process.env, pkg.version);
if (!config.ok) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", event: "config_invalid", error: config.error }));
  process.exit(1);
}

// Sentry antes de tudo, para pegar erro já na subida (ADR-0010). Sem SENTRY_DSN, nada sai.
const reporter =
  config.value.sentryDsn === null
    ? noReporter
    : sentryReporter({ dsn: config.value.sentryDsn, release: config.value.version, environment: "production" });
const logger = createLogger({ level: config.value.logLevel, onError: reporter.report });
if (config.value.sentryDsn === null) logger.warn("sentry_disabled");
if (config.value.metricsToken === null) logger.warn("metrics_disabled");
const redis = config.value.redisUrl === null ? null : new RedisClient(config.value.redisUrl);
if (redis === null) logger.warn("snapshot_store_in_memory");
const snapshots = redis === null ? new MemorySnapshotStore() : redisSnapshotStore(redis);
const db = config.value.postgresUrl === null ? null : connect(config.value.postgresUrl);
if (db === null) logger.warn("match_store_disabled");
else {
  const migrated = await migrateDatabase(db);
  if (!migrated.ok) {
    logger.error("database_migration_failed");
    process.exit(1);
  }
}
// Sem Postgres (dev), os recordes do solo ficam na memória e somem num restart.
const progression = db === null ? new MemoryProgressionStore() : postgresProgressionStore(db);
// Um throttle da Deezer por processo (ADR-0025.R4), dividido entre a importação e o áudio.
const deezerThrottle = new DeezerThrottle();
// Idem para as playlists e a conta do Spotify.
// O registry e os sockets entram nas métricas antes de existirem: os gauges só os leem na coleta.
let registry: RoomRegistry | undefined;
const sockets = new OpenSockets();
const metrics = createMetrics({
  roomsByPhase: () => registry?.byPhase() ?? { empty: 0, lobby: 0, in_match: 0, finished: 0 },
  wsConnections: () => sockets.size,
  memoryBytes: () => process.memoryUsage().rss,
});
const playlists = await playlistIntegration({
  fetch: countDeezerRequests((url, init) => fetch(url, init), metrics),
  store: db === null ? new MemoryPlaylistStore() : postgresPlaylistStore(db),
  accounts: db === null ? new MemoryAccountStore() : postgresAccountStore(db),
  youtubeApiKey: config.value.youtubeApiKey,
  spotify: config.value.spotify,
  logger,
  now: Date.now,
  throttle: deezerThrottle,
});
if (!playlists.ok) {
  logger.error("config_invalid", { error: playlists.error });
  process.exit(1);
}
if (config.value.youtubeApiKey === null) logger.warn("youtube_import_disabled");
if (config.value.spotify === null) logger.warn("spotify_login_disabled");
// O áudio da rodada (ADR-0025): pool de conexões próprio para a Deezer, separado do resto da API.
const deezerSession = new Bun.FetchSession({ keepAlive: { idleTimeout: 30, maxIdleSockets: 8 } });
const audioTokens = new AudioTokens(config.value.audioSecret);
const resolver = previewResolver({
  deezer: deezerClient({ fetch: countDeezerRequests(deezerSession.fetch, metrics), throttle: deezerThrottle, maxSongs: 0 }),
  cache: redis === null ? new MemoryIsrcCache() : redisIsrcCache(redis),
  fetch: deezerSession.fetch,
});
const previews = { resolve: timed(resolver.resolve, (s) => metrics.deezerResolveDuration.observe(s)) };
const matches = db === null ? noMatchStore : postgresMatchRepository(db);
registry = new RoomRegistry({
  clock: systemClock,
  ids: systemIds,
  logger,
  snapshots,
  songs: playlistSongs(playlists.value.store),
  audio: deezerAudio({ previews, tokens: audioTokens }),
  matches,
  solo: soloRecords(progression),
  metrics,
});
const rooms = registry;
const hooks: ShutdownHook[] = [
  { name: "room_snapshot", run: () => rooms.snapshotAll() },
  { name: "sentry_flush", run: () => reporter.flush() },
];
const app = createApp({ config: config.value, logger, now: Date.now, startedAt: Date.now(), registry: rooms, sockets, progression, playlists: playlists.value, audioTokens, metrics, matches });

// Antes de aceitar conexões (docs/architecture.md#recuperação).
const recovery = await recoverRooms({ store: snapshots, registry: rooms, clock: systemClock, logger, metrics });
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
