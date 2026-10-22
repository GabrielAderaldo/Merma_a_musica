---
until: packages/schema/package.json
---

# Spec pré-código — protocolo WS e REST

> **Rascunho com prazo de validade.** É a base para escrever os schemas Zod em `packages/schema`
> ([ADR-0014](../adr/0014-contratos-zod-first.md)). Quando o pacote existir, os schemas viram a fonte, os
> arquivos OpenAPI/AsyncAPI/JSON Schema passam a ser **gerados** a partir deles, e este arquivo é apagado.
> Ele substitui os YAMLs escritos à mão (removidos em 2026-10-21, recuperáveis no git: `handbook/doc/30-specs/`).

Convenções: `snake_case`, enums em minúsculo, toda mensagem WS tem `type`. No fio o tempo vai em
**segundos** inteiros (`time_per_round`, `duration_seconds`); no domínio vai em `Duration` (ms).

## WebSocket `wss://<domínio>/ws/room/{invite_code}`

Identidade só pelo cookie `__Host-session` ([ADR-0013](../adr/0013-identidade-por-sessao-anonima.md)). Na query vai só `?nickname=` (1–32 caracteres, R-003), que não é credencial.

### Cliente → servidor

| `type` | Campos | Regra |
|---|---|---|
| `player_ready` / `player_unready` | — | Host recebe `host_is_always_ready` (R-008) |
| `player_afk_changed` | `afk: boolean` | R-601 |
| `configure_match` | `config: MatchConfiguration` | Só host (R-007) |
| `select_playlist` | `playlist_id`, `platform` | — |
| `start_game` | — | Só host, ≥1 jogador (R-009) |
| `submit_answer` | `answer_text` | Várias vezes; vale a última (R-105) |
| `vote_skip` | — | Só depois de responder (R-120) |
| `autocomplete_search` | `query` (≥ 2) | R-104 |
| `player_leave` | — | Saída voluntária |
| `ping` | — | A cada 30s |

### Servidor → cliente

| `type` | Campos principais |
|---|---|
| `room_state` | `room_id`, `invite_code`, `phase`, `host_player_uuid`, `config`, `players[]`, `song_range { min, max }`, `current_round_index?`, `total_rounds?`, `audio?` (token reemitido ao reconectar no meio da rodada) |
| `player_joined` | `player` |
| `player_left` | `player_uuid`, `reason: voluntary \| timeout` |
| `player_ready_changed` | `player_uuid`, `ready` |
| `player_afk_changed` | `player_uuid`, `afk` |
| `config_updated` | `config`, `song_range` |
| `host_changed` | `new_host_uuid`, `new_host_nickname`, `reason: previous_host_disconnected` |
| `game_starting` | `countdown_seconds: 3` |
| `round_starting` | `round_index`, `total_rounds`, `audio_source: deezer \| spotify_sdk`, `audio_token?`, `spotify_uri?`, `grace_period_seconds: 3` |
| `timer_started` | `duration_seconds` (10–60), `server_now` (Unix ms) |
| `answer_confirmed` | — (nunca diz se acertou, S-21) |
| `player_voted_skip` | `player_uuid`, `skip_votes`, `votes_needed` |
| `round_ended` | `round_index`, `end_reason: timer_expired \| majority_skip`, `song` (isrc, name, artist, album, cover_url, `contributed_by` = nickname, source_platform), `answers[]` (player_uuid, nickname, answer_text, is_correct, is_near_miss, points_earned, response_time), `scores`, `next_round_in_seconds: 3` |
| `game_ended` | `match_id`, `final_scores`, `ranking[]` (position, player_uuid, nickname, total_points, correct_answers, max_streak, avg_response_time), `highlights` (best_streak, fastest_answer, most_correct, near_miss_champion), `solo_comparison?` (R-704), `return_to_lobby_in_seconds: 5` |
| `autocomplete_results` | `query`, `results[]` (até 10: `text`, `kind: song \| artist`) |
| `pong` | — |
| `error` | `code`, `message` (pt-BR) |

`MatchConfiguration` no fio: `time_per_round` (10–60), `total_songs` (≥ 1), `answer_type`, `allow_repeats`, `scoring_rule`, `game_mode`. `Player`: `player_uuid`, `nickname` (≤ 32), `is_host`, `ready`, `afk`, `connection_status`, `has_playlist`, `platform | null`.

**Códigos de `error`:** `unauthenticated`, `not_host`, `host_is_always_ready`, `room_full`, `room_not_found`, `round_not_accepting_answers`, `round_not_accepting_skip`, `player_not_in_match`, `player_already_voted`, `player_not_answered_yet`, `rate_limited`, `invalid_payload`, `internal_error`.

**Close codes:** 1000 saída normal · 1003 payload inválido 3× (S-24) · 1008 origin não permitido · 4001 mesma identidade em outra conexão · 4029 rate limit repetido.

## REST

| Método e rota | Auth | Resposta |
|---|---|---|
| `GET /auth/{platform}` | sessão | 302 para o provedor (state + PKCE em `__Host-csrf`) |
| `GET /auth/{platform}/callback` | sessão | Valida o state, guarda a `ConnectedAccount` e redireciona 302 de volta |
| `POST /auth/logout` | sessão | 204; desvincula as contas da sessão, sem apagar a identidade anônima |
| `GET /auth/me` | sessão | `player_uuid`, `is_authenticated`, `connected_accounts[]` |
| `POST /api/v1/auth/disconnect/{platform}` | sessão | 204, apaga os tokens |
| `POST /api/v1/rooms` | sessão | 201 `room_id`, `invite_code`, `host_player_uuid`; 429 (S-25) |
| `GET /api/v1/rooms/{invite_code}` | — | 200 `invite_code`, `phase`, `player_count`, `max_players: 20`; 404 |
| `GET /api/v1/playlists` | sessão | Playlists importadas (`playlist_id`, `external_id`, `name`, `platform`, `track_count`, `cover_url`, `imported_at`) |
| `GET /api/v1/playlists/available/{platform}` | sessão + conta | Catálogo do provedor; 502 se ele estiver fora |
| `POST /api/v1/playlists/import` | sessão + conta | 202 `job_id`; conclusão via WS `playlist_imported` ou polling |
| `GET /api/v1/playlists/imports/{job_id}` | sessão | `status: queued \| in_progress \| completed \| failed`, `progress`, `imported_playlist_id?`, `error_code?` |
| `DELETE /api/v1/playlists/{playlist_id}` | sessão | 204 |
| `GET /api/v1/audio/{audio_token}` | sessão | MP3; erros em [`audio.md`](audio.md#proxy-get-apiv1audioaudio_token) |
| `GET /api/v1/solo/personal-bests` | sessão | `global_stats` (R-506) + `by_playlist[]` (R-504/R-505) |
| `GET /api/v1/solo/personal-bests/{playlist_id}` | sessão | Recorde, ou 404 se for a 1ª partida |
| `GET /api/v1/me/export` · `DELETE /api/v1/me` | sessão | LGPD ([`privacy.md`](../privacy.md)) |
| `GET /metrics` | Bearer `METRICS_AUTH_TOKEN` | Prometheus |
| `GET /health` | — | `status`, `uptime_seconds`, `version`; 503 se o banco ou o Redis estiver fora |

"Sessão" vale também para anônimos: toda visita tem `__Host-session`. Erros REST: `{ code, message }`; 429 vem com `Retry-After`.

Falta no protocolo: o evento WS `playlist_imported` (`playlist_id`, `track_count`) é enviado por uma conexão do jogador que **não** é de sala. Decidir o canal ao escrever `apps/api`.
