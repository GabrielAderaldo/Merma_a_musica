// Conta do Spotify do jogador (ConnectedAccount). O refresh token vai cifrado para o store (ADR-0006.R3); o access
// token fica só nesta memória, nunca persistido (docs/privacy.md).
import type { TokenCipher } from "./crypto.ts";
import { err, ok, type Result } from "./result.ts";
import type { SpotifyClient, SpotifyConfig, SpotifyToken } from "./spotify.ts";
import type { AccountRecord, AccountStore, StoreError } from "./store.ts";

// Renova um minuto antes de expirar, para não usar um token que vence no meio da importação.
const MARGIN_MS = 60_000;

// O login do Spotify quando a instância o configurou (SPOTIFY_CLIENT_ID).
export type SpotifyAuth = Readonly<{ accounts: SpotifyAccounts; config: SpotifyConfig }>;

export type AccountError = "platform_not_connected" | "provider_unavailable" | StoreError;

export class SpotifyAccounts {
  readonly #client: SpotifyClient;
  readonly #store: AccountStore;
  readonly #cipher: TokenCipher;
  readonly #now: () => number;
  readonly #access = new Map<string, { token: string; expires_at: number }>();

  constructor(deps: { client: SpotifyClient; store: AccountStore; cipher: TokenCipher; now: () => number }) {
    this.#client = deps.client;
    this.#store = deps.store;
    this.#cipher = deps.cipher;
    this.#now = deps.now;
  }

  get client(): SpotifyClient {
    return this.#client;
  }

  // Callback do OAuth: troca o code, descobre o usuário e guarda o refresh token cifrado.
  async connect(player: string, code: string, verifier: string): Promise<Result<void, AccountError>> {
    const token = await this.#client.exchange(code, verifier);
    if (!token.ok || token.value.refresh_token === undefined) return err("provider_unavailable");
    const user = await this.#client.userId(token.value.access_token);
    if (!user.ok) return err("provider_unavailable");
    const saved = await this.#save(player, user.value, token.value.refresh_token, this.#now());
    if (saved.ok) this.#remember(player, token.value);
    return saved;
  }

  async accessToken(player: string): Promise<Result<string, AccountError>> {
    const cached = this.#access.get(player);
    if (cached !== undefined && cached.expires_at - MARGIN_MS > this.#now()) return ok(cached.token);
    const account = await this.#store.get(player, "spotify");
    if (!account.ok) return account;
    if (account.value === null) return err("platform_not_connected");
    const refreshToken = await this.#cipher.decrypt(account.value.refresh_token_encrypted);
    if (!refreshToken.ok) return this.#forget(player);
    const token = await this.#client.refresh(refreshToken.value);
    // invalid_grant (400): o jogador revogou o acesso no Spotify. A conta some e ele conecta de novo.
    if (!token.ok) return token.error === "unauthorized" ? this.#forget(player) : err("provider_unavailable");
    if (token.value.refresh_token !== undefined) {
      const saved = await this.#save(player, account.value.external_user_id, token.value.refresh_token, account.value.connected_at);
      if (!saved.ok) return saved;
    }
    this.#remember(player, token.value);
    return ok(token.value.access_token);
  }

  list(player: string): Promise<Result<readonly AccountRecord[], StoreError>> {
    return this.#store.list(player);
  }

  // Revogar o consentimento apaga o token na hora (docs/privacy.md). As playlists ficam.
  async disconnect(player: string): Promise<Result<void, StoreError>> {
    this.#access.delete(player);
    return this.#store.delete(player, "spotify");
  }

  async #save(player: string, external_user_id: string, refreshToken: string, connected_at: number) {
    const refresh_token_encrypted = await this.#cipher.encrypt(refreshToken);
    return this.#store.save(player, { platform: "spotify", external_user_id, refresh_token_encrypted, connected_at });
  }

  #remember(player: string, token: SpotifyToken): void {
    this.#access.set(player, { token: token.access_token, expires_at: this.#now() + token.expires_in * 1000 });
  }

  async #forget(player: string): Promise<Result<never, AccountError>> {
    const deleted = await this.disconnect(player);
    return deleted.ok ? err("platform_not_connected") : deleted;
  }
}
