# Game Engine — Documentação do Domínio

**Bounded Context:** Game Engine (Core Domain)
**Tecnologia:** Gleam (BEAM)
**Tipo:** Lógica pura — zero IO, zero side effects, zero dependências externas

---

## 1. Visão Geral

O Game Engine é o coração do "Mermã, a Música!". Ele gerencia o ciclo de vida completo de uma partida de quiz musical: criação, rodadas, respostas, pontuação, desempate e finalização.

**Princípios:**
- 100% puro e determinístico — recebe dados, retorna resultados
- Estados ilegais irrepresentáveis — o compilador impede chamadas inválidas
- Funções totais — toda entrada tem uma saída tipada (Result ou valor)
- Ubiquitous Language — nomes do código espelham o Game Design Document

**O que o Engine NÃO faz:**
- WebSocket, HTTP, banco de dados, timers, I/O de qualquer tipo
- Embaralhamento aleatório (Orchestrator faz)
- Gerenciamento de salas, conexões ou autenticação
- Proxy de áudio ou resolução de playlists

---

## 2. Como Usar (Guia para o Orchestrator)

### 2.1 Ponto de Entrada

Importe **apenas** o módulo facade:

```gleam
import game_engine
```

**Nunca** importe módulos internos (`domain/workflows/*`, `domain/services/*`). A facade é a única porta de entrada.

### 2.2 Fluxo Completo de Uma Partida

```
                    ┌─────────────────────────┐
                    │      WaitingMatch        │
                    │                          │
                    │  new_match()             │
                    │  set_player_ready()      │
                    │  set_player_unready()    │
                    │  start_match()  ─────────┼──→ MatchStarted
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │      ActiveMatch         │
                    │                          │
            ┌──────│  start_round()  ─────────┼──→ RoundStarted
            │       │  submit_answer() ────────┼──→ AnswerProcessed
            │       │  all_answered()          │
            │       │  end_round()    ─────────┼──→ RoundCompleted
            │       │  is_last_round()         │
            │       │  end_match()    ─────────┼──→ MatchCompleted
            │       │                 ─────────┼──→ TiebreakerNeeded
            │       └──────────┬──────────────┘
            │                  │
            │     ┌────────────▼─────────────┐
            │     │     FinishedMatch         │
            │     │                           │
            │     │  (imutável — só consulta) │
            │     └───────────────────────────┘
            │
            └──→ (loop de rodadas até is_last_round)
```

### 2.3 Código Exemplo

```gleam
import game_engine
import game_engine/domain/types/config.{MatchConfiguration, Both, SpeedBonus}
import game_engine/domain/types/media.{SelectedSong}
import game_engine/domain/types/player.{Player}
import game_engine/domain/events.{MatchStarted, RoundStarted, AnswerProcessed, RoundCompleted, MatchCompleted, TiebreakerNeeded}

// 1. Criar partida
let config = MatchConfiguration(
  time_per_round: 30,
  total_songs: 5,
  answer_type: Both,
  allow_repeats: False,
  scoring_rule: SpeedBonus,
)
let assert Ok(waiting) = game_engine.new_match("match_1", config, players, selected_songs)

// 2. Jogadores ficam prontos
let assert Ok(waiting) = game_engine.set_player_ready(waiting, "player_1")
let assert Ok(waiting) = game_engine.set_player_ready(waiting, "player_2")

// 3. Iniciar partida (todos devem estar Ready)
let assert Ok(MatchStarted(match: active)) = game_engine.start_match(waiting)

// 4. Loop de rodadas
let assert Ok(RoundStarted(match: active, round: round)) = game_engine.start_round(active)

// 5. Jogadores respondem
let assert Ok(AnswerProcessed(match: active, player_id: _, is_correct: _, points_earned: _)) =
  game_engine.submit_answer(active, "player_1", "Bohemian Rhapsody", 5.2)

// 6. Encerrar rodada
let assert Ok(RoundCompleted(match: active, round: ended_round, scores: scores)) =
  game_engine.end_round(active)

// 7. Verificar se é a última
case game_engine.is_last_round(active) {
  True -> {
    // 8. Encerrar partida
    case game_engine.end_match(active) {
      Ok(MatchCompleted(match: finished, ranking: ranking, highlights: highlights, ..)) ->
        // Partida finalizada com ranking
        todo

      Ok(TiebreakerNeeded(tiebreaker)) ->
        // Empate! Orchestrator gerencia rodada extra de Gol de Ouro
        // Depois: game_engine.resolve_tiebreaker(tiebreaker, winner_id)
        todo
    }
  }
  False ->
    // Próxima rodada
    game_engine.start_round(active)
}
```

---

## 3. API Pública (Facade)

### Lobby (WaitingMatch)

