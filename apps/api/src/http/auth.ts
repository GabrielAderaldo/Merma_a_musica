// Rotas de auth: OAuth do Spotify com PKCE (R-002, ADR-0024.R4), /auth/me e a desconexão (docs/privacy.md).
// O callback chega de accounts.spotify.com, então o __Host-session (SameSite=Strict) não vem junto: quem diz de que
// jogador é o login é o __Host-csrf (SameSite=Lax, 10 min, S-04), assinado e emitido no início do fluxo.
import { createRoute, z } from "@hono/zod-openapi";
import { PlayerUuid } from "@merma/domain";
import { ErrorResponse, MeResponse } from "@merma/schema";
import { timingSafeEqual } from "node:crypto";
import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import type { SpotifyAuth } from "../playlist/accounts.ts";
import { authorizeUrl, pkcePair } from "../playlist/spotify.ts";
import type { AppEnv, OpenApiApp } from "./app.ts";
import type { Logger } from "./logger.ts";
import { rotateSession } from "./session.ts";

const CSRF = "csrf"; // com prefix "host", __Host-csrf
const CSRF_MAX_AGE_SECONDS = 10 * 60;

const json = <S extends z.ZodType>(schema: S, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

// R-002: o jogador volta à tela onde estava. Só caminho do próprio site, para não virar open redirect.
const ReturnTo = z
  .string()
  .max(200)
  .regex(/^\/(?![/\\])/)
  .optional();

const startRoute = createRoute({
  method: "get",
  path: "/auth/{platform}",
  request: { params: z.object({ platform: z.string() }), query: z.object({ return_to: ReturnTo }) },
  responses: {
    302: { description: "Para o consentimento do Spotify, com state e PKCE no __Host-csrf" },
    404: json(ErrorResponse, "Plataforma sem login: só o Spotify tem (ADR-0024.R4)"),
    503: json(ErrorResponse, "Login do Spotify não configurado nesta instância"),
  },
});

const callbackRoute = createRoute({
  method: "get",
  path: "/auth/{platform}/callback",
  request: {
    params: z.object({ platform: z.string() }),
    query: z.object({ code: z.string().max(2000).optional(), state: z.string().max(200).optional(), error: z.string().max(200).optional() }),
  },
  responses: {
    302: { description: "De volta ao return_to; com ?oauth_error=… se o login não se completou" },
    404: json(ErrorResponse, "Plataforma sem login"),
  },
});

const meRoute = createRoute({
  method: "get",
  path: "/auth/me",
  responses: { 200: json(MeResponse, "Quem é o jogador e quais contas ele conectou"), 503: json(ErrorResponse, "Postgres fora do ar") },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/auth/logout",
  responses: {
    204: { description: "Contas desvinculadas; a identidade anônima continua (ADR-0013)" },
    503: json(ErrorResponse, "Postgres fora do ar"),
  },
});

const disconnectRoute = createRoute({
  method: "post",
  path: "/api/v1/auth/disconnect/{platform}",
  request: { params: z.object({ platform: z.literal("spotify") }) },
  responses: {
    204: { description: "Tokens apagados na hora; as playlists ficam (docs/privacy.md)" },
    400: json(ErrorResponse, "Plataforma sem login"),
    503: json(ErrorResponse, "Postgres fora do ar"),
  },
});

type Pending = { state: string; verifier: string; player_uuid: string; return_to: string };

// Valor assinado: state.verifier.player_uuid.return_to (este em base64url). Os três primeiros não têm ponto.
const encode = (p: Pending) => [p.state, p.verifier, p.player_uuid, Buffer.from(p.return_to).toString("base64url")].join(".");
const decode = (raw: string): Pending | null => {
  const [state, verifier, player_uuid, returnTo, ...rest] = raw.split(".");
  if (rest.length > 0 || !state || !verifier || !player_uuid || returnTo === undefined) return null;
  return { state, verifier, player_uuid, return_to: Buffer.from(returnTo, "base64url").toString() };
};

const NOT_FOUND = { code: "invalid_payload" as const, message: "Essa plataforma não tem login." };
const STORE_DOWN = { code: "internal_error" as const, message: "Tente de novo." };

const sameState = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const back = (c: Context, returnTo: string, error?: string) => {
  const url = new URL(returnTo, "https://merma.invalid");
  if (error !== undefined) url.searchParams.set("oauth_error", error);
  return c.redirect(`${url.pathname}${url.search}`, 302);
};

export const authRoutes = (
  app: OpenApiApp,
  deps: { spotify: SpotifyAuth | null; secret: string; now: () => number; logger: Logger },
) => {
  // Revogar o consentimento apaga o refresh token na hora; as playlists ficam (docs/privacy.md).
  const disconnect = async (c: Context<AppEnv>) => {
    const { player_uuid } = c.get("session");
    if (deps.spotify === null) return true;
    const removed = await deps.spotify.accounts.disconnect(player_uuid);
    if (removed.ok) deps.logger.info("oauth_account_disconnected", { player_uuid, platform: "spotify" });
    return removed.ok;
  };

  // /auth/me e /auth/logout antes de /auth/{platform}: o Hono casa na ordem de registro.
  return app
    .openapi(meRoute, async (c) => {
      const { player_uuid } = c.get("session");
      const accounts = deps.spotify === null ? { ok: true as const, value: [] } : await deps.spotify.accounts.list(player_uuid);
      if (!accounts.ok) return c.json(STORE_DOWN, 503);
      const connected_accounts = accounts.value.map((a) => ({ platform: a.platform, connected_at: new Date(a.connected_at).toISOString() }));
      return c.json({ player_uuid, is_authenticated: connected_accounts.length > 0, connected_accounts }, 200);
    })
    .openapi(logoutRoute, async (c) => ((await disconnect(c)) ? c.body(null, 204) : c.json(STORE_DOWN, 503)))
    .openapi(disconnectRoute, async (c) => ((await disconnect(c)) ? c.body(null, 204) : c.json(STORE_DOWN, 503)))
    .openapi(startRoute, async (c) => {
      if (c.req.valid("param").platform !== "spotify") return c.json(NOT_FOUND, 404);
      if (deps.spotify === null) return c.json({ code: "provider_unavailable" as const, message: "Login do Spotify indisponível." }, 503);
      const { verifier, challenge } = await pkcePair();
      const state = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
      const pending = { state, verifier, player_uuid: c.get("session").player_uuid, return_to: c.req.valid("query").return_to ?? "/" };
      await setSignedCookie(c, CSRF, encode(pending), deps.secret, {
        prefix: "host",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
        maxAge: CSRF_MAX_AGE_SECONDS,
      });
      return c.redirect(authorizeUrl(deps.spotify.config, state, challenge), 302);
    })
    .openapi(callbackRoute, async (c) => {
      if (c.req.valid("param").platform !== "spotify" || deps.spotify === null) return c.json(NOT_FOUND, 404);
      // Sem o cookie Strict, o middleware emitiu uma sessão nova; ela sobrescreveria a do jogador no browser. Só o
      // login completo emite sessão, a rotacionada (ADR-0013.R4).
      c.header("Set-Cookie", undefined);
      const raw = await getSignedCookie(c, deps.secret, CSRF, "host");
      const pending = typeof raw === "string" ? decode(raw) : null;
      const query = c.req.valid("query");
      if (pending === null || query.state === undefined || !sameState(pending.state, query.state)) {
        deps.logger.warn("oauth_state_mismatch", { platform: "spotify" });
        return back(c, pending?.return_to ?? "/", "state_mismatch");
      }
      const player = PlayerUuid(pending.player_uuid);
      if (!player.ok) return back(c, pending.return_to, "state_mismatch");
      // Recusa no consentimento, ou usuário fora da allowlist do app (403 do Spotify).
      if (query.code === undefined) return back(c, pending.return_to, "denied");
      const connected = await deps.spotify.accounts.connect(player.value, query.code, pending.verifier);
      if (!connected.ok) return back(c, pending.return_to, connected.error);
      await rotateSession(c, { secret: deps.secret, now: deps.now }, player.value);
      deleteCookie(c, CSRF, { path: "/", secure: true, prefix: "host" });
      deps.logger.info("oauth_account_connected", { player_uuid: player.value, platform: "spotify" });
      return back(c, pending.return_to);
    });
};
