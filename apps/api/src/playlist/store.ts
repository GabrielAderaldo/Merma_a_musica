// Playlists do jogador e conta do Spotify: Postgres em produção (ADR-0006) e memória nos testes e em dev sem
// POSTGRES_URL. Os dois adapters passam pelo mesmo teste de contrato (store.test.ts).
import type { Platform } from "@merma/schema";
import { and, asc, count, eq } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import { connectedAccounts, playlistSongs, playlists } from "../db/schema.ts";
import { err, ok, type Result } from "./result.ts";
import type { StoredSong } from "./types.ts";

export type StoreError = "store_unavailable";

export type PlaylistRecord = Readonly<{
  playlist_id: string;
  platform: Platform;
  external_id: string | null;
  name: string;
  cover_url: string | null;
  track_count: number;
  imported_at: number;
}>;

export type NewPlaylist = Readonly<{
  player_uuid: string;
  platform: Platform;
  external_id: string | null;
  name: string;
  cover_url: string | null;
  songs: readonly StoredSong[];
  imported_at: number;
}>;

export type PlaylistStore = Readonly<{
  // Mesma origem e external_id do mesmo jogador: troca as músicas e mantém o playlist_id (e os recordes).
  save(playlist: NewPlaylist, newId: () => string): Promise<Result<PlaylistRecord, StoreError>>;
  list(player: string): Promise<Result<readonly PlaylistRecord[], StoreError>>;
  // null: não existe ou é de outro jogador.
  songs(player: string, playlist_id: string): Promise<Result<{ platform: Platform; songs: readonly StoredSong[] } | null, StoreError>>;
  delete(player: string, playlist_id: string): Promise<Result<boolean, StoreError>>;
}>;

// O refresh token chega aqui já cifrado (ADR-0006.R3): o store nunca vê o texto puro.
export type AccountRecord = Readonly<{
  platform: "spotify";
  external_user_id: string;
  refresh_token_encrypted: string;
  connected_at: number;
}>;

export type AccountStore = Readonly<{
  save(player: string, account: AccountRecord): Promise<Result<void, StoreError>>;
  get(player: string, platform: "spotify"): Promise<Result<AccountRecord | null, StoreError>>;
  list(player: string): Promise<Result<readonly AccountRecord[], StoreError>>;
  delete(player: string, platform: "spotify"): Promise<Result<void, StoreError>>;
}>;

type MemoryPlaylist = PlaylistRecord & { player_uuid: string; songs: readonly StoredSong[] };
const record = (p: MemoryPlaylist): PlaylistRecord => ({
  playlist_id: p.playlist_id,
  platform: p.platform,
  external_id: p.external_id,
  name: p.name,
  cover_url: p.cover_url,
  track_count: p.track_count,
  imported_at: p.imported_at,
});

export class MemoryPlaylistStore implements PlaylistStore {
  readonly #playlists = new Map<string, MemoryPlaylist>();

  save = async (p: NewPlaylist, newId: () => string) => {
    const same = [...this.#playlists.values()].find(
      (x) => p.external_id !== null && x.player_uuid === p.player_uuid && x.platform === p.platform && x.external_id === p.external_id,
    );
    const stored: MemoryPlaylist = {
      playlist_id: same?.playlist_id ?? newId(),
      player_uuid: p.player_uuid,
      platform: p.platform,
      external_id: p.external_id,
      name: p.name,
      cover_url: p.cover_url,
      track_count: p.songs.length,
      imported_at: p.imported_at,
      songs: p.songs,
    };
    this.#playlists.set(stored.playlist_id, stored);
    return ok(record(stored));
  };

  list = async (player: string) =>
    ok(
      [...this.#playlists.values()]
        .filter((p) => p.player_uuid === player)
        .toSorted((a, b) => b.imported_at - a.imported_at)
        .map(record),
    );

  songs = async (player: string, playlist_id: string) => {
    const p = this.#playlists.get(playlist_id);
    return ok(p === undefined || p.player_uuid !== player ? null : { platform: p.platform, songs: p.songs });
  };

  delete = async (player: string, playlist_id: string) => {
    const p = this.#playlists.get(playlist_id);
    if (p === undefined || p.player_uuid !== player) return ok(false);
    this.#playlists.delete(playlist_id);
    return ok(true);
  };
}

export class MemoryAccountStore implements AccountStore {
  readonly #accounts = new Map<string, AccountRecord>();

