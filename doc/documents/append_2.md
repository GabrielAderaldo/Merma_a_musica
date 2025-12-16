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
  rpc IniciarPartida(IniciarPartidaRequest) returns (PartidaIniciadaResponse);
  rpc FinalizarPartida(FinalizarPartidaRequest) returns (PartidaFinalizadaResponse);
  
  // Comandos de rodada
  rpc IniciarRodada(IniciarRodadaRequest) returns (RodadaIniciadaResponse);
  rpc EnviarResposta(EnviarRespostaRequest) returns (RespostaProcessadaResponse);
  rpc FinalizarRodada(FinalizarRodadaRequest) returns (RodadaFinalizadaResponse);

  // Um stream para eventos em tempo real durante a partida (opcional)
  rpc SubscribeToPartidaEvents(SubscribeRequest) returns (stream PartidaEvent);
}

// --- Mensagens de Request (Comandos) ---

message IniciarPartidaRequest {
  string partida_id = 1;
  // ... Definição de jogadores, configuração, etc.
}

message EnviarRespostaRequest {
  string partida_id = 1;
  string jogador_id = 2;
  string resposta = 3;
  double tempo_resposta = 4;
}

// --- Mensagens de Response (Eventos) ---

message PartidaIniciadaResponse {
  int32 rodada_atual = 1;
  Musica musica = 2;
  // ...
}

message RodadaFinalizadaResponse {
  int32 numero_rodada = 1;
  map<string, Resposta> respostas = 2;
  map<string, int32> placar_parcial = 3;
}

message RespostaProcessadaResponse {
    string jogador_id = 1;
    bool valida = 2;
    int32 ponto_ganho = 3;
}

// ... outras mensagens ...
```

---

## ✅ Lista de **Serviços/RPCs** (Comandos)

| RPC (Comando)       | Descrição                                         | Mensagem de Request (`Request`)                                  |
| ------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| `IniciarPartida`    | Cria uma partida pronta para rodadas              | `IniciarPartidaRequest` (com `partida_id`, `jogadores`, `config`)  |
| `IniciarRodada`     | Avança para a próxima rodada                      | `IniciarRodadaRequest` (com `partida_id`)                        |
| `EnviarResposta`    | Um jogador envia uma resposta para a rodada atual | `EnviarRespostaRequest` (com `partida_id`, `jogador_id`, `resposta`) |
| `FinalizarRodada`   | Finaliza a rodada manualmente ou por timeout      | `FinalizarRodadaRequest` (com `partida_id`)                      |
| `FinalizarPartida`  | Força o término do jogo                           | `FinalizarPartidaRequest` (com `partida_id`)                     |

---

## 📢 Lista de **Respostas/Eventos**

| Evento (Response/Stream)   | O que significa                     | Mensagem de Response (`Response`)                                    |
| -------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `PartidaIniciada`          | Partida começou com sucesso         | `PartidaIniciadaResponse` (com `rodada_atual`, `musica`, `jogadores`)    |
| `RodadaIniciada`           | Nova rodada começou                 | `RodadaIniciadaResponse` (com `numero_rodada`, `musica`, `tempo_limite`) |
| `RespostaProcessada`       | Uma resposta foi validada           | `RespostaProcessadaResponse` (com `jogador_id`, `valida`, `ponto_ganho`) |
| `RodadaFinalizada`         | Rodada foi encerrada                | `RodadaFinalizadaResponse` (com `respostas`, `placar_parcial`)       |
| `PartidaFinalizada`        | Fim da partida                      | `PartidaFinalizadaResponse` (com `placar_final`, `vencedor_id`)        |
| `Error` (Status gRPC)      | Algum comando inválido foi recebido | Status gRPC com código de erro e mensagem descritiva.              |

---

## ⚠️ Regras Gerais do Contrato

*   **Todo `Request` válido deve gerar um `Response` correspondente** ou um erro gRPC.
*   O `partida_id` deve estar presente na maioria das mensagens para garantir o contexto.
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