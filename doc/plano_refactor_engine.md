# Plano de Refatoração — Game Engine (Padrões Gleam + DDD Funcional)

**Objetivo**: Quebrar módulos grandes, reduzir acoplamento, tornar o código legível e alinhar ao DDD funcional.
**Regras**:
- Nenhum arquivo com mais de 200 linhas de código
- Estados ilegais irrepresentáveis (compilador garante invariantes)
- Funções puras, tipos algébricos, zero side effects
- Ubiquitous Language: nomes espelham o domínio do jogo

**Base**: padrões de `doc/references/gleam/patterns/` + DDD funcional.

---

## Estado Atual

| Módulo | Linhas | Problema |
|---|---|---|
| `match.gleam` | **784** | Monolítico. Faz tudo: criação, ready, start, answer, round, end, tiebreaker, highlights, ranking, helpers |
| `types.gleam` | **304** | Grande mas aceitável. Pode separar por domínio |
| `validation.gleam` | **278** | Levenshtein + normalização + check misturados. Separável |
| `song_selection.gleam` | 146 | OK |
| `game_engine.gleam` | 87 | Facade — OK |
| `player.gleam` | 64 | OK |
| `scoring.gleam` | 34 | OK |

**Total: 3 módulos acima de 200 linhas precisam ser quebrados.**

---

## Padrões Aplicados

### 1. State Pattern → `match.gleam` vira 4 módulos de estado

O `match.gleam` tem um `case match.state` gigante em quase toda função. Cada estado (`WaitingForPlayers`, `InProgress`, `Finished`) tem comportamentos diferentes.

**Refatoração**: extrair handlers por estado.

| Módulo novo | Responsabilidade | ~Linhas |
|---|---|---|
| `match/lobby.gleam` | `new_match`, `set_player_ready`, `set_player_unready`, `start_match` | ~100 |
| `match/round.gleam` | `start_round`, `submit_answer`, `all_answered`, `end_round`, `is_last_round` | ~150 |
| `match/finish.gleam` | `end_match`, `resolve_tiebreaker`, detecção de empate | ~120 |
| `match/helpers.gleam` | `get_round`, `get_current_round`, `update_round_at`, `accumulate_round_scores`, `build_scores_dict`, `list_at` | ~60 |

O `match.gleam` original vira um **Facade** fino que delega para os módulos de estado:
```gleam
pub fn set_player_ready(m, id) { lobby.set_player_ready(m, id) }
pub fn submit_answer(m, ...) { round.submit_answer(m, ...) }
pub fn end_match(m) { finish.end_match(m) }
```
~40 linhas.

### 2. Strategy Pattern → scoring e validation plugáveis

**scoring.gleam** já está limpo (34 linhas). Mas a estratégia de pontuação é hardcoded nos variants Simple/SpeedBonus. Se quisermos novas regras no futuro, é só adicionar variants — Gleam resolve com pattern matching. **Não precisa mudar.**

**validation.gleam** mistura 3 responsabilidades: normalização, distância de Levenshtein e check de resposta. Separar:

| Módulo novo | Responsabilidade | ~Linhas |
|---|---|---|
| `validation/normalize.gleam` | `normalize`, `remove_accents`, `remove_parenthetical`, `remove_brackets`, `remove_articles`, `collapse_spaces` | ~80 |
| `validation/levenshtein.gleam` | `levenshtein`, `make_range`, `levenshtein_compute`, `update_row`, `list_at_int` | ~100 |
| `validation.gleam` (refatorado) | `check_answer`, `check_answer_detailed`, `check_similarity` — usa os 2 módulos acima | ~50 |

### 3. Builder Pattern → types separados por domínio

`types.gleam` (304 linhas) define tudo num arquivo só. Separar por domínio semântico:

