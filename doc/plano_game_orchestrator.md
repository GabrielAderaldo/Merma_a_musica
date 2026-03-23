# Plano de Implementação — Game Orchestrator (Gleam + Elixir)

**App**: `apps/game_orchestrator/`
**Tecnologia**: Gleam (BEAM) para lógica + Elixir mínimo (Phoenix Channels, Endpoint, Router)
**Tipo**: Supporting Domain — orquestração, salas, tempo real, integração de playlists

---

## Visão Geral

O Game Orchestrator é o "cérebro operacional". Ele gerencia salas como processos BEAM isolados, controla timers, coordena a comunicação entre frontend e Game Engine, integra com plataformas de streaming e serve como proxy de áudio. Elixir é usado exclusivamente como lib de infraestrutura (Phoenix), exportando funções para o Gleam consumir.

**Referências**:
- `doc/documents/game_orquestration_context.md`
- `doc/documents/playlist_integration_context.md`
- `doc/documents/music_system.md`
- `doc/documents/contract_api.md`
- `doc/documents/infra.md`
- `doc/documents/Openapi.yaml` e `Asyncapi.yaml`

---

## Princípio de Implementação

**Elixir é lib de infra.** Phoenix Channels, Endpoint, Router, Telemetry ficam em Elixir. Toda lógica de orquestração, coordenação, playlist e áudio deve ser implementada em Gleam. O Elixir exporta funções/callbacks que o Gleam consome, não o contrário quando possível.

---

## Fase 1 — Scaffolding e Infraestrutura Phoenix (Elixir)

**Objetivo**: Setup mínimo de Phoenix como lib de infra.

### 1.1 Estrutura base

- [ ] Phoenix Endpoint (`endpoint.ex`) — configuração HTTP + WebSocket
- [ ] Router (`router.ex`) — rotas REST (`/api/v1/*`, `/auth/*`, `/health`)
- [ ] UserSocket (`user_socket.ex`) — entry point WebSocket
- [ ] RoomChannel (`room_channel.ex`) — canal `room:{invite_code}` (thin wrapper que delega para Gleam)
- [ ] Application (`application.ex`) — inicia supervisor tree (Registry, DynamicSupervisor, PubSub, Cache ETS)
- [ ] Telemetry (`telemetry.ex`) — métricas básicas

### 1.2 Configuração

- [ ] `config/config.exs`, `dev.exs`, `prod.exs`, `runtime.exs`, `test.exs`
- [ ] Sem Ecto/Repo — sem banco de dados no MVP
- [ ] Mix project com custom compiler para Gleam (`Mix.Tasks.Compile.GleamBuild`)

### Critério de conclusão
`mix phx.server` inicia sem erros. Health check responde em `/health`.

---

## Fase 2 — Room Server (Gleam)

**Objetivo**: Implementar o processo GenServer de sala em Gleam.

### 2.1 Estado da sala (`room_state.gleam`)

- [ ] Tipo `RoomState` — id, host_id, players (List(PlayerInRoom)), state (Waiting/InMatch/Finished), invite_code, match (Option(Match)), timer_ref
- [ ] Tipo `PlayerInRoom` — id, name, playlist, ready, connection_status (Connected/Disconnected/Reconnecting)

### 2.2 Room Server (`room_server.gleam`)

- [ ] Wrapper Gleam sobre GenServer (via erlang/OTP interop ou gleam_otp)
- [ ] `init` — cria sala com host como primeiro jogador
- [ ] `handle_call/handle_cast` para comandos:
  - `join_room(player_id, nickname)` — adicionar jogador
  - `leave_room(player_id)` — remover jogador
  - `set_ready(player_id, ready)` — toggle pronto
  - `configure_match(player_id, config)` — host configura partida
  - `start_game(player_id)` — host inicia (valida: é host? todos prontos? músicas suficientes?)
  - `submit_answer(player_id, answer_text)` — encaminha para Game Engine
  - `select_playlist(player_id, playlist_id, platform)` — associar playlist ao jogador
- [ ] Broadcast de eventos via PubSub (interop com Phoenix.PubSub)

### 2.3 Invariantes

- [ ] Apenas host inicia (`not_host`)
- [ ] Todos prontos antes de começar (`not_all_ready`)
- [ ] Jogador único por sala (`already_joined`)
- [ ] Max 20 jogadores (`room_full`)
- [ ] Sala em match não aceita novos jogadores (`room_in_match`)

