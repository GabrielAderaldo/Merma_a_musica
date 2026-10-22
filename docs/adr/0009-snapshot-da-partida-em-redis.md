---
id: ADR-0009
title: Snapshot da partida ativa em Redis 8
status: accepted
date: 2026-05-13
revised: 2026-10-21
scope: ["apps/api/**"]
revisit_when: "Mais de 5k salas simultâneas, ou recuperação falhando em mais de 1% das tentativas"
---

# ADR-0009 — Snapshot da partida ativa em Redis 8

## Contexto

Com o estado só na memória do processo ([ADR-0002](0002-servidor-hono-single-writer.md)), um crash ou deploy derruba 20 jogadores no meio da partida. Isso fere o pilar "ritmo rápido". Event sourcing seria exagero, e snapshot no Postgres poluiria o banco principal com escrita transitória.

## Decisão

- **Redis 8** como store de snapshot. Era 7.x até 2026-10-21; subiu para bater com a `~/.infra`.
- O `RoomActor` serializa o estado em `room:{invite_code}:snapshot` a cada **5s**, só com a sala em `in_match`. TTL de 30 min.
- O payload tem o necessário para retomar: roster, config, índice da rodada, respostas da rodada atual e placar.
- Ao subir, o `RecoveryService` reidrata as salas órfãs ([`../architecture.md`](../architecture.md#recuperação)).
- Ao persistir a partida, o snapshot é apagado na hora.
- Mesmo Redis guarda o cache ISRC → Deezer ([ADR-0004](0004-audio-universal-via-deezer.md)).
- Cliente: `Bun.redis` nativo.

## Restrições

- **ADR-0009.R1** MUST NOT usar Redis para dado durável (contas, recordes, histórico). — Check: Review: mantenedor
- **ADR-0009.R2** MUST NOT escrever snapshot fora de `in_match`. — Check: pendente — teste do `SnapshotWriter`
- **ADR-0009.R3** MUST expor o Redis só em loopback, com `requirepass` em produção e AOF ligado. — Check: pendente — teste de config no deploy
- **ADR-0009.R4** MUST recuperar uma sala (snapshot → `RoomActor` aceitando WS) em menos de 200ms. — Check: pendente — teste de recuperação

## Consequências

- Perda máxima de 5s numa queda. Habilita deploy hard-cut sem perder partidas.
- Uma dependência operacional a mais. O snapshot contém respostas em andamento, por isso fica só em loopback e com senha.
- Tamanho: ~5–15 KB por sala.

## Alternativas descartadas

- Memória pura aceitando a perda: UX inaceitável.
- Snapshot no Postgres: escrita de 5–15ms + ruído transitório no banco principal.
- Event sourcing: ~3× a complexidade.
- SQLite local e Memcached: não compartilhados ou sem persistência.

## Fontes

- Plugin `redis-development` (skills `redis-core`, `redis-security`); MCP `bun-docs` para `Bun.redis`.
