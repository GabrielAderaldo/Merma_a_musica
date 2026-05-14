---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Spec — `@merma/domain` (Game Engine)

> Implementação detalhada da lógica do jogo. Pure functions, zero I/O, zero dependências externas (exceto `@merma/schema`).
>
> Esta spec é **normativa**. Tudo aqui é referenciável como autoridade. Quando o código diverge, o código está errado.

## Sumário

1. [Princípios de implementação](#1-princípios-de-implementação)
2. [Tipos fundamentais](#2-tipos-fundamentais)
3. [Estruturas de domínio](#3-estruturas-de-domínio)
4. [Funções públicas](#4-funções-públicas)
5. [Algoritmos críticos](#5-algoritmos-críticos)
6. [Invariantes](#6-invariantes)
7. [Estratégia de testes](#7-estratégia-de-testes)

---

## 1. Princípios de Implementação

### 1.1 Functional core, imperative shell

- **`packages/domain` é puro**: dado o mesmo input, mesmo output. Sem estado global, sem I/O, sem `Date.now()` chamado internamente (passe `now` como parâmetro).
- **Side-effects vivem em `apps/api`**: o Game Orchestrator pega o `Result<NewState, Error>` da engine e aplica (persistir, broadcast, agendar timer).

### 1.2 Result em vez de throw

```typescript
type Result<T, E> = Readonly<
  | { ok: true; value: T }
  | { ok: false; error: E }
>;

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

**Nunca `throw`** em `packages/domain`. Erro inesperado (`unreachable`, `impossible`) → ainda assim retorna `err`, com tipo de erro `InternalDomainError` documentado.

### 1.3 Immutability total

- `Readonly<T>` em todo tipo exportado.
- `readonly T[]` para arrays.
- `as const` para literais.
- **Não usar** `Object.freeze` — confiar no compilador (`strict: true` + `noImplicitAny`).
- Mutação ≡ retornar nova versão: `{ ...state, scores: { ...state.scores, [uuid]: newScore } }`.

### 1.4 Branded types

Nominal typing para IDs e strings críticas:

```typescript
type Brand<T, B> = T & { readonly __brand: B };

type PlayerUuid     = Brand<string, "PlayerUuid">;
type RoomId         = Brand<string, "RoomId">;
type MatchId        = Brand<string, "MatchId">;
type RoundId        = Brand<string, "RoundId">;
type InviteCode     = Brand<string, "InviteCode">;
type Isrc           = Brand<string, "Isrc">;
type AudioToken     = Brand<string, "AudioToken">;
type PlaylistId     = Brand<string, "PlaylistId">;
```

Smart constructors em `packages/domain/shared/brand.ts`:

```typescript
export const PlayerUuid = (s: string): Result<PlayerUuid, "invalid_uuid"> => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
    ? ok(s as PlayerUuid)
    : err("invalid_uuid");
};

export const InviteCode = (s: string): Result<InviteCode, "invalid_invite_code"> => {
  return /^[A-Z0-9]{6}$/.test(s) ? ok(s as InviteCode) : err("invalid_invite_code");
};
```

### 1.5 Estrutura de pastas

```
packages/domain/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              ← public API
│   ├── shared/
│   │   ├── result.ts         ← Result + ok/err
│   │   ├── brand.ts          ← Brand + smart constructors
│   │   └── time.ts           ← Duration, Timestamp (também branded)
│   ├── match/
│   │   ├── types.ts          ← Match, MatchConfiguration, GameMode, ...
│   │   ├── configure.ts      ← configureMatch()
│   │   ├── start.ts          ← startMatch()
│   │   └── end.ts            ← endMatch()
│   ├── round/
│   │   ├── types.ts          ← Round, RoundState, Answer
│   │   ├── start.ts          ← startRound()
│   │   ├── submit.ts         ← submitAnswer()
│   │   ├── evaluate.ts       ← evaluateAnswer()
│   │   ├── score.ts          ← calculatePoints() (Simple + SpeedBonus)
│   │   ├── skip.ts           ← voteSkip(), shouldEndRound()
│   │   └── end.ts            ← endRound()
│   ├── pool/
│   │   ├── types.ts          ← Pool, NormalizedSong
│   │   ├── distribute.ts     ← distributePool() (round-robin)
│   │   └── select.ts         ← selectNextSong()
│   ├── fuzzy/
│   │   ├── normalize.ts      ← normalizeText()
│   │   ├── levenshtein.ts    ← levenshteinDistance()
│   │   └── match.ts          ← fuzzyMatch()
│   ├── highlights/
│   │   └── compute.ts        ← computeHighlights()
│   └── solo/
│       └── recordCompare.ts  ← compareWithPersonalBest()
└── tests/
    └── (mirror of src/)
```

---

## 2. Tipos Fundamentais

### 2.1 `Result<T, E>`

Ver §1.2. Helpers utilitários em `shared/result.ts`:

```typescript
export const map = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  r.ok ? ok(f(r.value)) : r;

export const flatMap = <T, U, E>(
  r: Result<T, E>,
  f: (t: T) => Result<U, E>,
): Result<U, E> => (r.ok ? f(r.value) : r);

export const combine = <T extends readonly Result<unknown, unknown>[]>(
  ...rs: T
): Result<UnwrapAll<T>, ExtractError<T[number]>> => { /* ... */ };
```

### 2.2 `Timestamp` & `Duration`

```typescript
type Timestamp = Brand<number, "Timestamp">;   // ms desde epoch UTC
type Duration  = Brand<number, "Duration">;    // ms

export const Timestamp = (n: number): Result<Timestamp, "invalid_timestamp"> =>
  Number.isFinite(n) && n >= 0 ? ok(n as Timestamp) : err("invalid_timestamp");

export const Duration = (n: number): Result<Duration, "invalid_duration"> =>
  Number.isFinite(n) && n >= 0 ? ok(n as Duration) : err("invalid_duration");

export const elapsed = (start: Timestamp, end: Timestamp): Duration =>
  (Math.max(0, end - start)) as Duration;
```

**Regra fundamental:** funções da engine recebem `now: Timestamp` como parâmetro **explícito**. Nunca lêem o clock internamente.

---

## 3. Estruturas de Domínio

### 3.1 `MatchConfiguration`

```typescript
type AnswerType   = "song" | "artist" | "both";
type ScoringRule  = "simple" | "speed_bonus";
type GameMode     = "multiplayer" | "solo";

type MatchConfiguration = Readonly<{
  time_per_round: Duration;     // 10s–60s
  total_songs: number;          // dentro do range dinâmico
  answer_type: AnswerType;      // default: "both"
  allow_repeats: boolean;       // default: false
  scoring_rule: ScoringRule;    // default: "speed_bonus"
  game_mode: GameMode;          // default: "multiplayer"
}>;
```

**Validação** (`configure.ts`):

```typescript
type ConfigError =
  | "time_per_round_out_of_range"        // <10s ou >60s
  | "total_songs_out_of_range"           // fora do range dinâmico calculado
  | "invalid_answer_type"
  | "invalid_scoring_rule"
  | "invalid_game_mode";

export const configureMatch = (
  currentMatch: Match,
  input: unknown,                        // raw do client; validado aqui
  playerCount: number,
  playersWithPlaylistCount: number,
): Result<Match, ConfigError>;
```

### 3.2 `Match`

```typescript
type MatchState =
  | "configuring"          // host configurando no lobby (não há Match real ainda; placeholder)
  | "starting"             // countdown 3s
  | "in_match"             // rodada ativa
  | "reveal"               // 3s pós-rodada
  | "finished";            // ranking exibido

type Match = Readonly<{
  match_id: MatchId;
  room_id: RoomId;
  state: MatchState;
  config: MatchConfiguration;
  host_uuid: PlayerUuid;
  players: ReadonlyArray<PlayerInMatch>;
  rounds: ReadonlyArray<Round>;           // pode estar parcial durante in_match
  current_round_index: number | null;     // 0-based; null se state ∉ {in_match, reveal}
  scores: Readonly<Record<PlayerUuid, number>>;
  started_at: Timestamp | null;
  ended_at: Timestamp | null;
}>;
```

### 3.3 `PlayerInMatch`

```typescript
type PlayerInMatch = Readonly<{
  player_uuid: PlayerUuid;
  nickname: string;
  is_host: boolean;
  ready: boolean;                         // ignorado se is_host (host é sempre ready)
  afk: boolean;
  connection_status: "connected" | "reconnecting" | "disconnected";
  has_playlist: boolean;
  platform: "spotify" | "deezer" | "youtube_music" | null;
  current_streak: number;
  best_streak_in_match: number;
}>;
```

### 3.4 `Round`

```typescript
type RoundState =
  | "resolving"        // selecionando música
  | "streaming"        // áudio sendo preparado
  | "grace_period"    // 3s antes do timer começar
  | "timer_running"
  | "reveal"
  | "ended";

type Round = Readonly<{
  round_id: RoundId;
  round_index: number;                    // 0-based dentro do Match
  state: RoundState;
  song: Song;
  answers: ReadonlyArray<Answer>;
  skip_votes: ReadonlyArray<PlayerUuid>;
  timer_started_at: Timestamp | null;     // null antes do grace_period acabar
  timer_duration: Duration;
  ended_at: Timestamp | null;
}>;
```

### 3.5 `Song`

```typescript
type Song = Readonly<{
  isrc: Isrc | null;                      // pode faltar para faixas obscuras
  name: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
  contributed_by: PlayerUuid;             // dono da música
  source_platform: "spotify" | "deezer" | "youtube_music";
  // resolved_deezer_id é detalhe de áudio, não do domínio puro
}>;
```

### 3.6 `Answer`

```typescript
type Answer = Readonly<{
  player_uuid: PlayerUuid;
  answer_text: string;                    // raw do client
  submitted_at: Timestamp;
  is_correct: boolean;
  points_earned: number;
  response_time: Duration | null;         // null se não respondeu
}>;
```

Em `state ∈ {resolving, streaming, grace_period, timer_running}`: `answers` contém apenas as submissões em andamento; `is_correct` e `points_earned` são placeholders (`false` e `0`) **até** a transição para `reveal` onde tudo é re-calculado.

---

## 4. Funções Públicas

API de `packages/domain` (re-exportada via `src/index.ts`).

### 4.1 Configuração e início

```typescript
export const configureMatch: (
  match: Match,
  config: MatchConfiguration,
  playerCount: number,
  playersWithPlaylistCount: number,
) => Result<Match, ConfigError>;

export const startMatch: (
  match: Match,
  pool: Pool,
  now: Timestamp,
) => Result<Match, StartMatchError>;
// StartMatchError = "not_enough_players_in_pool" | "no_playlists_imported" | "already_started"
```

### 4.2 Rodada

```typescript
export const startRound: (
  match: Match,
  song: Song,
  now: Timestamp,
) => Result<Match, "no_match_active" | "invalid_round_index">;

export const submitAnswer: (
  match: Match,
  player_uuid: PlayerUuid,
  answer_text: string,
  now: Timestamp,
) => Result<Match, SubmitError>;
// SubmitError = "round_not_accepting_answers" | "player_not_in_match" | "is_host_and_solo_mode" /* host não responde no solo? VERIFICAR — ver invariantes */

export const voteSkip: (
  match: Match,
  player_uuid: PlayerUuid,
) => Result<Match, "round_not_accepting_skip" | "player_already_voted" | "player_not_answered_yet">;

export const shouldEndRound: (match: Match, now: Timestamp) => Result<boolean, never>;
// retorna ok(true) se: timer expirou OU todos responderam + maioria votou skip

export const endRound: (
  match: Match,
  reason: "timer_expired" | "majority_skip",
  now: Timestamp,
) => Result<Match, "no_round_active">;
```

### 4.3 Encerramento

```typescript
export const endMatch: (
  match: Match,
  now: Timestamp,
) => Result<MatchResult, "no_match_active">;

type MatchResult = Readonly<{
  match: Match;                           // estado final (state = "finished")
  ranking: ReadonlyArray<RankingEntry>;
  highlights: Highlights;
}>;
```

### 4.4 Avaliação

```typescript
export const evaluateAnswer: (
  answer_text: string,
  song: Song,
  answer_type: AnswerType,
) => EvaluationResult;

type EvaluationResult = Readonly<{
  matched: boolean;
  near_miss: boolean;                     // matched=false mas distance pequena (categoria "na trave")
  distance: number;
  normalized_input: string;
  normalized_target: string;
}>;
```

### 4.5 Distribuição de pool

```typescript
export const distributePool: (
  players: ReadonlyArray<PlayerInMatch>,
  available_songs: ReadonlyArray<Song>,
  total_songs: number,
  allow_repeats: boolean,
  random_seed: string,                    // determinístico — necessário para testes
) => Result<Pool, "not_enough_unique_songs">;

type Pool = Readonly<{
  ordered: ReadonlyArray<Song>;           // ordem aleatória (seed-determinada)
}>;
```

### 4.6 Highlights e ranking

```typescript
export const computeHighlights: (match: Match) => Highlights;

type Highlights = Readonly<{
  best_streak: { player_uuid: PlayerUuid; nickname: string; streak: number } | null;
  fastest_answer: { player_uuid: PlayerUuid; nickname: string; time: Duration; song_name: string } | null;
  most_correct: { player_uuid: PlayerUuid; nickname: string; count: number } | null;
  near_miss_champion: { player_uuid: PlayerUuid; nickname: string; count: number } | null;
}>;
```

### 4.7 Solo

```typescript
export const compareWithPersonalBest: (
  result: MatchResult,
  previous_best: PersonalBest | null,
) => SoloOutcome;

type PersonalBest = Readonly<{
  max_score: number;
  max_streak: number;
  avg_response_time: Duration | null;
  last_played_at: Timestamp;
}>;

type SoloOutcome = Readonly<{
  beat_record: boolean;
  delta_score: number | null;             // diff em pontos vs anterior
  delta_streak: number | null;
  delta_avg_time: Duration | null;
}>;
```

---

## 5. Algoritmos Críticos

### 5.1 Normalização de texto

```typescript
const ARTICLES = new Set(["o", "a", "os", "as", "the", "el", "la", "los", "las"]);
const BRACKETS_RE = /[\(\[].*?[\)\]]/g;

export const normalizeText = (s: string): string => {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")          // remove diacríticos (acentos)
    .replace(BRACKETS_RE, "")                 // remove () e []
    .split(/\s+/)
    .filter(w => w.length > 0 && !ARTICLES.has(w))
    .join(" ")
    .trim();
};
```

**Casos de teste obrigatórios:**

| Input | Output | Por quê |
|---|---|---|
| `"Bohemian Rhapsody"` | `"bohemian rhapsody"` | lowercase básico |
| `"Evidências"` | `"evidencias"` | acentos |
| `"The Weeknd"` | `"weeknd"` | artigo "the" removido |
| `"Hey Jude (feat. Paul)"` | `"hey jude"` | parênteses removidos |
| `"  El   tonto  "` | `"tonto"` | artigo "el" + trim |
| `""` | `""` | string vazia |
| `"   "` | `""` | só espaços |
| `"O O O"` | `""` | só artigos |

### 5.2 Levenshtein distance

Implementação iterativa, O(m*n) tempo, O(min(m,n)) espaço:

```typescript
export const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // garantir que `a` seja o menor (reduz alocação)
  if (a.length > b.length) [a, b] = [b, a];

  let prev = Array.from({ length: a.length + 1 }, (_, i) => i);
  let curr = new Array<number>(a.length + 1).fill(0);

  for (let j = 1; j <= b.length; j++) {
    curr[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        curr[i - 1] + 1,            // insertion
        prev[i] + 1,                // deletion
        prev[i - 1] + cost,         // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[a.length];
};
```

### 5.3 Fuzzy match (threshold dinâmico)

```typescript
export const fuzzyMatch = (input: string, target: string): EvaluationResult => {
  const normalized_input = normalizeText(input);
  const normalized_target = normalizeText(target);

  if (normalized_input === "" || normalized_target === "") {
    return { matched: false, near_miss: false, distance: Infinity, normalized_input, normalized_target };
  }

  const distance = levenshteinDistance(normalized_input, normalized_target);
  const threshold = Math.max(1, Math.floor(normalized_target.length * 0.15));

  const matched = distance <= threshold;
  // near_miss: errado mas perto — usado para destaque "na trave"
  const near_miss = !matched && distance <= threshold + 2;

  return { matched, near_miss, distance, normalized_input, normalized_target };
};
```

**Comportamento por `answer_type`:**

```typescript
export const evaluateAnswer = (
  answer_text: string,
  song: Song,
  answer_type: AnswerType,
): EvaluationResult => {
  switch (answer_type) {
    case "song":   return fuzzyMatch(answer_text, song.name);
    case "artist": return fuzzyMatch(answer_text, song.artist);
    case "both": {
      const a = fuzzyMatch(answer_text, song.name);
      if (a.matched) return a;
      const b = fuzzyMatch(answer_text, song.artist);
      if (b.matched) return b;
      // escolher o "mais perto" para near_miss/distance
      return a.distance < b.distance ? a : b;
    }
  }
};
```

### 5.4 Cálculo de pontos

```typescript
export const calculatePoints = (
  scoring_rule: ScoringRule,
  evaluation: EvaluationResult,
  response_time: Duration | null,
  time_per_round: Duration,
): number => {
  if (!evaluation.matched || response_time === null) return 0;

  switch (scoring_rule) {
    case "simple":
      return 1;
    case "speed_bonus": {
      const ratio = Math.min(1, response_time / time_per_round);
      return Math.round(Math.max(100, 1000 - ratio * 900));
    }
  }
};
```

**Casos de teste (rodada de 30s = 30000ms):**

| `response_time` (ms) | `speed_bonus` esperado |
|---:|---:|
| 0 | 1000 |
| 5000 | 850 |
| 15000 | 550 |
| 30000 | 100 |
| 35000 (clamp para 30000) | 100 |

### 5.5 Distribuição de pool (round-robin)

```typescript
export const distributePool = (
  players: ReadonlyArray<PlayerInMatch>,
  available_songs: ReadonlyArray<Song>,
  total_songs: number,
  allow_repeats: boolean,
  random_seed: string,
): Result<Pool, "not_enough_unique_songs"> => {
  // 1. Filtra jogadores com playlist
  const contributors = players.filter(p => p.has_playlist);
  if (contributors.length === 0) return err("not_enough_unique_songs");

  // 2. Calcula quotas por round-robin
  const quotas = new Map<PlayerUuid, number>();
  const base = Math.floor(total_songs / contributors.length);
  const extras = total_songs % contributors.length;

  // ordem aleatória estável via seed
  const shuffled_contributors = seededShuffle(contributors, random_seed);
  shuffled_contributors.forEach((c, idx) => {
    quotas.set(c.player_uuid, base + (idx < extras ? 1 : 0));
  });

  // 3. Para cada jogador, escolhe N músicas da playlist dele
  const selected: Song[] = [];
  for (const c of shuffled_contributors) {
    const songs_from_this = available_songs.filter(s => s.contributed_by === c.player_uuid);
    const quota = quotas.get(c.player_uuid)!;

    if (allow_repeats) {
      selected.push(...sampleN(songs_from_this, quota, random_seed));
    } else {
      const unique = deduplicateByIsrc(songs_from_this);
      if (unique.length < quota) return err("not_enough_unique_songs");
      selected.push(...sampleN(unique, quota, random_seed));
    }
  }

  // 4. Ordem aleatória final
  const ordered = seededShuffle(selected, random_seed);
  return ok({ ordered });
};
```

`seededShuffle` é Fisher-Yates com PRNG seedado (Mulberry32). **Determinístico** para teste; usar timestamp UUID em produção.

---

## 6. Invariantes

Toda invariante aqui é **assertion de domínio**. Quebrá-las é bug. Funções da engine **rejeitam** input que violaria invariantes.

### 6.1 Match

- **I-M-1**: `state` segue máquina definida em [`../20-architecture/03-state-machines.md`](../20-architecture/03-state-machines.md). Transições ilegais retornam `err("illegal_state_transition")`.
- **I-M-2**: `host_uuid` sempre está em `players`.
- **I-M-3**: `players` tem entre 1 e 20 itens.
- **I-M-4**: `current_round_index` é `null` se `state ∉ {in_match, reveal}`, senão é índice válido em `rounds`.
- **I-M-5**: `scores` tem entrada para cada `player_uuid` em `players`.

### 6.2 Round

- **I-R-1**: `timer_started_at` é `null` em `state ∈ {resolving, streaming, grace_period}`; preenchido em `timer_running` e em diante.
- **I-R-2**: `answers` contém ≤1 entrada por `player_uuid` (substituição em vez de duplicação).
- **I-R-3**: `skip_votes` contém UUIDs únicos, todos com entrada em `answers`.
- **I-R-4**: `is_correct` é `false` para todas as `answers` enquanto `state ≠ "reveal"`.

### 6.3 Configuração

- **I-C-1**: `time_per_round ∈ [10000, 60000]` ms.
- **I-C-2**: `total_songs ∈ [player_count, player_count × 5]`.
- **I-C-3**: `game_mode = "solo"` implica `players.length === 1`.
- **I-C-4**: `game_mode = "solo"` implica `scoring_rule = "speed_bonus"` (enforced silenciosamente).

### 6.4 Pool

- **I-P-1**: `allow_repeats = false` → todos `Song.isrc` distintos (se `null`, comparação por `(name, artist)`).
- **I-P-2**: `pool.ordered.length === total_songs`.

### 6.5 Host

- **I-H-1**: Comando `player_ready` ou `player_unready` com `player_uuid === host_uuid` retorna `err("host_is_always_ready")`.
- **I-H-2**: Comando `start_game` com `player_uuid ≠ host_uuid` retorna `err("not_host")`.

### 6.6 Answer

- **I-A-1**: `submitAnswer` durante `state ∉ {timer_running}` retorna `err("round_not_accepting_answers")`.
- **I-A-2**: Resposta duplicada do mesmo `player_uuid` **substitui** a anterior; `response_time` é atualizado para a nova submissão.
- **I-A-3**: Resposta vazia (`answer_text.trim() === ""`) é tratada como **não-resposta** (0 pontos sem fazer fuzzy match).

---

## 7. Estratégia de Testes

### 7.1 Cobertura alvo

- **100% das funções públicas** testadas com pelo menos: caso feliz + 1 caso de erro + 1 caso de borda.
- **Algoritmos críticos** (normalize, levenshtein, fuzzy, scoring, pool distribution): tabela de casos parametrizados.
- **Invariantes**: cada uma tem teste explícito que tenta quebrá-la → espera `err`.

### 7.2 Estilo de teste (`bun test`)

```typescript
import { describe, test, expect } from "bun:test";
import { normalizeText } from "./normalize.ts";

describe("normalizeText", () => {
  test.each([
    ["Bohemian Rhapsody", "bohemian rhapsody"],
    ["Evidências", "evidencias"],
    ["The Weeknd", "weeknd"],
    ["Hey Jude (feat. Paul)", "hey jude"],
    ["  El   tonto  ", "tonto"],
    ["", ""],
    ["   ", ""],
    ["O O O", ""],
  ])('"%s" → "%s"', (input, expected) => {
    expect(normalizeText(input)).toBe(expected);
  });
});
```

### 7.3 Property-based testing (opcional)

Para `levenshteinDistance` e `normalizeText`, considerar [`fast-check`](https://github.com/dubzzz/fast-check):

```typescript
import fc from "fast-check";
test("levenshtein é commutativo", () => {
  fc.assert(fc.property(fc.string(), fc.string(), (a, b) => {
    return levenshteinDistance(a, b) === levenshteinDistance(b, a);
  }));
});
```

### 7.4 Casos determinísticos para `distributePool`

Usar seed fixa `"test-seed-1"`:

```typescript
test("13 músicas / 3 contributors → 5, 4, 4 round-robin", () => {
  const players = makePlayers([
    { uuid: "a", has_playlist: true, songs_count: 10 },
    { uuid: "b", has_playlist: true, songs_count: 10 },
    { uuid: "c", has_playlist: true, songs_count: 10 },
  ]);
  const pool = distributePool(players, allSongs, 13, false, "test-seed-1");
  expect(pool.ok).toBe(true);
  if (!pool.ok) return;
  const quotas = countSongsPerPlayer(pool.value);
  expect(Array.from(quotas.values()).sort().reverse()).toEqual([5, 4, 4]);
});
```

### 7.5 Snapshot tests

Para `computeHighlights` — fixture de partida com 4 jogadores e 8 rodadas:

```typescript
test("highlights de partida exemplo", () => {
  const match = loadFixture("matches/4players-8rounds.json");
  const h = computeHighlights(match);
  expect(h).toMatchSnapshot();
});
```

---

## Changelog

- **2026-05-13:** primeira versão. Cobre tipos, estruturas, funções públicas (assinaturas explícitas), algoritmos críticos com implementação de referência, invariantes catalogadas, estratégia de testes. Substitui `archive/SPEC_ENGINE_v0.md`.
