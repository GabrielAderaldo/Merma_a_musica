---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Glossário — Linguagem Ubíqua

Termos compartilhados entre produto, design, arquitetura, código e specs. Quando um termo for usado em qualquer documento ou no código, **a definição é esta**. Se um termo aparecer aqui e no código com sentidos diferentes, **o código está errado** — abra PR para alinhar.

> Convenção: Português para narrativa, **inglês para identificadores em código**. O glossário registra ambos quando relevante.

---

## 1. Conceitos de produto

| PT-BR | EN (código) | Definição |
|---|---|---|
| **Sala** | `Room` | Espaço persistente onde jogadores se reúnem antes, durante e depois de partidas. Identificada por **invite code**. Pode hospedar múltiplas partidas sequenciais. |
| **Partida** | `Match` | Uma execução completa do jogo dentro de uma sala: do start ao ranking final. Composta por rodadas. Uma sala pode ter várias partidas em sequência. |
| **Rodada** | `Round` | Um ciclo de "ouvir música → responder → revelação". Várias rodadas compõem uma partida. |
| **Host** | `Host` | Jogador que criou a sala. Tem permissões exclusivas (configurar partida, iniciar). **Sempre conta como ready** (não pode marcar `unready`). Se desconectar, o papel migra para o jogador conectado há mais tempo. |
| **Lobby** | `Lobby` (estado de `Room`) | Tela onde jogadores esperam, escolhem playlists, marcam ready e o host configura a próxima partida. |
| **Ready** | `ready: boolean` | Estado por-jogador no lobby. **Não se aplica ao host** (host é sempre ready). Não bloqueia o início — o host pode iniciar mesmo com jogadores `unready`, contanto que pelo menos 1 jogador esteja na sala. |
| **AFK** | `afk: boolean` | Sinalizador por-jogador (inclusive host) de ausência temporária. **Apenas comunicação social** — não muda regras do jogo, não bloqueia início, não auto-skip de rodadas. Volta automaticamente a `false` na próxima interação do jogador. UI deve exibir badge visual. |
| **Invite code** | `invite_code` | Código curto (6 caracteres alfanuméricos maiúsculos) que identifica a sala em links e em UI. Ex: `ABC123`. |
| **Streak** | `streak` | Quantidade de acertos consecutivos sem errar dentro de uma partida. Zera ao errar ou não responder. Critério de desempate. |
| **Pool** | `pool` | Conjunto total de músicas das playlists de todos os jogadores da sala. Fonte do autocomplete (evita spoilers de quais músicas estão na partida). |
| **Revelação** | `Reveal` (fase de `Round`) | Momento após o timer da rodada onde a música correta + respostas de todos + pontos são exibidos. Dura ~3 segundos. |
| **Grace period** | `grace_period_seconds` | Janela de 3 segundos antes do timer oficial da rodada, para buffering do áudio nos clientes. |
| **Modo de jogo** | `game_mode` ∈ `{multiplayer, solo}` | Modalidade da partida, configurada na `MatchConfiguration`. **Solo** é modo explícito com UI e mecânicas próprias (ver abaixo). |
| **Modo Solo** | `game_mode = solo` | Partida com 1 jogador focada em **progressão pessoal contra si mesmo**. Características-chave: (1) UI exclusiva (sem ranking comparativo, sem indicadores de "esperando outros"); (2) **métricas pessoais persistidas** — recorde de pontuação por playlist, melhor streak, tempo médio de resposta, total de músicas conhecidas; (3) `MatchConfiguration` mostra apenas opções relevantes (sem voto-pular, sem repetição forçada); (4) `allow_repeats` exposto como escolha livre do jogador. Detalhes finais (telas, achievements, prompt de "supere seu recorde") em [`10-product/03-gdd.md`](10-product/03-gdd.md). |

## 2. Conceitos de resposta e pontuação

