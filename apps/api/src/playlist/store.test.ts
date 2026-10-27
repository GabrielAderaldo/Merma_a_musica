import { afterAll, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { connect, migrateDatabase } from "../db/client.ts";
import { connectedAccounts, playlists } from "../db/schema.ts";
import type { Result } from "./result.ts";
import {
  type AccountStore,
  MemoryAccountStore,
  MemoryPlaylistStore,
  type NewPlaylist,
  type PlaylistStore,
  postgresAccountStore,
  postgresPlaylistStore,
} from "./store.ts";
import type { StoredSong } from "./types.ts";

const unwrap = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) return expect.unreachable(`esperava ok, veio err(${String(r.error)})`);
  return r.value;
};

const song = (i: number): StoredSong => ({
  deezer_id: String(i),
  isrc: i % 2 === 0 ? `BRXXX26000${i}` : null,
  name: `Música ${i}`,
  artist: "Artista",
  album: null,
  cover_url: null,
});

// Cada teste usa um jogador novo, para rodar no mesmo Postgres sem se misturar.
const fixtures = () => {
  const player = crypto.randomUUID();
  const playlist = (change: Partial<NewPlaylist> = {}): NewPlaylist => ({
    player_uuid: player,
    platform: "deezer",
    external_id: "42",
    name: "Minhas",
    cover_url: "https://cdn-images.dzcdn.net/p.jpg",
    songs: [song(1), song(2)],
    imported_at: 1_000_000,
    ...change,
  });
  return { player, playlist };
};
const newId = () => crypto.randomUUID();

const contract = (make: () => { playlists: PlaylistStore; accounts: AccountStore }) => {
  test("grava, lista e devolve as músicas na ordem", async () => {
    const { playlists: store } = make();
    const { player, playlist } = fixtures();
    const saved = unwrap(await store.save(playlist(), newId));
    expect(saved).toMatchObject({ platform: "deezer", external_id: "42", name: "Minhas", track_count: 2, imported_at: 1_000_000 });
    expect(unwrap(await store.list(player))).toEqual([saved]);
    expect(unwrap(await store.songs(player, saved.playlist_id))).toEqual({ platform: "deezer", songs: [song(1), song(2)] });
  });

  test("reimportar a mesma playlist troca as músicas e mantém o playlist_id (e os recordes)", async () => {
    const { playlists: store } = make();
    const { player, playlist } = fixtures();
    const first = unwrap(await store.save(playlist(), newId));
    const again = unwrap(await store.save(playlist({ name: "Renomeada", songs: [song(3)], imported_at: 2_000_000 }), newId));
    expect(again.playlist_id).toBe(first.playlist_id);
    expect(unwrap(await store.list(player))).toEqual([again]);
    expect(unwrap(await store.songs(player, first.playlist_id))?.songs).toEqual([song(3)]);
  });

  test("R-010: duas listas coladas (external_id null) são duas playlists; a lista mais recente vem antes", async () => {
    const { playlists: store } = make();
    const { player, playlist } = fixtures();
    const a = unwrap(await store.save(playlist({ platform: "text", external_id: null, imported_at: 1 }), newId));
    const b = unwrap(await store.save(playlist({ platform: "text", external_id: null, imported_at: 2 }), newId));
    expect(a.playlist_id).not.toBe(b.playlist_id);
    expect(unwrap(await store.list(player)).map((p) => p.playlist_id)).toEqual([b.playlist_id, a.playlist_id]);
  });

  test("playlist de outro jogador não aparece, não toca e não se apaga", async () => {
    const { playlists: store } = make();
    const { playlist } = fixtures();
    const other = crypto.randomUUID();
    const saved = unwrap(await store.save(playlist(), newId));
    expect(unwrap(await store.list(other))).toEqual([]);
    expect(unwrap(await store.songs(other, saved.playlist_id))).toBeNull();
    expect(unwrap(await store.delete(other, saved.playlist_id))).toBe(false);
  });

  test("apagar tira a playlist e as músicas", async () => {
    const { playlists: store } = make();
    const { player, playlist } = fixtures();
    const saved = unwrap(await store.save(playlist(), newId));
    expect(unwrap(await store.delete(player, saved.playlist_id))).toBe(true);
    expect(unwrap(await store.songs(player, saved.playlist_id))).toBeNull();
    expect(unwrap(await store.delete(player, saved.playlist_id))).toBe(false);
  });

  test("conta do Spotify: grava, troca, lista e apaga", async () => {
    const { accounts } = make();
    const player = crypto.randomUUID();
    const account = { platform: "spotify" as const, external_user_id: "u1", refresh_token_encrypted: "c1", connected_at: 1_000 };
    unwrap(await accounts.save(player, account));
    unwrap(await accounts.save(player, { ...account, refresh_token_encrypted: "c2" }));
    expect(unwrap(await accounts.get(player, "spotify"))).toEqual({ ...account, refresh_token_encrypted: "c2" });
    expect(unwrap(await accounts.list(player))).toHaveLength(1);
    unwrap(await accounts.delete(player, "spotify"));
    expect(unwrap(await accounts.get(player, "spotify"))).toBeNull();
    expect(unwrap(await accounts.list(player))).toEqual([]);
  });
};

describe("stores em memória", () => contract(() => ({ playlists: new MemoryPlaylistStore(), accounts: new MemoryAccountStore() })));

// Contra o Postgres de verdade quando POSTGRES_URL existe: no CI (service postgres) e em dev com `infra up postgres`.
const url = process.env["POSTGRES_URL"];
describe.skipIf(url === undefined || url === "")("stores no Postgres (de verdade)", () => {
  const db = connect(url ?? "");
  const players = new Set<string>();
  const store = postgresPlaylistStore(db);
  const accountStore = postgresAccountStore(db);
  // Guarda os jogadores usados, para apagar as linhas no fim.
  const tracked = {
    playlists: { ...store, save: (p: NewPlaylist, id: () => string) => (players.add(p.player_uuid), store.save(p, id)) },
    accounts: { ...accountStore, save: (player: string, a: Parameters<AccountStore["save"]>[1]) => (players.add(player), accountStore.save(player, a)) },
  };

  test("migra", async () => {
    expect(await migrateDatabase(db)).toEqual({ ok: true, value: undefined });
  });
  contract(() => tracked);

  test("ADR-0006.R3: a coluna guarda só o que chegou cifrado", async () => {
    const player = crypto.randomUUID();
    players.add(player);
    unwrap(await accountStore.save(player, { platform: "spotify", external_user_id: "u", refresh_token_encrypted: "AAAA", connected_at: 1 }));
    const [row] = await db.select().from(connectedAccounts).where(eq(connectedAccounts.player_uuid, player));
    expect(Object.keys(row ?? {}).toSorted()).toEqual(["connected_at", "external_user_id", "platform", "player_uuid", "refresh_token_encrypted"]);
  });

  afterAll(async () => {
    const ids = [...players];
    if (ids.length > 0) {
      await db.delete(playlists).where(inArray(playlists.player_uuid, ids));
      await db.delete(connectedAccounts).where(inArray(connectedAccounts.player_uuid, ids));
    }
    await db.$client.close();
  });
});
