// Fixtures dos testes da apps/api.
import { createApp } from "./http/app.ts";
import { createLogger, type Logger } from "./http/logger.ts";
import { OpenSockets } from "./http/socket.ts";
import type { ProgressionStore } from "./progression/solo.ts";
import { soloRecords } from "./progression/solo.ts";
import { MemoryProgressionStore } from "./progression/store.ts";
import { RoomRegistry } from "./room/registry.ts";
import { MemorySnapshotStore } from "./room/snapshot-store.ts";
import { AudioTokens } from "./playlist/audio/token.ts";
import { noAudio, noMatchStore, systemClock, systemIds } from "./room/system.ts";
import type { SpotifyAuth } from "./playlist/accounts.ts";
import { DeezerThrottle, deezerClient } from "./playlist/deezer.ts";
import type { Fetch } from "./playlist/http.ts";
import { ImportJobs } from "./playlist/importer.ts";
import { MemoryPlaylistStore, type PlaylistStore } from "./playlist/store.ts";
import type { PlaylistIntegration } from "./playlist/system.ts";
import { youtubeClient } from "./playlist/youtube.ts";
import { playlistSongs } from "./room/playlist-songs.ts";

export const SECRET = "test-secret-with-at-least-32-characters!";
export const AUDIO_SECRET = "audio-secret-with-at-least-32-characters";
export const ORIGIN = "https://merma.test";

export type Captured = { logger: Logger; lines: Record<string, unknown>[] };

export const captureLogs = (): Captured => {
  const lines: Record<string, unknown>[] = [];
  return { lines, logger: createLogger({ level: "debug", write: (line) => lines.push(JSON.parse(line)) }) };
};

// Resposta com outro status no fakeFetch (o padrão é 200).
export const withStatus = (status: number, body: unknown = {}) => ({ withStatus: status, body });

// Fetch que só conhece as URLs dadas (por prefixo); o resto é 503. Nenhum teste sai para a rede.
export const fakeFetch = (routes: Record<string, unknown>, calls: string[] = []): Fetch => async (url) => {
  calls.push(url);
  // O prefixo mais longo vence, para /playlist/1/tracks não cair em /playlist/1.
  const key = Object.keys(routes)
    .toSorted((a, b) => b.length - a.length)
    .find((prefix) => url.startsWith(prefix));
  const route = key === undefined ? withStatus(503) : routes[key];
  const { status, body } =
    typeof route === "object" && route !== null && "withStatus" in route && typeof route.withStatus === "number"
      ? { status: route.withStatus, body: "body" in route ? route.body : {} }
      : { status: 200, body: route };
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
};

// Playlist Integration dos testes: Deezer (e YouTube, com chave) sobre o fakeFetch, sem esperar o throttle.
export const testPlaylists = (
  opts: { fetch?: Fetch; store?: PlaylistStore; youtube?: boolean; spotify?: SpotifyAuth | null; logger?: Logger; now?: () => number } = {},
): PlaylistIntegration => {
  const fetch = opts.fetch ?? fakeFetch({});
  const store = opts.store ?? new MemoryPlaylistStore();
  const spotify = opts.spotify ?? null;
  const jobs = new ImportJobs({
    deezer: deezerClient({ fetch, throttle: new DeezerThrottle({ limit: 1_000_000 }), maxSongs: 500 }),
    youtube: opts.youtube === true ? youtubeClient({ fetch, apiKey: "test-key", maxSongs: 500 }) : null,
    spotify: spotify?.accounts ?? null,
    store,
    newId: () => crypto.randomUUID(),
    now: opts.now ?? (() => 1_000_000),
    logger: opts.logger ?? captureLogs().logger,
    maxSongs: 500,
  });
  return { store, jobs, spotify };
};

export const testApp = (
  opts: {
    now?: () => number;
    logger?: Logger;
    registry?: RoomRegistry;
    sockets?: OpenSockets;
    progression?: ProgressionStore;
    playlists?: PlaylistIntegration;
    audioTokens?: AudioTokens;
  } = {},
) => {
  const logger = opts.logger ?? captureLogs().logger;
  const progression = opts.progression ?? new MemoryProgressionStore();
  const playlists = opts.playlists ?? testPlaylists({ logger });
  const registry =
    opts.registry ??
    new RoomRegistry({
      clock: systemClock,
      ids: systemIds,
      logger,
      snapshots: new MemorySnapshotStore(),
      songs: playlistSongs(playlists.store),
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
    playlists,
    audioTokens: opts.audioTokens ?? new AudioTokens(AUDIO_SECRET),
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
