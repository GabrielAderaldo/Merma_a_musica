---
id: ADR-0006
title: PostgreSQL 17 + Drizzle para dados duráveis
status: accepted
date: 2026-05-13
revised: 2026-10-21
scope: ["apps/api/**/db/**", "drizzle.config.ts"]
revisit_when: "Drizzle bloquear uma feature necessária, ou o driver bun:sql se mostrar instável"
---

# ADR-0006 — PostgreSQL 17 + Drizzle para dados duráveis

## Contexto

Dados duráveis: contas conectadas (tokens OAuth), playlists normalizadas, histórico de partidas e recordes do solo. São relacionais, precisam de migração versionada e de tipos em TypeScript. Partida em andamento **não** é durável ([ADR-0009](0009-snapshot-da-partida-em-redis.md)).

## Decisão

- **PostgreSQL 17**. Era 16 até 2026-10-21; subiu para bater com a `~/.infra`, onde roda o dev. Nada havia sido implementado, então a migração não custou nada.
- **Drizzle ORM** com schema em TypeScript. Migrações com `drizzle-kit generate` e `drizzle-kit migrate`, e os `.sql` gerados vão para o git.
- Driver `bun:sql` (nativo); `pg` só se houver bloqueador.
- Pool de 10 conexões por instância. Conexão por `POSTGRES_URL`.

## Restrições

- **ADR-0006.R1** MUST NOT gravar estado de partida em andamento no Postgres; só uma escrita ao chegar em `completed`. — Check: pendente — teste do `RoomActor` (nenhuma query antes de `completed`)
- **ADR-0006.R2** MUST NOT persistir `answer_text` (minimização, [`../privacy.md`](../privacy.md)). — Check: pendente — teste do schema Drizzle (a coluna não existe)
- **ADR-0006.R3** MUST guardar refresh token OAuth cifrado (AES-256-GCM, `OAUTH_TOKEN_ENCRYPTION_KEY`). — Check: pendente — teste do repositório de contas
- **ADR-0006.R4** MUST usar em dev o Postgres da `~/.infra`, nunca um container do projeto. — Check: Review: mantenedor (regra da `~/.infra`)

## Consequências

- Mudar uma coluna quebra a compilação de quem a usa. SQL explícito quando necessário.
- O local do schema Drizzle (`apps/api/src/db` ou um pacote próprio) se decide ao criar o `apps/api`.

## Alternativas descartadas

- Prisma: engine separada e query menos transparente.
- TypeORM: decorators e active record contra o estilo funcional.
- Kysely: ótimo, mas sem schema declarativo central (plano B).
- SQLite: escrita concorrente e multi-instância fracas.
- MongoDB: os dados são relacionais.

## Fontes

- `orm.drizzle.team/llms.txt`; MCP `bun-docs` para `bun:sql` ([ADR-0011](0011-docs-de-libs-por-fontes-oficiais.md)).
