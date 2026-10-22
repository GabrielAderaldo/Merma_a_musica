---
id: ADR-0002
title: Servidor HTTP/WS em Hono, com um processo dono de cada sala
status: accepted
date: 2026-05-13
revised: 2026-10-21
scope: ["apps/api/**"]
revisit_when: "Limite de throughput de WS no Hono/Bun, ou a Fase 1 (N VPS) chegar (ver docs/operations.md)"
---

# ADR-0002 — Servidor HTTP/WS em Hono, com um processo dono de cada sala

## Contexto

O `apps/api` precisa de REST (auth, playlists, áudio), de WebSocket de baixa latência por sala e de middleware tipado, sem adaptadores de Node (`ws`, `socket.io`) que não são idiomáticos no Bun. O estado de uma partida muda muitas vezes por segundo e não pode ter corrida entre processos.

## Decisão

- **Hono** como framework HTTP/WS. WebSocket via `upgradeWebSocket` em `/ws/room/:invite_code`.
- Ordem dos middlewares: `secureHeaders → cors (allowlist) → requestId → session → rateLimit → handler`.
- **Single-writer-per-room:** cada sala pertence a exatamente um `RoomActor` num único processo, e toda mutação passa por uma fila interna dele.
- Com N nodes, o Caddy roteia por hash consistente do `invite_code` (sticky). Com 1 VPS (MVP), o deploy é hard-cut com recuperação pelo snapshot ([ADR-0009](0009-snapshot-da-partida-em-redis.md)).

## Restrições

- **ADR-0002.R1** MUST mutar o estado da sala só dentro da fila do `RoomActor`. — Check: pendente — teste de concorrência (N `submit_answer` simultâneos → estado consistente)
- **ADR-0002.R2** MUST NOT usar Redis Pub/Sub nem outra coordenação entre nodes para estado de sala. — Check: Review: mantenedor
- **ADR-0002.R3** MUST validar todo payload de entrada (WS e REST) com o schema Zod de `packages/schema` antes de chegar no handler. — Check: pendente — teste "payload inválido → `invalid_payload`" (S-24)

## Consequências

- Tipagem do router até o handler; middleware composicional que combina com `Result`.
- Broadcast por sala e presença são nossos (o Hono não traz isso).
- O hash sticky do Caddy pelo path ainda não foi validado. Fica em aberto até o gatilho da Fase 1.

## Alternativas descartadas

- `Bun.serve` puro: reimplementar roteamento, middleware e validação.
- Express e Fastify: pensados para Node, com tipagem mais fraca.
- Elysia: DX equivalente, mas o Hono tem mais middleware oficial e roda em outros runtimes.

## Fontes

- Hono: plugin `hono@hono` e `bunx @hono/cli docs` ([ADR-0011](0011-docs-de-libs-por-fontes-oficiais.md)).
