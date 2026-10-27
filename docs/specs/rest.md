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
| `GET /api/v1/audio/{audio_token}` | sessão | MP3; já implementado em `apps/api/src/http/audio.ts` ([ADR-0004](../adr/0004-audio-universal-via-deezer.md)) |
| `GET /api/v1/me/export` · `DELETE /api/v1/me` | sessão | LGPD ([`privacy.md`](../privacy.md)) |
| `GET /metrics` | Bearer `METRICS_AUTH_TOKEN` | Prometheus |

"Sessão" vale também para anônimos: toda visita tem `__Host-session` ([ADR-0013](../adr/0013-identidade-por-sessao-anonima.md)). Erros REST: `{ code, message }`; 429 vem com `Retry-After`. `platform` é o enum `Platform` de `packages/schema`.