| Função | Assinatura | Descrição |
|---|---|---|
| `new_match` | `(String, MatchConfiguration, List(Player), List(SelectedSong)) → Result(WaitingMatch, LobbyError)` | Criar partida. Músicas já selecionadas e embaralhadas pelo Orchestrator. |
| `set_player_ready` | `(WaitingMatch, String) → Result(WaitingMatch, LobbyError)` | Marcar jogador como pronto. |
| `set_player_unready` | `(WaitingMatch, String) → Result(WaitingMatch, LobbyError)` | Desmarcar jogador. |
| `start_match` | `(WaitingMatch) → Result(MatchEvent, LobbyError)` | Iniciar. Retorna `MatchStarted(ActiveMatch)`. Invariante: todos prontos. |

### Rodadas (ActiveMatch)

| Função | Assinatura | Descrição |
|---|---|---|
| `start_round` | `(ActiveMatch) → Result(MatchEvent, RoundError)` | Iniciar próxima rodada. Retorna `RoundStarted`. |
| `submit_answer` | `(ActiveMatch, String, String, Float) → Result(MatchEvent, RoundError)` | Submeter resposta. Args: match, player_id, answer_text, response_time. Permite re-submissão. |
| `all_answered` | `(ActiveMatch) → Bool` | Verificar se todos responderam. |
| `end_round` | `(ActiveMatch) → Result(MatchEvent, RoundError)` | Encerrar rodada. Acumula scores. Retorna `RoundCompleted`. |
| `is_last_round` | `(ActiveMatch) → Bool` | Verificar se é a última rodada. |

### Finalização (ActiveMatch → FinishedMatch)

| Função | Assinatura | Descrição |
|---|---|---|
| `end_match` | `(ActiveMatch) → Result(MatchEvent, FinishError)` | Encerrar partida. Retorna `MatchCompleted` ou `TiebreakerNeeded` se há empate. |
| `resolve_tiebreaker` | `(TiebreakerInfo, String) → MatchEvent` | Resolver desempate após rodada extra. Retorna `MatchCompleted`. |

---

## 4. Tipos do Domínio

### 4.1 Aggregate Root — Match States

O compilador garante que cada função só aceita o estado correto. Impossível chamar `submit_answer` num `WaitingMatch`.

```gleam
// Aguardando jogadores
type WaitingMatch {
  WaitingMatch(id, config, players, rounds, songs)
}

// Em andamento
type ActiveMatch {
  ActiveMatch(id, config, players, active_rounds, ended_rounds, current_round_index, songs)
}

// Finalizada (imutável)
type FinishedMatch {
  FinishedMatch(id, config, players, rounds, songs)
}
```

### 4.2 Entities

```gleam
// Jogador (identidade por id)
type Player {
  Player(id: String, name: String, playlist: Playlist, state: PlayerState, score: Int)
}
type PlayerState { Connected | Ready | Answered }

// Rodada (ciclo de vida)
type ActiveRound {
  ActiveRound(index: Int, song: Song, answers: Dict(String, Answer), contributed_by: String)
}
type EndedRound {
  EndedRound(index: Int, song: Song, answers: Dict(String, Answer), contributed_by: String)
}
```

### 4.3 Value Objects

```gleam
// Mídia (resolvida pelo Orchestrator)
type Song { Song(id, name, artist: Artist, album: Album, preview_url, duration_seconds) }
type Artist { Artist(id, name) }
type Album { Album(id, title, cover_url) }
type Playlist { Playlist(id, name, platform, cover_url, tracks, total_tracks, valid_tracks) }
type SelectedSong { SelectedSong(song: Song, contributed_by: String) }
type Platform { Spotify | PlatformDeezer | YoutubeMusic }

// Configuração (smart constructor)
type MatchConfiguration {
  MatchConfiguration(time_per_round, total_songs, answer_type, allow_repeats, scoring_rule)
}
type AnswerType { SongName | ArtistName | Both }
type ScoringRule { Simple | SpeedBonus }

// Resposta
type Answer { Answer(text, answer_time, is_correct, is_near_miss, points) }
type AnswerResult { AnswerResult(is_correct: Bool, is_near_miss: Bool) }

// Resultado
type RankingEntry { RankingEntry(position, player_id, nickname, total_points, correct_answers, avg_response_time) }
type Highlights { Highlights(best_streak, fastest_answer, most_correct, near_miss) }

// Desempate
type TiebreakerInfo {
  TiebreakerInfo(match, tied_player_ids, tied_score, songs_both_missed, songs_from_others, partial_ranking, highlights)
}
```

### 4.4 Domain Events

