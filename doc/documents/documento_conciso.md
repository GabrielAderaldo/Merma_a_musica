# 📘 Documento Conciso de Domínio — "Mermã, a Música!"

Documento consolidado que mantém todas as informações dos arquivos de `doc/`, organizado para consulta rápida sem alterar o conteúdo original.

---

## 1. Visão Estratégica

- **Propósito**: jogo multiplayer de quiz musical que usa playlists pessoais (Spotify, Deezer) para rodadas competitivas em tempo real, mantendo foco em diversão casual, personalização total e comunidade open-source ativa.
- **Problema resolvido**: falta de plataformas que permitam usar playlists próprias; diferencial em catálogo infinito, regras configuráveis, rodadas dinâmicas e abertura a contribuições.
- **Objetivos estratégicos**: experiência rápida e recompensadora; salas privadas para amigos; playlists pessoais como núcleo; arquitetura modular preparada para modos ranqueados/progressão; projeto OSS com guia público.
- **Perfis de usuário**: jogador casual; host da partida; contribuidor open-source; streamer/influencer.
- **Escopo MVP**: criação de salas, importação Spotify, rodadas com trechos de 15–30s, respostas validadas (inclui configurações de músicas, tempo, tipo de resposta e regra de pontuação) e placar final. Fora do escopo: modo ranqueado, XP/nível, integrações extras, espectador/chat, matchmaking público.
- **Tecnologia e arquitetura**: UI/Gateway em Bun + TS/JS; Game Orchestrator em Elixir/Gleam; Game Engine em Zig; integrações REST/GraphQL para plataformas musicais.
- **Roadmap**: MVP (multiplayer com playlists); v1.1 (estatísticas pós-jogo, modo espectador, integração Discord); v1.2 (XP, ranking, conquistas); v2.0 (matchmaking público, torneios, novas fontes como YouTube/SoundCloud).

---

## 2. Context Map e Status

- **Contextos principais**: UI Gateway (frontend e APIs); Game Orchestrator (salas, tempo real); Game Engine (regras puras); Playlist Integration (importa/normaliza playlists); Progressão & Ranking (XP, histórico, conquistas); contatos futuros com serviços externos.
- **Relações**: UI/Gateway ↔ Orchestrator via HTTP/WebSocket; Orchestrator ↔ Game Engine via Port/NIF/JSON/Binário; Orchestrator ↔ Playlist Context via REST/GraphQL; Orchestrator ↔ Progressão via eventos; Playlist fornece dados ao Engine; Progressão escuta resultados.
- **Design chave**: cada sala = processo isolado no BEAM; Game Engine independente e agnóstico à UI; Playlist Context desacopla integrações; Progressão é plugável; UI pode ser trocada sem tocar o domínio.
- **Tipos de relacionamento**: Playlist é upstream do Game Engine; protocolos: Gateway ↔ Orchestrator (HTTP/WebSocket), Orchestrator ↔ Engine (Port/NIF), Engine ↔ Playlist (requisições de dados).
- **Status atual por contexto**: Game Engine (Core, pronto para implementação); Game Orchestrator (Supporting, precisa orquestração); Playlist Integration (Supporting, depende das libs externas); Progressão/Ranking (Future, fora do escopo atual).

---

## 3. Bounded Contexts

### 3.1 Game Engine Context — Zig (Core Domain)

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
- **Integrações**: Game Engine (Port/NIF/RPC), UI Gateway (WebSocket/API), Playlist Context (REST/GraphQL), Progressão futura (eventos).
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

## 4. Integração Zig ↔ Elixir (Ports / NIF / FFI)

- **Objetivo**: permitir que o processo Elixir (sala) invoque a lógica pura em Zig com comandos (`iniciar_partida`, `responder`, `avancar_rodada`) e receba eventos/estados.
- **Modo recomendado**: Port via stdin/stdout usando JSON inicial (legível para debug) com opção futura de formato binário; Port oferece segurança (processo isolado), facilidade e desacoplamento, ao contrário de NIFs.
- **Contrato**: Elixir → Zig envia comandos; Zig → Elixir retorna eventos (`partida_iniciada`, `resposta_correta`, etc.).
- **Implementação**:
  - Zig mantém loop lendo stdin, processa regras de domínio, escreve eventos em stdout.
  - Elixir usa `Port.open/2`, envia com `Port.command/2`, escuta `handle_info` com eventos.
- **Testes sugeridos**: mocks de comandos, respostas simuladas e testes de contrato (`ExUnit` + fixtures).
- **Evolução**: migrar para NIF/Zigler ou FFI + C ABI quando precisar de máxima performance e controle.

---

## 5. Contrato de Comandos e Eventos do Game Engine

- **Estrutura**: comandos (Elixir → Zig) e eventos (Zig → Elixir) serializados em JSON (versões futuras podem usar binário). Todo comando válido gera ao menos um evento; `partida_id` presente em todas as mensagens; contrato versionado (v1, v2...).

### Comandos

| Comando             | Descrição                                | Campos                                                                 |
| ------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| `iniciar_partida`   | Cria partida pronta para rodadas         | `partida_id`, `jogadores`, `configuracao`, `musicas_por_jogador`       |
| `iniciar_rodada`    | Avança para a próxima rodada             | `partida_id`                                                           |
| `enviar_resposta`   | Registra resposta de jogador             | `partida_id`, `jogador_id`, `resposta`, `tempo_resposta`               |
| `finalizar_rodada`  | Encerra rodada manualmente/por timeout   | `partida_id`                                                           |
| `finalizar_partida` | Força término da partida                 | `partida_id`                                                           |
| `resetar_partida`   | Limpa estado para nova execução          | `partida_id`                                                           |

### Eventos

| Evento               | Significado                              | Campos                                                                  |
| -------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| `partida_iniciada`   | Partida começou                          | `rodada_atual`, `musica`, `jogadores`                                   |
| `rodada_iniciada`    | Nova rodada                              | `numero_rodada`, `musica`, `tempo_limite`                               |
| `resposta_recebida`  | Resposta registrada                      | `jogador_id`, `resposta`, `valida`, `tempo_resposta`                     |
| `resposta_certa`     | Jogador acertou                          | `jogador_id`, `ponto`, `musica`                                         |
| `resposta_errada`    | Jogador errou                            | `jogador_id`                                                            |
| `rodada_finalizada`  | Rodada encerrada                         | `numero_rodada`, `respostas`, `placar_parcial`                          |
| `partida_finalizada` | Partida terminou                         | `placar_final`, `vencedor_id`, `resumo_partida`                         |
| `erro`               | Comando inválido ou falha                | `mensagem`, `tipo_erro`, `dados_recebidos`                              |

- **Exemplos**: comandos como `enviar_resposta` com `partida_id`, `jogador_id`, `resposta`, `tempo_resposta`; eventos como `rodada_finalizada` com lista de respostas e placar parcial.
- **Modelagem sugerida**: enums/tagged unions no Zig, structs (`%Command{}`/`%Event{}`) no Elixir, facilitando testes isolados e mocks do engine.

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
