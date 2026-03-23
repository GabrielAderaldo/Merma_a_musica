# MERMÃ, A MÚSICA! — Contrato de API

**Documento complementar ao DDD, Infraestrutura, GDD e Sistema de Áudio**
**Versão 1.0 — MVP | Março 2026**

---

## 1. Visão Geral

Este documento define o contrato completo de comunicação entre o frontend (SvelteKit) e o backend (BEAM). As fontes da verdade formais são:

- **`openapi_spec.yaml`** (OpenAPI 3.1) — Endpoints REST (criação de sala, auth, playlists, áudio).
- **`asyncapi_spec.yaml`** (AsyncAPI 3.1) — Eventos WebSocket via Phoenix Channels (gameplay em tempo real).

Este markdown serve como referência rápida e legível de ambos.

### 1.1 Convenções Gerais

| Convenção | Valor |
|-----------|-------|
| Base URL | `https://<dominio>/api/v1` |
| Formato | JSON |
| Nomes de campos | `snake_case` |
| IDs | UUID v4 |
| Idioma das mensagens de erro | pt-BR |
| Autenticação REST | Token da plataforma via header quando necessário |
| Autenticação WebSocket | `player_uuid` enviado no join do tópico |

### 1.2 Formato de Erro Padrão

Todos os erros retornam HTTP status code apropriado + body:

```json
{
  "error": {
    "code": "room_full",
    "message": "A sala está cheia (máximo 20 jogadores).",
    "details": {}
  }
}
```

### 1.3 Códigos de Erro

| Código | HTTP Status | Descrição |
|--------|------------|-----------|
| `room_not_found` | 404 | Sala não existe ou foi destruída |
| `room_full` | 422 | Sala atingiu limite de 20 jogadores |
| `room_in_match` | 422 | Partida em andamento, não pode entrar |
| `already_joined` | 409 | Jogador já está na sala |
| `not_host` | 403 | Ação permitida apenas para o host |
| `not_all_ready` | 422 | Nem todos os jogadores estão prontos |
| `invalid_config` | 422 | Configuração de partida inválida |
| `not_enough_songs` | 422 | Músicas insuficientes para iniciar |
| `token_expired` | 401 | Token OAuth expirado |
| `token_invalid` | 401 | Token OAuth inválido |
| `audio_token_invalid` | 403 | Audio token inválido, expirado ou já usado |
| `playlist_not_found` | 404 | Playlist não encontrada na plataforma |
| `platform_unavailable` | 503 | API da plataforma temporariamente indisponível |
| `internal_error` | 500 | Erro interno do servidor |

---

## 2. Endpoints REST

### 2.1 Health

#### `GET /api/v1/health`

Retorna status do servidor e métricas básicas.

**Response 200:**
```json
{
  "status": "ok",
  "active_rooms": 12,
  "connected_players": 47,
  "uptime_seconds": 86400
}
```

---

### 2.2 Autenticação

#### `GET /api/v1/auth/{platform}/login?redirect_uri={uri}`

Inicia fluxo OAuth. Redireciona (302) para a página de autorização da plataforma.

**Plataformas:** `spotify`, `deezer`, `youtube_music`

---

#### `GET /api/v1/auth/{platform}/callback?code={code}&state={state}`

Callback OAuth. Backend troca o code por tokens.

**Response 200:**
```json
{
  "access_token": "BQDv...",
  "refresh_token": "AQBx...",
  "expires_in": 3600,
  "platform": "spotify",
  "platform_user_id": "user123",
  "platform_username": "Gabriel"
}
```

---

#### `POST /api/v1/auth/{platform}/refresh`

Renova token de acesso.

**Request:**
```json
{
  "refresh_token": "AQBx..."
}
```

**Response 200:** Mesmo formato do callback.

---

### 2.3 Salas

#### `POST /api/v1/rooms`

Cria nova sala. Jogador vira host.

**Request:**
```json
{
  "player_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "nickname": "Gabriel"
}
```

**Response 201:**
```json
{
  "room_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "invite_code": "ABC123",
  "invite_link": "https://merma.example.com/sala/ABC123",
  "host_player_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "websocket_url": "wss://merma.example.com/socket/websocket",
  "websocket_topic": "room:ABC123"
}
```

---

#### `GET /api/v1/rooms/{invite_code}`