```gleam
type MatchEvent {
  MatchStarted(match: ActiveMatch)
  RoundStarted(match: ActiveMatch, round: ActiveRound)
  AnswerProcessed(match: ActiveMatch, player_id: String, is_correct: Bool, points_earned: Int)
  RoundCompleted(match: ActiveMatch, round: EndedRound, scores: Dict(String, Int))
  MatchCompleted(match: FinishedMatch, final_scores: Dict(String, Int), ranking: List(RankingEntry), highlights: Highlights)
  TiebreakerNeeded(tiebreaker: TiebreakerInfo)
}
```

### 4.5 Domain Errors

```gleam
// Erros do lobby
type LobbyError { NotEnoughPlayers | NotAllPlayersReady | NotEnoughSongs | LobbyPlayerNotFound(player_id) }

// Erros de rodada
type RoundError { RoundPlayerNotFound(player_id) | NoMoreRounds }

// Erros de finalização
type FinishError { MatchNotActive(message) }

// Erros de configuração
type ConfigError { InvalidTimePerRound(value) | InvalidTotalSongs(value) }
```

---

## 5. Domain Services

### 5.1 Scoring

```gleam
scoring.calculate_points(is_correct: Bool, response_time: Float, config: MatchConfiguration) -> Int
```

- **Simple**: acertou = 1 ponto, errou = 0
- **SpeedBonus**: `max(100, 1000 - (response_time / time_per_round × 900))`. Errou = 0.

### 5.2 Validation

```gleam
validation.check_answer(answer_text: String, song: Song, answer_type: AnswerType) -> Bool
validation.check_answer_detailed(answer_text: String, song: Song, answer_type: AnswerType) -> AnswerResult
```

- **Normalização**: lowercase, remove acentos, remove artigos (o, a, the, el, la...), remove conteúdo entre parênteses/colchetes, colapsa espaços
- **Fuzzy matching**: Levenshtein distance com threshold
- **Thresholds**: >80% = correto, 60-80% = "na trave" (near miss), <60% = errado
- **answer_type=Both**: aceita música OU artista

### 5.3 Song Selection

```gleam
song_selection.calculate_range(total_players: Int) -> SongRange
song_selection.select_songs(players: List(Player), total_songs: Int, allow_repeats: Bool) -> SelectionResult
song_selection.distribute_quotas(total: Int, num_players: Int) -> List(Int)
```

- **Range**: min = 1 × jogadores, max = 5 × jogadores
- **Distribuição**: round-robin (sobras vão para os primeiros)
- **Deduplicação**: `allow_repeats=False` remove duplicatas por `song.id`
- **Nota**: Engine NÃO embaralha. O Orchestrator embaralha antes de chamar.

### 5.4 Highlights

```gleam
highlights.build(players: List(Player), rounds: List(EndedRound)) -> Highlights
highlights.build_ranking(players: List(Player), rounds: List(EndedRound)) -> List(RankingEntry)
highlights.player_stats(player_id: String, rounds: List(EndedRound)) -> PlayerStats
highlights.calculate_streak(player_id: String, rounds: List(EndedRound)) -> Int
```

- **Maior streak**: sequência de acertos consecutivos (quebra ao errar/não responder)
- **Resposta mais rápida**: menor `answer_time` com `is_correct=True`
- **Mais acertos**: total de respostas corretas
- **Na trave**: total de near misses (similaridade 60-80%)

---

## 6. Regra de Desempate — "Gol de Ouro"

Quando `end_match` detecta empate no topo do ranking, retorna `TiebreakerNeeded` em vez de `MatchCompleted`.

### Fluxo do Orchestrator

```
1. game_engine.end_match(active) → Ok(TiebreakerNeeded(info))

2. info.songs_both_missed  ← Pool A: músicas que TODOS os empatados erraram
   info.songs_from_others  ← Pool B: músicas de OUTROS jogadores não tocadas

3. Se Pool A não vazio:
     Orchestrator escolhe 1 música aleatória do Pool A
   Senão:
     Orchestrator usa músicas do Pool B, uma de cada vez

4. Orchestrator roda rodada extra:
     - Envia música aos jogadores empatados
     - Primeiro a acertar = winner_id
     - Se ambos acertam: mais rápido vence
     - Se ambos erram: próxima música do pool

5. game_engine.resolve_tiebreaker(info, winner_id) → MatchCompleted
```

### TiebreakerInfo

| Campo | Tipo | Descrição |
|---|---|---|
| `match` | `ActiveMatch` | Match no estado atual |
| `tied_player_ids` | `List(String)` | IDs dos empatados |
| `tied_score` | `Int` | Score do empate |
| `songs_both_missed` | `List(Song)` | Pool A: músicas que todos erraram |
| `songs_from_others` | `List(Song)` | Pool B: músicas de não-empatados |
| `partial_ranking` | `List(RankingEntry)` | Ranking dos não-empatados (já definido) |
| `highlights` | `Highlights` | Destaques calculados |

---

