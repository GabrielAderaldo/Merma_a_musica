import { describe, expect, test } from "bun:test";
import { ORIGIN, sessionCookie, testApp } from "../testing.ts";

const FORGED = "11111111-1111-4111-8111-111111111111";
const DAY = 24 * 60 * 60 * 1000;

// Rota de teste que devolve a sessão que o handler enxerga.
const appWithWhoami = (now?: () => number) => {
  const app = testApp(now ? { now } : {});
  app.all("/whoami", (c) => c.json(c.get("session")));
  return app;
};

describe("ADR-0013.R3 — a sessão anônima é emitida antes de qualquer rota", () => {
  test("primeira visita recebe __Host-session com HttpOnly, Secure, SameSite=Strict, Path=/ e 30 dias (S-01)", async () => {
    const res = await testApp().request("/health");
    const header = res.headers.getSetCookie().find((c) => c.startsWith("__Host-session="));
    expect(header).toBeDefined();
    expect(header).toContain("Max-Age=2592000");
    expect(header).toContain("Path=/");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Strict");
    expect(header).not.toContain("Domain=");
  });

  test.each(["/ws/room/ABC123", "/api/v1/audio/qualquer", "/rota/que/nao/existe"])(
    "%s também emite a sessão",
    async (path) => {
      const res = await testApp().request(path);
      expect(sessionCookie(res)).toBeDefined();
    },
  );

  test("upgrade de WS sem sessão é recusado com 401, sem abrir o socket", async () => {
    const res = await testApp().request("/ws/room/ABC123", { headers: { upgrade: "websocket" } });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ code: "unauthenticated", message: expect.any(String) });
  });

  test("a mesma sessão volta com o mesmo player_uuid, sem reemitir o cookie no mesmo dia", async () => {
    const app = appWithWhoami();
    const first = await app.request("/whoami");
    const cookie = sessionCookie(first) ?? "";
    const second = await app.request("/whoami", { headers: { cookie } });
    expect(await second.json()).toEqual(await first.json());
    expect(sessionCookie(second)).toBeUndefined();
  });

  test("depois de um dia o cookie é reemitido com o mesmo player_uuid (renovado no uso)", async () => {
    let now = 1_000_000;
    const app = appWithWhoami(() => now);
    const first = await app.request("/whoami");
    now += DAY + 1;
    const second = await app.request("/whoami", { headers: { cookie: sessionCookie(first) ?? "" } });
    expect(sessionCookie(second)).toBeDefined();
    expect(await second.json()).toEqual(await first.json());
  });

  test("cookie com assinatura adulterada vira uma identidade nova", async () => {
    const app = appWithWhoami();
    const first = await app.request("/whoami");
    const original = (await first.json()) as { player_uuid: string };
    const [value = ""] = decodeURIComponent((sessionCookie(first) ?? "").split("=")[1] ?? "").split(".");
    const forged = `__Host-session=${encodeURIComponent(`${value.replace(original.player_uuid, FORGED)}.assinatura`)}`;
    const res = await app.request("/whoami", { headers: { cookie: forged } });
    const body = (await res.json()) as { player_uuid: string };
    expect(body.player_uuid).not.toBe(FORGED);
    expect(body.player_uuid).not.toBe(original.player_uuid);
  });
});

describe("ADR-0013.R1 — o player_uuid vem só da sessão (S-01)", () => {
  test("player_uuid forjado em query, header e body é ignorado", async () => {
    const app = appWithWhoami();
    const first = await app.request("/whoami");
    const own = (await first.json()) as { player_uuid: string };
    const res = await app.request(`/whoami?player_uuid=${FORGED}`, {
      method: "POST",
      headers: {
        cookie: sessionCookie(first) ?? "",
        origin: ORIGIN,
        "x-player-uuid": FORGED,
        "content-type": "application/json",
      },
      body: JSON.stringify({ player_uuid: FORGED }),
    });
    expect(((await res.json()) as { player_uuid: string }).player_uuid).toBe(own.player_uuid);
  });

  test("sem cookie, o player_uuid forjado também não vale: nasce um novo", async () => {
    const res = await appWithWhoami().request(`/whoami?player_uuid=${FORGED}`, { headers: { "x-player-uuid": FORGED } });
    expect(((await res.json()) as { player_uuid: string }).player_uuid).not.toBe(FORGED);
  });
});
