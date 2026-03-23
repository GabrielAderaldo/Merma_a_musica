# Plano de Implementação — Game Engine (Gleam)

**App**: `apps/game_engine/`
**Tecnologia**: Gleam (BEAM)
**Tipo**: Core Domain — lógica pura, sem side effects
**Arquitetura**: DDD Funcional — estados ilegais irrepresentáveis, erros por workflow, smart constructors
**Status**: ✅ IMPLEMENTADO (87 testes, 0 falhas, 20 módulos)

---

## Visão Geral

O Game Engine é o coração do sistema. Ele gerencia o ciclo completo de uma partida: criação, rodadas, respostas, pontuação, desempate e finalização. É 100% puro — recebe dados, retorna resultados. Não conhece WebSocket, banco de dados, UI ou timers.

**Referências**:
- `apps/game_engine/README.md` — documentação completa do domínio e API
- `doc/documents/game_engine_context.md` — bounded context DDD
- `doc/documents/gdd.md` — regras de game design
- `doc/documents/documento_conciso.md` — documento consolidado

---

## Fases Implementadas

### Fase 1 — Tipos e Modelo de Domínio ✅

Tipos separados por conceito DDD em `domain/types/`:

- [x] `media.gleam` — Song (com Artist, Album), Playlist, SelectedSong, Platform
- [x] `config.gleam` — MatchConfiguration (smart constructor), AnswerType, ScoringRule, ConfigError
- [x] `match_states.gleam` — WaitingMatch, ActiveMatch, FinishedMatch (aggregate root por estado)
- [x] `round.gleam` — ActiveRound, EndedRound (entity filha com ciclo de vida)
- [x] `player.gleam` — Player, PlayerState (entity filha)
- [x] `answer.gleam` — Answer, AnswerResult (value objects)
- [x] `results.gleam` — RankingEntry, Highlights (4 tipos: streak, fastest, most_correct, near_miss)
- [x] `tiebreaker.gleam` — TiebreakerInfo (value object de desempate)

**DDD aplicado**: Estados ilegais irrepresentáveis — o compilador garante que `submit_answer` só aceita `ActiveMatch`, `start_match` só aceita `WaitingMatch`, etc.

### Fase 2 — Lobby Workflow (WaitingMatch → ActiveMatch) ✅

Implementado em `domain/workflows/lobby.gleam`:

- [x] `new_match(id, config, players, selected_songs) → Result(WaitingMatch, LobbyError)`
- [x] `set_player_ready(match, player_id) → Result(WaitingMatch, LobbyError)`
- [x] `set_player_unready(match, player_id) → Result(WaitingMatch, LobbyError)`
- [x] `start_match(match) → Result(MatchEvent, LobbyError)` — invariante: todos prontos

### Fase 3 — Round Workflow (ActiveMatch → ActiveMatch) ✅

Implementado em `domain/workflows/round.gleam` com pipeline Chain of Responsibility:

- [x] `start_round(match) → Result(MatchEvent, RoundError)` — retorna RoundStarted
- [x] `submit_answer(match, player_id, text, time) → Result(MatchEvent, RoundError)` — pipeline: validate round → validate player → process answer
- [x] `all_answered(match) → Bool`
- [x] `end_round(match) → Result(MatchEvent, RoundError)` — ActiveRound → EndedRound, acumula scores
- [x] `is_last_round(match) → Bool`
- [x] Re-submissão permitida (última resposta vale)

### Fase 4 — Validation Service ✅

Implementado em `domain/services/validation.gleam` + `validation/normalize.gleam` + `shared/levenshtein.gleam`:

- [x] `check_answer(text, song, answer_type) → Bool`
- [x] `check_answer_detailed(text, song, answer_type) → AnswerResult` (is_correct + is_near_miss)
- [x] Normalização: lowercase, acentos, artigos, parênteses, colchetes, espaços
- [x] Fuzzy matching: Levenshtein com threshold >80% = correto, 60-80% = na trave
- [x] Suporte a SongName, ArtistName, Both
- [x] Levenshtein isolado em `shared/` (algoritmo genérico, sem domínio)

### Fase 5 — Scoring Service ✅

Implementado em `domain/services/scoring.gleam`:

- [x] Simple: acertou = 1, errou = 0
- [x] SpeedBonus: `max(100, 1000 - (time/total × 900))`, errou = 0

### Fase 6 — Finish Workflow (ActiveMatch → FinishedMatch) ✅

Implementado em `domain/workflows/finish.gleam`:

- [x] `end_match(match) → Result(MatchEvent, FinishError)` — detecta empate
- [x] Sem empate → `MatchCompleted(FinishedMatch, scores, ranking, highlights)`
- [x] Com empate → `TiebreakerNeeded(TiebreakerInfo)` com Pool A e Pool B
- [x] `resolve_tiebreaker(info, winner_id) → MatchEvent` — Gol de Ouro

### Fase 7 — Song Selection Service ✅

Implementado em `domain/services/song_selection.gleam`:

- [x] `calculate_range(total_players) → SongRange` (min=1×players, max=5×players)
- [x] `select_songs(players, total, allow_repeats) → SelectionResult` com `contributed_by`
- [x] `distribute_quotas(total, num_players) → List(Int)` (round-robin)
- [x] Deduplicação por `song.id` quando `allow_repeats=False`
- [x] Engine NÃO embaralha (Orchestrator faz antes)