| Termo | Definição |
|---|---|
| **`answer_type`** | Configuração da partida que define o que o jogador precisa acertar: `SONG` (nome da música), `ARTIST` (nome do artista), ou `BOTH` (qualquer um dos dois — modo **mais fácil**, não mais difícil). |
| **`answer_text`** | String digitada pelo jogador na rodada. Pode ser atualizada várias vezes até o timer encerrar. |
| **Resposta correta** | `answer_text` que, após **normalização** + **fuzzy match**, casa com `song.name` (modo `SONG`), `song.artist` (modo `ARTIST`), ou com qualquer um dos dois (modo `BOTH`). |
| **Normalização** | Pipeline aplicado antes do fuzzy match: minúsculas → remover acentos → remover artigos (`o`, `a`, `os`, `as`, `the`, `el`, `la`) → remover conteúdo entre parênteses/colchetes → trim. |
| **Fuzzy match** | Comparação tolerante a 1–2 erros de digitação. Implementação: Levenshtein in-house ([`adrs/0007`](20-architecture/adrs/0007-fuzzy-match-levenshtein.md)). Roda **sempre no backend**, nunca no frontend. |
| **`scoring_rule`** | Configuração da partida: `SIMPLE` (1 ponto por acerto) ou `SPEED_BONUS` (100–1000 pontos, linear no tempo). |
| **`SpeedBonus`** | Regra `SPEED_BONUS`. Fórmula: `pontos = max(100, 1000 - ((tempo_resposta / tempo_total) * 900))`. Tempo da **última** submissão é o que conta. |
| **`response_time`** | Segundos entre o início do timer oficial e a última `submit_answer`. `null` se o jogador não respondeu. |
| **`points_earned`** | Pontos da rodada, calculados pelo `scoring_rule` ativo. `0` para erro ou não-resposta, independente da regra. |

## 3. Conceitos de áudio

| Termo | Definição |
|---|---|
| **Preview** | Trecho de 30 segundos de uma música, fornecido pelo Deezer. É o áudio efetivamente reproduzido no jogo. |
| **Audio engine** | Sistema que resolve uma música qualquer (de Spotify/YouTube Music/Deezer) para um preview Deezer reproduzível. Estratégia: ISRC first, fallback por nome. |
| **`audio_token`** | Token opaco UUIDv4, single-use, com TTL igual à rodada. Frontend usa em `GET /api/v1/audio/{audio_token}` para receber o stream sanitizado. |
| **Proxy de áudio** | Endpoint backend que faz download do preview Deezer e re-stream para o cliente, **strippando headers ID3** e o `Content-Length` original — impede identificação por inspeção de rede. |
| **ISRC** | International Standard Recording Code — identificador único e global de uma gravação. Chave canônica para resolver "esta música no Spotify = aquela música no Deezer". |
| **Fallback Spotify Premium** | Quando a música não existe no Deezer e é vital para a partida, tenta-se via **Spotify Web Playback SDK** — requer que o dono da música tenha Spotify Premium. Não funciona em Safari iOS. |

## 4. Conceitos de jogador e identidade

| Termo | Definição |
|---|---|
| **`player_uuid`** | UUIDv4 gerado no browser (1ª visita), persistido em cookie. Identifica o jogador entre reconexões dentro da mesma sala. Não vincula a uma conta. |
| **Nickname** | Nome exibido nas UIs. Editável a qualquer momento fora de rodada. Sem unicidade global; pode haver duplicatas numa sala. |
| **`connection_status`** | Estado de conexão WS do jogador: `connected`, `disconnected`, `reconnecting`. Diferente de `ready`. |
| **`ConnectedAccount`** | Vínculo entre `player_uuid` e uma conta externa (Spotify/Deezer/YouTube Music) via OAuth. Armazena tokens de refresh. Opcional — só necessário para importar playlists. |

## 5. Conceitos técnicos / arquitetura

