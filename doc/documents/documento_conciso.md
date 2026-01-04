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
- **Aggregate `Match`**: controla rodadas, configuração (`MatchConfiguration`), estado (`WaitingForPlayers`, `InProgress`, `Finished`), lista de `PlayerInMatch`, `Round` e índice atual.
- **Entidades**:
  - `PlayerInMatch`: id, nome, playlist (lista de `Song`), estado (Connected/Ready/Answered), pontuação, histórico de `Answer`.
  - `Round`: índice, `Song`, mapa de respostas por jogador, estado (`InProgress`, `Ended`).
  - `Song`: id, nome, artista, `preview_url`.
- **Value Objects**:
  - `MatchConfiguration`: tempo por rodada, total de músicas (divisível pelo número de jogadores para iniciar), tipo de resposta (SONG/ARTIST/BOTH), repetição permitida, regra de pontuação (simples ou bônus).
  - `Answer`: texto, tempo de resposta, validade.
  - `RoundResult`: respostas certas/erradas, tempo, pontuação atribuída.
- **Eventos**: `MatchStarted`, `RoundStarted`, `AnswerReceived`, `CorrectAnswer`, `RoundEnded`, `MatchEnded`.
- **Invariantes**: todos prontos e músicas divisíveis antes de iniciar; uma resposta por jogador por rodada; sem resposta após rodada finalizada; repetição só se permitido.
- **Linguagem ubíqua**: Match, Player, Round, Answer, Song, Configuration, Event mapeados para as respectivas entidades/VOs.

### 3.2 Game Orchestrator Context — Elixir/Gleam

- **Objetivo**: receber comandos da UI, manter jogadores conectados, controlar timers, coordenar transições de estado e acionar a Game Engine, enviando notificações em tempo real.
- **Modelo de processos**: um processo BEAM por sala ativa mantém estado em memória, timers e comunicação bidirecional com UI e Engine, permitindo escala horizontal.
- **Entidades**:
  - `Room`: id, host_id, jogadores (`PlayerInRoom`), estado (`Waiting`, `InMatch`, `Finished`), código de convite, estado serializado da partida, timer.
  - `PlayerInRoom`: id, nome, playlist pré-processada, flag `ready`, status de conexão (Connected, Disconnected, Reconnecting).
- **Value Objects**: `RoomCode`, `RoomState` (`WaitingForPlayers`, `ReadyToStart`, `InGame`, `Finished`), `StateMessage`.
- **Comportamentos**: entrada/saída de jogadores, marcação de pronto, início do jogo pelo host, disparo de `RoundStarted`, encaminhamento de respostas à Engine, fechamento automático por timeout, finalização e envio de resultados.
- **Integrações**: Game Engine (gRPC), UI Gateway (WebSocket/API), Playlist Context (REST/GraphQL), Progressão futura (eventos).
- **Serviços internos**: `RoomManager`, `RoundTimer`, `MessageDispatcher`, `MatchCoordinator`.
- **Invariantes**: apenas host inicia; todos prontos antes de começar; músicas divisíveis por jogadores; jogador único por sala; reconexão com timeout; sala destruída após inatividade.
- **Glossário**: sala = processo, jogador = entrada ativa, código de convite = identificador público, estado da sala = estágios, timer da rodada = contador, comando/evento = mensagens da UI/Engine.

### 3.3 Playlist Integration Context

- **Objetivo**: autenticar jogadores com plataformas (Spotify, Deezer, futuros YouTube/SoundCloud), importar playlists, filtrar músicas com `preview_url`, normalizar dados para o formato esperado pelo Game Engine.
- **Motivação**: isolar APIs externas para manter domínio limpo, permitir múltiplas fontes e facilitar testes via mocks.
- **Entidades**:
  - `ConnectedAccount`: usuário, plataforma, access/refresh tokens, nome na plataforma.
  - `ImportedPlaylist`: id, nome, músicas válidas (`NormalizedSong`), total filtrado, dono.
  - `NormalizedSong`: id externo, nome, artista, `preview_url`, duração, flag `is_valid`.
- **Value Objects**: `StreamingPlatform` enum (SPOTIFY, DEEZER, YOUTUBE_MUSIC...), `OAuthToken` (access, refresh, validade), `ImportResult` (listas de válidas, inválidas, erros).
- **Serviços**: `PlatformAuthenticator`, `PlaylistImporter`, `ValidSongFilter`, `SongNormalizer`.
- **Fluxo**: OAuth → armazenar `ConnectedAccount` → escolher playlist → importar/filtrar → entregar `ImportedPlaylist` ao Orchestrator → seleção de músicas para partida.
- **Invariantes**: apenas músicas com preview; cada jogador usa apenas suas playlists; playlists precisam de N músicas válidas; remover playlist externa implica descartar cache local.
- **Comunicação**: fornece playlists ao Orchestrator, lista opções ao UI Gateway.
- **Glossário**: plataforma, playlist, música válida, importação, token OAuth conforme descrito.