| Módulo novo | O que contém | ~Linhas |
|---|---|---|
| `types/media.gleam` | `Artist`, `Album`, `Song`, `Playlist`, `Platform`, `SelectedSong` | ~80 |
| `types/config.gleam` | `MatchConfiguration`, `AnswerType`, `ScoringRule` | ~30 |
| `types/game.gleam` | `Match`, `Round`, `Player`, `Answer`, `PlayerState`, `MatchState`, `RoundState` | ~80 |
| `types/events.gleam` | `MatchEvent`, `TiebreakerInfo` | ~50 |
| `types/errors.gleam` | `EngineError` | ~20 |
| `types/results.gleam` | `RankingEntry`, `Highlights`, `HighlightStreak`, `HighlightFastest`, `HighlightMostCorrect`, `HighlightNearMiss` | ~50 |

`types.gleam` vira um re-export:
```gleam
pub type Artist = media.Artist
// ... ou apenas importar dos sub-módulos diretamente
```

### 4. Chain of Responsibility → pipeline de resposta

Hoje `submit_answer` no match.gleam é um bloco aninhado de 50 linhas com case dentro de case. Transformar em pipeline:

```gleam
pub fn submit_answer(match, player_id, answer_text, response_time) {
  match
  |> validate_in_progress()
  |> result.try(validate_round_active)
  |> result.try(validate_player_exists(_, player_id))
  |> result.try(process_answer(_, player_id, answer_text, response_time))
}
```

Cada step retorna `Result(Match, EngineError)`. Isso fica em `match/round.gleam`.

### 5. Facade Pattern → game_engine.gleam (já existe, manter)

O `game_engine.gleam` já é a facade. Após a refatoração, ele importa de `match/lobby`, `match/round`, `match/finish` em vez de `match` monolítico. Interface pública não muda.

### 6. Highlights extraído

`build_highlights`, `find_best_streak`, `find_fastest_answer`, `find_most_correct`, `find_most_near_misses`, `calculate_streak`, `count_correct`, `count_near_misses` → tudo para:

| Módulo novo | ~Linhas |
|---|---|
| `highlights.gleam` | ~120 |

---

## Estrutura Final

```
src/game_engine/
  types/
    media.gleam          → Artist, Album, Song, Playlist, Platform, SelectedSong (~80)
    config.gleam         → MatchConfiguration (opaque), AnswerType, ScoringRule, ConfigError (~50)
    match_states.gleam   → WaitingMatch, ActiveMatch, FinishedMatch (~60)
    round_states.gleam   → ActiveRound, EndedRound (~30)
    game.gleam           → Player, Answer, PlayerState (~50)
    events.gleam         → MatchEvent, TiebreakerInfo (~50)
    errors.gleam         → LobbyError, RoundError, FinishError (~30)
    results.gleam        → RankingEntry, Highlights, Highlight* (~50)

  match/
    lobby.gleam          → new_match, ready/unready, start_match (~100)
    round.gleam          → start_round, submit_answer, all_answered, end_round (~150)
    finish.gleam         → end_match, tiebreaker, ranking (~120)
    helpers.gleam        → funções utilitárias internas (~60)

  validation/
    normalize.gleam      → normalização de strings (~80)
    levenshtein.gleam    → distância de Levenshtein (~100)

  validation.gleam       → check_answer, check_answer_detailed (~50)
  scoring.gleam          → calculate_points (~34, sem mudança)
  player.gleam           → find, set_state, all_ready (~64, sem mudança)
  song_selection.gleam   → select_songs, distribute, range (~146, sem mudança)
  highlights.gleam       → build_highlights, find_best_*, count_* (~120)

src/game_engine.gleam    → Facade: API pública (~90)
```

### Contagem final