Informações públicas da sala (antes de entrar).

**Response 200:**
```json
{
  "room_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "invite_code": "ABC123",
  "state": "waiting",
  "player_count": 3,
  "max_players": 20,
  "host_nickname": "Gabriel"
}
```

---

#### `POST /api/v1/rooms/{invite_code}/join`

Entrar na sala. Retorna dados para conectar WebSocket.

**Request:**
```json
{
  "player_uuid": "660e8400-e29b-41d4-a716-446655440001",
  "nickname": "Maria"
}
```

**Response 200:**
```json
{
  "room_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "invite_code": "ABC123",
  "websocket_url": "wss://merma.example.com/socket/websocket",
  "websocket_topic": "room:ABC123",
  "player_uuid": "660e8400-e29b-41d4-a716-446655440001"
}
```

---

### 2.4 Playlists

#### `GET /api/v1/playlists/{platform}`

Lista playlists do jogador na plataforma.

**Header:** `access_token: {token_da_plataforma}`

**Response 200:**
```json
{
  "playlists": [
    {
      "playlist_id": "37i9dQZF1DXcBWIGoYBM5M",
      "name": "Meus Rocks",
      "track_count": 45,
      "cover_url": "https://...",
      "platform": "spotify"
    }
  ]
}
```

---

#### `POST /api/v1/playlists/{platform}/{playlist_id}/import`

Importa playlist, extrai metadados e valida cada música no Deezer.

**Header:** `access_token: {token_da_plataforma}`

**Response 200:**
```json
{
  "playlist": {
    "playlist_id": "37i9dQZF1DXcBWIGoYBM5M",
    "name": "Meus Rocks",
    "platform": "spotify",
    "tracks": [
      {
        "original_id": "4u7EnebtmKWzUH433cf5Qv",
        "original_name": "Bohemian Rhapsody",
        "original_artist": "Queen",
        "original_platform": "spotify",
        "isrc": "GBUM71029604",
        "status": "available",
        "deezer_track_id": "68968044",
        "deezer_name": "Bohemian Rhapsody",
        "deezer_artist": "Queen",
        "deezer_album": "A Night At The Opera",
        "deezer_cover_url": "https://...",
        "match_confidence": 1.0
      },
      {
        "original_id": "3n3Ppam7vgaVa1iaRUc9Lp",
        "original_name": "Música Rara Regional",
        "original_artist": "Artista Desconhecido",
        "original_platform": "spotify",
        "isrc": null,
        "status": "unavailable",
        "deezer_track_id": null,
        "deezer_name": null,
        "deezer_artist": null,
        "deezer_album": null,
        "deezer_cover_url": null,
        "match_confidence": 0
      }
    ],
    "stats": {
      "total": 45,
      "available": 41,
      "fallback": 2,
      "unavailable": 2
    }
  }
}
```

---

#### `GET /api/v1/playlists/validated`

Retorna playlists já validadas do jogador (cache da sessão).

**Header:** `player_uuid: {uuid}`

**Response 200:** Array de `ValidatedPlaylist` (mesmo formato acima).

---

### 2.5 Áudio

#### `GET /api/v1/audio/{audio_token}`

Stream de áudio para a rodada. Proxy do preview do Deezer.

**Response 200:** Stream `audio/mpeg` (headers sanitizados, sem metadata de plataforma).

**Response 403:** Token inválido, expirado ou já usado.

---

#### `GET /api/v1/audio/preview/{deezer_track_id}`

Preview rápido (5 segundos) para confirmação na validação de playlist.

**Response 200:** Stream `audio/mpeg` (5 primeiros segundos do preview).

---

## 3. Eventos WebSocket (Phoenix Channels)

### 3.1 Conexão

**URL:** `wss://<dominio>/socket/websocket`
**Tópico:** `room:{invite_code}`
**Params no join:** `{ "player_uuid": "...", "nickname": "..." }`

### 3.2 Eventos do Cliente → Servidor

#### `player_ready`
Jogador marca-se como pronto.
```json
{ "player_uuid": "..." }
```

#### `player_unready`
Jogador desmarca pronto.
```json
{ "player_uuid": "..." }
```