### 3.4 Progressão e Ranking Context (Futuro)

- **Objetivo**: acompanhar evolução dos jogadores (XP, níveis, ranking, conquistas, histórico), reagindo a eventos do jogo sem interferir na partida.
- **Papel estratégico**: implementável depois, escuta `MatchEnded`/`PlayerScored`, escala separadamente e habilita gamificação/monetização sem tocar o core.
- **Integrações**: recebe eventos do Orchestrator (`MatchEnded`, `ScoreCalculated`), expõe dados ao UI Gateway (ranking, níveis, conquistas).
- **Entidades**:
  - `GlobalPlayer`: user_id, total_xp, nível, ranking, conquistas (`Badge`).
  - `HistoricalMatch`: id, data, participantes (`PlayerPerformance`), configuração, músicas usadas.
  - `PlayerPerformance`: player_id, score, average_response_time, correct_answers.
  - `Badge`: id, nome, condition, unlocked_at.
- **Value Objects**: `ExperiencePoints`, `Level`, `GlobalRanking`.
- **Regras**: XP apenas em partidas completas; nível deriva de XP; ranking atualizado periodicamente; XP não diminui; conquistas únicas; histórico imutável.
- **Serviços**: `XPService`, `LevelService`, `AchievementService`, `HistoryService`, `RankingService`.
- **Glossário**: XP, nível, conquista, histórico, ranking.
- **Implementação sugerida**: armazenamento relacional/NoSQL, fila de eventos (RabbitMQ/Kafka/Pub/Sub), API REST, consistência eventual.

### 3.5 UI Gateway Context

- **Tipo**: domínio genérico que expõe WebSocket e REST para o frontend, faz ponte com o Orchestrator e suporta Bun/TypeScript, podendo ser trocado sem afetar o domínio.

---

## 4. Integração Swift ↔ Elixir (gRPC)

- **Objetivo**: permitir que o processo Elixir (sala) invoque a lógica pura em Swift com comandos (`StartMatch`, `SubmitAnswer`, `StartRound`) e receba eventos/estados via gRPC.
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
| `StartMatch`        | Cria partida pronta para rodadas         |
| `StartRound`        | Avança para a próxima rodada             |
| `SubmitAnswer`      | Registra resposta de jogador             |
| `EndRound`          | Encerra rodada manualmente/por timeout   |
| `EndMatch`          | Força término da partida                 |

### Eventos (Exemplos de Responses/Streams)

| Evento               | Significado                              |
| -------------------- | ---------------------------------------- |
| `MatchStarted`       | Partida começou                          |
| `RoundStarted`       | Nova rodada                              |
| `AnswerProcessed`    | Resposta registrada e validada           |
| `RoundEnded`         | Rodada encerrada                         |
| `MatchEnded`         | Partida terminou                         |
| `Error` (Status gRPC) | Comando inválido ou falha                |

- **Modelagem sugerida**: A definição do contrato é o próprio arquivo `.proto`. As ferramentas de gRPC geram o código do servidor (Swift) e do cliente (Elixir) automaticamente.

---

## 6. Glossário Geral do Domínio

| Termo                    | Definição                                                                 |
| ------------------------ | ------------------------------------------------------------------------- |
| Match                    | Sessão composta por rodadas e jogadores                                   |
| Round                    | Momento em que uma música toca e todos respondem                          |
| Player                   | Participante com identidade única na partida                              |
| Playlist                 | Lista de músicas conectada do streaming                                   |
| Answer                   | Texto enviado tentando acertar                                            |
| Match Configuration      | Regras (número de músicas, tempo, modo de pontuação, repetição)           |
| Song Repetition          | Permissão para usar músicas duplicadas entre playlists                    |
| Score                    | Total de acertos do jogador                                               |
| Ranking                  | Posição do jogador em relação ao sistema inteiro                          |
| XP                       | Pontos de experiência ganhos por participação/desempenho                  |
| Room                     | Processo isolado que coordena jogadores e partida                         |
| Invite Code              | Identificador público para ingressar em uma sala                          |
| Round Timer              | Contador usado para encerrar rodadas                                      |
| Valid Song               | Música com `preview_url` disponível                                       |
| Import                   | Processo de buscar playlists/músicas na conta conectada                   |

---

Documento finalizado mantendo todas as informações originais em formato condensado.