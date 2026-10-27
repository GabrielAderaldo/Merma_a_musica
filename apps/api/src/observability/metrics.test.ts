import { describe, expect, test } from "bun:test";
import { Counter, createMetrics, Histogram, testMetrics } from "./metrics.ts";

const FORBIDDEN = ["player_uuid", "room_id", "match_id", "isrc"];
const UUID = "0b7c1a52-7f4e-4c2a-9d8e-3f1a2b4c5d6e";

describe("ADR-0010.R2 — label de métrica só de enum fechado", () => {
  test("nenhuma métrica declara player_uuid, room_id, match_id ou isrc como label", () => {
    const labels = testMetrics().all.flatMap((m) => m.labelNames);
    expect(labels.filter((l) => FORBIDDEN.includes(l))).toEqual([]);
  });

  test("valor fora do enum declarado não vira série", () => {
    const c = new Counter("merma_x_total", "x", { kind: ["a", "b"] });
    c.inc({ kind: "a" });
    c.inc({ kind: UUID });
    expect(c.render()).toBe('# HELP merma_x_total x\n# TYPE merma_x_total counter\nmerma_x_total{kind="a"} 1');
  });

  test("a saída inteira não carrega nenhum UUID, mesmo depois de eventos com UUID no valor", () => {
    const metrics = testMetrics();
    metrics.securityEvents.inc({ kind: UUID as never });
    metrics.deezerRequests.inc({ status: UUID as never });
    expect(metrics.render()).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});

describe("/metrics no formato Prometheus (ADR-0010)", () => {
  test("todas as métricas do ADR-0010 existem, com o prefixo merma_", () => {
    const names = testMetrics().all.map((m) => m.name);
    expect(names.toSorted()).toEqual(
      [
        "rooms_active",
        "ws_connections",
        "submit_answer_duration_seconds",
        "round_duration_seconds",
        "audio_first_byte_seconds",
        "deezer_request_total",
        "deezer_resolve_duration_seconds",
        "redis_snapshot_total",
        "recovery_total",
        "security_event_total",
        "suspicious_pattern_total",
        "process_memory_bytes",
      ]
        .map((n) => `merma_${n}`)
        .toSorted(),
    );
  });

  test("gauges leem a fonte na hora da coleta", () => {
    let connections = 1;
    const metrics = createMetrics({
      roomsByPhase: () => ({ empty: 0, lobby: 2, in_match: 1, finished: 0 }),
      wsConnections: () => connections,
      memoryBytes: () => 42,
    });
    connections = 5;
    const out = metrics.render();
    expect(out).toContain('merma_rooms_active{phase="lobby"} 2');
    expect(out).toContain("merma_ws_connections 5");
    expect(out).toContain("merma_process_memory_bytes 42");
  });

  test("contador sem label aparece com 0 antes do primeiro evento", () => {
    expect(testMetrics().render()).toContain("merma_recovery_total 0");
  });

  test("histograma acumula os buckets, a soma e a contagem", () => {
    const h = new Histogram("merma_t_seconds", "t", [0.1, 1]);
    h.observe(0.05);
    h.observe(0.5);
    h.observe(3);
    expect(h.render().split("\n").slice(2)).toEqual([
      'merma_t_seconds_bucket{le="0.1"} 1',
      'merma_t_seconds_bucket{le="1"} 2',
      'merma_t_seconds_bucket{le="+Inf"} 3',
      "merma_t_seconds_sum 3.55",
      "merma_t_seconds_count 3",
    ]);
  });
});
