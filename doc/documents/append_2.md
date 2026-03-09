## 📌 Adendo: Especificação completa de comandos e eventos no **Game Engine** (contrato de módulo Gleam)

### 🎯 Objetivo

Estabelecer um **contrato claro e completo de comunicação** entre o **orquestrador (Elixir)** e o **motor do jogo (Gleam)**, permitindo:

*   Definir **funções públicas** que controlam o jogo.
*   Estruturar **custom types** para comandos e eventos.
*   Garantir compatibilidade e tipagem forte via compilador Gleam.
*   Testar e evoluir cada lado de forma isolada com base no contrato.

> Esse contrato é definido pelos **tipos exportados dos módulos Gleam** e verificado em tempo de compilação.

---

## 🔁 Estrutura de Comunicação

*   **Comandos** são enviados de **Elixir → Gleam** (como chamadas de função direta).
*   **Eventos** são retornados de **Gleam → Elixir** (como `Result` types ou custom types).
*   **Formato**: Custom types Gleam nativos — sem serialização necessária.
*   Zero overhead de rede, pois tudo roda no mesmo nó BEAM.

---

## 📜 Exemplo de Definição do Contrato (tipos Gleam)

```gleam
// Tipos de configuração
pub type AnswerType {
  SongName
  ArtistName
  Both
}

pub type ScoringRule {
  Simple
  SpeedBonus
}

pub type MatchConfiguration {
  MatchConfiguration(
    time_per_round: Int,
    total_songs: Int,
    answer_type: AnswerType,
    allow_repeats: Bool,
    scoring_rule: ScoringRule,
  )
}

// Tipos de evento retornados
pub type MatchEvent {
  MatchStarted(match: Match)
  RoundStarted(match: Match, round: Round)
  AnswerProcessed(match: Match, player_id: String, is_correct: Bool, points_earned: Int)
  RoundCompleted(match: Match, round: Round, scores: Dict(String, Int))
  MatchCompleted(match: Match, final_scores: Dict(String, Int), winner_id: String)
}

pub type EngineError {
  InvalidState(message: String)
  PlayerNotFound(player_id: String)
  NotEnoughPlayers
  NotAllPlayersReady
  NotEnoughSongs
  SongsDivisibilityError(total_songs: Int, total_players: Int)
  RoundAlreadyEnded
  PlayerAlreadyAnswered(player_id: String)
  NoMoreRounds
}

// Funções públicas (contrato) — módulo game_engine
pub fn new_match(id: String, config: MatchConfiguration, players: List(Player), songs: List(Song)) -> Result(Match, EngineError)
pub fn set_player_ready(match: Match, player_id: String) -> Result(Match, EngineError)
pub fn start_match(match: Match) -> Result(MatchEvent, EngineError)
pub fn start_round(match: Match) -> Result(MatchEvent, EngineError)
pub fn submit_answer(match: Match, player_id: String, answer: String, response_time: Float) -> Result(MatchEvent, EngineError)
pub fn end_round(match: Match) -> Result(MatchEvent, EngineError)
pub fn end_match(match: Match) -> Result(MatchEvent, EngineError)
pub fn all_answered(match: Match) -> Bool
pub fn is_last_round(match: Match) -> Bool
```

---

## ✅ Lista de **Funções públicas** (Comandos)

| Função              | Descrição                                         | Parâmetros principais                                    |
| ------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `new_match`         | Cria uma nova partida                             | `id`, `config`, `players`, `songs`                       |
| `set_player_ready`  | Marca jogador como pronto                         | `match`, `player_id`                                     |
| `start_match`       | Inicia a partida (todos devem estar prontos)      | `match`                                                  |
| `start_round`       | Avança para a próxima rodada                      | `match`                                                  |
| `submit_answer`     | Um jogador envia uma resposta para a rodada atual | `match`, `player_id`, `answer`, `response_time`          |
| `end_round`         | Finaliza a rodada manualmente ou por timeout      | `match`                                                  |
| `end_match`         | Força o término do jogo                           | `match`                                                  |
| `all_answered`      | Verifica se todos responderam na rodada           | `match`                                                  |
| `is_last_round`     | Verifica se é a última rodada                     | `match`                                                  |

---

## 📢 Lista de **Eventos** (Custom types retornados)

| Evento               | O que significa                     | Campos principais                                        |
| -------------------- | ----------------------------------- | -------------------------------------------------------- |
| `MatchStarted`       | Partida começou com sucesso         | `match`                                                  |
| `RoundStarted`       | Nova rodada começou                 | `match`, `round`                                         |
| `AnswerProcessed`    | Uma resposta foi validada           | `match`, `player_id`, `is_correct`, `points_earned`      |
| `RoundCompleted`     | Rodada foi encerrada                | `match`, `round`, `scores`                               |
| `MatchCompleted`     | Fim da partida                      | `match`, `final_scores`, `winner_id`                     |
| `EngineError`        | Algum comando inválido              | Variant com mensagem descritiva                          |

---

## ⚠️ Regras Gerais do Contrato

*   **Toda função retorna `Result(MatchEvent, EngineError)`** — sucesso ou erro tipado.
*   O compilador Gleam garante que **todos os casos de erro são tratados** (exhaustive pattern matching).
*   O contrato é **versionado pelos módulos** — mudanças breaking são detectadas em tempo de compilação.

---

## 🧪 Sugestão de testes

*   **Gleam**: testes unitários puros para cada função da engine, validando invariantes.
*   **Elixir**: testes de integração chamando os módulos Gleam e verificando os retornos.
*   **Property-based testing**: usando bibliotecas como `qcheck` (Gleam) para testar combinações de estados.

---

## ✅ Benefícios de manter esse contrato

*   Garante clareza e **forte tipagem em tempo de compilação**.
*   Facilita testes isolados da engine (funções puras sem side effects).
*   Permite mockar a engine para testes do Orchestrator.
*   Serve como documentação viva — os tipos Gleam **são** o contrato.
*   **Zero overhead**: sem serialização, sem rede, sem geração de código.

---
