// Monta a Playlist Integration a partir da config: Deezer sempre, YouTube com chave, Spotify com app configurado.
import { MAX_IMPORTED_SONGS } from "@merma/schema";
import type { Logger } from "../http/logger.ts";
import { SpotifyAccounts, type SpotifyAuth } from "./accounts.ts";
import { tokenCipher } from "./crypto.ts";
import { DeezerThrottle, deezerClient } from "./deezer.ts";
import type { Fetch } from "./http.ts";
import { ImportJobs } from "./importer.ts";
import { err, ok, type Result } from "./result.ts";
import { spotifyClient } from "./spotify.ts";
import type { AccountStore, PlaylistStore } from "./store.ts";
import { youtubeClient } from "./youtube.ts";

// accounts direto, além do SpotifyAuth: o DELETE /me apaga a conta mesmo numa instância que desligou o Spotify.
export type PlaylistIntegration = Readonly<{ store: PlaylistStore; accounts: AccountStore; jobs: ImportJobs; spotify: SpotifyAuth | null }>;

export const playlistIntegration = async (deps: {
  fetch: Fetch;
  store: PlaylistStore;
  accounts: AccountStore;
  youtubeApiKey: string | null;
  spotify: { clientId: string; redirectUri: string; tokenKey: string } | null;
  logger: Logger;
  now: () => number;
  throttle?: DeezerThrottle;
}): Promise<Result<PlaylistIntegration, "invalid_oauth_token_encryption_key">> => {
  const maxSongs = MAX_IMPORTED_SONGS;
  let spotify: SpotifyAuth | null = null;
  if (deps.spotify !== null) {
    const cipher = await tokenCipher(deps.spotify.tokenKey);
    if (cipher === null) return err("invalid_oauth_token_encryption_key");
    const config = { clientId: deps.spotify.clientId, redirectUri: deps.spotify.redirectUri };
    const client = spotifyClient({ fetch: deps.fetch, config, maxSongs });
    spotify = { config, accounts: new SpotifyAccounts({ client, store: deps.accounts, cipher, now: deps.now }) };
  }
  const jobs = new ImportJobs({
    deezer: deezerClient({ fetch: deps.fetch, throttle: deps.throttle ?? new DeezerThrottle(), maxSongs }),
    youtube: deps.youtubeApiKey === null ? null : youtubeClient({ fetch: deps.fetch, apiKey: deps.youtubeApiKey, maxSongs }),
    spotify: spotify?.accounts ?? null,
    store: deps.store,
    newId: () => crypto.randomUUID(),
    now: deps.now,
    logger: deps.logger,
    maxSongs,
  });
  return ok({ store: deps.store, accounts: deps.accounts, jobs, spotify });
};
