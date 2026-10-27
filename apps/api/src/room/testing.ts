// Fakes das portas do Orchestrator para os testes: relógio manual, IDs determinísticos, playlists, áudio e Postgres.
import { expect } from "bun:test";
import {
  err,
  MatchId,
  ok,
  PlayerUuid,
  RoomId,
  RoundId,
  Timestamp,
  type PlaylistId,
  type Result,
  type RoundId as RoundIdType,
  type Song,
  type Timestamp as TimestampType,
} from "@merma/domain";
import { WsServerMessage } from "@merma/schema";
import type { ServerSocket } from "../http/socket.ts";
import { testMetrics } from "../observability/metrics.ts";
import { soloRecords } from "../progression/solo.ts";
import { MemoryProgressionStore } from "../progression/store.ts";
import { captureLogs } from "../testing.ts";
import type { ActorDeps } from "./actor.ts";
import { MemoryMatchRepository } from "./match-store.ts";
import type {
  AudioResolver,
  Cancel,
  Clock,
  CompletedMatch,
  Ids,
  MatchRepository,
  ResolvedAudio,
  SoloRecords,
  SongSource,
} from "./ports.ts";
import { MemorySnapshotStore } from "./snapshot-store.ts";

const unwrap = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) expect.unreachable(`esperava ok, veio err(${String(r.error)})`);
  return r.value;
};

const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
export const player = (n: number) => unwrap(PlayerUuid(uuid(n)));
export const PLAYLIST = uuid(5000);

// Timers rodam só quando o teste avança o tempo, na ordem do vencimento.
export class FakeClock implements Clock {
  #now: number;
  #seq = 0;
  readonly #timers = new Map<number, { at: number; run: () => void }>();

  constructor(start = 1_000_000) {
    this.#now = start;
  }

  now = (): TimestampType => unwrap(Timestamp(this.#now));

  schedule = (delayMs: number, run: () => void): Cancel => {
    const id = this.#seq++;
    this.#timers.set(id, { at: this.#now + delayMs, run });
    return () => this.#timers.delete(id);
  };

  // Avança até `ms` depois de agora; depois de cada timer, espera `settle` (a fila do actor) antes do próximo.
  async advance(ms: number, settle: () => Promise<void> = async () => {}): Promise<void> {
    const target = this.#now + ms;
    for (;;) {
      await settle();
      const due = [...this.#timers].filter(([, t]) => t.at <= target).sort(([a, x], [b, y]) => x.at - y.at || a - b)[0];
      if (due === undefined) break;
      const [id, timer] = due;
      this.#timers.delete(id);
      this.#now = Math.max(this.#now, timer.at);
      timer.run();
    }
    this.#now = target;
    await settle();
  }

  get pending(): number {
    return this.#timers.size;
  }
}

export const fakeIds = (): Ids => {
  let n = 0;
  return {
    roomId: () => unwrap(RoomId(uuid(7000 + n++))),
    matchId: () => unwrap(MatchId(uuid(9000 + n++))),
    roundId: () => unwrap(RoundId(uuid(1000 + n++))),
    seed: () => "seed",
    inviteCode: () => "ABC123",
  };
};

export const song = (owner: PlayerUuid, name: string, artist: string): Song => ({
  isrc: null,
  name,
  artist,
  album: null,
  cover_url: null,
  contributed_by: owner,
  source_platform: "deezer",
});

// `count` músicas por jogador, "Musica <jogador> <i>" de "Artista <jogador>".
export class FakeSongs implements SongSource {
  count: number;
  // Atraso opcional, para provar que a fila do actor segura as mensagens seguintes (ADR-0002.R1).
  delay: Promise<void> | null = null;

  constructor(count = 20) {
    this.count = count;
  }

  playlist = async (owner: PlayerUuid, _id: PlaylistId) => {
    if (this.delay !== null) await this.delay;
    if (this.count === 0) return err("no_playlists_imported" as const);
    const tag = owner.slice(-2);
    const songs = Array.from({ length: this.count }, (_, i) => song(owner, `Musica ${tag} ${i}`, `Artista ${tag}`));
    return ok({ platform: "deezer" as const, playable_songs: songs.length, songs });
  };
}

// Um frame MP3 qualquer: o actor não abre o áudio.
export const FAKE_MP3 = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);

export class FakeAudio implements AudioResolver {
  // Nomes de música sem áudio (R-307).
  readonly unplayable = new Set<string>();
  readonly tokens: string[] = [];
  readonly expiries: number[] = [];

  resolve = async (_round: RoundIdType, s: Song): Promise<ResolvedAudio | null> =>
    this.unplayable.has(s.name) ? null : { mp3: FAKE_MP3 };

  token = (p: PlayerUuid, round: RoundIdType, expires_at: number) => {
    this.expiries.push(expires_at);
    const token = `tok:${p.slice(-2)}:${round.slice(-4)}:${this.tokens.length}`;
    this.tokens.push(token);
    return token;
  };
}

export class FakeMatches implements MatchRepository {
  readonly saved: CompletedMatch[] = [];
  // Momentos em que o repositório foi chamado, com o estado da sala naquele instante (ADR-0006.R1).
  readonly calls: string[] = [];
  stateAtCall: () => string = () => "";
  readonly #store = new MemoryMatchRepository();

  saveCompleted = async (match: CompletedMatch) => {
    this.calls.push(this.stateAtCall());
    this.saved.push(match);
    return this.#store.saveCompleted(match);
  };
  history = (player: string) => this.#store.history(player);
  anonymize = (player: string) => this.#store.anonymize(player);
}

// A Progression de verdade sobre a memória, com o registro das chamadas e uma falha opcional.
export class FakeSolo implements SoloRecords {
  readonly store = new MemoryProgressionStore();
  readonly calls: string[] = [];
  stateAtCall: () => string = () => "";
  fail = false;

  complete: SoloRecords["complete"] = async (match, playlist_id) => {
    this.calls.push(this.stateAtCall());
    if (this.fail) return err("store_unavailable");
    return soloRecords(this.store).complete(match, playlist_id);
  };
}

// Um "processo" novo que reaproveita o relógio e o Redis de outro passa os dois aqui.
export const actorDeps = (shared: { clock?: FakeClock; snapshots?: MemorySnapshotStore } = {}) => {
  const clock = shared.clock ?? new FakeClock();
  const snapshots = shared.snapshots ?? new MemorySnapshotStore();
  const songs = new FakeSongs();
  const audio = new FakeAudio();
  const matches = new FakeMatches();
  const solo = new FakeSolo();
  const logs = captureLogs();
  const metrics = testMetrics();
  const deps: ActorDeps = { clock, ids: fakeIds(), logger: logs.logger, snapshots, songs, audio, matches, solo, metrics };
  return { deps, clock, snapshots, songs, audio, matches, solo, metrics, lines: logs.lines };
};

// Socket falso: guarda o que o servidor mandou, já validado pelo contrato do fio (ADR-0014.R2).
export class FakeSocket implements ServerSocket {
  readonly sent: WsServerMessage[] = [];
  closedWith: number | null = null;

  send = (data: string) => {
    this.sent.push(WsServerMessage.parse(JSON.parse(data)));
  };

  close = (code: number) => {
    this.closedWith = code;
  };

  of<T extends WsServerMessage["type"]>(type: T): Extract<WsServerMessage, { type: T }>[] {
    return this.sent.filter((m): m is Extract<WsServerMessage, { type: T }> => m.type === type);
  }

  last<T extends WsServerMessage["type"]>(type: T): Extract<WsServerMessage, { type: T }> | undefined {
    return this.of(type).at(-1);
  }
}
