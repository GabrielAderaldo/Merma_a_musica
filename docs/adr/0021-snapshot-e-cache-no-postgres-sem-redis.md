---
id: ADR-0021
title: Tirar o Redis e guardar o snapshot da partida e o cache ISRC no Postgres
status: proposed
date: 2026-10-26
supersedes: ADR-0009
scope: ["apps/api/**", "deploy/**", "docs/architecture.md", "docs/operations.md"]
revisit_when: "Mais de 500 salas simultâneas (gatilho da Fase 1 em docs/operations.md), ou a escrita de snapshot passar de 10% do tempo de CPU do Postgres"
---

# ADR-0021 — Tirar o Redis e guardar o snapshot da partida e o cache ISRC no Postgres

> **Proposta para o mantenedor decidir.** Se for aceita, substitui o [ADR-0009](0009-snapshot-da-partida-em-redis.md) e pede um ADR que substitua o [ADR-0006](0006-postgres-e-drizzle.md), cuja R1 proíbe estado de partida em andamento no Postgres.

## Contexto

O Redis ([ADR-0009](0009-snapshot-da-partida-em-redis.md)) guarda só duas coisas: o snapshot de cada sala em `in_match` (a cada 5 s, ~5–15 KB, TTL 30 min) e o cache ISRC → Deezer (TTL 24 h). Nada durável. Para isso o projeto paga um serviço inteiro: container, healthcheck, segredo, AOF, `requirepass`, um cliente (`Bun.redis`) e uma superfície de segurança a mais (o snapshot tem respostas em andamento). Numa equipe de 1 mantenedor + IA, cada serviço a mais é o que mais pesa.

O ADR-0009 descartou o Postgres por "escrita de 5–15 ms + ruído transitório no banco principal". Os números de hoje:

- **Carga:** o teto do MVP é 500 salas simultâneas ([`operations.md`](../operations.md)). Com um snapshot a cada 5 s, são **100 UPSERTs/s** de ~10 KB, ~1 MB/s. É pouco para um Postgres 17 em 2 vCPU, mas é mais escrita do que todo o resto do jogo junto (uma escrita por partida terminada).
- **Latência:** o `RoomActor` grava o snapshot fora do caminho da jogada. Os 5–15 ms não somam ao `submit_answer`.
- **RAM:** na PoC do [ADR-0017](0017-producao-em-containers-com-podman-quadlet.md), o Redis usou 5,6 MB. Tirá-lo quase não muda a memória; o ganho é operacional.
- **Durabilidade:** tabela `UNLOGGED` não escreve WAL, mas é **truncada depois de crash ou parada suja do Postgres**. O caso que o snapshot cobre é o crash da **API** (RTO < 15 s), não o do Postgres, então `UNLOGGED` serve; uma queda do Postgres perderia as partidas em andamento.

## Decisão (proposta)

- O snapshot vai para a tabela `UNLOGGED` `room_snapshot (invite_code PK, payload jsonb, updated_at)`, com `UPSERT` a cada 5 s só em `in_match`, e `DELETE` ao persistir a partida. O `RecoveryService` lê as linhas com `updated_at` de até 2 min.
- O cache ISRC → Deezer vai para a tabela `UNLOGGED` `isrc_deezer_cache (isrc PK, payload jsonb, expires_at)`. Uma limpeza periódica apaga os vencidos.
- O pod do ADR-0017 fica com três containers (Caddy, API, Postgres). Sai o `Bun.redis`, a variável `REDIS_URL`, o segredo `merma-redis-password` e o `merma-redis.container`.

## Restrições

- **ADR-0021.R1** MUST gravar snapshot só com a sala em `in_match`, e apagá-lo ao persistir a partida. — Check: pendente (apps/api) — teste do `SnapshotWriter`
- **ADR-0021.R2** MUST criar `room_snapshot` e `isrc_deezer_cache` como `UNLOGGED`, e nada durável nelas. — Check: pendente (apps/api) — teste das migrações Drizzle
- **ADR-0021.R3** MUST recuperar uma sala (snapshot → `RoomActor` aceitando WS) em menos de 200 ms. — Check: pendente (apps/api) — teste de recuperação

## Consequências

- Um serviço, um cliente, um segredo e uma configuração de persistência a menos. O backup diário deixa as duas tabelas de fora com `pg_dump --no-unlogged-table-data`.
- O snapshot fica atrás do mesmo `bun:sql` dos dados duráveis: um bug do driver afeta os dois ([ADR-0018](0018-bun-1-4-4.md) já exige a versão com as correções de transação).
- Os 100 UPSERTs/s geram tuplas mortas: o autovacuum da tabela precisa ser agressivo (`autovacuum_vacuum_scale_factor` baixo).
- Uma queda do Postgres perde as partidas em andamento (o Redis com AOF perderia ≤ 1 s).
- Na Fase 1 (N VPS) as duas opções funcionam: as tabelas são compartilhadas como o Redis seria.

## Alternativas descartadas

- **Manter o Redis** (ADR-0009): é o que roda hoje na `~/.infra` e na PoC, com AOF e perda ≤ 1 s mesmo se o Postgres cair. Custa um serviço inteiro para dois usos transitórios.
- Tabela comum (com WAL) no Postgres: sobrevive à queda do Postgres, mas ~1 MB/s de WAL e mais peso no backup e na replicação futura.
- SQLite local para o snapshot: não é compartilhado na Fase 1.

## Fontes

- `UNLOGGED`: https://www.postgresql.org/docs/17/sql-createtable.html
- Metas e capacidade: [`../operations.md`](../operations.md). RAM medida: [ADR-0017](0017-producao-em-containers-com-podman-quadlet.md).