  save = async (player: string, account: AccountRecord) => {
    this.#accounts.set(`${player}/${account.platform}`, account);
    return ok(undefined);
  };
  get = async (player: string, platform: "spotify") => ok(this.#accounts.get(`${player}/${platform}`) ?? null);
  list = async (player: string) =>
    ok([...this.#accounts].filter(([key]) => key.startsWith(`${player}/`)).map(([, account]) => account));
  delete = async (player: string, platform: "spotify") => {
    this.#accounts.delete(`${player}/${platform}`);
    return ok(undefined);
  };
}

// O driver lança em falha de rede ou de constraint; aqui vira Result (regra da apps/api).
const attempt = async <T>(run: () => Promise<T>): Promise<Result<T, StoreError>> => {
  try {
    return ok(await run());
  } catch {
    return err("store_unavailable");
  }
};

export const postgresPlaylistStore = (db: Database): PlaylistStore => {
  const withCount = (player: string) =>
    db
      .select({
        playlist_id: playlists.playlist_id,
        platform: playlists.platform,
        external_id: playlists.external_id,
        name: playlists.name,
        cover_url: playlists.cover_url,
        imported_at: playlists.imported_at,
        track_count: count(playlistSongs.position),
      })
      .from(playlists)
      .leftJoin(playlistSongs, eq(playlistSongs.playlist_id, playlists.playlist_id))
      .where(eq(playlists.player_uuid, player))
      .groupBy(playlists.playlist_id);
  type Row = Awaited<ReturnType<typeof withCount>>[number];
  const toRecord = (r: Row): PlaylistRecord => ({ ...r, imported_at: r.imported_at.getTime() });

  return {
    save: (p, newId) =>
      attempt(() =>
        db.transaction(async (tx) => {
          // A lista colada (external_id null) é sempre nova.
          const [existing] =
            p.external_id === null
              ? []
              : await tx
                  .select({ id: playlists.playlist_id })
                  .from(playlists)
                  .where(and(eq(playlists.player_uuid, p.player_uuid), eq(playlists.platform, p.platform), eq(playlists.external_id, p.external_id)))
                  .for("update");
          const playlist_id = existing?.id ?? newId();
          const row = { name: p.name, cover_url: p.cover_url, imported_at: new Date(p.imported_at) };
          if (existing === undefined) {
            await tx.insert(playlists).values({ playlist_id, player_uuid: p.player_uuid, platform: p.platform, external_id: p.external_id, ...row });
          } else {
            await tx.update(playlists).set(row).where(eq(playlists.playlist_id, playlist_id));
            await tx.delete(playlistSongs).where(eq(playlistSongs.playlist_id, playlist_id));
          }
          if (p.songs.length > 0) {
            await tx.insert(playlistSongs).values(p.songs.map((s, position) => ({ playlist_id, position, ...s })));
          }
          return {
            playlist_id,
            platform: p.platform,
            external_id: p.external_id,
            name: p.name,
            cover_url: p.cover_url,
            track_count: p.songs.length,
            imported_at: p.imported_at,
          };
        }),
      ),
    list: (player) =>
      attempt(async () => (await withCount(player)).map(toRecord).toSorted((a, b) => b.imported_at - a.imported_at)),
    songs: (player, playlist_id) =>
      attempt(async () => {
        const [owner] = await db
          .select({ platform: playlists.platform })
          .from(playlists)
          .where(and(eq(playlists.playlist_id, playlist_id), eq(playlists.player_uuid, player)));
        if (owner === undefined) return null;
        const rows = await db
          .select()
          .from(playlistSongs)
          .where(eq(playlistSongs.playlist_id, playlist_id))
          .orderBy(asc(playlistSongs.position));
        return {
          platform: owner.platform,
          songs: rows.map(({ deezer_id, isrc, name, artist, album, cover_url }) => ({ deezer_id, isrc, name, artist, album, cover_url })),
        };
      }),
    delete: (player, playlist_id) =>
      attempt(async () => {
        const deleted = await db
          .delete(playlists)
          .where(and(eq(playlists.playlist_id, playlist_id), eq(playlists.player_uuid, player)))
          .returning({ id: playlists.playlist_id });
        return deleted.length > 0;
      }),
  };
};

export const postgresAccountStore = (db: Database): AccountStore => {
  const toRecord = (r: typeof connectedAccounts.$inferSelect): AccountRecord => ({
    platform: r.platform,
    external_user_id: r.external_user_id,
    refresh_token_encrypted: r.refresh_token_encrypted,
    connected_at: r.connected_at.getTime(),
  });
  const forPlayer = (player: string, platform: "spotify") =>
    and(eq(connectedAccounts.player_uuid, player), eq(connectedAccounts.platform, platform));
  return {
    save: (player, a) =>
      attempt(async () => {
        const row = {
          external_user_id: a.external_user_id,
          refresh_token_encrypted: a.refresh_token_encrypted,
          connected_at: new Date(a.connected_at),
        };
        await db
          .insert(connectedAccounts)
          .values({ player_uuid: player, platform: a.platform, ...row })
          .onConflictDoUpdate({ target: [connectedAccounts.player_uuid, connectedAccounts.platform], set: row });
      }),
    get: (player, platform) =>
      attempt(async () => {
        const [row] = await db.select().from(connectedAccounts).where(forPlayer(player, platform));
        return row === undefined ? null : toRecord(row);
      }),
    list: (player) =>
      attempt(async () => (await db.select().from(connectedAccounts).where(eq(connectedAccounts.player_uuid, player))).map(toRecord)),
    delete: (player, platform) =>
      attempt(async () => {
        await db.delete(connectedAccounts).where(forPlayer(player, platform));
      }),
  };
};
