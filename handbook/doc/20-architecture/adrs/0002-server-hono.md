# ADR 0002: Server HTTP/WS — Hono

- **Status:** accepted
- **Data:** 2026-05-13
- **Decisores:** core

## Contexto

Com o runtime decidido ([ADR 0001](0001-runtime-bun-and-ts-6.md)), precisamos de uma camada HTTP + WebSocket para o backend `@merma/api`. Requisitos:

- **Latência baixa** para WebSockets de sala (eventos como `submit_answer`, `round_starting` precisam chegar com poucos ms de overhead do servidor).
- **API ergonômica** com tipagem forte e middleware composável.
- **Roteamento HTTP** padrão (REST para `/api/v1/audio/{token}`, `/auth/*`, listagem de playlists).
- **WebSocket nativo** sem dependência de adapters de Node (`ws`, `socket.io`) que não rodam idiomaticamente em Bun.

## Decisão

Adotar **Hono** como framework HTTP/WS principal do `@merma/api`. Versão mínima: a estável compatível com Bun 1.x.

Padrões de uso:
- Rotas HTTP definidas em arquivos por bounded context: `routes/auth.ts`, `routes/playlists.ts`, `routes/audio.ts`.
- WebSocket via `app.upgradeWebSocket()` para o endpoint `/ws/room/:invite_code` — substitui completamente o uso de "Phoenix Channels" da stack anterior.
- Middleware em ordem: `secureHeaders → cors (allowlist) → requestId → authSession → rateLimit → handler`.
- Validação de payloads via **Zod** (compartilhado com `@merma/schema`).

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **`Bun.serve` puro (sem framework)** | Funciona, mas reimplementar roteamento, middleware, parser de body, validação de Zod é trabalho de plataforma que não é o nosso core. Adiamos esse trabalho até dar problema concreto. |
| **Express** | Maduro, mas legacy (callbacks, middleware mutável `req`/`res`), tipagem fraca, e o adapter para Bun é incompleto em alguns recursos. |
| **Elysia** | Excelente DX e performance comparável a Hono no Bun. Hono ganhou por: (a) ecossistema mais amplo de middleware (cors, secureHeaders, sentry, oauth); (b) também roda em Workers/Deno/Node, dando portabilidade caso o runtime mude no futuro. |
| **Fastify** | Performante e maduro, mas otimizado para Node; integração com Bun é "boa" mas não nativa. |
| **Phoenix Channels (stack anterior)** | Exigia BEAM em produção — rejeitado em [ADR 0001](0001-runtime-bun-and-ts-6.md). |

## Consequências

- **Positivas:**
  - DX excelente para TS: tipagem propagada do router até handlers.
  - Middleware funcional (composição via `app.use()`) combina bem com nosso estilo `Result<T, E>` no domínio.
  - Suporte oficial a WebSocket via `upgradeWebSocket` em ambientes Bun, sem adapter terceiro.
  - Portabilidade futura: se decidirmos rodar em Workers/Edge, Hono já suporta.
- **Negativas / trade-offs:**
  - Hono é mais novo que Express/Fastify — surface de bugs ainda em descoberta. Mitigação: pinning de versão e testes de integração no `apps/api`.
  - WebSocket no Bun via Hono ainda é menos "documentado" que `Bun.serve` direto; alguns padrões (broadcast por sala, presence) terão que ser construídos internamente.
- **Neutras:**
  - Documentação online do Hono é a fonte primária; complementar com snapshot offline (a fazer em `handbook/references/hono/` na F6).

## Topologia e sharding (adendo 2026-05-13)

Resultado da discussão arquitetural depois da decisão original:

- **Padrão: single-writer-per-room.** Cada `Room` é detida por exatamente um processo Bun (um `RoomActor` em memória). Esse padrão é o mesmo usado por Erlang/OTP, Phoenix Channels, Discord guilds, Twitch chat — comprovado para o nosso tipo de problema.
- **Sharding sticky por `invite_code`.** Em N nodes, o load balancer (Caddy) faz hash consistente de `invite_code` → mesma sala sempre cai no mesmo node. WebSockets têm session affinity pela mesma chave.
- **Snapshot via Redis** ([ADR-0009](0009-redis-snapshot.md)) cobre crash/deploy — node novo re-hidrata `RoomActor` a partir do Redis.
- **Deploy rolling drain.** Em N≥2 nodes: node antigo para de aceitar **lobbies novos**, mantém lobbies vivos até esvaziarem, depois é morto. Em 1 VPS (MVP) o deploy é hard-cut em janela de baixo uso — recovery automático via snapshot.

### Latência alvo (NFR)

| Métrica | Alvo p95 |
|---|---|
| `submit_answer` round-trip (cliente → server → ack) | < 80ms |
| Jitter de `timer_started` entre clientes | < 100ms |
| TTFB do áudio após `round_starting` | < 500ms |

Documentado em detalhes em [`40-operations/01-nfrs.md`](../../../40-operations/01-nfrs.md) (F6).

## Notas

- Decisão revisita-se caso encontremos limites de throughput no MVP — improvável no escopo atual.
