// Rate limit do WS por (player_uuid, room_id), em janela fixa de 1s e em memória (um processo, ADR-0002). S-23.
// A chave é do jogador na sala, não da conexão: reconectar não zera a contagem.
// Decidido em 2026-10-26: estourar o limite conta uma violação por janela, por mais mensagens que passem; a
// contagem zera depois de 60s sem violação; a 3ª violação fecha com 4029.
import type { WsClientMessage } from "@merma/schema";

export const WS_RATE_LIMITS = { submit_answer: 10, autocomplete_search: 5, other: 30 } as const;
export const WS_RATE_WINDOW_MS = 1_000;
export const VIOLATION_RESET_MS = 60_000;
export const MAX_VIOLATIONS = 3;

type Bucket = keyof typeof WS_RATE_LIMITS;

// allowed: segue para o actor. rate_limited: 1ª mensagem recusada da janela, responde o erro. dropped: as
// demais recusadas da janela, descartadas em silêncio para não ecoar uma rajada. close: 3ª violação.
export type RateVerdict = "allowed" | "rate_limited" | "dropped" | "close";

type State = {
  windowStart: number;
  counts: Record<Bucket, number>;
  violatedThisWindow: boolean;
  violations: number;
  lastViolationAt: number;
};

const bucketOf = (type: WsClientMessage["type"]): Bucket =>
  type === "submit_answer" || type === "autocomplete_search" ? type : "other";

export class WsRateLimiter {
  readonly #now: () => number;
  readonly #states = new Map<string, State>();
  #lastSweep = Number.NEGATIVE_INFINITY;

  constructor(now: () => number) {
    this.#now = now;
  }

  get size(): number {
    return this.#states.size;
  }

  check(player: string, room: string, type: WsClientMessage["type"]): RateVerdict {
    const now = this.#now();
    this.#sweep(now);
    const key = `${player}:${room}`;
    const state = this.#states.get(key) ?? fresh(now);
    this.#states.set(key, state);
    if (now - state.windowStart >= WS_RATE_WINDOW_MS) {
      state.windowStart = now;
      state.counts = { submit_answer: 0, autocomplete_search: 0, other: 0 };
      state.violatedThisWindow = false;
    }
    const bucket = bucketOf(type);
    if (state.counts[bucket] < WS_RATE_LIMITS[bucket]) {
      state.counts[bucket]++;
      return "allowed";
    }
    if (state.violatedThisWindow) return "dropped";
    if (state.violations > 0 && now - state.lastViolationAt >= VIOLATION_RESET_MS) state.violations = 0;
    state.violatedThisWindow = true;
    state.violations++;
    state.lastViolationAt = now;
    return state.violations >= MAX_VIOLATIONS ? "close" : "rate_limited";
  }

  // No máximo uma varredura por janela, para o Map não crescer sem limite nem custar O(n) por mensagem.
  #sweep(now: number): void {
    if (now - this.#lastSweep < WS_RATE_WINDOW_MS) return;
    this.#lastSweep = now;
    for (const [key, s] of this.#states) {
      const windowOver = now - s.windowStart >= WS_RATE_WINDOW_MS;
      const violationsOver = s.violations === 0 || now - s.lastViolationAt >= VIOLATION_RESET_MS;
      if (windowOver && violationsOver) this.#states.delete(key);
    }
  }
}

const fresh = (now: number): State => ({
  windowStart: now,
  counts: { submit_answer: 0, autocomplete_search: 0, other: 0 },
  violatedThisWindow: false,
  violations: 0,
  lastViolationAt: now,
});
