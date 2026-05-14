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

## Notas

- Latência alvo (NFR a documentar em `40-operations/01-nfrs.md`): p95 < 60ms para o handler de `submit_answer` (cliente → servidor → broadcast). Vamos benchmarkar antes do MVP shipar.
- Decisão revisita-se caso encontremos limites de throughput no MVP — improvável no escopo atual.
