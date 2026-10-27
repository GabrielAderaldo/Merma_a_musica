import { describe, expect, test } from "bun:test";
import { MAX_VIOLATIONS, VIOLATION_RESET_MS, WS_RATE_LIMITS, WS_RATE_WINDOW_MS, WsRateLimiter, type RateVerdict } from "./rate-limit.ts";

const P1 = "player-1";
const P2 = "player-2";
const ROOM = "room-1";

const limiter = () => {
  let now = 0;
  const l = new WsRateLimiter(() => now);
  return { l, advance: (ms: number) => (now += ms) };
};

const burst = (l: WsRateLimiter, n: number, type: Parameters<WsRateLimiter["check"]>[2], player = P1, room = ROOM): RateVerdict[] =>
  Array.from({ length: n }, () => l.check(player, room, type));

describe("S-23 — rate limit do WS por (player_uuid, room_id)", () => {
  test.each([
    ["submit_answer", WS_RATE_LIMITS.submit_answer],
    ["autocomplete_search", WS_RATE_LIMITS.autocomplete_search],
  ] as const)("%s: %d por segundo; a seguinte é rate_limited", (type, limit) => {
    const { l } = limiter();
    expect(burst(l, limit, type).every((v) => v === "allowed")).toBe(true);
    expect(l.check(P1, ROOM, type)).toBe("rate_limited");
  });

  test("as demais mensagens somam 30/s entre si", () => {
    const { l } = limiter();
    burst(l, 15, "ping");
    burst(l, 15, "player_ready");
    expect(l.check(P1, ROOM, "vote_skip")).toBe("rate_limited");
  });

  test("cada limite é seu: submit_answer esgotado não bloqueia ping", () => {
    const { l } = limiter();
    burst(l, WS_RATE_LIMITS.submit_answer + 1, "submit_answer");
    expect(l.check(P1, ROOM, "ping")).toBe("allowed");
  });

  test("a chave é (player_uuid, room_id): outro jogador e outra sala têm a própria conta", () => {
    const { l } = limiter();
    burst(l, WS_RATE_LIMITS.submit_answer, "submit_answer");
    expect(l.check(P2, ROOM, "submit_answer")).toBe("allowed");
    expect(l.check(P1, "room-2", "submit_answer")).toBe("allowed");
  });

  test("a janela é fixa de 1s: na seguinte, a conta recomeça", () => {
    const { l, advance } = limiter();
    burst(l, WS_RATE_LIMITS.submit_answer, "submit_answer");
    advance(WS_RATE_WINDOW_MS);
    expect(burst(l, WS_RATE_LIMITS.submit_answer, "submit_answer").every((v) => v === "allowed")).toBe(true);
  });

  test("uma violação por janela: as demais recusadas da mesma janela são descartadas sem erro", () => {
    const { l } = limiter();
    const verdicts = burst(l, WS_RATE_LIMITS.submit_answer + 20, "submit_answer").slice(WS_RATE_LIMITS.submit_answer);
    expect(verdicts[0]).toBe("rate_limited");
    expect(verdicts.slice(1).every((v) => v === "dropped")).toBe(true);
  });

  test(`a ${MAX_VIOLATIONS}ª violação, em janelas distintas, é close`, () => {
    const { l, advance } = limiter();
    const violate = () => burst(l, WS_RATE_LIMITS.submit_answer + 1, "submit_answer").at(-1);
    expect(violate()).toBe("rate_limited");
    advance(WS_RATE_WINDOW_MS);
    expect(violate()).toBe("rate_limited");
    advance(WS_RATE_WINDOW_MS);
    expect(violate()).toBe("close");
  });

  test("a contagem de violações zera após 60s sem violação", () => {
    const { l, advance } = limiter();
    const violate = () => burst(l, WS_RATE_LIMITS.submit_answer + 1, "submit_answer").at(-1);
    violate();
    advance(WS_RATE_WINDOW_MS);
    violate();
    advance(VIOLATION_RESET_MS);
    expect(violate()).toBe("rate_limited");
    advance(WS_RATE_WINDOW_MS);
    expect(violate()).toBe("rate_limited");
  });

  test("o Map não cresce: chaves sem janela aberta nem violação recente saem", () => {
    const { l, advance } = limiter();
    for (let i = 0; i < 100; i++) l.check(`p${i}`, ROOM, "ping");
    burst(l, WS_RATE_LIMITS.submit_answer + 1, "submit_answer", P1);
    advance(WS_RATE_WINDOW_MS);
    l.check(P2, ROOM, "ping");
    // P1 fica: a violação dele ainda conta por 60s, inclusive se reconectar.
    expect(l.size).toBe(2);
    advance(VIOLATION_RESET_MS);
    l.check(P2, ROOM, "ping");
    expect(l.size).toBe(1);
  });
});
