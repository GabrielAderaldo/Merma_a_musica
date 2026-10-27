// Spotify por OAuth com PKCE, opcional e limitado à allowlist do app em Development Mode (R-002, ADR-0026.R4).
// Rotas aferidas em 2026-10-26: /playlists/{id}/items no lugar de /tracks, campo `item` no lugar de `track`.
// O access token fica só em memória (docs/privacy.md); o refresh token vai cifrado para o Postgres (ADR-0006.R3).
import { z } from "zod";
import { type Fetch, type HttpError, requestJson } from "./http.ts";
import { err, ok, type Result } from "./result.ts";
import type { Candidate, SourceError, SourcePlaylist } from "./types.ts";

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";
const SCOPES = "playlist-read-private playlist-read-collaborative";
const MAX_AVAILABLE = 200;

export type SpotifyConfig = Readonly<{ clientId: string; redirectUri: string }>;

const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

// RFC 7636: verifier de 43 a 128 caracteres; o challenge é o SHA-256 dele em base64url.
export const pkcePair = async (): Promise<{ verifier: string; challenge: string }> => {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return { verifier, challenge: base64url(digest) };
};

export const authorizeUrl = (config: SpotifyConfig, state: string, challenge: string): string => {
  const url = new URL(`${ACCOUNTS}/authorize`);
  for (const [k, v] of Object.entries({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    state,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  })) {
    url.searchParams.set(k, v);
  }
  return url.toString();
};

const Token = z.object({ access_token: z.string(), expires_in: z.number(), refresh_token: z.string().optional() });
export type SpotifyToken = Readonly<{ access_token: string; expires_in: number; refresh_token?: string | undefined }>;
const Me = z.object({ id: z.string() });
const Image = z.object({ url: z.string() });
const PlaylistSummary = z.object({
  id: z.string(),
  name: z.string(),
  images: z.array(Image).nullish(),
  items: z.object({ total: z.number() }).optional(),
});
const Playlists = z.object({ items: z.array(PlaylistSummary.nullable()), next: z.string().nullable() });
const PlaylistMeta = z.object({ name: z.string() });
const Items = z.object({
  next: z.string().nullable(),
  items: z.array(
    z.object({
      is_local: z.boolean().optional(),
      item: z
        .object({
          type: z.string(),
          name: z.string(),
          artists: z.array(z.object({ name: z.string() })).optional(),
          external_ids: z.object({ isrc: z.string().optional() }).optional(),
        })
        .nullable(),
    }),
  ),
});

export type AvailablePlaylist = Readonly<{ external_id: string; name: string; track_count: number; cover_url: string | null }>;

export const spotifyClient = (deps: { fetch: Fetch; config: SpotifyConfig; maxSongs: number }) => {
  const token = (body: Record<string, string>) =>
    requestJson(deps.fetch, `${ACCOUNTS}/api/token`, Token, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: deps.config.clientId, ...body }).toString(),
    });
  const api = <S extends z.ZodType>(accessToken: string, path: string, schema: S) =>
    requestJson(deps.fetch, path.startsWith("https://") ? path : `${API}${path}`, schema, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
  // Página seguinte só se for da própria API (ADR-0026.R3).
  const nextPage = (next: string | null) => (next !== null && next.startsWith(`${API}/`) ? next : null);

  return {
    // PKCE dispensa o client_secret.
    exchange: (code: string, verifier: string): Promise<Result<SpotifyToken, HttpError>> =>
      token({ grant_type: "authorization_code", code, redirect_uri: deps.config.redirectUri, code_verifier: verifier }),
    // A resposta pode trazer um refresh token novo; sem ele, o anterior continua valendo.
    refresh: (refreshToken: string): Promise<Result<SpotifyToken, HttpError>> =>
      token({ grant_type: "refresh_token", refresh_token: refreshToken }),
    userId: async (accessToken: string): Promise<Result<string, HttpError>> => {
      const me = await api(accessToken, "/me", Me);
      return me.ok ? ok(me.value.id) : me;
    },
    available: async (accessToken: string): Promise<Result<readonly AvailablePlaylist[], HttpError>> => {
      const found: AvailablePlaylist[] = [];
      for (let url: string | null = "/me/playlists?limit=50"; url !== null && found.length < MAX_AVAILABLE; ) {
        const page = await api(accessToken, url, Playlists);
        if (!page.ok) return page;
        for (const p of page.value.items) {
          if (p === null) continue;
          found.push({ external_id: p.id, name: p.name, track_count: p.items?.total ?? 0, cover_url: p.images?.[0]?.url ?? null });
        }
        url = nextPage(page.value.next);
      }
      return ok(found);
    },
    // Só playlist que o jogador criou ou em que colabora: as outras dão 403 em Development Mode.
    playlist: async (accessToken: string, id: string): Promise<Result<SourcePlaylist, SourceError>> => {
      const fail = (e: HttpError): SourceError => (e === "not_found" || e === "forbidden" ? "playlist_not_found" : "provider_unavailable");
      const meta = await api(accessToken, `/playlists/${id}?fields=name`, PlaylistMeta);
      if (!meta.ok) return err(fail(meta.error));
      const candidates: Candidate[] = [];
      for (let url: string | null = `/playlists/${id}/items?limit=50`; url !== null && candidates.length < deps.maxSongs; ) {
        const page = await api(accessToken, url, Items);
        if (!page.ok) return err(fail(page.error));
        for (const { is_local, item } of page.value.items) {
          // Arquivo local e episódio de podcast não existem na Deezer.
          if (is_local === true || item === null || item.type !== "track") continue;
          const artist = item.artists?.[0]?.name ?? "";
          candidates.push({
            kind: "lookup",
            label: artist === "" ? item.name : `${artist} - ${item.name}`,
            query: `${artist} ${item.name}`,
            isrc: item.external_ids?.isrc ?? null,
          });
        }
        url = nextPage(page.value.next);
      }
      return ok({
        platform: "spotify",
        external_id: id,
        name: meta.value.name,
        // A URL de imagem do Spotify expira em menos de um dia: a capa vem da 1ª música achada na Deezer.
        cover_url: null,
        candidates: candidates.slice(0, deps.maxSongs),
      });
    },
  };
};
export type SpotifyClient = ReturnType<typeof spotifyClient>;