| Termo | Definição |
|---|---|
| **Bounded Context** | Fronteira explícita dentro da qual um modelo é consistente. Mermã tem 4: Game Engine, Game Orchestrator, Playlist Integration, Progression (futuro). Detalhes em [`20-architecture/02-bounded-contexts.md`](20-architecture/02-bounded-contexts.md). |
| **`Result<T, E>`** | Tipo de retorno do domínio: `{ ok: true, value: T } \| { ok: false, error: E }`. Sem `throw`. Erros são valores. |
| **Branded type** | Pattern TypeScript para nominal typing: `type RoomId = string & { readonly __brand: 'RoomId' }`. Impede confundir um `RoomId` com um `MatchId`. |
| **State machine** | Diagrama formal de transições válidas. `Room`, `Match` e `Round` têm máquinas de estado documentadas em [`20-architecture/03-state-machines.md`](20-architecture/03-state-machines.md). |
| **ADR** | Architecture Decision Record. Um documento curto que registra contexto, decisão tomada, alternativas consideradas e consequências. Veja [`20-architecture/adrs/`](20-architecture/adrs/). |
| **NFR** | Non-Functional Requirement — requisito de qualidade (latência, escalabilidade, disponibilidade) em oposição a funcional (regra de negócio). |

## 6. Conceitos de evento (websocket)

Eventos seguem `snake_case`. Detalhes em [`30-specs/04-websocket.yaml`](30-specs/04-websocket.yaml).

| Evento (client→server) | O que faz |
|---|---|
| `player_ready` / `player_unready` | Alterna `ready` do jogador. **Rejeitado se o emissor é o host** (host é sempre ready). |
| `player_afk_changed` | Jogador (qualquer um, inclusive host) alterna `afk`. Servidor faz broadcast equivalente. |
| `configure_match` | Host envia `MatchConfiguration` (inclui `game_mode`). |
| `start_game` | Host inicia. |
| `submit_answer` | Envia ou atualiza `answer_text`. Pode ser chamado várias vezes durante a rodada. |
| `vote_skip` | Vota para encerrar a rodada antes do timer (só após ter respondido). |
| `select_playlist` | Jogador escolhe playlist validada para usar na partida. |
| `autocomplete_search` | Pede sugestões do pool. Frontend deve aplicar debounce de 300ms. |

| Evento (server→client) | Quando dispara |
|---|---|
| `room_state` | Ao entrar/reconectar; estado completo da sala. |
| `player_joined` / `player_left` / `host_changed` | Eventos de presença. |
| `player_ready_changed` / `player_afk_changed` / `config_updated` | Mudanças no lobby (ready, ausência, configuração da partida). |
| `game_starting` / `round_starting` / `timer_started` | Início de partida e rodadas. |
| `answer_confirmed` | Backend acusa recebimento — **não** revela se acertou. |
| `player_voted_skip` | Inclui contagem atual de votos. |
| `round_ended` | Revelação completa. |
| `game_ended` | Ranking final + destaques. |
| `autocomplete_results` | Sugestões (máx 10). |
| `error` | Erro direcionado ao jogador (`not_host`, `room_full`, etc.). |

## 7. Termos legados (referência)

Estes termos apareciam em versões antigas da documentação e **não devem mais ser usados**:

| Termo legado | Por quê foi descontinuado | Substituto atual |
|---|---|---|
| **GenServer / BEAM process** | Stack era Elixir/Phoenix; agora é Bun/Hono | Service object em TS (`RoomService`, `MatchCoordinator`) |
| **ETS** | Cache Erlang | `Map`/`Cache` em memória do processo Bun |
| **Phoenix Channel** | Transporte WebSocket no Phoenix | WebSocket via Hono (`app.upgradeWebSocket`) |
| **Gleam** | Linguagem do domínio antigo | TypeScript 6.0 + Result type |
| **SvelteKit** | Frontend antigo | Vanilla TS sem framework |
| **`audio_source: spotify_sdk`** (no AsyncAPI antigo) | Fallback raro, mantido | Permanece como `spotify_sdk` no enum, mas é exceção |

---

## Changelog

- **2026-05-13:** primeira versão consolidada. Termos extraídos de `DOMAIN_MODELS_v0_gleam.md`, `gdd_v1.1.md`, `Asyncapi_v1.0_phoenix.yaml`. Termos legados (BEAM/ETS/Phoenix Channel/Gleam/SvelteKit) marcados como descontinuados.
- **2026-05-13 (fixup):** ajustes de produto após primeira revisão — (1) **Host é sempre ready** e não pode marcar `unready`; (2) novo conceito **AFK** como sinalizador social (não funcional); (3) **Solo** promovido a modo de jogo explícito (`game_mode` na `MatchConfiguration`); (4) novo evento `player_afk_changed`.