### Critério de conclusão
Testes: criar sala, join/leave, toggle ready, configurar match, iniciar jogo. Todos in-memory sem dependência externa.

---

## Fase 3 — Room Registry e Lifecycle

**Objetivo**: Gerenciar ciclo de vida das salas.

### 3.1 Registry (`room_registry.gleam`)

- [ ] Criar sala → gerar invite_code (6 chars alfanuméricos maiúsculos) + iniciar processo
- [ ] Lookup sala por invite_code
- [ ] Listar salas ativas (para health/métricas)
- [ ] Usar DynamicSupervisor + Registry do Elixir via interop

### 3.2 Lifecycle e timeouts

- [ ] Reconexão: jogador desconecta → 2 min timeout → removido
- [ ] Host desconecta → transferir para jogador mais antigo → evento `host_changed`
- [ ] Sala waiting sem atividade → 30 min → destruída
- [ ] Sala finished → 5 min → destruída
- [ ] Sala sem jogadores → 2 min → destruída

### Critério de conclusão
Testes: criar sala via registry, lookup por código, timeout de reconexão, transferência de host, destruição por inatividade.

---

## Fase 4 — Coordinator (Bridge Engine ↔ Orchestrator)

**Objetivo**: Ponte entre o Room Server e o Game Engine.

### 4.1 Match Coordinator (`coordinator.gleam`)

- [ ] `start_game` → coletar playlists dos jogadores → selecionar músicas → chamar `game_engine.new_match` + `game_engine.start_match`
- [ ] `start_round` → chamar `game_engine.start_round` → iniciar timer → broadcast `round_starting`
- [ ] `submit_answer` → chamar `game_engine.submit_answer` → broadcast `answer_confirmed` → verificar `all_answered`
- [ ] `end_round` (timeout ou skip) → chamar `game_engine.end_round` → broadcast `round_ended` → verificar `is_last_round`
- [ ] `end_match` → chamar `game_engine.end_match` → broadcast `game_ended` → voltar para lobby

### 4.2 Timer management

- [ ] Grace period de 3s antes de cada rodada (buffer de áudio)
- [ ] Timer da rodada (10-60s configurável)
- [ ] Timer entre rodadas (3s)
- [ ] Timer de countdown para início (3s)
- [ ] Retorno ao lobby após resultados (5s)
- [ ] Usar `Process.send_after` / `:timer` via interop

### 4.3 Conversão Gleam ↔ Elixir

- [ ] Gleam Dicts → Elixir Maps (`:gleam@dict.to_list/1` → `Map.new()`)
- [ ] Gleam custom types → Erlang tuples (pattern matching no Elixir)
- [ ] Centralizar conversões neste módulo

### Critério de conclusão
Testes de integração: fluxo completo de partida (criar sala → join → ready → start → rodadas → respostas → fim).

---

## Fase 5 — Phoenix Channels (Elixir — thin wrapper)

**Objetivo**: Implementar RoomChannel como wrapper fino que delega tudo para Gleam.

### 5.1 RoomChannel (`room_channel.ex`)

- [ ] `join("room:" <> invite_code, params)` → validar, chamar Gleam room server, retornar room_state
- [ ] `handle_in("player_ready", payload)` → delegar para Gleam
- [ ] `handle_in("player_unready", payload)` → delegar para Gleam
- [ ] `handle_in("configure_match", payload)` → delegar para Gleam
- [ ] `handle_in("start_game", payload)` → delegar para Gleam
- [ ] `handle_in("submit_answer", payload)` → delegar para Gleam
- [ ] `handle_in("vote_skip", payload)` → delegar para Gleam
- [ ] `handle_in("select_playlist", payload)` → delegar para Gleam
- [ ] `handle_in("player_leave", payload)` → delegar para Gleam
- [ ] `handle_in("autocomplete_search", payload)` → delegar para Gleam
- [ ] Subscribe no PubSub para receber eventos do Room Server e push para clients

### 5.2 Eventos Server → Client

