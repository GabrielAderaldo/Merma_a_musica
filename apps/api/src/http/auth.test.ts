import { describe, expect, test } from "bun:test";
import { MeResponse } from "@merma/schema";
import { SpotifyAccounts, type SpotifyAuth } from "../playlist/accounts.ts";
import { tokenCipher } from "../playlist/crypto.ts";
import { spotifyClient } from "../playlist/spotify.ts";
import { MemoryAccountStore } from "../playlist/store.ts";
import { captureLogs, fakeFetch, ORIGIN, sessionCookie, testApp, testPlaylists } from "../testing.ts";

const CONFIG = { clientId: "client-id", redirectUri: "https://merma.test/auth/spotify/callback" };

const spotifyAuth = async (): Promise<SpotifyAuth> => {
  const cipher = await tokenCipher(Buffer.alloc(32, 5).toString("base64"));
  if (cipher === null) return expect.unreachable("chave válida");
  const fetch = fakeFetch({
    "https://accounts.spotify.com/api/token": { access_token: "access", expires_in: 3600, refresh_token: "refresh" },
    "https://api.spotify.com/v1/me": { id: "spotify-user" },
  });
  const client = spotifyClient({ fetch, config: CONFIG, maxSongs: 500 });
  return { config: CONFIG, accounts: new SpotifyAccounts({ client, store: new MemoryAccountStore(), cipher, now: () => 1_000_000 }) };
};

const app = async (opts: { spotify?: boolean } = {}) => {
  const logs = captureLogs();
  const spotify = opts.spotify === false ? null : await spotifyAuth();
  const a = testApp({ logger: logs.logger, playlists: testPlaylists({ spotify }) });
  a.get("/whoami", (c) => c.json(c.get("session")));
  return { app: a, logs };
};

type Session = { session_id: string; player_uuid: string };
const whoami = async (a: Awaited<ReturnType<typeof app>>["app"], cookie: string) =>
  (await (await a.request("/whoami", { headers: { cookie } })).json()) as Session;

const csrfCookie = (res: Response) =>
  res.headers
    .getSetCookie()
    .find((c) => c.startsWith("__Host-csrf="))
    ?.split(";")[0];

// Começa o fluxo como o browser: sessão primeiro, depois /auth/spotify.
const startFlow = async (a: Awaited<ReturnType<typeof app>>["app"], returnTo = "/sala/ABC123") => {
  const cookie = sessionCookie(await a.request("/auth/me")) ?? "";
  const res = await a.request(`/auth/spotify?return_to=${encodeURIComponent(returnTo)}`, { headers: { cookie } });
  const location = new URL(res.headers.get("location") ?? "");
  return { cookie, res, csrf: csrfCookie(res) ?? "", state: location.searchParams.get("state") ?? "" };
};

describe("ADR-0026.R4 — OAuth só do Spotify, com PKCE", () => {
  test.each(["deezer", "youtube_music", "text"])("/auth/%s → 404", async (platform) => {
    const { app: a } = await app();
    expect((await a.request(`/auth/${platform}`)).status).toBe(404);
    expect((await a.request(`/auth/${platform}/callback?code=x&state=y`)).status).toBe(404);
  });

  test("Spotify não configurado na instância → 503", async () => {
    const { app: a } = await app({ spotify: false });
    expect((await a.request("/auth/spotify")).status).toBe(503);
  });

  test("S-04: o início manda ao consentimento com PKCE e guarda state no __Host-csrf (Lax, 10 min)", async () => {
    const { app: a } = await app();
    const { res, state } = await startFlow(a);
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.origin).toBe("https://accounts.spotify.com");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(state.length).toBeGreaterThanOrEqual(32);
    const header = res.headers.getSetCookie().find((c) => c.startsWith("__Host-csrf=")) ?? "";
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Max-Age=600");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
  });

  test("R-002: return_to fora do próprio site é recusado (sem open redirect)", async () => {
    const { app: a } = await app();
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com"]) {
      expect((await a.request(`/auth/spotify?return_to=${encodeURIComponent(bad)}`)).status).toBe(400);
    }
  });
});