## 7. Estrutura de Arquivos

```
src/
  game_engine.gleam                    ← Facade (ÚNICA porta de entrada)

  shared/
    levenshtein.gleam                  ← Algoritmo genérico (sem domínio)

  game_engine/domain/
    events.gleam                       ← MatchEvent (domain events)
    errors.gleam                       ← LobbyError, RoundError, FinishError

    types/                             ← Tipos puros (VOs, entities, aggregate)
      media.gleam                      ← Song, Artist, Album, Playlist, SelectedSong
      config.gleam                     ← MatchConfiguration (smart constructor)
      match_states.gleam               ← WaitingMatch, ActiveMatch, FinishedMatch
      round.gleam                      ← ActiveRound, EndedRound
      player.gleam                     ← Player, PlayerState
      answer.gleam                     ← Answer, AnswerResult
      results.gleam                    ← RankingEntry, Highlights
      tiebreaker.gleam                 ← TiebreakerInfo

    workflows/                         ← Transições de estado do aggregate
      lobby.gleam                      ← WaitingMatch → ActiveMatch
      round.gleam                      ← ActiveMatch → ActiveMatch (rodadas)
      finish.gleam                     ← ActiveMatch → FinishedMatch

    services/                          ← Lógica de negócio transversal
      scoring.gleam                    ← Cálculo de pontuação
      validation.gleam                 ← Validação de respostas
      validation/normalize.gleam       ← Normalização de strings
      song_selection.gleam             ← Seleção e distribuição de músicas
      highlights.gleam                 ← Ranking e destaques
```

---

## 8. Testes

```
test/
  game_engine_test.gleam               ← Entry point (gleeunit runner)
  test_helpers.gleam                   ← Factories e setups compartilhados
  lobby_test.gleam                     ← Workflow: new_match → start_match
  round_test.gleam                     ← Workflow: rounds, answers, scoring
  finish_test.gleam                    ← Workflow: end_match, ranking, highlights
  tiebreaker_test.gleam                ← Gol de Ouro: empate, pools, resolve
  scoring_test.gleam                   ← Service: Simple e SpeedBonus
  validation_test.gleam                ← Service: normalize, levenshtein, fuzzy
  near_miss_test.gleam                 ← Service: detecção "na trave"
  song_selection_test.gleam            ← Service: range, quotas, distribuição
  error_states_test.gleam              ← Transições inválidas
  e2e_test.gleam                       ← Cenários completos ponta a ponta
```

**87 testes, 0 falhas.**

Para rodar:
```bash
cd apps/game_engine && gleam test
```

---

## 9. Invariantes do Domínio

| Invariante | Garantida por |
|---|---|
| Partida só inicia se todos estão Ready | `lobby.start_match` verifica, compilador só aceita `WaitingMatch` |
| Resposta só aceita durante rodada ativa | Compilador: `submit_answer` aceita `ActiveMatch` com `ActiveRound` |
| Impossível chamar `submit_answer` num `WaitingMatch` | **Compilador** (tipo diferente) |
| Impossível chamar `start_match` num `ActiveMatch` | **Compilador** (tipo diferente) |
| Impossível chamar `end_match` num `FinishedMatch` | **Compilador** (tipo diferente) |
| Jogador só responde se existe na partida | `RoundPlayerNotFound` error |
| Config válida por construção | Smart constructor `new_config` |
| Músicas suficientes para a partida | `NotEnoughSongs` error |
| Pelo menos 1 jogador | `NotEnoughPlayers` error |
| Re-submissão de resposta permitida | Última resposta vale (atualiza answer_time) |
| Empate detectado automaticamente | `end_match` → `TiebreakerNeeded` |

---

## 10. Para Contribuidores

### Adicionando um novo modo de pontuação

1. Adicionar variant em `types/config.gleam` → `ScoringRule { Simple | SpeedBonus | NovoModo }`
2. Adicionar case em `services/scoring.gleam` → `NovoModo -> calcular_novo_modo(...)`
3. Adicionar testes em `test/scoring_test.gleam`
4. `gleam test` — todos devem passar

### Adicionando um novo highlight

1. Adicionar tipo em `types/results.gleam` → `HighlightNovoTipo { ... }`
2. Adicionar campo em `Highlights` → `novo_tipo: HighlightNovoTipo`
3. Implementar finder em `services/highlights.gleam`
4. Adicionar ao `build()` em highlights
5. Testes em `test/finish_test.gleam` ou `test/near_miss_test.gleam`

### Adicionando um novo tipo de resposta

1. Adicionar variant em `types/config.gleam` → `AnswerType { SongName | ArtistName | Both | NovoTipo }`
2. Adicionar case em `services/validation.gleam` → `check_answer_detailed`
3. Testes em `test/validation_test.gleam` e `test/round_test.gleam`
