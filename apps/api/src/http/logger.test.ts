import { describe, expect, test } from "bun:test";
import { createLogger } from "./logger.ts";
import { captureLogs, testApp } from "../testing.ts";

describe("ADR-0010.R1 — o log nunca leva answer_text, nickname, cookie nem token", () => {
  test("campos proibidos somem em qualquer profundidade; o resto fica", () => {
    const { logger, lines } = captureLogs();
    logger.info("answer_submitted", {
      player_uuid: "4c0d3f4e-1111-4222-8333-944455556666",
      answer_text: "Asa Branca",
      nickname: "Zé",
      payload: { answer_text: "Asa Branca", is_correct: true, nested: [{ refresh_token: "r", ok: 1 }] },
      headers: { cookie: "__Host-session=x", Authorization: "Bearer y", accept: "*/*" },
      access_token: "a",
      audio_token: "b",
      session_secret: "c",
    });
    expect(lines).toEqual([
      {
        player_uuid: "4c0d3f4e-1111-4222-8333-944455556666",
        payload: { is_correct: true, nested: [{ ok: 1 }] },
        headers: { accept: "*/*" },
        ts: expect.any(String),
        level: "info",
        event: "answer_submitted",
      },
    ]);
  });

  test("o log de requisição usa a rota, não o path com o audio_token", async () => {
    const { logger, lines } = captureLogs();
    const app = testApp({ logger });
    await app.request("/api/v1/audio/segredo-do-token");
    expect(JSON.stringify(lines)).not.toContain("segredo-do-token");
    expect(lines.at(-1)).toMatchObject({ event: "http_request", route: "/api/v1/audio/:audio_token", status: 401 });
  });

  test("o header Cookie da requisição não aparece no log", async () => {
    const { logger, lines } = captureLogs();
    await testApp({ logger }).request("/auth/me", { headers: { cookie: "__Host-session=valor-secreto" } });
    expect(JSON.stringify(lines)).not.toContain("valor-secreto");
  });
});

describe("logger", () => {
  test("respeita o nível e não deixa campo do evento sobrescrever ts, level e event", () => {
    const lines: string[] = [];
    const logger = createLogger({ level: "warn", write: (l) => lines.push(l), now: () => 0 });
    logger.info("ignorado");
    logger.warn("valeu", { level: "debug", event: "outro" });
    expect(lines.map((l) => JSON.parse(l))).toEqual([{ ts: "1970-01-01T00:00:00.000Z", level: "warn", event: "valeu" }]);
  });
});
