---
until: packages/domain/package.json
---

# Spec pré-código — `packages/domain`

> **Rascunho com prazo de validade.** Quando `packages/domain/package.json` existir, este conteúdo vira
> tipos e testes, e o arquivo é apagado (`bun run docs:check` passa a falhar enquanto ele existir).
> As regras são as do [`gdd.md`](../gdd.md); aqui está só o **formato** da engine. As convenções de código
> estão em `.claude/rules/domain.md`.

## Tipos fundamentais

```typescript
type Result<T, E> = Readonly<{ ok: true; value: T } | { ok: false; error: E }>;
type Brand<T, B extends string> = T & { readonly __brand: B };

type PlayerUuid = Brand<string, "PlayerUuid">; // RoomId, MatchId, RoundId, InviteCode, Isrc, PlaylistId: idem
type Timestamp  = Brand<number, "Timestamp">;  // ms desde epoch UTC
type Duration   = Brand<number, "Duration">;   // ms
```

- Smart constructors retornam `Result` (`InviteCode("abc")` → `err("invalid_invite_code")`).
- Funções que dependem de tempo recebem `now: Timestamp`; as que sorteiam recebem `seed: string` (PRNG Mulberry32 + Fisher-Yates).
- Erro "impossível" também é `err`, com o tipo `InternalDomainError`.

## Estruturas

```typescript
type AnswerType  = "song" | "artist" | "both";
type ScoringRule = "simple" | "speed_bonus";
type GameMode    = "multiplayer" | "solo";

type MatchConfiguration = Readonly<{
  time_per_round: Duration; total_songs: number; answer_type: AnswerType;
  allow_repeats: boolean; scoring_rule: ScoringRule; game_mode: GameMode;
}>;

type MatchState = "countdown" | "in_progress" | "completed" | "persisted";
type RoundState = "resolving" | "streaming" | "grace_period" | "timer_running" | "reveal";

type Song = Readonly<{
  isrc: Isrc | null; name: string; artist: string; album: string | null;
  cover_url: string | null; contributed_by: PlayerUuid;
  source_platform: "spotify" | "deezer" | "youtube_music";
}>;

type Answer = Readonly<{
  player_uuid: PlayerUuid; answer_text: string; submitted_at: Timestamp;
  response_time: Duration | null; is_correct: boolean; is_near_miss: boolean; points_earned: number;
}>;
```

`Match` guarda `match_id`, `room_id`, `state`, `config`, `host_uuid`, `players` (`PlayerInMatch`: uuid, nickname, `is_host`, `ready`, `afk`, `connection_status`, `has_playlist`, `platform`, `current_streak`, `best_streak`), `rounds`, `current_round_index`, `scores`, `started_at` e `ended_at`. Os estados seguem [`architecture.md`](../architecture.md#máquinas-de-estado).

## API pública

| Função | Retorno | Erros |
|---|---|---|
| `configureMatch(match, input: unknown, playerCount, playersWithPlaylist)` | `Result<Match, ConfigError>` | `time_per_round_out_of_range`, `total_songs_out_of_range`, `invalid_answer_type`, `invalid_scoring_rule`, `invalid_game_mode` |
| `startMatch(match, pool, now)` | `Result<Match, …>` | `no_playlists_imported`, `not_enough_unique_songs`, `already_started` |
| `startRound(match, song, now)` | `Result<Match, …>` | `no_match_active`, `invalid_round_index` |
| `submitAnswer(match, player, text, now)` | `Result<Match, …>` | `round_not_accepting_answers`, `player_not_in_match` |
| `voteSkip(match, player)` | `Result<Match, …>` | `round_not_accepting_skip`, `player_already_voted`, `player_not_answered_yet` |
| `shouldEndRound(match, now)` | `boolean` | — |
| `endRound(match, reason, now)` | `Result<Match, "no_round_active">` | — |
| `endMatch(match, now)` | `Result<MatchResult, "no_match_active">` | — |
| `evaluateAnswer(text, song, answerType)` | `{ matched, near_miss, distance, normalized_input, normalized_target }` | — |
| `calculatePoints(rule, evaluation, responseTime, timePerRound)` | `number` | — |
| `distributePool(players, songs, total, allowRepeats, seed)` | `Result<Pool, "not_enough_unique_songs">` | — |
| `computeHighlights(match)` | `Highlights` | — |
| `compareWithPersonalBest(result, previous)` | `SoloOutcome` (R-504) | — |

## Invariantes (cada uma com teste que tenta quebrá-la)

- **I-M-1** `host_uuid` está sempre em `players`; `players` tem de 1 a 20 itens (R-005).
- **I-M-2** `scores` tem uma entrada por jogador.
- **I-M-3** `current_round_index` é `null` fora de `in_progress`.
- **I-R-1** `timer_started_at` é `null` antes de `timer_running`.
- **I-R-2** No máximo uma `Answer` por jogador; resposta nova **substitui** e atualiza `response_time` (R-105).
- **I-R-3** `skip_votes` sem repetição, só de quem tem `Answer` (R-120).
- **I-R-4** `is_correct = false` e `points_earned = 0` até a rodada entrar em `reveal`.
- **I-C-1** `time_per_round` ∈ [10000, 60000] ms.
- **I-C-2** `total_songs` no range de R-302 (multiplayer) ou R-502 (solo).
- **I-C-3** `solo` ⇒ 1 jogador e `scoring_rule = speed_bonus`, aplicado em silêncio (R-503).
- **I-P-1** `allow_repeats = false` ⇒ ISRCs distintos; sem ISRC, `(nome, artista)` distintos (R-304).
- **I-P-2** `pool.ordered.length === total_songs`.
- **I-H-1** `player_ready`/`player_unready` vindo do host → `err("host_is_always_ready")` (R-008).
- **I-H-2** `start_game` vindo de quem não é host → `err("not_host")`.

## Testes

- Algoritmos (normalização, Levenshtein, fuzzy, pontuação, distribuição): `test.each` com as tabelas do GDD, citando o ID da regra.
- Levenshtein: iterativo, O(m·n) em tempo e O(min(m, n)) em espaço. Propriedades: simetria e `d(a, a) = 0`.
- `distributePool` com seed fixa `"test-seed-1"`: 13 músicas para 3 jogadores com playlist → `[5, 4, 4]`.
- Destaques: fixture de 4 jogadores e 8 rodadas, comparado por snapshot.
- Cobertura: toda função pública com caminho feliz, um erro e uma borda.
