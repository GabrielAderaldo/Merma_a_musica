import { describe, expect, test } from "bun:test";
import { fakeFetch, withStatus } from "../testing.ts";
import { SpotifyAccounts } from "./accounts.ts";
import { tokenCipher } from "./crypto.ts";
import { authorizeUrl, pkcePair, spotifyClient } from "./spotify.ts";
import { MemoryAccountStore } from "./store.ts";

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";
const CONFIG = { clientId: "client-id", redirectUri: "https://merma.test/auth/spotify/callback" };
const KEY = Buffer.alloc(32, 3).toString("base64");

describe("PKCE (RFC 7636)", () => {
  test("verifier de 43 a 128 caracteres; challenge = base64url(SHA-256(verifier))", async () => {
    const { verifier, challenge } = await pkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    const digest = new Bun.CryptoHasher("sha256").update(verifier).digest("base64url");
    expect(challenge).toBe(digest);
  });

  test("a URL de consentimento pede só leitura de playlist, com S256 e o state", () => {
    const url = new URL(authorizeUrl(CONFIG, "st", "ch"));
    expect(url.origin + url.pathname).toBe(`${ACCOUNTS}/authorize`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "client-id",
      response_type: "code",
      redirect_uri: CONFIG.redirectUri,
      state: "st",
      scope: "playlist-read-private playlist-read-collaborative",
      code_challenge_method: "S256",
      code_challenge: "ch",
    });
  });
});

describe("spotifyClient.playlist", () => {
  test("lê /items (fev. 2026), pula arquivo local e episódio, e leva o ISRC para a busca na Deezer", async () => {
    const client = spotifyClient({
      fetch: fakeFetch({
        [`${API}/playlists/p1/items`]: {
          next: null,
          items: [
            { is_local: false, item: { type: "track", name: "Envolver", artists: [{ name: "Anitta" }], external_ids: { isrc: "BRXXX2600002" } } },
            { is_local: true, item: { type: "track", name: "Local", artists: [] } },
            { is_local: false, item: { type: "episode", name: "Podcast" } },
            { is_local: false, item: null },
          ],
        },
        [`${API}/playlists/p1`]: { name: "Do Spotify" },
      }),
      config: CONFIG,
      maxSongs: 500,
    });
    expect(await client.playlist("token", "p1")).toEqual({
      ok: true,
      value: {
        platform: "spotify",
        external_id: "p1",
        name: "Do Spotify",
        cover_url: null,
        candidates: [{ kind: "lookup", label: "Anitta - Envolver", query: "Anitta Envolver", isrc: "BRXXX2600002" }],
      },
    });
  });

  test("playlist de outra pessoa (403 em Development Mode) → playlist_not_found", async () => {
    const client = spotifyClient({ fetch: fakeFetch({ [`${API}/playlists/p2`]: withStatus(403) }), config: CONFIG, maxSongs: 500 });
    expect(await client.playlist("token", "p2")).toEqual({ ok: false, error: "playlist_not_found" });
  });
});

describe("SpotifyAccounts", () => {
  const setup = async (routes: Record<string, unknown>) => {
    const cipher = await tokenCipher(KEY);
    if (cipher === null) return expect.unreachable("chave válida");
    const store = new MemoryAccountStore();
    let now = 1_000_000;
    const calls: string[] = [];
    const accounts = new SpotifyAccounts({
      client: spotifyClient({ fetch: fakeFetch(routes, calls), config: CONFIG, maxSongs: 500 }),
      store,
      cipher,
      now: () => now,
    });
    return { accounts, store, cipher, calls, advance: (ms: number) => (now += ms) };
  };

  test("ADR-0006.R3: o connect guarda o refresh token cifrado, que decifra de volta", async () => {
    const s = await setup({
      [`${ACCOUNTS}/api/token`]: { access_token: "access-1", expires_in: 3600, refresh_token: "refresh-segredo" },
      [`${API}/me`]: { id: "spotify-user" },
    });
    const player = crypto.randomUUID();
    expect(await s.accounts.connect(player, "code", "verifier")).toEqual({ ok: true, value: undefined });
    const stored = await s.store.get(player, "spotify");
    if (!stored.ok || stored.value === null) return expect.unreachable("conta gravada");
    expect(stored.value.external_user_id).toBe("spotify-user");
    expect(stored.value.refresh_token_encrypted).not.toContain("refresh-segredo");
    expect(await s.cipher.decrypt(stored.value.refresh_token_encrypted)).toEqual({ ok: true, value: "refresh-segredo" });
    // O access token fica na memória: nada de nova chamada enquanto vale.
    expect(await s.accounts.accessToken(player)).toEqual({ ok: true, value: "access-1" });
    expect(s.calls.filter((u) => u.startsWith(`${ACCOUNTS}/api/token`))).toHaveLength(1);
  });

  test("access token vencido é renovado pelo refresh; um refresh token novo substitui o antigo, cifrado", async () => {
    const s = await setup({
      [`${ACCOUNTS}/api/token`]: { access_token: "access-2", expires_in: 3600, refresh_token: "refresh-novo" },
      [`${API}/me`]: { id: "u" },
    });
    const player = crypto.randomUUID();
    await s.accounts.connect(player, "code", "verifier");
    s.advance(3600 * 1000);
    expect(await s.accounts.accessToken(player)).toEqual({ ok: true, value: "access-2" });
    const stored = await s.store.get(player, "spotify");
    expect(stored.ok && stored.value && (await s.cipher.decrypt(stored.value.refresh_token_encrypted))).toEqual({ ok: true, value: "refresh-novo" });
  });

  test("refresh recusado (invalid_grant: acesso revogado no Spotify) apaga a conta → platform_not_connected", async () => {
    const s = await setup({ [`${ACCOUNTS}/api/token`]: withStatus(400, { error: "invalid_grant" }) });
    const player = crypto.randomUUID();
    await s.store.save(player, { platform: "spotify", external_user_id: "u", refresh_token_encrypted: await s.cipher.encrypt("r"), connected_at: 1 });
    expect(await s.accounts.accessToken(player)).toEqual({ ok: false, error: "platform_not_connected" });
    expect(await s.store.get(player, "spotify")).toEqual({ ok: true, value: null });
  });

  test("sem conta → platform_not_connected; disconnect apaga a conta e o token da memória", async () => {
    const s = await setup({
      [`${ACCOUNTS}/api/token`]: { access_token: "a", expires_in: 3600, refresh_token: "r" },
      [`${API}/me`]: { id: "u" },
    });
    const player = crypto.randomUUID();
    expect(await s.accounts.accessToken(player)).toEqual({ ok: false, error: "platform_not_connected" });
    await s.accounts.connect(player, "code", "verifier");
    await s.accounts.disconnect(player);
    expect(await s.accounts.accessToken(player)).toEqual({ ok: false, error: "platform_not_connected" });
  });
});