#### `configure_match`
Host define configuração da partida. Só aceito do host.
```json
{
  "player_uuid": "...",
  "config": {
    "time_per_round": 30,
    "total_songs": 12,
    "answer_type": "both",
    "allow_repeats": false,
    "scoring_rule": "speed_bonus"
  }
}
```

#### `start_game`
Host inicia a partida. Só aceito do host + todos prontos.
```json
{ "player_uuid": "..." }
```

#### `submit_answer`
Jogador envia (ou atualiza) resposta. Pode ser enviado múltiplas vezes.
```json
{
  "player_uuid": "...",
  "answer_text": "Bohemian Rhapsody"
}
```

#### `vote_skip`
Jogador vota para pular rodada (só após ter respondido).
```json
{ "player_uuid": "..." }
```

#### `select_playlist`
Jogador seleciona playlist validada para usar na partida.
```json
{
  "player_uuid": "...",
  "playlist_id": "37i9dQZF1DXcBWIGoYBM5M",
  "platform": "spotify"
}
```

#### `player_leave`
Jogador sai voluntariamente.
```json
{ "player_uuid": "..." }
```

---

### 3.3 Eventos do Servidor → Cliente

#### `room_state`
Estado completo da sala. Enviado ao entrar/reconectar.
```json
{
  "room_id": "...",
  "invite_code": "ABC123",
  "state": "waiting",
  "host_player_uuid": "...",
  "config": {
    "time_per_round": 30,
    "total_songs": 12,
    "answer_type": "both",
    "allow_repeats": false,
    "scoring_rule": "speed_bonus"
  },
  "players": [
    {
      "player_uuid": "...",
      "nickname": "Gabriel",
      "is_host": true,
      "ready": true,
      "connection_status": "connected",
      "has_playlist": true,
      "platform": "spotify"
    }
  ],
  "song_range": {
    "min": 4,
    "max": 20,
    "current_players": 4,
    "players_with_playlist": 3
  }
}
```

#### `player_joined`
Novo jogador entrou na sala.
```json
{
  "player": {
    "player_uuid": "...",
    "nickname": "Maria",
    "is_host": false,
    "ready": false,
    "connection_status": "connected",
    "has_playlist": false,
    "platform": null
  }
}
```

#### `player_left`
Jogador saiu ou removido por timeout.
```json
{
  "player_uuid": "...",
  "reason": "voluntary | timeout | kicked"
}
```

#### `player_ready_changed`
Status de pronto mudou.
```json
{
  "player_uuid": "...",
  "ready": true
}
```

#### `config_updated`
Host mudou a configuração.
```json
{
  "config": { ... },
  "song_range": { "min": 4, "max": 20 }
}
```

#### `host_changed`
Host mudou (desconexão do anterior).
```json
{
  "new_host_uuid": "...",
  "new_host_nickname": "Maria"
}
```

#### `game_starting`
Contagem regressiva para início.
```json
{
  "countdown_seconds": 3
}
```

#### `round_starting`
Nova rodada. Frontend deve buscar áudio.
```json
{
  "round_index": 1,
  "total_rounds": 12,
  "audio_token": "a1b2c3d4-...",
  "audio_source": "deezer",
  "grace_period_seconds": 3
}
```

#### `timer_started`
Timer oficial iniciou (após grace period).
```json
{
  "duration_seconds": 30
}
```

#### `answer_confirmed`
Confirma recebimento da resposta (sem revelar se está certa).
```json
{
  "player_uuid": "..."
}
```

#### `player_voted_skip`
Jogador votou para pular.
```json
{
  "player_uuid": "...",
  "skip_votes": 3,
  "votes_needed": 4
}
```

#### `round_ended`
Rodada encerrada. Revelação completa.
```json
{
  "round_index": 1,
  "song": {
    "name": "Bohemian Rhapsody",
    "artist": "Queen",
    "album": "A Night At The Opera",
    "cover_url": "https://...",
    "contributed_by": "Gabriel"
  },
  "answers": [
    {
      "player_uuid": "...",
      "nickname": "Gabriel",
      "answer_text": "Bohemian Rhapsody",
      "is_correct": true,
      "points_earned": 850,
      "response_time": 5.2
    },
    {
      "player_uuid": "...",
      "nickname": "Maria",
      "answer_text": "We Will Rock You",
      "is_correct": false,
      "points_earned": 0,
      "response_time": 12.1
    },
    {
      "player_uuid": "...",
      "nickname": "João",
      "answer_text": "",
      "is_correct": false,
      "points_earned": 0,
      "response_time": null
    }
  ],
  "scores": {
    "player-uuid-1": 850,
    "player-uuid-2": 0,
    "player-uuid-3": 0
  },
  "next_round_in_seconds": 3
}
```

