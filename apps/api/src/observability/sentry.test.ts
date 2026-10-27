import { afterAll, describe, expect, test } from "bun:test";
import * as Sentry from "@sentry/bun";
import type { ErrorEvent } from "@sentry/bun";
import { createLogger } from "../http/logger.ts";
import { sanitizeEvent, sentryReporter } from "./sentry.ts";

const UUID = "0b7c1a52-7f4e-4c2a-9d8e-3f1a2b4c5d6e";
const SECRETS = ["Evidências", "Camila", "s3cr3t-cookie", "refresh-abc", "tok_audio_123", UUID, "10.0.0.7", "host-da-vps"];

const dirty = (): ErrorEvent => ({
  type: undefined,
  event_id: "e1",
  level: "error",
  server_name: "host-da-vps",
  message: `falhou para ${UUID}`,
  request: { url: "https://merma.test/api/v1/audio/tok_audio_123", headers: { cookie: "__Host-session=s3cr3t-cookie" } },
  user: { id: UUID, ip_address: "10.0.0.7" },
  breadcrumbs: [{ message: "GET /api/v1/audio/tok_audio_123" }],
  tags: { event: "audio_proxy_failed", nickname: "Camila" },
  extra: { answer_text: "Evidências", nested: { refresh_token: "refresh-abc" }, round_index: 3 },
  contexts: { runtime: { name: "bun", version: "1.4.4" }, os: { name: "host-da-vps" } },
  exception: {
    values: [
      {
        type: "Error",
        value: `duplicate key (player_uuid)=(${UUID})`,
        stacktrace: { frames: [{ filename: "/app/src/x.ts", function: "f", lineno: 1, vars: { answer_text: "Evidências" }, context_line: "const nickname = 'Camila'" }] },
      },
    ],
  },
});

describe("ADR-0010.R3 — o payload é sanitizado antes de ir ao Sentry", () => {
  test("beforeSend por allowlist: some request, user, breadcrumbs, server_name, vars e contexto de código", () => {
    const clean = sanitizeEvent(dirty());
    const json = JSON.stringify(clean);
    for (const s of SECRETS) expect(json).not.toContain(s);
    expect(clean).toMatchObject({
      level: "error",
      tags: { event: "audio_proxy_failed" },
      extra: { round_index: 3 },
      contexts: { runtime: { name: "bun" } },
      exception: { values: [{ type: "Error", value: "duplicate key (player_uuid)=([uuid])", stacktrace: { frames: [{ filename: "/app/src/x.ts", lineno: 1 }] } }] },
    });
  });

  describe("ponta a ponta, do logger.error ao envelope do SDK", () => {
    const envelopes: string[] = [];
    const reporter = sentryReporter({
      dsn: "https://public@o1.ingest.sentry.io/1",
      release: "0.0.0-test",
      environment: "test",
      transport: () => ({
        send: async (envelope) => {
          envelopes.push(JSON.stringify(envelope));
          return {};
        },
        flush: async () => true,
      }),
    });
    afterAll(() => Sentry.close());

    test("o erro chega com a stack e o nome do evento, sem answer_text, nickname, token nem UUID", async () => {
      const logger = createLogger({ level: "error", write: () => {}, onError: reporter.report });
      logger.error("audio_proxy_failed", {
        error: new Error(`resolver caiu para ${UUID}`),
        answer_text: "Evidências",
        nickname: "Camila",
        audio_token: "tok_audio_123",
        status: 502,
      });
      await reporter.flush();
      const sent = envelopes.join("\n");
      expect(sent).toContain("audio_proxy_failed");
      expect(sent).toContain("resolver caiu para [uuid]");
      expect(sent).toContain('"status":502');
      for (const s of SECRETS) expect(sent).not.toContain(s);
    });
  });
});
