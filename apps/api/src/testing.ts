// Fixtures dos testes da apps/api.
import { createApp } from "./http/app.ts";
import { createLogger, type Logger } from "./http/logger.ts";
import { OpenSockets } from "./http/socket.ts";
import type { ProgressionStore } from "./progression/solo.ts";
import { soloRecords } from "./progression/solo.ts";
import { MemoryProgressionStore } from "./progression/store.ts";
import { RoomRegistry } from "./room/registry.ts";
import { MemorySnapshotStore } from "./room/snapshot-store.ts";
import { noAudio, noMatchStore, noPlaylists, systemClock, systemIds } from "./room/system.ts";

export const SECRET = "test-secret-with-at-least-32-characters!";
export const ORIGIN = "https://merma.test";

export type Captured = { logger: Logger; lines: Record<string, unknown>[] };

export const captureLogs = (): Captured => {
  const lines: Record<string, unknown>[] = [];
  return { lines, logger: createLogger({ level: "debug", write: (line) => lines.push(JSON.parse(line)) }) };
};

export const testApp = (
  opts: { now?: () => number; logger?: Logger; registry?: RoomRegistry; sockets?: OpenSockets; progression?: ProgressionStore } = {},
) => {
  const logger = opts.logger ?? captureLogs().logger;
  const progression = opts.progression ?? new MemoryProgressionStore();
  const registry =
    opts.registry ??
    new RoomRegistry({
      clock: systemClock,
      ids: systemIds,
      logger,
      snapshots: new MemorySnapshotStore(),
      songs: noPlaylists,
      audio: noAudio,
      matches: noMatchStore,
      solo: soloRecords(progression),
    });
  return createApp({
    config: { sessionSecret: SECRET, allowedOrigins: [ORIGIN], version: "0.0.0-test" },
    logger,
    now: opts.now ?? (() => 1_000_000),
    startedAt: 0,
    registry,
    sockets: opts.sockets ?? new OpenSockets(),
    progression,
  });
};

// Valor do Set-Cookie da sessão, pronto para voltar num header Cookie.
export const sessionCookie = (res: Response): string | undefined =>
  res.headers
    .getSetCookie()
    .find((c) => c.startsWith("__Host-session="))
    ?.split(";")[0];

// Abre um WS com a sessão emitida por uma requisição REST, como o cliente faz.
export const connect = async (base: URL, path: string, opts: { cookie?: string; origin?: string } = {}): Promise<WebSocket> => {
  const cookie = opts.cookie ?? sessionCookie(await fetch(new URL("/health", base))) ?? "";
  const url = new URL(path, base);
  url.protocol = "ws:";
  const ws = new WebSocket(url, { headers: { cookie, origin: opts.origin ?? ORIGIN } });
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  return ws;
};

export const closed = (ws: WebSocket) => new Promise<CloseEvent>((resolve) => (ws.onclose = resolve));
