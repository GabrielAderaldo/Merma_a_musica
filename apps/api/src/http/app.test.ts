import { describe, expect, test } from "bun:test";
import { HealthResponse } from "@merma/schema";
import { captureLogs, ORIGIN, testApp } from "../testing.ts";

describe("GET /health", () => {
  test("responde no contrato HealthResponse, com uptime em segundos inteiros", async () => {
    let now = 0;
    const app = testApp({ now: () => now });
    now = 61_900;
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(HealthResponse.parse(await res.json())).toEqual({ status: "ok", uptime_seconds: 61, version: "0.0.0-test" });
  });
});

describe("middlewares (ordem do ADR-0002)", () => {
  test("secureHeaders responde em toda rota", async () => {
    const res = await testApp().request("/nao-existe");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("CORS só libera o origin da allowlist, com credenciais", async () => {
    const allowed = await testApp().request("/health", { headers: { origin: ORIGIN } });
    expect(allowed.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(allowed.headers.get("access-control-allow-credentials")).toBe("true");
    const other = await testApp().request("/health", { headers: { origin: "https://evil.test" } });
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });

  test("X-Request-Id do cliente é ignorado: o trace_id é do servidor", async () => {
    const { logger, lines } = captureLogs();
    const res = await testApp({ logger }).request("/health", { headers: { "x-request-id": "forjado" } });
    expect(res.headers.get("x-request-id")).toBeNull();
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(lines.at(-1)).toMatchObject({ event: "http_request", trace_id: expect.stringMatching(UUID) });
  });

  test("erro não tratado vira 500 internal_error, logado sem vazar a mensagem ao cliente", async () => {
    const { logger, lines } = captureLogs();
    const app = testApp({ logger });
    app.get("/boom", () => {
      throw new Error("detalhe interno");
    });
    const res = await app.request("/boom");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ code: "internal_error", message: "erro interno" });
    expect(lines).toContainEqual(expect.objectContaining({ event: "unhandled_error", route: "/boom" }));
  });
});
