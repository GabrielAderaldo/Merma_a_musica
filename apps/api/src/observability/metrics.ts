// Métricas no formato texto do Prometheus, servidas em GET /metrics (ADR-0010). Registro próprio, sem dependência:
// contadores, gauges lidos na hora da coleta e histogramas, todos com prefixo merma_.
// ADR-0010.R2: label só de enum fechado. O nome do label é um tipo fechado (LabelName) e o valor vem de uma lista
// declarada junto com a métrica; valor fora da lista é descartado, então player_uuid, room_id, match_id ou isrc
// nunca viram série.

export type LabelName = "phase" | "status" | "result" | "kind";

type Labels<L extends LabelName> = { readonly [K in L]: string };

const PREFIX = "merma_";

const escapeHelp = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
const renderLabels = (labels: Readonly<Record<string, string>>) => {
  const entries = Object.entries(labels);
  return entries.length === 0 ? "" : `{${entries.map(([k, v]) => `${k}="${v}"`).join(",")}}`;
};

interface Metric {
  readonly name: string;
  readonly labelNames: readonly LabelName[];
  render(): string;
}

export class Counter<L extends LabelName = never> implements Metric {
  readonly #values = new Map<string, { labels: Labels<L>; value: number }>();
  constructor(
    readonly name: string,
    readonly help: string,
    readonly allowed: { readonly [K in L]: readonly string[] },
  ) {}

  get labelNames(): readonly LabelName[] {
    return Object.keys(this.allowed) as LabelName[];
  }

  inc(...[labels]: [L] extends [never] ? [] : [Labels<L>]): void {
    const l = (labels ?? {}) as Labels<L>;
    if (!allowedValues(this.allowed, l)) return;
    const key = JSON.stringify(l);
    const current = this.#values.get(key);
    this.#values.set(key, { labels: l, value: (current?.value ?? 0) + 1 });
  }

  value(...[labels]: [L] extends [never] ? [] : [Labels<L>]): number {
    return this.#values.get(JSON.stringify(labels ?? {}))?.value ?? 0;
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${escapeHelp(this.help)}`, `# TYPE ${this.name} counter`];
    // Sem rótulo, a série existe desde o início com 0, para o Prometheus ver a métrica antes do primeiro evento.
    if (this.labelNames.length === 0 && this.#values.size === 0) lines.push(`${this.name} 0`);
    for (const { labels, value } of this.#values.values()) lines.push(`${this.name}${renderLabels(labels)} ${value}`);
    return lines.join("\n");
  }
}

export class Gauge<L extends LabelName = never> implements Metric {
  constructor(
    readonly name: string,
    readonly help: string,
    readonly allowed: { readonly [K in L]: readonly string[] },
    // Lido na hora da coleta: o gauge não guarda estado.
    readonly collect: () => ReadonlyArray<{ labels: Labels<L>; value: number }>,
  ) {}

  get labelNames(): readonly LabelName[] {
    return Object.keys(this.allowed) as LabelName[];
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${escapeHelp(this.help)}`, `# TYPE ${this.name} gauge`];
    for (const { labels, value } of this.collect()) {
      if (allowedValues(this.allowed, labels)) lines.push(`${this.name}${renderLabels(labels)} ${value}`);
    }
    return lines.join("\n");
  }
}

// Segundos. Os buckets cobrem de 5 ms (submit_answer) a 1 min (rodada de 60s, R-401).
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60] as const;

export class Histogram implements Metric {
  readonly labelNames: readonly LabelName[] = [];
  readonly #counts: number[];
  #sum = 0;
  #count = 0;

  constructor(
    readonly name: string,
    readonly help: string,
    readonly buckets: readonly number[] = DEFAULT_BUCKETS,
  ) {
    this.#counts = buckets.map(() => 0);
  }

  observe(seconds: number): void {
    this.#sum += seconds;
    this.#count++;
    this.buckets.forEach((le, i) => {
      if (seconds <= le) this.#counts[i] = (this.#counts[i] ?? 0) + 1;
    });
  }

