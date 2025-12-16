# Documento Unificado — "Mermã, a Música!"

## Sumário
- [append_1.md](#append_1-md)
- [append_2.md](#append_2-md)
- [documento_conciso.md](#documento_conciso-md)
- [game_engine_context.md](#game_engine_context-md)
- [game_orquestration_context.md](#game_orquestration_context-md)
- [introdução.md](#introdução-md)
- [map_de_contexto.md](#map_de_contexto-md)
- [playlist_integration_context.md](#playlist_integration_context-md)
- [progression_ranked_context.md](#progression_ranked_context-md)
- [visão_estrátegica.md](#visão_estrátegica-md)


<a id="append_1-md"></a>
## append_1.md

Claro! Aqui vai um **adendo sobre a definição das interfaces entre Swift ↔ Elixir via gRPC**, alinhado à arquitetura que você adotou:

---

## 📌 Adendo: Interfaces entre Swift ↔ Elixir (gRPC)

### 🎯 Objetivo da Integração

Permitir que o processo Elixir (que representa uma sala e orquestra a partida) **chame a lógica pura da engine em Swift**, passando comandos (como "iniciar partida", "responder", "avançar rodada") e recebendo eventos ou estado atualizado de forma performática e segura.

---

### 🔌 Modo de Integração recomendado: **gRPC**

#### ✅ Por que usar gRPC?

*   **Segurança e Desacoplamento**: Swift roda em processo separado — se crashar, Elixir continua vivo. gRPC reforça o desacoplamento com um contrato de serviço forte.
*   **Performance e Interoperabilidade**: gRPC usa Protocol Buffers para serialização binária eficiente e é otimizado para comunicação de baixa latência entre serviços. O Swift tem excelente suporte para gRPC.
*   **Contrato bem definido**: a definição do serviço via arquivos `.proto` garante um contrato claro e tipado entre o orquestrador e a engine.

---

### 🧱 Interface sugerida (Contrato via Protobuf)

#### 🔁 Comunicação:

*   **Entrada (Elixir → Swift)**: Chamadas de serviço RPC (ex: `IniciarPartidaRequest`)
*   **Saída (Swift → Elixir)**: Respostas RPC ou streams de eventos de domínio (ex: `PartidaIniciadaResponse`, `stream RodadaEvent`)

#### 📦 Formato dos dados:

*   A comunicação será via **Protocol Buffers (Protobuf)**, que é o padrão do gRPC.

#### 📘 Exemplo de contrato (`.proto`):

```proto
// Exemplo de definição de serviço
service GameEngine {
  rpc IniciarPartida(IniciarPartidaRequest) returns (PartidaIniciadaResponse);
  rpc EnviarResposta(EnviarRespostaRequest) returns (stream RespostaEvent);
}

message IniciarPartidaRequest {
  string partida_id = 1;
  // ... outros campos
}

message PartidaIniciadaResponse {
  int32 rodada_atual = 1;
  // ... outros campos
}
```

---

### 🛠️ Passos para implementar:

1.  **Swift**:
    *   Implementa os serviços gRPC definidos no arquivo `.proto`.
    *   Cada função de serviço aciona a lógica de domínio correspondente.
    *   Retorna respostas ou transmite eventos via gRPC streams.

2.  **Elixir**:
    *   Usa um cliente gRPC gerado a partir do `.proto` para se comunicar com o servidor Swift.
    *   Chama as funções de serviço remotas (ex: `GameService.Stub.iniciar_partida(request)`).
    *   Recebe respostas ou escuta streams de eventos do serviço Swift.

---

### 🧪 Sugestão de testes

*   Mocks de chamadas gRPC do Elixir para o servidor Swift.
*   O servidor Swift responde com mensagens Protobuf simuladas → assert no cliente Elixir.
*   Testes de contrato automatizados podem ser adicionados para validar o `.proto`.

---

### 🔄 Evolução futura

*   A arquitetura com gRPC já é altamente performática. A evolução pode focar em otimizar os payloads do Protobuf ou explorar streaming bidirecional para comunicação ainda mais reativa.

---

## ✅ Resumo

*   Use **gRPC** para performance, segurança e um contrato de serviço robusto.
*   Elixir envia **chamadas RPC → Swift aplica lógica → Swift retorna respostas/eventos**.
*   Mantenha a interface **simples, explícita e baseada em contratos bem definidos** no arquivo `.proto`.
*   Evolua o contrato `.proto` de forma versionada conforme a necessidade.

---
---


<a id="append_2-md"></a>
## append_2.md

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
---


<a id="documento_conciso-md"></a>
## documento_conciso.md

# 📘 Documento Conciso de Domínio — "Mermã, a Música!"

Documento consolidado que mantém todas as informações dos arquivos de `doc/`, organizado para consulta rápida sem alterar o conteúdo original.

---

## 1. Visão Estratégica

- **Propósito**: jogo multiplayer de quiz musical que usa playlists pessoais (Spotify, Deezer) para rodadas competitivas em tempo real, mantendo foco em diversão casual, personalização total e comunidade open-source ativa.
- **Problema resolvido**: falta de plataformas que permitam usar playlists próprias; diferencial em catálogo infinito, regras configuráveis, rodadas dinâmicas e abertura a contribuições.
- **Objetivos estratégicos**: experiência rápida e recompensadora; salas privadas para amigos; playlists pessoais como núcleo; arquitetura modular preparada para modos ranqueados/progressão; projeto OSS com guia público.
- **Perfis de usuário**: jogador casual; host da partida; contribuidor open-source; streamer/influencer.
- **Escopo MVP**: criação de salas, importação Spotify, rodadas com trechos de 15–30s, respostas validadas (inclui configurações de músicas, tempo, tipo de resposta e regra de pontuação) e placar final. Fora do escopo: modo ranqueado, XP/nível, integrações extras, espectador/chat, matchmaking público.
- **Tecnologia e arquitetura**: UI/Gateway em Bun + TS/JS; Game Orchestrator em Elixir/Gleam; Game Engine em **Swift**; comunicação via **gRPC**; integrações REST/GraphQL para plataformas musicais.
- **Roadmap**: MVP (multiplayer com playlists); v1.1 (estatísticas pós-jogo, modo espectador, integração Discord); v1.2 (XP, ranking, conquistas); v2.0 (matchmaking público, torneios, novas fontes como YouTube/SoundCloud).

---

## 2. Context Map e Status

- **Contextos principais**: UI Gateway (frontend e APIs); Game Orchestrator (salas, tempo real); Game Engine (regras puras); Playlist Integration (importa/normaliza playlists); Progressão & Ranking (XP, histórico, conquistas); contatos futuros com serviços externos.
- **Relações**: UI/Gateway ↔ Orchestrator via HTTP/WebSocket; Orchestrator ↔ Game Engine via **gRPC**; Orchestrator ↔ Playlist Context via REST/GraphQL; Orchestrator ↔ Progressão via eventos; Playlist fornece dados ao Engine; Progressão escuta resultados.
- **Design chave**: cada sala = processo isolado no BEAM; Game Engine independente e agnóstico à UI; Playlist Context desacopla integrações; Progressão é plugável; UI pode ser trocada sem tocar o domínio.
- **Tipos de relacionamento**: Playlist é upstream do Game Engine; protocolos: Gateway ↔ Orchestrator (HTTP/WebSocket), Orchestrator ↔ Engine (**gRPC**), Engine ↔ Playlist (requisições de dados).
- **Status atual por contexto**: Game Engine (Core, pronto para implementação); Game Orchestrator (Supporting, precisa orquestração); Playlist Integration (Supporting, depende das libs externas); Progressão/Ranking (Future, fora do escopo atual).

---

## 3. Bounded Contexts

### 3.1 Game Engine Context — Swift (Core Domain)

- **Objetivo**: gerenciar ciclo completo da partida, validar respostas, aplicar regras configuradas, emitir eventos de domínio e garantir invariantes sem conhecer UI ou conexões.
- **Aggregate `Partida`**: controla rodadas, configuração (`ConfiguracaoDaPartida`), estado (`EsperandoJogadores`, `EmAndamento`, `Finalizada`), lista de `JogadorNaPartida`, `Rodada` e índice atual.
- **Entidades**:
  - `JogadorNaPartida`: id, nome, playlist (lista de `Musica`), estado (Conectado/Pronto/Respondido), pontuação, histórico de `Resposta`.
  - `Rodada`: índice, `Musica`, mapa de respostas por jogador, estado (`EmAndamento`, `Encerrada`).
  - `Musica`: id, nome, artista, `preview_url`.
- **Value Objects**:
  - `ConfiguracaoDaPartida`: tempo por rodada, total de músicas (divisível pelo número de jogadores para iniciar), tipo de resposta (MÚSICA/ARTISTA/AMBOS), repetição permitida, regra de pontuação (simples ou bônus).
  - `Resposta`: texto, tempo de resposta, validade.
  - `ResultadoRodada`: respostas certas/erradas, tempo, pontuação atribuída.
- **Eventos**: `PartidaIniciada`, `RodadaIniciada`, `RespostaRecebida`, `RespostaCorreta`, `RodadaFinalizada`, `PartidaFinalizada`.
- **Invariantes**: todos prontos e músicas divisíveis antes de iniciar; uma resposta por jogador por rodada; sem resposta após rodada finalizada; repetição só se permitido.
- **Linguagem ubíqua**: Partida, Jogador, Rodada, Resposta, Música, Configuração, Evento mapeados para as respectivas entidades/VOs.

### 3.2 Game Orchestrator Context — Elixir/Gleam

- **Objetivo**: receber comandos da UI, manter jogadores conectados, controlar timers, coordenar transições de estado e acionar a Game Engine, enviando notificações em tempo real.
- **Modelo de processos**: um processo BEAM por sala ativa mantém estado em memória, timers e comunicação bidirecional com UI e Engine, permitindo escala horizontal.
- **Entidades**:
  - `Sala`: id, host_id, jogadores (`JogadorNaSala`), estado (`Aguardando`, `EmPartida`, `Finalizada`), código de convite, estado serializado da partida, timer.
  - `JogadorNaSala`: id, nome, playlist pré-processada, flag `pronto`, status de conexão (Conectado, Desconectado, Reconectando).
- **Value Objects**: `CodigoDeSala`, `EstadoDaSala` (`AguardandoJogadores`, `ProntaParaComecar`, `EmJogo`, `Finalizada`), `MensagemDeEstado`.
- **Comportamentos**: entrada/saída de jogadores, marcação de pronto, início do jogo pelo host, disparo de `RodadaIniciada`, encaminhamento de respostas à Engine, fechamento automático por timeout, finalização e envio de resultados.
- **Integrações**: Game Engine (gRPC), UI Gateway (WebSocket/API), Playlist Context (REST/GraphQL), Progressão futura (eventos).
- **Serviços internos**: `GerenciadorDeSalas`, `RelogioDaRodada`, `DispatcherDeMensagens`, `CoordenadorDePartida`.
- **Invariantes**: apenas host inicia; todos prontos antes de começar; músicas divisíveis por jogadores; jogador único por sala; reconexão com timeout; sala destruída após inatividade.
- **Glossário**: sala = processo, jogador = entrada ativa, código de convite = identificador público, estado da sala = estágios, timer da rodada = contador, comando/evento = mensagens da UI/Engine.

### 3.3 Playlist Integration Context

- **Objetivo**: autenticar jogadores com plataformas (Spotify, Deezer, futuros YouTube/SoundCloud), importar playlists, filtrar músicas com `preview_url`, normalizar dados para o formato esperado pelo Game Engine.
- **Motivação**: isolar APIs externas para manter domínio limpo, permitir múltiplas fontes e facilitar testes via mocks.
- **Entidades**:
  - `ContaConectada`: usuário, plataforma, access/refresh tokens, nome na plataforma.
  - `PlaylistImportada`: id, nome, músicas válidas (`MusicaNormalizada`), total filtrado, dono.
  - `MusicaNormalizada`: id externo, nome, artista, `preview_url`, duração, flag `valida`.
- **Value Objects**: `PlataformaDeStreaming` enum (SPOTIFY, DEEZER, YOUTUBE_MUSIC...), `TokenOAuth` (access, refresh, validade), `ResultadoImportacao` (listas de válidas, inválidas, erros).
- **Serviços**: `AutenticadorDePlataforma`, `ImportadorDePlaylists`, `FiltradorDeMusicasValidas`, `NormalizadorDeMusicas`.
- **Fluxo**: OAuth → armazenar `ContaConectada` → escolher playlist → importar/filtrar → entregar `PlaylistImportada` ao Orchestrator → seleção de músicas para partida.
- **Invariantes**: apenas músicas com preview; cada jogador usa apenas suas playlists; playlists precisam de N músicas válidas; remover playlist externa implica descartar cache local.
- **Comunicação**: fornece playlists ao Orchestrator, lista opções ao UI Gateway.
- **Glossário**: plataforma, playlist, música válida, importação, token OAuth conforme descrito.

### 3.4 Progressão e Ranking Context (Futuro)

- **Objetivo**: acompanhar evolução dos jogadores (XP, níveis, ranking, conquistas, histórico), reagindo a eventos do jogo sem interferir na partida.
- **Papel estratégico**: implementável depois, escuta `PartidaFinalizada`/`JogadorPontuado`, escala separadamente e habilita gamificação/monetização sem tocar o core.
- **Integrações**: recebe eventos do Orchestrator (`PartidaFinalizada`, `PontuacaoCalculada`), expõe dados ao UI Gateway (ranking, níveis, conquistas).
- **Entidades**:
  - `JogadorGlobal`: user_id, xp_total, nível, ranking, conquistas (`Medalha`).
  - `PartidaHistorica`: id, data, participantes (`DesempenhoDoJogador`), configuração, músicas usadas.
  - `DesempenhoDoJogador`: jogador_id, pontuação, tempo médio de resposta, acertos.
  - `Medalha`: id, nome, condição, data de desbloqueio.
- **Value Objects**: `PontosDeExperiencia`, `Nivel`, `RankingGlobal`.
- **Regras**: XP apenas em partidas completas; nível deriva de XP; ranking atualizado periodicamente; XP não diminui; conquistas únicas; histórico imutável.
- **Serviços**: `XPService`, `NivelService`, `ConquistaService`, `HistoricoService`, `RankingService`.
- **Glossário**: XP, nível, conquista, histórico, ranking.
- **Implementação sugerida**: armazenamento relacional/NoSQL, fila de eventos (RabbitMQ/Kafka/Pub/Sub), API REST, consistência eventual.

### 3.5 UI Gateway Context

- **Tipo**: domínio genérico que expõe WebSocket e REST para o frontend, faz ponte com o Orchestrator e suporta Bun/TypeScript, podendo ser trocado sem afetar o domínio.

---

## 4. Integração Swift ↔ Elixir (gRPC)

- **Objetivo**: permitir que o processo Elixir (sala) invoque a lógica pura em Swift com comandos (`iniciar_partida`, `responder`, `avancar_rodada`) e receba eventos/estados via gRPC.
- **Modo recomendado**: **gRPC**, que oferece alta performance com Protocol Buffers, segurança (processo isolado) e um contrato de serviço forte e tipado.
- **Contrato**: A comunicação é definida por um arquivo `.proto`. Elixir (cliente) envia chamadas RPC para Swift (servidor), que retorna respostas ou streams de eventos.
- **Implementação**: Swift implementa os serviços gRPC definidos no `.proto`. Elixir usa um cliente gRPC gerado para invocar os serviços remotamente.
- **Testes sugeridos**: mocks das chamadas gRPC e respostas simuladas em Protobuf.
- **Evolução**: A arquitetura com gRPC já é altamente performática. A evolução pode focar em otimizar os payloads do Protobuf ou explorar streaming bidirecional.

---

## 5. Contrato de Serviço do Game Engine (gRPC)

- **Estrutura**: Serviços, comandos (Requests) e eventos (Responses/Streams) são definidos em um arquivo `.proto` e implementados via gRPC. A comunicação é binária e fortemente tipada por padrão. O contrato é versionado (ex: `v1`, `v2`).

### Comandos (Exemplos de RPCs)

| RPC                 | Descrição                                |
| ------------------- | ---------------------------------------- |
| `IniciarPartida`    | Cria partida pronta para rodadas         |
| `IniciarRodada`     | Avança para a próxima rodada             |
| `EnviarResposta`    | Registra resposta de jogador             |
| `FinalizarRodada`   | Encerra rodada manualmente/por timeout   |
| `FinalizarPartida`  | Força término da partida                 |

### Eventos (Exemplos de Responses/Streams)

| Evento               | Significado                              |
| -------------------- | ---------------------------------------- |
| `PartidaIniciada`    | Partida começou                          |
| `RodadaIniciada`     | Nova rodada                              |
| `RespostaProcessada` | Resposta registrada e validada           |
| `RodadaFinalizada`   | Rodada encerrada                         |
| `PartidaFinalizada`  | Partida terminou                         |
| `Error` (Status gRPC) | Comando inválido ou falha                |

- **Modelagem sugerida**: A definição do contrato é o próprio arquivo `.proto`. As ferramentas de gRPC geram o código do servidor (Swift) e do cliente (Elixir) automaticamente.

---

## 6. Glossário Geral do Domínio

| Termo                    | Definição                                                                 |
| ------------------------ | ------------------------------------------------------------------------- |
| Partida                  | Sessão composta por rodadas e jogadores                                   |
| Rodada                   | Momento em que uma música toca e todos respondem                          |
| Jogador                  | Participante com identidade única na partida                              |
| Playlist                 | Lista de músicas conectada do streaming                                   |
| Resposta                 | Texto enviado tentando acertar                                            |
| Configuração da Sala     | Regras (número de músicas, tempo, modo de pontuação, repetição)           |
| Repetição de música      | Permissão para usar músicas duplicadas entre playlists                    |
| Pontuação                | Total de acertos do jogador                                               |
| Ranking                  | Posição do jogador em relação ao sistema inteiro                          |
| XP                       | Pontos de experiência ganhos por participação/desempenho                  |
| Sala                     | Processo isolado que coordena jogadores e partida                         |
| Código de convite        | Identificador público para ingressar em uma sala                          |
| Timer da rodada          | Contador usado para encerrar rodadas                                      |
| Música válida            | Música com `preview_url` disponível                                       |
| Importação               | Processo de buscar playlists/músicas na conta conectada                   |

---

Documento finalizado mantendo todas as informações originais em formato condensado.

---


<a id="game_engine_context-md"></a>
## game_engine_context.md

Excelente! Vamos agora para o **📦 Ponto 3: Detalhamento de cada Bounded Context com seus Aggregates, Entidades e Value Objects**, começando pelo **contexto mais importante do sistema: o `Game Engine Context`**.

---

# 📦 3. Detalhamento dos Bounded Contexts

---

## 🎮 **Game Engine Context** (⚙️ Swift – Core Domain)

> Responsável por toda a **lógica central do jogo**, controlando a partida, suas rodadas, os jogadores, as respostas e a pontuação.
> Este contexto não conhece interfaces gráficas, APIs, nem estado de conexão: ele apenas executa as **regras puras do jogo**.

---

### 🎯 Objetivo deste contexto

* Gerenciar o ciclo de vida da partida (início → rodadas → fim)
* Validar respostas dos jogadores
* Aplicar regras configuradas (tipo de resposta, tempo, repetição)
* Gerar eventos do domínio que refletem mudanças de estado
* Garantir invariantes do jogo

---

### 📌 Aggregate Principal: `Partida`

> Representa uma instância de jogo multiplayer configurado e em andamento.

#### Responsabilidades:

* Coordenar rodadas
* Armazenar configurações
* Controlar o estado de execução
* Delegar respostas para as rodadas
* Calcular pontuação

#### Campos (estado interno):

* `id`: Identificador da partida
* `estado`: Enum (`EsperandoJogadores`, `EmAndamento`, `Finalizada`)
* `configuracao`: VO `ConfiguracaoDaPartida`
* `jogadores`: Lista de `JogadorNaPartida`
* `rodadas`: Lista de `Rodada`
* `indiceRodadaAtual`: Inteiro (qual rodada está ativa)

---

### 🧱 Entidades

#### 1. `JogadorNaPartida`

> Representa um jogador específico dentro de uma partida.

| Campo       | Tipo                | Descrição                     |
| ----------- | ------------------- | ----------------------------- |
| `id`        | ID                  | Identificador único           |
| `nome`      | String              | Apelido visível               |
| `playlist`  | Lista<`Musica`>     | Músicas extraídas do serviço  |
| `estado`    | Enum                | Conectado, Pronto, Respondido |
| `pontuacao` | Int                 | Pontuação acumulada           |
| `respostas` | Lista de `Resposta` | Histórico da partida          |

---

#### 2. `Rodada`

> Representa um momento do jogo em que uma música é tocada e os jogadores devem responder.

| Campo       | Tipo                     | Descrição                        |
| ----------- | ------------------------ | -------------------------------- |
| `indice`    | Int                      | Número da rodada                 |
| `musica`    | `Musica`                 | Música sorteada para essa rodada |
| `respostas` | Map<JogadorId, Resposta> | Respostas dadas pelos jogadores  |
| `estado`    | Enum                     | EmAndamento, Encerrada           |

---

#### 3. `Musica`

> Dados da música usada na rodada.

| Campo         | Tipo   | Descrição                           |
| ------------- | ------ | ----------------------------------- |
| `id`          | ID     | Interno                             |
| `nome`        | String | Título da música                    |
| `artista`     | String | Nome do artista                     |
| `preview_url` | String | Link para trecho da música (15–30s) |

---

### 🧩 Value Objects (VO)

#### 1. `ConfiguracaoDaPartida`

| Campo                | Tipo                          | Descrição                                     |
| -------------------- | ----------------------------- | --------------------------------------------- |
| `tempoPorRodada`     | Int                           | Em segundos (ex: 15)                          |
| `totalDeMusicas`     | Int                           | Quantidade total                              |
| `tipoDeResposta`     | Enum (MUSICA, ARTISTA, AMBOS) | Define o que será aceito como resposta válida |
| `repeticaoPermitida` | Bool                          | Define se músicas podem se repetir            |
| `regraPontuacao`     | Enum                          | Simples ou com bônus por velocidade           |

---

#### 2. `Resposta`

| Campo           | Tipo   | Descrição                                  |
| --------------- | ------ | ------------------------------------------ |
| `texto`         | String | Texto digitado pelo jogador                |
| `tempoResposta` | Float  | Tempo em segundos desde o início da rodada |
| `valida`        | Bool   | Resultado da validação contra a música     |

---

### 🔄 Eventos de Domínio (emitidos pelo Aggregate `Partida`)

| Evento              | Causa                             | Ação esperada                      |
| ------------------- | --------------------------------- | ---------------------------------- |
| `PartidaIniciada`   | Todos prontos, regras válidas     | Orquestrador inicia timers         |
| `RodadaIniciada`    | Avanço de rodada                  | Música tocada, cronômetro iniciado |
| `RespostaRecebida`  | Jogador enviou resposta           | Validar e armazenar                |
| `RespostaCorreta`   | Texto bate com valor esperado     | Atribuir ponto                     |
| `RodadaFinalizada`  | Todos responderam ou tempo acabou | Calcular resultado                 |
| `PartidaFinalizada` | Última rodada encerrada           | Enviar estatísticas finais         |

---

### 🧠 Invariantes (Regras que sempre devem ser verdadeiras)

* Partida só pode ser iniciada se:

  * Todos os jogadores estiverem `Prontos`
  * O número de músicas for divisível pelo número de jogadores
* Jogador só pode responder uma vez por rodada
* Não se aceita resposta após a rodada ser finalizada
* Músicas repetidas só são permitidas se `repeticaoPermitida = true`

---

### 📘 Linguagem Ubíqua (Termos preferidos no código e comunicação)

| Termo de Domínio | Representação no Modelo          |
| ---------------- | -------------------------------- |
| Partida          | Aggregate Root `Partida`         |
| Jogador          | `JogadorNaPartida`               |
| Rodada           | `Rodada` (entidade)              |
| Resposta         | `Resposta` (VO)                  |
| Música           | `Musica` (entidade)              |
| Configuração     | `ConfiguracaoDaPartida` (VO)     |
| Evento           | Enum ou struct `EventoDeDominio` |

---
---


<a id="game_orquestration_context-md"></a>
## game_orquestration_context.md

Perfeito! Vamos agora para o **📦 Bounded Context 2: `Game Orchestrator Context`**, que é **o cérebro da aplicação** no que diz respeito a tempo real, coordenação e orquestração da experiência de jogo.

---

# 📦 3.2 — **Game Orchestrator Context**

> *Elixir / Gleam – Orquestração e coordenação da partida multiplayer*

---

## 🎯 Objetivo deste contexto

Esse contexto é responsável por **controlar o ciclo de vida de uma sala e da partida**:

* Recebe comandos da UI (via HTTP/WebSocket)
* Coordena transições de estado da partida
* Mantém os jogadores conectados
* Garante o tempo das rodadas
* Comunica-se com o `Game Engine` para aplicar regras
* Dispara notificações para a UI em tempo real

> Ele **não implementa regras de jogo** — isso é papel do `Game Engine` — mas **é quem diz quando essas regras devem ser aplicadas**.

---

## 🧠 Ponto central: cada **sala ativa é um processo isolado**

Usando o modelo de processos do BEAM (Erlang VM), você pode criar **um processo por sala de jogo**, que:

* Mantém o estado da sala na memória
* Controla timers de rodada
* Escuta eventos de entrada (via WebSocket/API)
* Reage aos eventos emitidos pela `Game Engine`

Isso permite escalar horizontalmente o jogo sem colisões entre salas.

---

## 📦 Entidades do Contexto

### 1. `Sala`

> Representa uma sessão multiplayer aguardando ou rodando uma partida.

| Campo                 | Tipo                                 | Descrição                               |
| --------------------- | ------------------------------------ | --------------------------------------- |
| `id`                  | UUID                                 | Identificador único da sala             |
| `host_id`             | UUID                                 | Jogador que criou a sala                |
| `jogadores`           | Lista de `JogadorNaSala`             | Participantes conectados                |
| `estado`              | Enum                                 | `Aguardando`, `EmPartida`, `Finalizada` |
| `codigo_convite`      | String                               | Código usado para entrar na sala        |
| `partida_em_execucao` | Estado interno do jogo (serializado) |                                         |
| `timer`               | Ref de tempo                         | Timer de rodada atual                   |

---

### 2. `JogadorNaSala`

> Representa o jogador durante o ciclo de vida da sala.

| Campo            | Tipo                               | Descrição                                 |
| ---------------- | ---------------------------------- | ----------------------------------------- |
| `id`             | UUID                               | ID único                                  |
| `nome`           | String                             | Apelido                                   |
| `playlist`       | Lista de músicas (pré-processadas) |                                           |
| `pronto`         | Bool                               | Indicador de que está pronto para iniciar |
| `status_conexao` | Enum                               | Conectado, Desconectado, Reconectando     |

---

## 🧩 Value Objects

### `CodigoDeSala`

* String curta e única, compartilhada entre jogadores para ingressar na sala

### `EstadoDaSala`

* Enum: `AguardandoJogadores`, `ProntaParaComecar`, `EmJogo`, `Finalizada`

### `MensagemDeEstado`

* Estrutura enviada pela WebSocket para a UI refletir o estado atual

---

## 🎯 Comportamentos esperados do Orchestrator

| Comando recebido             | Ação executada                                         |
| ---------------------------- | ------------------------------------------------------ |
| Jogador entra na sala        | Adiciona à lista de jogadores e envia estado da sala   |
| Jogador marca-se como pronto | Atualiza status, verifica se todos estão prontos       |
| Host inicia o jogo           | Gera configuração e envia comando para o `Game Engine` |
| Rodada inicia                | Aciona timer, envia evento `RodadaIniciada` à UI       |
| Jogador envia resposta       | Encaminha para o `Game Engine`, armazena resultado     |
| Tempo da rodada acaba        | Fecha rodada automaticamente                           |
| Última rodada finalizada     | Marca partida como finalizada e envia resultados       |

---

## 🔄 Interações com outros contextos

| Componente externo      | Tipo de comunicação | Propósito                               |
| ----------------------- | ------------------- | --------------------------------------- |
| **Game Engine**         | gRPC                | Aplicar regras da partida               |
| **UI Gateway**          | WebSocket/API       | Receber comandos e enviar atualizações  |
| **Playlist Context**    | REST/GraphQL        | Buscar playlists válidas por jogador    |
| **Progressão (futuro)** | Event/Queue         | Enviar eventos como `PartidaFinalizada` |

---

## 🔧 Serviços internos

| Serviço                 | Responsabilidade                       |
| ----------------------- | -------------------------------------- |
| `GerenciadorDeSalas`    | Gerencia o registro de salas ativas    |
| `RelogioDaRodada`       | Timer central que aciona fim da rodada |
| `DispatcherDeMensagens` | Envia notificações via WebSocket       |
| `CoordenadorDePartida`  | Orquestra o início e fim da partida    |

---

## ⚠️ Invariantes importantes

* Só o host pode iniciar a partida
* Todos os jogadores precisam estar prontos para começar
* O número de músicas deve ser divisível pelo número de jogadores
* Cada jogador só pode entrar uma vez por sala
* Quando um jogador desconecta, deve ser possível reconectar (com timeout)
* Sala deve ser destruída se inativa por X minutos

---

## 📘 Glossário do Orchestrator

| Termo de Domínio  | Representação                    |
| ----------------- | -------------------------------- |
| Sala              | Processo isolado                 |
| Jogador           | Entrada ativa na sala            |
| Código de convite | Identificador público da sala    |
| Estado da sala    | Aguardando, Jogando, Finalizada  |
| Timer da rodada   | Contador para encerrar rodada    |
| Comando           | Mensagem recebida do cliente     |
| Evento            | Mensagem recebida do Game Engine |

---
---


<a id="introdu--o-md"></a>
## introdução.md

Perfeito, Gabriel! Agora vamos formalizar tudo que exploramos até aqui em um **📄 Documento Estratégico de Domínio (DDD)** para o projeto **"Mermã, a Música!"**.

Esse documento será composto por:

1. ✅ Visão Geral Estratégica
2. ✅ Mapa de Contexto (Context Map)
3. ✅ Bounded Contexts com explicação
4. ✅ Entidades, Aggregates e Value Objects por Contexto
5. ✅ Glossário de termos do domínio

Esse documento é seu **guia de domínio completo** para continuar o desenvolvimento técnico, comunicar com contribuidores e tomar decisões de design de forma alinhada com a visão do negócio.

---

# 📘 Documento de Domínio — **"Mermã, a Música!"**

## 1. 🎯 Visão Geral Estratégica

**"Mermã, a Música!"** é um jogo multiplayer online de quiz musical, inspirado em *Anime Music Quiz*, mas com suporte para playlists pessoais de plataformas como Spotify, Deezer, etc.

O foco principal do domínio é a **partida multiplayer competitiva**, na qual os jogadores escutam trechos de músicas de suas próprias playlists e tentam adivinhar corretamente os nomes das faixas, artistas ou ambos — dependendo das configurações da partida.

---

## 2. 🗺️ Mapa de Contexto (Context Map)

Aqui está a separação dos principais **Bounded Contexts** e como eles se relacionam:

```text
                                      ┌──────────────────────────────┐
                                      │     🎨 UI / Gateway (Bun)     │
                                      │ Frontend + WebSocket/HTTP API│
                                      └────────────┬─────────────────┘
                                                   │
                         ┌─────────────────────────┴──────────────────────────┐
                         │             🎮 Game Orchestrator Context           │
                         │         (Elixir / Gleam - Phoenix Channels)       │
                         └────────────┬────────────────────────────┬─────────┘
                                      │                            │
                       ┌──────────────┘                            └──────────────┐
                       ▼                                                       ▼
         ┌──────────────────────────────┐                        ┌──────────────────────────────┐
         │   ⚙️ Game Engine Context       │                        │     🎵 Playlist Context       │
         │      (Swift - lógica de jogo)  │                        │ Integrações Spotify/Deezer   │
         └──────────────────────────────┘                        └──────────────────────────────┘

                                  ┌──────────────────────────────┐
                                  │ 🏅 Progressão / Ranking Context│
                                  └──────────────────────────────┘
```

### Tipos de relacionamento:

* 🔗 **Upstream / Downstream**: `Playlist Context` é fornecedor para o `Game Engine Context`
* 💬 **Protocolos de integração**:

  * `Gateway ↔ Game Orchestrator`: HTTP/WebSocket
  * `Orchestrator ↔ Game Engine`: gRPC
  * `Game Engine ↔ Playlist Context`: Requisição de dados de entrada

---

## 3. 🧭 Bounded Contexts (Detalhados)

---

### 🎮 **1. Game Engine Context (Core Domain)**

> *Responsável por toda a lógica central da partida: rodadas, respostas, pontuação, regras, fluxo de jogo.*

#### 📦 Aggregates:

* `Partida`

  * Controla estado do jogo, jogadores, rodadas e regras
* `Rodada`

  * Responsável por reproduzir trecho e aceitar respostas
* `Placar`

  * Mantém pontuação dos jogadores

#### 🧱 Entidades:

* `JogadorNaPartida`

  * Identidade única, estado (pronto, respondido), playlist

* `Musica`

  * ID, nome, artista, trecho disponível

#### 🎯 Value Objects:

* `ConfiguracaoDaPartida`

  * Número de músicas, tempo por rodada, tipo de resposta (musica/artista/ambos), se permite repetição

* `Resposta`

  * Texto enviado pelo jogador (validado estritamente)

* `ResultadoRodada`

  * Respostas certas/erradas, tempos de resposta, pontuação atribuída

#### 🔄 Eventos de domínio:

* `PartidaIniciada`
* `RodadaIniciada`
* `RespostaRecebida`
* `RodadaFinalizada`
* `PartidaFinalizada`

---

### 🫂 **2. Game Orchestrator Context**

> *Responsável por gerenciar o ciclo de vida da sala, estado dos jogadores, orquestrar os fluxos, enviar mensagens de tempo real.*

#### 📦 Entidades:

* `Sala`

  * ID, host, estado (esperando, jogando, finalizada), jogadores

* `JogadorNaSala`

  * Conectado, pronto, playlist associada

#### 🎯 Value Objects:

* `CodigoDaSala`
* `EstadoDoJogador`

#### Serviços:

* `GerenciadorDeSalas`
* `RelogioDaRodada` (timer de execução)
* `WebSocketDispatcher`

---

### 🎵 **3. Playlist Context**

> *Responsável por integrar com plataformas externas de música e fornecer dados normalizados.*

#### 🧱 Entidades:

* `PlaylistExterna`

  * ID da plataforma, nome, dono, músicas com trecho disponível

* `MusicaDaPlaylist`

  * Nome, artista, preview_url (15–30s), gênero (opcional)

#### Serviços externos:

* `SpotifyService`
* `DeezerService`

#### ⚖️ Regras:

* Apenas músicas com `preview_url` válido podem ser usadas
* Cada jogador só pode usar suas próprias playlists conectadas

---

### 🏅 **4. Progressão / Ranking Context**

> *Calcula XP, ranking global, histórico de partidas e conquistas.*

#### 📦 Entidades:

* `JogadorGlobal`

  * userId, XP, ranking, conquistas

* `PartidaHistorica`

  * Data, resultado, pontuação, tempo de resposta médio

#### 🎯 Value Objects:

* `PontosDeExperiencia`
* `NivelDoJogador`
* `Medalha`

---

## 4. 📘 Glossário de Termos do Domínio

| Termo                    | Significado                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Partida**              | Sessão de jogo, composta por rodadas e jogadores                             |
| **Rodada**               | Um momento único onde uma música é tocada e os jogadores respondem           |
| **Jogador**              | Participante com identidade única na partida                                 |
| **Playlist**             | Lista de músicas conectada do streaming                                      |
| **Resposta**             | Texto enviado pelo jogador tentando acertar                                  |
| **Configuração da Sala** | Conjunto de regras da partida (número de músicas, tempo, modo de pontuação)  |
| **Repetição de música**  | Define se músicas repetidas entre playlists podem ser usadas mais de uma vez |
| **Pontuação**            | Total de acertos atribuídos ao jogador                                       |
| **Ranking**              | Posição do jogador entre todos os participantes do sistema                   |
| **XP**                   | Sistema de progressão baseado em participação e desempenho                   |

---

## 5. ✅ Status atual por contexto

| Contexto             | Tipo de Domínio | Maturidade                             |
| -------------------- | --------------- | -------------------------------------- |
| Game Engine          | ⭐ **Core**      | Modelado e pronto para implementação   |
| Game Orchestrator    | **Supporting**  | Planejado, precisa orquestração        |
| Playlist Integration | **Supporting**  | Parcial, depende da lib de integração  |
| Progressão / Ranking | **Future**      | Ainda indefinido, fora do escopo atual |

---

---


<a id="map_de_contexto-md"></a>
## map_de_contexto.md

Ótimo! Vamos detalhar agora o **📍Ponto 2: Mapa de Contexto (Context Map)**.

Este ponto responde a perguntas como:

* **Quais são os limites naturais do sistema?**
* **Quais partes falam com quais?**
* **Onde estão as integrações externas?**
* **Quem depende de quem?**
* **Quais contextos são independentes?**

---

# 📍 2. Mapa de Contexto — *"Mermã, a Música!"*

## 🎯 Objetivo

Dividir o sistema em **Bounded Contexts** estratégicos, cada um com sua **linguagem ubíqua**, **modelo de domínio próprio**, e **responsabilidades isoladas**, possibilitando uma arquitetura modular, distribuída e evolutiva.

---

## 🗺️ Visão Geral (Simplificada em Texto)

```plaintext
┌────────────────────────────────────────────────────┐
│                    UI Gateway (Bun)                │
│ - Frontend                                          │
│ - WebSocket/API interface                           │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│             Game Orchestrator Context              │
│ - Gerencia salas, rodadas, jogadores               │
│ - Tempo real (Elixir/Gleam)                        │
│ - Controla o fluxo geral da partida                │
└──────┬──────────────────────┬──────────────────────┘
       │                      │
       ▼                      ▼
┌───────────────┐     ┌──────────────────────────────┐
│ Game Engine   │     │ Playlist Integration Context │
│ (Swift)       │     │ - Spotify / Deezer APIs      │
│ - Regras do   │     │ - Autenticação e playlists   │
│   jogo        │     └──────────────────────────────┘
│ - Validação   │
└───────────────┘
       │
       ▼
┌────────────────────────────────────────────────────┐
│           Progressão e Ranking Context             │
│ - Histórico de partidas                            │
│ - XP e conquistas (futuro)                         │
└────────────────────────────────────────────────────┘
```

---

## 🔍 Detalhes de cada Bounded Context

---

### 1. 🎮 **Game Engine Context**

* **Tipo**: Core Domain
* **Responsável por**: Toda a lógica central da partida:

  * Início e fim de rodadas
  * Validação de respostas
  * Pontuação e regras
* **Tecnologia sugerida**: Swift (alta performance)
* **Não conhece nada sobre o mundo externo**: recebe comandos, retorna eventos
* **Comunicação**: via gRPC para o `Orchestrator`

---

### 2. 🫂 **Game Orchestrator Context**

* **Tipo**: Supporting Domain (estratégico)
* **Responsável por**:

  * Ciclo de vida de uma sala
  * Entrada e saída de jogadores
  * Orquestração das rodadas com timers
  * Envio/recebimento de mensagens via WebSocket
* **Tecnologia sugerida**: Elixir (BEAM), process model natural
* **Interage com**:

  * `Game Engine` (para lógica de jogo)
  * `UI Gateway` (para enviar estado ao frontend)
  * `Playlist Context` (para buscar músicas)
* **Design natural**: cada **sala = processo isolado**

---

### 3. 🎵 **Playlist Integration Context**

* **Tipo**: Generic Domain (integração)
* **Responsável por**:

  * Conectar contas do Spotify/Deezer
  * Buscar playlists e faixas
  * Normalizar músicas (ex: nome, artista, preview_url)
* **Tecnologia livre** (pode ser microserviço Node, Go, etc.)
* **Interface externa** com APIs de terceiros
* **Entregas**:

  * `PlaylistNormalizada` com trechos válidos
* **Comunicação**:

  * Fornece dados ao `Game Orchestrator` antes da partida

---

### 4. 🏅 **Progressão e Ranking Context**

* **Tipo**: Future Supporting Domain
* **Responsável por** (futuro):

  * Armazenar histórico de partidas
  * Calcular e manter XP dos jogadores
  * Ranking global e conquistas
* **Tecnologia opcional** (pode ser acoplada ou separada)
* **Pode ser atualizado via eventos do `Game Orchestrator`**
* **Separável para escalar em futuro matchmaking competitivo**

---

### 5. 🎨 **UI Gateway Context**

* **Tipo**: Generic Domain
* **Responsável por**:

  * Expor WebSocket para tempo real
  * Fornecer endpoints REST para o frontend
  * Fazer ponte com o Orquestrador
* **Tecnologia**: Bun (rápido, moderno, ideal para TypeScript)

---

## 🔗 Tipos de Relacionamento entre Contextos

| Relacionamento                 | Tipo                        | Exemplo                              |
| ------------------------------ | --------------------------- | ------------------------------------ |
| `UI Gateway` → `Orchestrator`  | API/Socket (Cliente)        | Envia comandos, recebe estado        |
| `Orchestrator` → `Game Engine` | gRPC                        | Envia comandos, recebe eventos       |
| `Orchestrator` → `Playlist`    | Cliente REST                | Solicita músicas para montar rodadas |
| `Orchestrator` → `Ranking`     | Eventual (event-driven)     | Envia eventos de resultado           |

---

## 📌 Direções estratégicas no contexto map

* **Game Engine é central**: ele **não depende de ninguém**, apenas reage a comandos
* **Orchestrator é o integrador**: sabe de todos os contextos, mas isola responsabilidades
* **Playlist é utilitário externo**: importante, mas não precisa estar sempre ativo
* **Ranking é plugável**: pode ser acoplado depois sem quebrar a base
* **UI é totalmente desacoplada da lógica**: pode trocar o front ou canal de comunicação no futuro

---
---


<a id="playlist_integration_context-md"></a>
## playlist_integration_context.md

Excelente! Vamos agora para o **📦 Bounded Context 3: Playlist Integration Context**, essencial para dar ao seu jogo o diferencial de **usar playlists pessoais** como fonte de conteúdo.

---

# 📦 3.3 — **Playlist Integration Context**

> *Responsável por conectar com serviços de streaming (Spotify, Deezer, etc.), importar playlists dos jogadores e normalizar as faixas que podem ser usadas no jogo.*

---

## 🎯 Objetivo deste contexto

Este contexto abstrai a complexidade das integrações com APIs externas de música.
Ele:

* Autentica os jogadores com suas contas de streaming
* Recupera playlists e músicas disponíveis
* Filtra apenas as músicas válidas para uso no jogo (com `preview_url`)
* Normaliza os dados para o formato que o `Game Engine` espera

---

## 🧠 Motivação estratégica

Sem esse contexto:

* A lógica de jogo precisaria conhecer as APIs do Spotify/Deezer
* Seria difícil mudar ou expandir suporte para outras plataformas
* O domínio ficaria acoplado à infraestrutura externa

Com esse contexto:

* O domínio continua limpo e agnóstico
* É possível usar múltiplas fontes no futuro (SoundCloud, Apple Music)
* Facilita testes com dados mockados

---

## 🔌 Serviços Externos Integrados

* 🎵 Spotify Web API
* 🎶 Deezer API
* (Outros futuros: YouTube Music, SoundCloud...)

---

## 📦 Entidades

### 1. `ContaConectada`

| Campo           | Tipo                      | Descrição                   |
| --------------- | ------------------------- | --------------------------- |
| `usuario_id`    | UUID                      | Relacionado ao jogador      |
| `plataforma`    | Enum (Spotify, Deezer...) | Origem dos dados            |
| `access_token`  | String                    | Token de acesso (OAuth)     |
| `refresh_token` | String                    | Usado para renovar sessão   |
| `nome_usuario`  | String                    | Nome da conta na plataforma |

---

### 2. `PlaylistImportada`

> Representa uma playlist da conta do jogador, com dados normalizados.

| Campo     | Tipo                         | Descrição                       |
| --------- | ---------------------------- | ------------------------------- |
| `id`      | String                       | ID da playlist na plataforma    |
| `nome`    | String                       | Nome da playlist                |
| `musicas` | Lista de `MusicaNormalizada` | Faixas válidas para o jogo      |
| `total`   | Int                          | Total de músicas após filtragem |
| `dono`    | `usuario_id`                 | Proprietário da playlist        |

---

### 3. `MusicaNormalizada`

> Música extraída e limpa, pronta para uso no jogo.

| Campo         | Tipo   | Descrição                                            |
| ------------- | ------ | ---------------------------------------------------- |
| `id_externo`  | String | ID na plataforma (ex: Spotify ID)                    |
| `nome`        | String | Nome da música                                       |
| `artista`     | String | Nome do artista                                      |
| `preview_url` | URL    | Trecho de 15–30s                                     |
| `duração_ms`  | Int    | Duração total da faixa                               |
| `valida`      | Bool   | Se pode ser usada (baseada na existência de preview) |

---

## 🧩 Value Objects

### `PlataformaDeStreaming`

* Enum: `SPOTIFY`, `DEEZER`, `YOUTUBE_MUSIC`, etc.

### `TokenOAuth`

* Struct com access + refresh + validade

### `ResultadoImportacao`

* Struct contendo listas: válidas, inválidas, erro

---

## 📡 Comportamentos / Serviços

| Serviço                     | Responsabilidade                                       |
| --------------------------- | ------------------------------------------------------ |
| `AutenticadorDePlataforma`  | Realiza OAuth e armazena tokens                        |
| `ImportadorDePlaylists`     | Lista as playlists da conta conectada                  |
| `FiltradorDeMusicasValidas` | Remove músicas sem `preview_url`                       |
| `NormalizadorDeMusicas`     | Converte formato da API externa para o domínio interno |

---

## 🔁 Fluxo de uso

```text
1. Jogador autentica com Spotify (OAuth)
2. Plataforma retorna tokens → armazenados como `ContaConectada`
3. Jogador escolhe uma playlist
4. Serviço importa e filtra músicas
5. `PlaylistImportada` é retornada ao `Game Orchestrator`
6. Orquestrador seleciona músicas para a partida
```

---

## ⚖️ Invariantes (Regras de Negócio)

* Apenas músicas com `preview_url` são válidas para o jogo
* Cada jogador só pode usar suas próprias playlists
* Playlists devem conter ao menos N músicas válidas para serem aceitas
* Se uma playlist for removida na plataforma, deve ser descartada no cache local

---

## 🔗 Comunicação com outros contextos

| Destino             | Propósito                                                   |
| ------------------- | ----------------------------------------------------------- |
| `Game Orchestrator` | Solicita playlists e músicas válidas para montar as rodadas |
| `UI Gateway`        | Exibe playlists disponíveis para o jogador escolher         |

---

## 📘 Linguagem Ubíqua

| Termo             | Significado                                    |
| ----------------- | ---------------------------------------------- |
| **Plataforma**    | Sistema de streaming conectado                 |
| **Playlist**      | Lista de músicas de um jogador                 |
| **Música válida** | Música com preview_url                         |
| **Importação**    | Processo de buscar playlists/músicas da conta  |
| **Token OAuth**   | Credencial de acesso segura para a API externa |

---
---


<a id="progression_ranked_context-md"></a>
## progression_ranked_context.md

Excelente, vamos fechar com chave de ouro agora o **📦 Bounded Context 4: Progressão e Ranking**, mesmo sendo um módulo futuro. Isso é uma prática muito boa em DDD: **modelar desde cedo os contextos que ainda não serão implementados**, para que o sistema **já nasça preparado para crescer com coerência**.

---

# 📦 3.4 — **Progressão e Ranking Context**

> *Futuro contexto responsável por XP, ranking global, conquistas e histórico de partidas.*

---

## 🎯 Objetivo deste contexto

Este contexto tem como missão **acompanhar a evolução dos jogadores ao longo do tempo**, recompensando a participação, o desempenho, e fomentando a competição saudável.

> Ele **não interfere no funcionamento da partida**, mas **reage aos eventos emitidos por ela**, construindo **indicadores persistentes** como:

* Pontos de experiência (XP)
* Nível de jogador
* Histórico de partidas
* Ranking global
* Conquistas e medalhas

---

## 🧠 Papel estratégico

* Pode ser implementado **posteriormente** sem quebrar o domínio principal
* Pode escutar eventos como `PartidaFinalizada`, `JogadorPontuado`, etc.
* Pode ser escalado separadamente como serviço
* Permite **gamificação leve**, sem afetar o core

---

## 🔄 Integração com outros contextos

| Fonte               | Evento recebido                           | Ação esperada                        |
| ------------------- | ----------------------------------------- | ------------------------------------ |
| `Game Orchestrator` | `PartidaFinalizada`, `PontuacaoCalculada` | Calcular XP, registrar histórico     |
| `UI Gateway`        | Consulta de ranking, nível e conquistas   | Fornecer dados agregados por jogador |

---

## 📦 Entidades

### 1. `JogadorGlobal`

> Representa um jogador no sistema de progressão, agregando todos os dados históricos.

| Campo        | Tipo               | Descrição                            |
| ------------ | ------------------ | ------------------------------------ |
| `user_id`    | UUID               | Referência ao jogador                |
| `xp_total`   | Int                | Total acumulado de experiência       |
| `nivel`      | Int                | Nível atual calculado com base no XP |
| `ranking`    | Int                | Posição relativa global (opcional)   |
| `conquistas` | Lista de `Medalha` | Conquistas desbloqueadas             |

---

### 2. `PartidaHistorica`

> Uma instância passada de uma partida finalizada.

| Campo           | Tipo                           | Descrição              |
| --------------- | ------------------------------ | ---------------------- |
| `id`            | UUID                           | ID da partida          |
| `data`          | DateTime                       | Quando aconteceu       |
| `participantes` | Lista de `DesempenhoDoJogador` | Resumo de cada jogador |
| `configuracao`  | Config usada na partida        |                        |
| `musicasUsadas` | Lista de faixas jogadas        |                        |

---

### 3. `DesempenhoDoJogador`

| Campo                  | Tipo  | Descrição        |
| ---------------------- | ----- | ---------------- |
| `jogador_id`           | UUID  | ID do jogador    |
| `pontuacao`            | Int   | Pontos finais    |
| `tempoMedioDeResposta` | Float | Em segundos      |
| `acertos`              | Int   | Total de acertos |

---

### 4. `Medalha` (Conquista)

| Campo             | Tipo         | Descrição                         |
| ----------------- | ------------ | --------------------------------- |
| `id`              | String       | Identificador                     |
| `nome`            | String       | Nome da medalha                   |
| `condicao`        | Enum / regra | Ex: "Acertar 10 músicas seguidas" |
| `dataDesbloqueio` | Date         | Quando foi conquistada            |

---

## 🧩 Value Objects

### `PontosDeExperiencia`

* Int (com função de cálculo para XP por pontuação e tempo)

### `Nivel`

* Int (nível do jogador, calculado por XP total)

### `RankingGlobal`

* Tabela ordenada por XP total (opcionalmente segmentada)

---

## 🧪 Regras e invariantes

* XP é ganho apenas em partidas completas
* Nível é derivado do XP (por faixas configuráveis)
* Ranking é atualizado periodicamente (batch ou em tempo real)
* Não há perda de XP (sem punição)
* Conquistas devem ser únicas e não reatribuídas
* Histórico não pode ser editado após salvo

---

## ⚙️ Serviços e funcionalidades

| Serviço            | Responsabilidade                      |
| ------------------ | ------------------------------------- |
| `XPService`        | Converte desempenho em pontos de XP   |
| `NivelService`     | Calcula o nível atual baseado no XP   |
| `ConquistaService` | Avalia e desbloqueia conquistas       |
| `HistoricoService` | Armazena e consulta partidas passadas |
| `RankingService`   | Ordena jogadores com base no XP total |

---

## 📘 Glossário

| Termo     | Significado                                |
| --------- | ------------------------------------------ |
| XP        | Pontos de experiência ganhos em partidas   |
| Nível     | Representação de progressão, baseada em XP |
| Conquista | Meta desbloqueada com uma ação notável     |
| Histórico | Registro completo das partidas jogadas     |
| Ranking   | Lista ordenada dos melhores jogadores      |

---

## 🛠️ Implementação sugerida (futura)

* Banco relacional ou NoSQL para armazenar histórico
* Escuta de eventos via fila (ex: RabbitMQ, Kafka, Pub/Sub)
* API REST para consulta de ranking e histórico
* Eventual consistência: pode ser atualizado em background

---

## ✅ Conclusão do `Progressão e Ranking Context`

Esse contexto é um **apoio valioso**, que **aumenta a vida útil do jogo**, promove engajamento e incentiva a competitividade. Ele:

* É **totalmente separado da lógica de jogo**
* Pode ser adicionado **a qualquer momento**
* Permite que o core continue limpo e rápido
* Abre portas para **monetização leve** (futuro)

---
---


<a id="vis-o_estr-tegica-md"></a>
## visão_estrátegica.md

Perfeito! Vamos então detalhar o **📘 Primeiro Ponto do Documento de Domínio: Visão Geral Estratégica**.

---

# 📘 1. Visão Geral Estratégica — *"Mermã, a Música!"*

### 🧠 **Propósito do Sistema**

**"Mermã, a Música!"** é um jogo multiplayer de quiz musical online que permite aos jogadores competirem entre si usando músicas de suas próprias playlists, conectadas por meio de serviços de streaming como Spotify ou Deezer.

O sistema combina:

* **Jogo casual divertido**
* **Customização total da experiência**
* **Interação multiplayer em tempo real**
* **Modelo open-source com comunidade ativa**

---

## 🧩 **Problema que o sistema resolve**

Jogos de quiz musicais existentes (como *Anime Music Quiz*) são altamente nichados e limitados a um catálogo específico.
Não existe uma plataforma multiplayer, em tempo real, que permita os jogadores **usarem suas próprias playlists** de música como base para um jogo competitivo e personalizável.

**"Mermã, a Música!" resolve isso** oferecendo:

| Diferencial             | Como é resolvido                                           |
| ----------------------- | ---------------------------------------------------------- |
| Catálogo limitado       | Usa playlists pessoais dos usuários                        |
| Falta de personalização | Regras da partida são configuráveis pelo host              |
| Jogos previsíveis       | Rodadas geradas dinamicamente a partir de múltiplas fontes |
| Interface fechada       | Projeto open-source com contribuições da comunidade        |

---

## 🎯 **Objetivos estratégicos do produto**

| Objetivo                                      | Descrição                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 🎮 Criar uma experiência divertida e imersiva | Foco na mecânica de jogo simples, rápida e recompensadora                                   |
| 🤝 Estimular o jogo entre amigos              | Multiplayer real-time com salas privadas                                                    |
| 🎧 Usar playlists pessoais como diferencial   | Integração direta com Spotify/Deezer para personalização                                    |
| 🚀 Criar base para expansão                   | Arquitetura modular, baseada em eventos, com suporte a modos ranqueados e progressão futura |
| 🧑‍💻 Ser um projeto open-source vivo         | Código aberto com guia de contribuição, roadmap público e comunidade ativa                  |

---

## 🧑‍🤝‍🧑 **Perfil dos Usuários**

| Tipo de Usuário              | Características                                                |
| ---------------------------- | -------------------------------------------------------------- |
| **Jogador Casual**           | Entra para jogar com amigos; valoriza a simplicidade           |
| **Host da Partida**          | Cria salas, configura as regras, convida amigos                |
| **Contribuidor Open-source** | Desenvolvedor, designer ou tradutor que colabora com o projeto |
| **Streamer/Influencer**      | Usa o jogo como conteúdo para live com seguidores              |

---

## 🧱 **Escopo da Primeira Versão (MVP)**

### 🟢 Incluído:

* Criação de salas multiplayer
* Conexão com Spotify para importar playlists
* Rodadas com reprodução de trechos musicais
* Campo de resposta com validação exata (com autocomplete)
* Regras configuráveis:

  * Total de músicas
  * Tempo por rodada
  * Tipo de resposta (música, artista, ambos)
  * Pontuação simples ou com bônus
* Placar final com pontuações

### 🔴 Fora do escopo inicial:

* Modo ranqueado global
* Progressão de nível ou XP
* Integração com outras plataformas além do Spotify
* Modo espectador ou chat integrado
* Matchmaking público automatizado

---

## 🛠️ **Tecnologia e Arquitetura Estratégica**

| Camada                | Tecnologia        | Responsabilidade                                  |
| --------------------- | ----------------- | ------------------------------------------------- |
| 🖼️ UI                | **Bun + TS/JS**   | Interface, WebSocket e API gateway                |
| 🔁 Orquestração       | **Elixir (BEAM)** | Gerencia salas, rodadas, mensagens                |
| ⚙️ Lógica de jogo     | **Swift**         | Engine pura do jogo: rodada, pontuação, validação |
| 🗣️ Comunicação MS      | **gRPC**          | Comunicação entre os microsserviços                |
| 🎵 Integração externa | REST/GraphQL      | Spotify, Deezer, etc.                             |

---

## 🌱 **Evolução futura planejada**

| Fase    | Funcionalidades                                                                   |
| ------- | --------------------------------------------------------------------------------- |
| 🟢 MVP  | Jogo multiplayer básico com playlists pessoais                                    |
| 🔵 v1.1 | Tela de estatísticas pós-jogo, modo espectador, integração com Discord            |
| 🟣 v1.2 | Progressão com XP, ranking global, conquistas                                     |
| 🟠 v2.0 | Matchmaking público, torneios, suporte a novas fontes (YouTube, SoundCloud, etc.) |

---

## 📌 **Resumo estratégico**

> **"Mermã, a Música!"** é um sistema de quiz musical multiplayer baseado em playlists pessoais, focado em diversão, personalização e multiplayer leve. Ele adota princípios modernos de design de software (DDD, Event-Driven, arquitetura distribuída) e visa se tornar um projeto open-source referência no nicho de jogos sociais.
---