### Fase 8 — Highlights Service ✅

Implementado em `domain/services/highlights.gleam`:

- [x] `build(players, rounds) → Highlights`
- [x] `build_ranking(players, rounds) → List(RankingEntry)` com correct_answers e avg_response_time
- [x] **Maior streak** — quebra ao errar/não responder
- [x] **Resposta mais rápida** — menor time com is_correct=True
- [x] **Mais acertos** — total de corretas
- [x] **Na trave** — total de near misses (similaridade 60-80%)

### Fase 9 — Desempate "Gol de Ouro" ✅

- [x] Detecção automática de empate no topo do ranking
- [x] Pool A: músicas que TODOS os empatados erraram
- [x] Pool B: músicas de OUTROS jogadores não tocadas
- [x] `resolve_tiebreaker(info, winner_id)` — vencedor do gol de ouro fica em primeiro
- [x] Ranking parcial preservado para não-empatados

### Fase 10 — Refatoração DDD ✅

- [x] Tipos por estado: WaitingMatch / ActiveMatch / FinishedMatch (compilador garante)
- [x] Tipos por ciclo: ActiveRound / EndedRound
- [x] Erros por workflow: LobbyError / RoundError / FinishError
- [x] Smart constructor: MatchConfiguration validada
- [x] Levenshtein extraído para shared/ (genérico)
- [x] 20 módulos, nenhum acima de ~200 linhas
- [x] Pipeline Chain of Responsibility no submit_answer

---

## Estrutura Final

```
src/
  game_engine.gleam                              ← Facade (104 linhas)
  shared/levenshtein.gleam                       ← Algoritmo genérico (103)

  game_engine/domain/
    events.gleam                                 ← Domain Events (32)
    errors.gleam                                 ← Domain Errors por workflow (17)

    types/
      media.gleam                                ← Song, Artist, Album, Playlist (44)
      config.gleam                               ← MatchConfiguration + smart constructor (54)
      match_states.gleam                         ← WaitingMatch, ActiveMatch, FinishedMatch (44)
      round.gleam                                ← ActiveRound, EndedRound (27)
      player.gleam                               ← Player, PlayerState (20)
      answer.gleam                               ← Answer, AnswerResult (17)
      results.gleam                              ← RankingEntry, Highlights (42)
      tiebreaker.gleam                           ← TiebreakerInfo (18)

    workflows/
      lobby.gleam                                ← WaitingMatch → ActiveMatch (106)
      round.gleam                                ← ActiveMatch → ActiveMatch (203)
      finish.gleam                               ← ActiveMatch → FinishedMatch (164)

    services/
      scoring.gleam                              ← calculate_points (26)
      validation.gleam                           ← check_answer (82)
      validation/normalize.gleam                 ← normalização de strings (79)
      song_selection.gleam                       ← seleção e distribuição (112)
      highlights.gleam                           ← ranking e destaques (166)
```

---

## Testes

```
test/
  game_engine_test.gleam       ← Runner (gleeunit)
  test_helpers.gleam           ← Factories e setups
  lobby_test.gleam             ← 10 testes: new_match, ready, start
  round_test.gleam             ← 18 testes: rounds, answers, scoring modes
  finish_test.gleam            ← 10 testes: ranking, highlights, scores
  tiebreaker_test.gleam        ← 8 testes: empate, pools, resolve
  scoring_test.gleam           ← 6 testes: Simple e SpeedBonus isolados
  validation_test.gleam        ← 9 testes: normalize, levenshtein, fuzzy
  near_miss_test.gleam         ← 4 testes: detecção "na trave"
  song_selection_test.gleam    ← 16 testes: range, quotas, distribuição
  error_states_test.gleam      ← 3 testes: transições inválidas
  e2e_test.gleam               ← 4 testes: cenários completos
```

**Total: 87 testes, 0 falhas, 0 erros de compilação.**

Para rodar: `cd apps/game_engine && gleam test`

---

## Dependências

```toml
[dependencies]
gleam_stdlib = ">= 0.44.0 and < 2.0.0"

[dev-dependencies]
gleeunit = ">= 1.0.0 and < 2.0.0"
```

Zero dependências de runtime externas. Apenas gleam_stdlib.

---

## Padrões DDD Aplicados

| Padrão | Implementação |
|---|---|
| **Aggregate Root** | WaitingMatch → ActiveMatch → FinishedMatch (tipos distintos) |
| **Entity** | Player (id), ActiveRound/EndedRound (index) |
| **Value Object** | Song, Artist, Album, Answer, MatchConfiguration, Highlights |
| **Domain Event** | MatchEvent (6 variants) |
| **Domain Error** | LobbyError, RoundError, FinishError (por workflow) |
| **Domain Service** | scoring, validation, song_selection, highlights |
| **Smart Constructor** | MatchConfiguration.new_config() → Result |
| **Estados ilegais irrepresentáveis** | Compilador rejeita chamadas inválidas |
| **Facade** | game_engine.gleam (única porta de entrada) |
| **Chain of Responsibility** | Pipeline no submit_answer |
| **Ubiquitous Language** | Nomes do GDD no código |