| Módulo | Linhas | Padrão DDD |
|---|---|---|
| types/media.gleam | ~80 | Value Objects (Song, Artist, Album) |
| types/config.gleam | ~50 | Value Object opaque (smart constructor) |
| types/match_states.gleam | ~60 | Aggregate states (WaitingMatch, ActiveMatch, FinishedMatch) |
| types/round_states.gleam | ~30 | Entity states (ActiveRound, EndedRound) |
| types/game.gleam | ~50 | Entities (Player, Answer) |
| types/events.gleam | ~50 | Domain Events |
| types/errors.gleam | ~30 | Erros por workflow |
| types/results.gleam | ~50 | Value Objects (Ranking, Highlights) |
| match/lobby.gleam | ~100 | Workflow: WaitingMatch → ActiveMatch |
| match/round.gleam | ~150 | Workflow: ActiveMatch → ActiveMatch (pipeline) |
| match/finish.gleam | ~120 | Workflow: ActiveMatch → FinishedMatch |
| match/helpers.gleam | ~60 | Funções utilitárias puras |
| validation.gleam | ~50 | Domain Service |
| validation/normalize.gleam | ~80 | Domain Service (sub) |
| validation/levenshtein.gleam | ~100 | Domain Service (sub) |
| scoring.gleam | ~34 | Domain Service |
| player.gleam | ~64 | Entity operations |
| song_selection.gleam | ~146 | Domain Service |
| highlights.gleam | ~120 | Domain Service |
| game_engine.gleam | ~90 | Facade (porta de entrada) |
| **TOTAL** | **~1514** |
| **Maior módulo** | **match/round.gleam (~150)** |

**Nenhum módulo acima de 200 linhas. ✅**
**Todos os módulos com responsabilidade única. ✅**
**Estados ilegais irrepresentáveis pelo compilador. ✅**

---

## Alinhamento DDD Funcional

### Princípios aplicados ao Game Engine

O Game Engine é o **Core Domain** — a camada mais interna do sistema. Não tem dependências externas, é 100% puro. As regras de DDD funcional se aplicam naturalmente.

### Fase 0 — Tornar estados ilegais irrepresentáveis

Hoje o Engine usa enums genéricos (`MatchState`, `PlayerState`, `RoundState`) e valida em runtime via `case match.state`. DDD funcional diz: **use tipos diferentes para cada estado**. Assim o compilador impede chamadas inválidas.

#### 0.1 — Match como tipos distintos por estado

**Antes** (estado como enum dentro do mesmo tipo):
```gleam
pub type Match { Match(state: MatchState, ...) }
// Qualquer função aceita qualquer Match, valida em runtime:
pub fn start_match(m: Match) -> Result(MatchEvent, EngineError)
```

**Depois** (tipo diferente por estado):
```gleam
pub type WaitingMatch { WaitingMatch(id: String, config: MatchConfiguration, players: List(Player), rounds: List(Round), songs: List(Song)) }
pub type ActiveMatch { ActiveMatch(id: String, config: MatchConfiguration, players: List(Player), rounds: List(Round), current_round_index: Int, songs: List(Song)) }
pub type FinishedMatch { FinishedMatch(id: String, players: List(Player), rounds: List(Round), songs: List(Song)) }

// Agora o compilador garante:
pub fn start_match(m: WaitingMatch) -> Result(ActiveMatch, EngineError)   // Só aceita WaitingMatch
pub fn submit_answer(m: ActiveMatch, ...) -> Result(ActiveMatch, EngineError) // Só aceita ActiveMatch
pub fn end_match(m: ActiveMatch) -> Result(FinishedMatch, EngineError)    // Só aceita ActiveMatch
```

**Benefício**: impossível chamar `submit_answer` num match que está em `WaitingForPlayers`. O compilador rejeita. Zero validação runtime para estado.

#### 0.2 — Round como tipos distintos

```gleam
pub type ActiveRound { ActiveRound(index: Int, song: Song, answers: Dict(String, Answer), contributed_by: String) }
pub type EndedRound { EndedRound(index: Int, song: Song, answers: Dict(String, Answer), contributed_by: String) }

pub fn end_round(r: ActiveRound) -> EndedRound  // Impossível encerrar rodada já encerrada
```

#### 0.3 — Smart constructors para Value Objects

**Antes** (qualquer valor é aceito):
```gleam
MatchConfiguration(time_per_round: -5, total_songs: 0, ...)  // Compila mas é inválido
```

**Depois** (smart constructor valida na criação):
```gleam
pub opaque type MatchConfiguration { ... }

pub fn new_config(time_per_round: Int, total_songs: Int, ...) -> Result(MatchConfiguration, ConfigError) {
  case time_per_round >= 10 && time_per_round <= 60 {
    True -> case total_songs >= 1 { ... }
    False -> Error(InvalidTimePerRound(time_per_round))
  }
}
```