#### `game_ended`
Partida encerrada. Ranking e destaques.
```json
{
  "final_scores": {
    "player-uuid-1": 7650,
    "player-uuid-2": 5200,
    "player-uuid-3": 3100
  },
  "ranking": [
    {
      "position": 1,
      "player_uuid": "...",
      "nickname": "Gabriel",
      "total_points": 7650,
      "correct_answers": 9,
      "avg_response_time": 6.3
    }
  ],
  "highlights": {
    "best_streak": {
      "player_uuid": "...",
      "nickname": "Gabriel",
      "streak": 5
    },
    "fastest_answer": {
      "player_uuid": "...",
      "nickname": "Maria",
      "time": 1.2,
      "song_name": "Evidências"
    },
    "most_correct": {
      "player_uuid": "...",
      "nickname": "Gabriel",
      "count": 9
    }
  },
  "return_to_lobby_in_seconds": 5
}
```

#### `error`
Erro direcionado ao jogador.
```json
{
  "code": "not_host",
  "message": "Apenas o host pode iniciar a partida."
}
```

---

## 4. Autocomplete (Busca de Músicas)

### 4.1 Endpoint Dedicado (WebSocket)

#### Cliente → Servidor: `autocomplete_search`
```json
{
  "player_uuid": "...",
  "query": "bohem"
}
```

#### Servidor → Cliente: `autocomplete_results`
```json
{
  "query": "bohem",
  "results": [
    { "text": "Bohemian Rhapsody", "type": "song" },
    { "text": "Bohemian Like You", "type": "song" },
    { "text": "Bohemians", "type": "artist" }
  ]
}
```

**Fonte dos resultados:** Pool total de músicas de todas as playlists validadas dos jogadores na sala (não apenas as selecionadas para a partida).

**Debounce:** Frontend deve aplicar debounce de 300ms antes de enviar a query. Backend limita a 10 resultados por query.

---

## 5. Diagrama de Sequência — Fluxo Completo de Uma Partida

```
Frontend (Host)          Backend (BEAM)           Frontend (Jogadores)
      |                       |                          |
      |-- POST /rooms ------->|                          |
      |<-- 201 {room} --------|                          |
      |                       |                          |
      |== WS join room:ABC ===|=== WS join room:ABC ====|
      |<-- room_state --------|--- room_state ---------->|
      |                       |                          |
      |                       |<-- player_ready ---------|
      |<-- player_ready_changed|-- player_ready_changed ->|
      |                       |                          |
      |-- configure_match --->|                          |
      |<-- config_updated ----|--- config_updated ------>|
      |                       |                          |
      |-- start_game -------->|                          |
      |<-- game_starting -----|--- game_starting ------->|
      |                       |                          |
      |<-- round_starting ----|--- round_starting ------>|
      |                       |                          |
      |-- GET /audio/{token}->|<-- GET /audio/{token} --|
      |<-- audio stream ------|--- audio stream -------->|
      |                       |                          |
      |     (grace 3s)        |      (grace 3s)         |
      |                       |                          |
      |<-- timer_started -----|--- timer_started ------->|
      |                       |                          |
      |-- submit_answer ----->|                          |
      |<-- answer_confirmed --|                          |
      |                       |<-- submit_answer --------|
      |<-- answer_confirmed --|--- answer_confirmed ---->|
      |                       |                          |
      |     (timer ends)      |                          |
      |                       |                          |
      |<-- round_ended -------|--- round_ended --------->|
      |                       |                          |
      |     (3s pause)        |                          |
      |                       |                          |
      |<-- round_starting ----|--- round_starting ------>|
      |     ... (repete) ...  |                          |
      |                       |                          |
      |<-- game_ended --------|--- game_ended ---------->|
      |                       |                          |
      |     (5s results)      |                          |
      |                       |                          |
      |<-- room_state --------|--- room_state ---------->|
      |     (back to lobby)   |                          |
```

---

*Fim do Contrato de API*
