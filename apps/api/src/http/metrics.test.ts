import { describe, expect, test } from "bun:test";
import { testMetrics } from "../observability/metrics.ts";
import { ORIGIN, sessionCookie, testApp } from "../testing.ts";

const TOKEN = "metrics-token-with-at-least-32-chars!!";
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

describe("GET /metrics (ADR-0010)", () => {
  test("sem METRICS_AUTH_TOKEN, a rota não existe", async () => {
    expect((await testApp().request("/metrics", { headers: bearer(TOKEN) })).status).toBe(404);
  });

  test.each([
    ["sem Authorization", {}],
    ["token errado", bearer("x".repeat(TOKEN.length))],
    ["token com outro tamanho", bearer("curto")],
    ["outro esquema", { authorization: `Basic ${TOKEN}` }],
  ])("%s → 401", async (_name, headers) => {
    const res = await testApp({ metricsToken: TOKEN }).request("/metrics", { headers });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe("Bearer");
  });

  test("com o Bearer certo, devolve o texto do Prometheus, sem cookie de sessão nem cache", async () => {
    const res = await testApp({ metricsToken: TOKEN }).request("/metrics", { headers: bearer(TOKEN) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toStartWith("text/plain; version=0.0.4");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(sessionCookie(res)).toBeUndefined();
    expect(await res.text()).toContain("# TYPE merma_rooms_active gauge");
  });
});

describe("security_event_total{kind} nas bordas REST", () => {
  test("S-04: mutação com Origin de fora conta origin_not_allowed", async () => {
    const metrics = testMetrics();
    const app = testApp({ metrics });
    const res = await app.request("/api/v1/rooms", { method: "POST", headers: { origin: "https://evil.test" } });
    expect(res.status).toBe(403);
    expect(metrics.securityEvents.value({ kind: "origin_not_allowed" })).toBe(1);
  });

  test("S-25: o 429 do POST /rooms conta rest_rate_limited", async () => {
    const metrics = testMetrics();
    const app = testApp({ metrics });
    const cookie = sessionCookie(await app.request("/health")) ?? "";
    for (let i = 0; i < 11; i++) await app.request("/api/v1/rooms", { method: "POST", headers: { cookie, origin: ORIGIN } });
    expect(metrics.securityEvents.value({ kind: "rest_rate_limited" })).toBe(1);
  });
});