**Benefício**: se existe um `MatchConfiguration`, ele é válido por construção. Não precisa validar de novo.

#### 0.4 — Erros como union types por contexto

**Antes** (um EngineError genérico para tudo):
```gleam
pub type EngineError { InvalidState(...) | PlayerNotFound(...) | NotEnoughPlayers | ... }
```

**Depois** (erros por workflow):
```gleam
pub type LobbyError { NotEnoughPlayers | NotAllPlayersReady | NotEnoughSongs | PlayerNotFound(String) }
pub type RoundError { RoundNotActive | PlayerNotFound(String) | NoMoreRounds }
pub type FinishError { MatchNotActive }
pub type ConfigError { InvalidTimePerRound(Int) | InvalidTotalSongs(Int) }
```

**Benefício**: cada função retorna EXATAMENTE os erros que pode produzir. O caller faz pattern match exaustivo sem tratar erros impossíveis.

### Ubiquitous Language — Nomes do domínio

| Conceito do GDD | Nome no código | Módulo |
|---|---|---|
| Partida | `WaitingMatch` / `ActiveMatch` / `FinishedMatch` | `types/match_states.gleam` |
| Rodada | `ActiveRound` / `EndedRound` | `types/round_states.gleam` |
| Jogador | `Player` | `types/game.gleam` |
| Música | `Song` (resolvida, validada) | `types/media.gleam` |
| Artista | `Artist` | `types/media.gleam` |
| Álbum | `Album` | `types/media.gleam` |
| Playlist | `Playlist` (validada) | `types/media.gleam` |
| Configuração | `MatchConfiguration` (opaque, smart constructor) | `types/config.gleam` |
| Resposta | `Answer` | `types/game.gleam` |
| Pontuação | `scoring.calculate_points` | `scoring.gleam` |
| Validação | `validation.check_answer_detailed` | `validation.gleam` |
| Seleção de músicas | `song_selection.select_songs` | `song_selection.gleam` |
| Desempate (Gol de Ouro) | `TiebreakerInfo` | `types/events.gleam` |
| Destaques | `Highlights` | `types/results.gleam` |
| Na trave | `HighlightNearMiss` | `types/results.gleam` |

### Estrutura por camada DDD

```
src/game_engine/
  ┌─── Domain Types (estados ilegais irrepresentáveis) ───┐
  │  types/                                                │
  │    media.gleam         → Song, Artist, Album, Playlist │
  │    config.gleam        → MatchConfiguration (opaque)   │
  │    match_states.gleam  → WaitingMatch, ActiveMatch,    │
  │                          FinishedMatch                 │
  │    round_states.gleam  → ActiveRound, EndedRound       │
  │    game.gleam          → Player, Answer, PlayerState   │
  │    events.gleam        → MatchEvent, TiebreakerInfo    │
  │    errors.gleam        → LobbyError, RoundError, etc.  │
  │    results.gleam       → RankingEntry, Highlights      │
  └────────────────────────────────────────────────────────┘

  ┌─── Domain Workflows (funções puras) ───────────────────┐
  │  match/                                                 │
  │    lobby.gleam         → WaitingMatch → ActiveMatch     │
  │    round.gleam         → ActiveMatch → ActiveMatch      │
  │    finish.gleam        → ActiveMatch → FinishedMatch    │
  │    helpers.gleam       → utilitários puros              │
  │                                                         │
  │  validation.gleam      → String → AnswerResult          │
  │  validation/normalize  → String → String                │
  │  validation/levenshtein → String → String → Int         │
  │  scoring.gleam         → AnswerResult → Int             │
  │  player.gleam          → List(Player) → List(Player)    │
  │  song_selection.gleam  → List(Player) → List(SelectedSong) │
  │  highlights.gleam      → Match → Highlights             │
  └─────────────────────────────────────────────────────────┘

  ┌─── Facade (API pública) ────────────────────────────────┐
  │  game_engine.gleam     → Interface para o Orchestrator  │
  │                          (única porta de entrada)       │
  └─────────────────────────────────────────────────────────┘
```

---

## Fases de Execução