  get count(): number {
    return this.#count;
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${escapeHelp(this.help)}`, `# TYPE ${this.name} histogram`];
    this.buckets.forEach((le, i) => lines.push(`${this.name}_bucket{le="${le}"} ${this.#counts[i] ?? 0}`));
    lines.push(`${this.name}_bucket{le="+Inf"} ${this.#count}`, `${this.name}_sum ${this.#sum}`, `${this.name}_count ${this.#count}`);
    return lines.join("\n");
  }
}

const allowedValues = (allowed: Readonly<Record<string, readonly string[]>>, labels: Readonly<Record<string, string>>) =>
  Object.keys(labels).length === Object.keys(allowed).length &&
  Object.entries(labels).every(([k, v]) => allowed[k]?.includes(v) === true);

// Os enums fechados dos labels.
// O RoomState da sala viva; terminated sai do registry na hora.
export const ROOM_PHASES = ["empty", "lobby", "in_match", "finished"] as const;
export const DEEZER_STATUSES = ["2xx", "4xx", "429", "5xx", "network_error"] as const;
export const SNAPSHOT_RESULTS = ["ok", "failed"] as const;
export const SECURITY_EVENT_KINDS = [
  "origin_not_allowed",
  "invalid_payload",
  "ws_rate_limited",
  "rest_rate_limited",
  "audio_token_rejected",
] as const;

export type SecurityEventKind = (typeof SECURITY_EVENT_KINDS)[number];
export type DeezerStatus = (typeof DEEZER_STATUSES)[number];

// O que /metrics lê na hora da coleta e não tem dono aqui.
export type MetricSources = Readonly<{
  roomsByPhase: () => Readonly<Record<(typeof ROOM_PHASES)[number], number>>;
  wsConnections: () => number;
  memoryBytes: () => number;
}>;

// A lista de métricas do ADR-0010, item 3.
export const createMetrics = (sources: MetricSources) => {
  const m = (name: string) => `${PREFIX}${name}`;
  const metrics = {
    roomsActive: new Gauge(m("rooms_active"), "Salas abertas, por fase", { phase: ROOM_PHASES }, () =>
      Object.entries(sources.roomsByPhase()).map(([phase, value]) => ({ labels: { phase }, value })),
    ),
    wsConnections: new Gauge(m("ws_connections"), "Conexões WebSocket abertas", {}, () => [{ labels: {}, value: sources.wsConnections() }]),
    submitAnswerDuration: new Histogram(m("submit_answer_duration_seconds"), "Tempo do servidor para processar um submit_answer"),
    roundDuration: new Histogram(m("round_duration_seconds"), "Duração da rodada, do round_starting ao round_ended"),
    audioFirstByte: new Histogram(m("audio_first_byte_seconds"), "Tempo do proxy de áudio até o primeiro byte"),
    deezerRequests: new Counter(m("deezer_request_total"), "Requisições à API da Deezer, por classe de status", { status: DEEZER_STATUSES }),
    deezerResolveDuration: new Histogram(m("deezer_resolve_duration_seconds"), "Tempo para resolver o preview de uma música na Deezer"),
    redisSnapshots: new Counter(m("redis_snapshot_total"), "Gravações de snapshot de sala, por resultado", { result: SNAPSHOT_RESULTS }),
    recoveries: new Counter(m("recovery_total"), "Salas recuperadas do snapshot ao subir", {}),
    securityEvents: new Counter(m("security_event_total"), "Eventos de segurança, por tipo (docs/security.md)", { kind: SECURITY_EVENT_KINDS }),
    // S-26: só contagem, sem ação automática no MVP.
    suspiciousPatterns: new Counter(m("suspicious_pattern_total"), "Jogador com 100% de acerto e tempo médio abaixo de 1s numa partida", {}),
    processMemory: new Gauge(m("process_memory_bytes"), "Memória residente do processo", {}, () => [{ labels: {}, value: sources.memoryBytes() }]),
  };
  const all: readonly Metric[] = Object.values(metrics);
  return { ...metrics, all, render: () => `${all.map((x) => x.render()).join("\n")}\n` };
};

export type Metrics = ReturnType<typeof createMetrics>;

// Métricas sem fonte, para os testes e para quem não lê gauges.
export const testMetrics = (): Metrics =>
  createMetrics({ roomsByPhase: () => ({ empty: 0, lobby: 0, in_match: 0, finished: 0 }), wsConnections: () => 0, memoryBytes: () => 0 });
