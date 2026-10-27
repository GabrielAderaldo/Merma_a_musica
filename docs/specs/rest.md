---
until: apps/api/src/observability
---

# Spec pré-código — rotas REST

> **Rascunho com prazo de validade.** Veio do antigo `specs/protocol.md`: a parte WebSocket virou
> `packages/schema` em 2026-10-26, e a REST espera a `apps/api`, onde as rotas e o `openapi.json` nascem com
> `@hono/zod-openapi` ([ADR-0014](../adr/0014-contratos-zod-first.md)). Os corpos REST entram em `packages/schema`
> junto com as rotas. **Cada linha sai desta tabela no commit em que a rota nasce.** O arquivo é apagado quando
> `apps/api/src/observability` (a última camada, com `/metrics`) existir.

| Método e rota | Auth | Resposta |
|---|---|---|
| `GET /auth/{platform}` | sessão | 302 para o provedor (state + PKCE em `__Host-csrf`) |
| `GET /auth/{platform}/callback` | sessão | Valida o state, guarda a `ConnectedAccount` e redireciona 302 de volta |
| `POST /auth/logout` | sessão | 204; desvincula as contas da sessão, sem apagar a identidade anônima |
| `GET /auth/me` | sessão | `player_uuid`, `is_authenticated`, `connected_accounts[]` |
| `POST /api/v1/auth/disconnect/{platform}` | sessão | 204, apaga os tokens |
| `GET /api/v1/playlists` | sessão | Playlists importadas (`playlist_id`, `external_id`, `name`, `platform`, `track_count`, `cover_url`, `imported_at`) |
| `GET /api/v1/playlists/available/{platform}` | sessão + conta | Catálogo do provedor; 502 se ele estiver fora |
| `POST /api/v1/playlists/import` | sessão + conta | 202 `job_id`; conclusão via WS `playlist_imported` ou polling |
| `GET /api/v1/playlists/imports/{job_id}` | sessão | `status: queued \| in_progress \| completed \| failed`, `progress`, `imported_playlist_id?`, `error_code?` |
| `DELETE /api/v1/playlists/{playlist_id}` | sessão | 204 |
| `GET /api/v1/audio/{audio_token}` | sessão | MP3; erros em [`audio.md`](audio.md#proxy-get-apiv1audioaudio_token) |
| `GET /api/v1/me/export` · `DELETE /api/v1/me` | sessão | LGPD ([`privacy.md`](../privacy.md)) |
| `GET /metrics` | Bearer `METRICS_AUTH_TOKEN` | Prometheus |

"Sessão" vale também para anônimos: toda visita tem `__Host-session` ([ADR-0013](../adr/0013-identidade-por-sessao-anonima.md)). Erros REST: `{ code, message }`; 429 vem com `Retry-After`. `platform` é o enum `Platform` de `packages/schema`.

Falta decidir: o evento `playlist_imported` (`playlist_id`, `track_count`) vai por uma conexão do jogador que **não** é de sala, e o canal se decide ao escrever a `apps/api`.