### Fase 0 — DDD: Estados ilegais irrepresentáveis
1. Criar `types/match_states.gleam` — `WaitingMatch`, `ActiveMatch`, `FinishedMatch` como tipos distintos
2. Criar `types/round_states.gleam` — `ActiveRound`, `EndedRound` como tipos distintos
3. Tornar `MatchConfiguration` opaque com smart constructor `new_config() -> Result`
4. Separar `EngineError` em erros por workflow: `LobbyError`, `RoundError`, `FinishError`, `ConfigError`
5. Atualizar assinaturas das funções para usar tipos de estado específicos
6. Atualizar game_engine.gleam (facade) — as assinaturas mudam
7. Atualizar TODOS os testes — padrões de match mudam
8. Rodar testes — 86 devem passar

**NOTA**: Esta é a fase mais impactante. Muda as assinaturas públicas do Engine.
O Orchestrator (phoenix_bridge) precisará se adaptar depois.

### Fase 1 — Quebrar types.gleam em sub-módulos
1. Criar `types/media.gleam`, `types/config.gleam`, `types/game.gleam`, `types/events.gleam`, `types/errors.gleam`, `types/results.gleam`
2. Mover tipos para cada módulo
3. Atualizar imports em todos os módulos que usam types
4. Rodar testes — 86 devem passar

### Fase 2 — Extrair highlights.gleam
1. Mover `build_highlights`, `find_best_streak`, `find_fastest_answer`, `find_most_correct`, `find_most_near_misses`, `calculate_streak`, `count_correct`, `count_near_misses`, `player_stats` de match.gleam para highlights.gleam
2. Atualizar imports
3. Rodar testes

### Fase 3 — Quebrar match.gleam em sub-módulos
1. Criar `match/helpers.gleam` — mover funções utilitárias
2. Criar `match/lobby.gleam` — mover new_match, ready, start_match
3. Criar `match/round.gleam` — mover start_round, submit_answer, all_answered, end_round + pipeline chain
4. Criar `match/finish.gleam` — mover end_match, resolve_tiebreaker, tiebreaker helpers
5. Refatorar `match.gleam` como delegador fino
6. Rodar testes

### Fase 4 — Quebrar validation.gleam
1. Criar `validation/normalize.gleam` — mover normalização
2. Criar `validation/levenshtein.gleam` — mover algoritmo
3. Refatorar `validation.gleam` para usar os sub-módulos
4. Rodar testes

### Fase 5 — Pipeline no submit_answer (Chain of Responsibility)
1. Refatorar `match/round.gleam` submit_answer de case aninhado → pipeline com result.try
2. Rodar testes

**Após cada fase: `gleam test` deve continuar com 86 passed, 0 failures, 0 warnings.**

---

## Resumo DDD Funcional aplicado

| Princípio DDD | Como aplicamos |
|---|---|
| **Estados ilegais irrepresentáveis** | `WaitingMatch`/`ActiveMatch`/`FinishedMatch` como tipos distintos — compilador impede chamadas inválidas |
| **Smart constructors** | `MatchConfiguration` opaque — só existe se válida |
| **Erros como dados (por workflow)** | `LobbyError`, `RoundError`, `FinishError` — cada função retorna exatamente os erros possíveis |
| **Funções puras** | Zero IO, zero side effects — Engine é 100% determinístico |
| **Aggregate root** | `WaitingMatch`→`ActiveMatch`→`FinishedMatch` — transições explícitas |
| **Domain Events** | `MatchEvent` variants — `MatchStarted`, `RoundStarted`, etc. |
| **Value Objects** | `Song`, `Artist`, `Album`, `MatchConfiguration` — imutáveis, igualdade estrutural |
| **Entities** | `Player` (identidade por id), `Round` (identidade por index) |
| **Ubiquitous Language** | Nomes do GDD → nomes no código (ver tabela acima) |
| **Bounded Context** | Game Engine = Core Domain, isolado, sem dependências externas |
| **Facade** | `game_engine.gleam` = única porta de entrada para o Orchestrator |
| **Functional core, imperative shell** | Engine puro, Orchestrator faz IO |
