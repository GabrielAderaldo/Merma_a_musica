Claro! Aqui vai o **adendo sobre a especificação completa de comandos e eventos no Game Engine**, servindo como **contrato formal** entre o **Game Orchestrator (Elixir)** e a **Game Engine (Swift)** via gRPC:

---

## 📌 Adendo: Especificação completa de serviços, comandos e eventos no **Game Engine** (contrato gRPC)

### 🎯 Objetivo

Estabelecer um **contrato claro e completo de comunicação** entre o **orquestrador (Elixir)** e o **motor do jogo (Swift)**, permitindo:

*   Definir **serviços e chamadas (RPCs)** que controlam o jogo.
*   Estruturar **mensagens (requests/responses)** para comandos e eventos.
*   Garantir compatibilidade e tipagem forte entre os contextos.
*   Testar e evoluir cada lado de forma isolada com base no contrato.

> Esse contrato será definido usando **Protocol Buffers (`.proto`)** e implementado via **gRPC**.

---

## 🔁 Estrutura de Comunicação

*   **Comandos** são enviados de **Elixir → Swift** (como chamadas de serviço RPC).
*   **Eventos** são emitidos de **Swift → Elixir** (como respostas de serviço ou streams gRPC).
*   **Formato**: **Protocol Buffers**, o padrão para gRPC.
*   gRPC já utiliza uma serialização binária altamente eficiente por padrão.

---

## 📜 Exemplo de Definição do Contrato (`.proto`)

```proto
syntax = "proto3";

package game_engine.v1;

// O serviço principal da Game Engine
service GameEngineService {
  // Comandos que iniciam ou alteram o estado geral
  rpc StartMatch(StartMatchRequest) returns (MatchStartedResponse);
  rpc EndMatch(EndMatchRequest) returns (MatchEndedResponse);
  
  // Comandos de rodada
  rpc StartRound(StartRoundRequest) returns (RoundStartedResponse);
  rpc SubmitAnswer(SubmitAnswerRequest) returns (AnswerProcessedResponse);
  rpc EndRound(EndRoundRequest) returns (RoundEndedResponse);

  // Um stream para eventos em tempo real durante a partida (opcional)
  rpc SubscribeToMatchEvents(SubscribeRequest) returns (stream MatchEvent);
}

// --- Mensagens de Request (Comandos) ---

message StartMatchRequest {
  string match_id = 1;
  // ... Definição de jogadores, configuração, etc.
}

message SubmitAnswerRequest {
  string match_id = 1;
  string player_id = 2;
  string answer = 3;
  double response_time = 4;
}

// --- Mensagens de Response (Eventos) ---

message MatchStartedResponse {
  int32 current_round = 1;
  Song song = 2;
  // ...
}

message RoundEndedResponse {
  int32 round_number = 1;
  map<string, Answer> answers = 2;
  map<string, int32> partial_scores = 3;
}

message AnswerProcessedResponse {
    string player_id = 1;
    bool is_valid = 2;
    int32 points_earned = 3;
}

// ... outras mensagens ...
```

---

## ✅ Lista de **Serviços/RPCs** (Comandos)

| RPC (Comando)       | Descrição                                         | Mensagem de Request (`Request`)                                  |
| ------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| `StartMatch`        | Cria uma partida pronta para rodadas              | `StartMatchRequest` (com `match_id`, `players`, `config`)        |
| `StartRound`        | Avança para a próxima rodada                      | `StartRoundRequest` (com `match_id`)                             |
| `SubmitAnswer`      | Um jogador envia uma resposta para a rodada atual | `SubmitAnswerRequest` (com `match_id`, `player_id`, `answer`)    |
| `EndRound`          | Finaliza a rodada manualmente ou por timeout      | `EndRoundRequest` (com `match_id`)                               |
| `EndMatch`          | Força o término do jogo                           | `EndMatchRequest` (com `match_id`)                               |

---

## 📢 Lista de **Respostas/Eventos**

| Evento (Response/Stream)   | O que significa                     | Mensagem de Response (`Response`)                                    |
| -------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `MatchStarted`             | Partida começou com sucesso         | `MatchStartedResponse` (com `current_round`, `song`, `players`)      |
| `RoundStarted`             | Nova rodada começou                 | `RoundStartedResponse` (com `round_number`, `song`, `time_limit`)    |
| `AnswerProcessed`          | Uma resposta foi validada           | `AnswerProcessedResponse` (com `player_id`, `is_valid`, `points_earned`)|
| `RoundEnded`               | Rodada foi encerrada                | `RoundEndedResponse` (com `answers`, `partial_scores`)               |
| `MatchEnded`               | Fim da partida                      | `MatchEndedResponse` (com `final_scores`, `winner_id`)               |
| `Error` (Status gRPC)      | Algum comando inválido foi recebido | Status gRPC com código de erro e mensagem descritiva.                |

---

## ⚠️ Regras Gerais do Contrato

*   **Todo `Request` válido deve gerar um `Response` correspondente** ou um erro gRPC.
*   O `match_id` deve estar presente na maioria das mensagens para garantir o contexto.
*   O contrato `.proto` deve ser **versionado** (ex: `v1`, `v2`) para garantir compatibilidade futura.

---

## 🧪 Sugestão de estrutura de contrato em código

A definição do contrato é o próprio arquivo `.proto`. As ferramentas de gRPC geram o código correspondente para cada linguagem:

*   Em **Swift**, o código do servidor e as mensagens são gerados a partir do `.proto`.
*   Em **Elixir**, o código do cliente e as mensagens também são gerados, garantindo a consistência.

---

## ✅ Benefícios de manter esse contrato

*   Garante clareza e forte tipagem entre a engine e a orquestração.
*   Facilita testes isolados da engine (simulando chamadas RPC).
*   Permite mockar a engine para a UI sem a engine real.
*   Serve como documentação viva e automatizável para a API interna.

---