- [ ] `room_state` — estado completo (join/reconexão)
- [ ] `player_joined`, `player_left`, `player_ready_changed`
- [ ] `config_updated`, `host_changed`
- [ ] `game_starting`, `round_starting`, `timer_started`
- [ ] `answer_confirmed`, `player_voted_skip`
- [ ] `round_ended`, `game_ended`
- [ ] `autocomplete_results`
- [ ] `error`

### 5.3 Payload format

- [ ] Todos os payloads seguem o contrato definido em `Asyncapi.yaml`
- [ ] Campos em `snake_case`, IDs como UUID v4

### Critério de conclusão
Teste end-to-end via WebSocket client: join → ready → start → responder → round_ended → game_ended.

---

## Fase 6 — REST Controllers (Elixir — thin wrapper)

**Objetivo**: Endpoints REST conforme `Openapi.yaml`.

### 6.1 Health Controller

- [ ] `GET /api/v1/health` → status, active_rooms, connected_players, uptime_seconds

### 6.2 Room Controller

- [ ] `POST /api/v1/rooms` → criar sala (player_uuid, nickname) → retorna room_id, invite_code, websocket_url, websocket_topic
- [ ] `GET /api/v1/rooms/{invite_code}` → info pública (state, player_count, host_nickname)
- [ ] `POST /api/v1/rooms/{invite_code}/join` → entrar na sala → retorna websocket_url, websocket_topic

### 6.3 Auth Controller

- [ ] `GET /api/v1/auth/{platform}/login` → redirect para OAuth (Spotify, Deezer, YouTube Music)
- [ ] `GET /api/v1/auth/{platform}/callback` → troca code por tokens → retorna access_token, refresh_token, platform_user_id
- [ ] `POST /api/v1/auth/{platform}/refresh` → renova token

### 6.4 Playlist Controller

- [ ] `GET /api/v1/playlists/{platform}` → listar playlists do jogador (header: access_token)
- [ ] `POST /api/v1/playlists/{platform}/{playlist_id}/import` → importar e validar playlist no Deezer
- [ ] `GET /api/v1/playlists/validated` → playlists já validadas (cache de sessão)

### 6.5 Audio Controller

- [ ] `GET /api/v1/audio/{audio_token}` → proxy de áudio (stream audio/mpeg do Deezer, headers sanitizados)
- [ ] `GET /api/v1/audio/preview/{deezer_track_id}` → preview rápido 5s (validação de playlist)

### 6.6 Formato de erro padrão

- [ ] `{ "error": { "code": "...", "message": "..." } }` conforme tabela de códigos

### Critério de conclusão
Testes: cada endpoint responde corretamente. Erros retornam formato padrão.

---

## Fase 7 — Playlist Integration (Gleam)

**Objetivo**: Importar playlists, validar músicas no Deezer, normalizar dados.

### 7.1 Platform Authenticator

- [ ] OAuth flow para Spotify (scopes: `playlist-read-private`, `playlist-read-collaborative`)
- [ ] OAuth flow para Deezer
- [ ] OAuth flow para YouTube Music (Google OAuth)
- [ ] Armazenar tokens no browser (via response ao frontend) — sem persistência no backend

### 7.2 Playlist Importer (`playlist_importer.gleam`)

- [ ] Spotify: `GET /v1/me/playlists` → `GET /v1/playlists/{id}/tracks` → extrair ISRC
- [ ] Deezer: `GET /user/me/playlists` → `GET /playlist/{id}/tracks`
- [ ] YouTube Music: `GET /youtube/v3/playlists` → `GET /youtube/v3/playlistItems` → extrair nome+artista do título

### 7.3 Music Resolver (`music_resolver.gleam`)

- [ ] Busca no Deezer por ISRC: `GET /track/isrc:{ISRC}` (preferencial)
- [ ] Fallback: busca por nome+artista: `GET /search?q=track:"{nome}" artist:"{artista}"`
- [ ] Validar match: similaridade > 80% (normalizado, fuzzy)
- [ ] Classificar: Available (Deezer preview), Fallback (Spotify SDK), Unavailable

### 7.4 Cache (ETS)

- [ ] Cache ISRC → Deezer track ID (TTL 24h)
- [ ] Cache resultado de validação de playlist (duração da sessão)
- [ ] Rate limiting Deezer: 50 req/5s (batch com throttle)

### 7.5 Song Filter (`song_filter.gleam`)

