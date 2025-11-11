# Documento Unificado — "Mermã, a Música!"

## Sumário
- [append_1.md](#append-1-md)
- [append_2.md](#append-2-md)
- [documento_conciso.md](#documento-conciso-md)
- [game_engine_context.md](#game-engine-context-md)
- [game_orquestration_context.md](#game-orquestration-context-md)
- [introdução.md](#introducao-md)
- [map_de_contexto.md](#map-de-contexto-md)
- [playlist_integration_context.md](#playlist-integration-context-md)
- [progression_ranked_context.md](#progression-ranked-context-md)
- [visão_estrátegica.md](#visao-estrategica-md)


<a id="append-1-md"></a>
## append_1.md

Claro! Aqui vai um **adendo sobre a definição das interfaces (ports) entre Zig ↔ Elixir**, alinhado à arquitetura que você adotou:

---

## 📌 Adendo: Interfaces entre Zig ↔ Elixir (Ports / NIF / FFI)

### 🎯 Objetivo da Integração

Permitir que o processo Elixir (que representa uma sala e orquestra a partida) **chame a lógica pura da engine em Zig**, passando comandos (como "iniciar partida", "responder", "avançar rodada") e recebendo eventos ou estado atualizado.

---

### 🔌 Modo de Integração recomendado: **Port (via stdio)**

#### ✅ Por que usar Port (em vez de NIF)?

* **Segurança**: Zig roda em processo separado — se crashar, Elixir continua vivo
* **Facilidade de implementação**: comunicação via stdin/stdout com JSON ou binário
* **Desacoplamento natural**: cada parte pode ser testada isoladamente

---

### 🧱 Interface sugerida (Contrato)

#### 🔁 Comunicação:

* **Entrada (Elixir → Zig)**: comandos (ex: `iniciar_partida`, `responder`)
* **Saída (Zig → Elixir)**: eventos do domínio (ex: `partida_iniciada`, `resposta_correta`, `rodada_finalizada`)

#### 📦 Formato dos dados:

* Comece com **JSON estruturado** (mais legível para debugging e prototipação)
* Depois, pode evoluir para formato binário mais eficiente (opcional)

#### 📘 Exemplo de contrato:

```json
// Elixir → Zig (comando)
{
  "command": "iniciar_partida",
  "partida_id": "abc123",
  "jogadores": [...],
  "configuracao": { "tipo_resposta": "MUSICA", ... }
}

// Zig → Elixir (evento)
{
  "event": "partida_iniciada",
  "rodada_atual": 1,
  "musica": {
    "nome": "Bohemian Rhapsody",
    "artista": "Queen"
  }
}
```

---

### 🛠️ Passos para implementar:

1. **Zig**:

   * Escreve uma função principal que fica lendo comandos da `stdin`
   * Processa usando sua lógica de domínio
   * Emite eventos para `stdout`

2. **Elixir**:

   * Usa `Port.open/2` para iniciar o binário do Zig como subprocesso
   * Envia comandos via `Port.command/2`
   * Escuta eventos com `handle_info({port, {:data, msg}}...)`

---

### 🧪 Sugestão de testes

* Mocks de comandos enviados do Elixir → Zig
* Zig responde com JSON simulado → assert em Elixir
* Testes de contrato automatizados podem ser adicionados depois (ex: via `ExUnit` + fixtures)

---

### 🔄 Evolução futura

* Migrar para NIF ou Zigler (quando maturar) se quiser performance máxima e controle direto de memória
* Ou usar **FFI + C ABI** para integração mais direta e robusta

---

## ✅ Resumo

* Use **Port** para segurança, facilidade e isolamento
* Elixir envia **comandos → Zig aplica lógica → Zig retorna eventos**
* Mantenha a interface **simples, explícita e baseada em contratos bem definidos**
* Evolua o formato (JSON → binário) e a estrutura conforme escalar

---

---

<a id="append-2-md"></a>
## append_2.md

Claro! Aqui vai o **adendo sobre a especificação completa de comandos e eventos no Game Engine**, servindo como **contrato formal** entre o **Game Orchestrator (Elixir)** e a **Game Engine (Zig)**:

---

## 📌 Adendo: Especificação completa de comandos e eventos no **Game Engine** (contrato de integração)

### 🎯 Objetivo

Estabelecer um **contrato claro e completo de comunicação** entre o **orquestrador (Elixir)** e o **motor do jogo (Zig)**, permitindo:

* Transmitir **comandos estruturados** que controlam o jogo
* Receber **eventos de domínio** que refletem o que aconteceu na lógica
* Garantir compatibilidade entre os contextos
* Testar e evoluir cada lado de forma isolada

> Esse contrato pode ser usado como base para implementar comunicação via `Port`, `FFI`, `NIF` ou até RPC.

---

## 🔁 Estrutura de Comunicação

* **Comandos** são enviados de **Elixir → Zig** (input)
* **Eventos** são emitidos de **Zig → Elixir** (output)
* **Formato sugerido**: JSON estruturado (por legibilidade e portabilidade)
* O protocolo pode ser convertido para **binário** futuramente para performance

---

## ✅ Lista de **Comandos**

| Comando             | Descrição                                         | Campos esperados                                                 |
| ------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| `iniciar_partida`   | Cria uma partida pronta para rodadas              | `partida_id`, `jogadores`, `configuracao`, `musicas_por_jogador` |
| `iniciar_rodada`    | Avança para a próxima rodada                      | `partida_id`                                                     |
| `enviar_resposta`   | Um jogador envia uma resposta para a rodada atual | `partida_id`, `jogador_id`, `resposta`, `tempo_resposta`         |
| `finalizar_rodada`  | Finaliza a rodada manualmente ou por timeout      | `partida_id`                                                     |
| `finalizar_partida` | Força o término do jogo                           | `partida_id`                                                     |
| `resetar_partida`   | Reseta o estado para uma nova execução            | `partida_id`                                                     |

### 🧪 Exemplo de comando:

```json
{
  "command": "enviar_resposta",
  "partida_id": "abc123",
  "jogador_id": "user-1",
  "resposta": "Radiohead",
  "tempo_resposta": 7.2
}
```

---

## 📢 Lista de **Eventos**

| Evento               | O que significa                     | Campos retornados                                    |
| -------------------- | ----------------------------------- | ---------------------------------------------------- |
| `partida_iniciada`   | Partida começou com sucesso         | `rodada_atual`, `musica`, `jogadores`                |
| `rodada_iniciada`    | Nova rodada começou                 | `numero_rodada`, `musica`, `tempo_limite`            |
| `resposta_recebida`  | Uma resposta foi registrada         | `jogador_id`, `resposta`, `valida`, `tempo_resposta` |
| `resposta_certa`     | Jogador acertou                     | `jogador_id`, `ponto`, `musica`                      |
| `resposta_errada`    | Jogador errou                       | `jogador_id`                                         |
| `rodada_finalizada`  | Rodada foi encerrada                | `numero_rodada`, `respostas`, `placar_parcial`       |
| `partida_finalizada` | Fim da partida                      | `placar_final`, `vencedor_id`, `resumo_partida`      |
| `erro`               | Algum comando inválido foi recebido | `mensagem`, `tipo_erro`, `dados_recebidos`           |

### 📢 Exemplo de evento:

```json
{
  "event": "rodada_finalizada",
  "numero_rodada": 3,
  "respostas": [
    { "jogador_id": "user-1", "resposta": "Radiohead", "valida": true },
    { "jogador_id": "user-2", "resposta": "Coldplay", "valida": false }
  ],
  "placar_parcial": {
    "user-1": 3,
    "user-2": 1
  }
}
```

---

## ⚠️ Regras Gerais do Contrato

* **Todo comando válido deve gerar ao menos um evento correspondente**
* **Eventos devem ser emitidos no formato serializado padrão (JSON no MVP)**
* O `partida_id` deve estar presente em todas as mensagens
* O contrato deve ser **versão controlada** (`v1`, `v2`, etc.) para garantir compatibilidade futura

---

## 🧪 Sugestão de estrutura de contrato em código

Você pode definir esse contrato como **tipos ou structs compartilhados**, mesmo que informalmente no início, como por exemplo:

```text
[Command]
type: iniciar_partida | enviar_resposta | ...

[Event]
type: partida_iniciada | resposta_certa | ...
```

No Zig, isso pode ser modelado como enums + tagged unions.
No Elixir, como structs (`%Command{}` / `%Event{}`).

---

## ✅ Benefícios de manter esse contrato

* Garante clareza entre engine e orquestração
* Facilita testes isolados da engine (simulando comandos)
* Permite mockar engine para UI sem a engine real
* Ajuda a criar documentação pública para contribuidores (ex: contributors no GitHub)

---

---

<a id="documento-conciso-md"></a>
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

---

<a id="game-engine-context-md"></a>
## game_engine_context.md

Excelente! Vamos agora para o **📦 Ponto 3: Detalhamento de cada Bounded Context com seus Aggregates, Entidades e Value Objects**, começando pelo **contexto mais importante do sistema: o `Game Engine Context`**.

---

# 📦 3. Detalhamento dos Bounded Contexts

---

## 🎮 **Game Engine Context** (⚙️ Zig – Core Domain)

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

<a id="game-orquestration-context-md"></a>
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
| **Game Engine**         | Port / NIF / RPC    | Aplicar regras da partida               |
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

<a id="introducao-md"></a>
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
         │      (Zig - lógica de jogo)  │                        │ Integrações Spotify/Deezer   │
         └──────────────────────────────┘                        └──────────────────────────────┘

                                  ┌──────────────────────────────┐
                                  │ 🏅 Progressão / Ranking Context│
                                  └──────────────────────────────┘
```

### Tipos de relacionamento:

* 🔗 **Upstream / Downstream**: `Playlist Context` é fornecedor para o `Game Engine Context`
* 💬 **Protocolos de integração**:

  * `Gateway ↔ Game Orchestrator`: HTTP/WebSocket
  * `Orchestrator ↔ Game Engine`: Port ou NIF (JSON / binário)
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

<a id="map-de-contexto-md"></a>
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
│ (Zig)         │     │ - Spotify / Deezer APIs      │
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
* **Tecnologia sugerida**: Zig (alta performance)
* **Não conhece nada sobre o mundo externo**: recebe comandos, retorna eventos
* **Comunicação**: via mensagens binárias/JSON para o `Orchestrator`

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
| `Orchestrator` → `Game Engine` | Port/NIF (Processo Interno) | Envia comandos, recebe eventos       |
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

<a id="playlist-integration-context-md"></a>
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

<a id="progression-ranked-context-md"></a>
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

<a id="visao-estrategica-md"></a>
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
| ⚙️ Lógica de jogo     | **Zig**           | Engine pura do jogo: rodada, pontuação, validação |
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