describe("callback", () => {
  test("ADR-0013.R4: sem o cookie Strict (vem do Spotify), o login cai no jogador do __Host-csrf, com session_id novo", async () => {
    const { app: a, logs } = await app();
    const { cookie, csrf, state } = await startFlow(a, "/sala/ABC123");
    const before = await whoami(a, cookie);
    // Só o __Host-csrf (Lax) chega na navegação vinda de accounts.spotify.com.
    const res = await a.request(`/auth/spotify/callback?code=c&state=${state}`, { headers: { cookie: csrf } });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/sala/ABC123");
    const sessions = res.headers.getSetCookie().filter((c) => c.startsWith("__Host-session="));
    expect(sessions).toHaveLength(1);
    const after = await whoami(a, sessionCookie(res) ?? "");
    expect(after.player_uuid).toBe(before.player_uuid);
    expect(after.session_id).not.toBe(before.session_id);
    // O __Host-csrf é apagado.
    expect(res.headers.getSetCookie().some((c) => c.startsWith("__Host-csrf=;"))).toBe(true);
    expect(logs.lines.some((l) => l["event"] === "oauth_account_connected" && l["player_uuid"] === before.player_uuid)).toBe(true);

    const me = MeResponse.parse(await (await a.request("/auth/me", { headers: { cookie: sessionCookie(res) ?? "" } })).json());
    expect(me).toMatchObject({ player_uuid: before.player_uuid, is_authenticated: true, connected_accounts: [{ platform: "spotify" }] });
  });

  test("state diferente ou sem __Host-csrf → volta com oauth_error=state_mismatch e o evento de auditoria", async () => {
    const { app: a, logs } = await app();
    const { csrf } = await startFlow(a);
    for (const cookie of [csrf, ""]) {
      const res = await a.request("/auth/spotify/callback?code=c&state=outro-state", { headers: { cookie } });
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toContain("oauth_error=state_mismatch");
      // A identidade do jogador no browser não é trocada por uma sessão nova.
      expect(sessionCookie(res)).toBeUndefined();
    }
    expect(logs.lines.filter((l) => l["event"] === "oauth_state_mismatch")).toHaveLength(2);
  });

  test("recusa no consentimento (ou usuário fora da allowlist do app) → volta com oauth_error=denied", async () => {
    const { app: a } = await app();
    const { csrf, state } = await startFlow(a, "/");
    const res = await a.request(`/auth/spotify/callback?error=access_denied&state=${state}`, { headers: { cookie: csrf } });
    expect(res.headers.get("location")).toBe("/?oauth_error=denied");
    expect(sessionCookie(res)).toBeUndefined();
  });
});

describe("/auth/me, logout e disconnect (docs/privacy.md)", () => {
  test("anônimo: sem conta conectada", async () => {
    const { app: a } = await app();
    const cookie = sessionCookie(await a.request("/auth/me")) ?? "";
    const me = MeResponse.parse(await (await a.request("/auth/me", { headers: { cookie } })).json());
    expect(me).toMatchObject({ is_authenticated: false, connected_accounts: [] });
  });

  test("disconnect apaga a conta; logout também, e a identidade continua", async () => {
    const { app: a } = await app();
    for (const path of ["/api/v1/auth/disconnect/spotify", "/auth/logout"]) {
      const { csrf, state } = await startFlow(a);
      const callback = await a.request(`/auth/spotify/callback?code=c&state=${state}`, { headers: { cookie: csrf } });
      const cookie = sessionCookie(callback) ?? "";
      const player = (await whoami(a, cookie)).player_uuid;
      expect((await a.request(path, { method: "POST", headers: { cookie, origin: ORIGIN } })).status).toBe(204);
      const me = MeResponse.parse(await (await a.request("/auth/me", { headers: { cookie } })).json());
      expect(me).toEqual({ player_uuid: player, is_authenticated: false, connected_accounts: [] });
    }
  });

  test("S-04: mutação sem o Origin da allowlist → 403 origin_not_allowed e evento de auditoria", async () => {
    const { app: a, logs } = await app();
    const cookie = sessionCookie(await a.request("/auth/me")) ?? "";
    for (const headers of [{ cookie }, { cookie, origin: "https://evil.com" }]) {
      const res = await a.request("/auth/logout", { method: "POST", headers });
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ code: "origin_not_allowed" });
    }
    expect(logs.lines.filter((l) => l["event"] === "rest_csrf_origin_mismatch")).toHaveLength(2);
  });
});