- [ ] Filtrar apenas músicas com preview_url válido
- [ ] Normalizar para formato `NormalizedSong` (external_id, name, artist, preview_url, duration_ms, is_valid)

### Critério de conclusão
Teste com mock das APIs externas: importar playlist Spotify → resolver no Deezer → retornar playlist validada com stats.

---

## Fase 8 — Audio Proxy (Gleam)

**Objetivo**: Proxy de áudio seguro com anti-cheat.

### 8.1 Audio Token Manager (`audio_token.gleam`)

- [ ] Gerar `audio_token` (UUID, opaco, single-use)
- [ ] Associar token → preview_url do Deezer (no estado da sala)
- [ ] Invalidar após uso ou fim da rodada
- [ ] TTL automático

### 8.2 Audio Proxy (`audio_proxy.gleam`)

- [ ] Resolver audio_token → preview_url
- [ ] Fetch preview do Deezer CDN
- [ ] Sanitizar headers de resposta (remover metadata de plataforma)
- [ ] Stream como `audio/mpeg`
- [ ] Preview rápido (5s) para validação de playlist

### 8.3 Fallback Spotify (futuro)

- [ ] Documentar interface para Spotify Web Playback SDK
- [ ] Não implementar no MVP — focar em maximizar match no Deezer

### Critério de conclusão
Teste: gerar token → proxy de áudio funciona → token invalidado após uso → segunda tentativa retorna 403.

---

## Fase 9 — Autocomplete

**Objetivo**: Busca de músicas para sugestão durante a rodada.

### 9.1 Autocomplete Service (`autocomplete.gleam`)

- [ ] Receber query (mínimo 2 chars)
- [ ] Buscar no pool total de músicas de todas as playlists dos jogadores na sala
- [ ] Retornar max 10 resultados (nome da música ou artista)
- [ ] Normalizar busca (lowercase, sem acentos)

### Critério de conclusão
Teste: pool com 50 músicas → busca "bohem" → retorna "Bohemian Rhapsody".

---

## Fase 10 — Skip Voting

**Objetivo**: Sistema de votação para pular rodada.

### 10.1 Skip Vote (`skip_vote.gleam`)

- [ ] Jogador só pode votar após ter respondido
- [ ] Contar votos — pular quando todos responderam + maioria votou
- [ ] Broadcast `player_voted_skip` com contagem atual
- [ ] Se condição atingida → `end_round`

### Critério de conclusão
Teste: 4 jogadores, todos respondem, 3 votam skip → rodada encerra.

---

## Resumo de Módulos Gleam

| Módulo | Responsabilidade |
|---|---|
| `room_state.gleam` | Tipos do estado da sala |
| `room_server.gleam` | GenServer da sala (processo BEAM) |
| `room_registry.gleam` | Registro e lookup de salas |
| `coordinator.gleam` | Bridge entre sala e Game Engine |
| `playlist_importer.gleam` | Import de playlists (Spotify/Deezer/YT) |
| `music_resolver.gleam` | Resolução de música no Deezer (ISRC/nome) |
| `song_filter.gleam` | Filtro e normalização de músicas |
| `audio_token.gleam` | Gerenciamento de tokens de áudio |
| `audio_proxy.gleam` | Proxy de stream de áudio |
| `autocomplete.gleam` | Busca de sugestões |
| `skip_vote.gleam` | Sistema de votação para pular |

## Módulos Elixir (infra mínima)

| Módulo | Responsabilidade |
|---|---|
| `endpoint.ex` | Phoenix Endpoint |
| `router.ex` | Rotas REST |
| `user_socket.ex` | Entry point WebSocket |
| `room_channel.ex` | Canal Phoenix (thin wrapper → Gleam) |
| `*_controller.ex` | Controllers REST (thin wrappers → Gleam) |
| `application.ex` | Supervisor tree |
| `telemetry.ex` | Métricas |

---

## Dependências

### Gleam
- `gleam_stdlib`
- `gleam_http` — HTTP client para APIs externas
- `gleam_json` — parsing de respostas JSON
- `gleam_otp` — processos e supervisores
- `gleam_erlang` — interop com BEAM

### Elixir
- `phoenix` — framework web
- `phoenix_pubsub` — PubSub para eventos
- `jason` — JSON encoding
- `bandit` — HTTP server
