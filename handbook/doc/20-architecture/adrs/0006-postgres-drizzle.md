# ADR 0006: Banco — PostgreSQL + Drizzle ORM

- **Status:** accepted
- **Data:** 2026-05-13
- **Decisores:** core

## Contexto

O MVP do Mermã tem dois tipos de dados:

1. **Efêmeros** (live durante a partida): estado da `Room`, conexões de jogadores, timer, respostas em andamento. Vivem em **memória do processo Bun** — não tocam o banco.
2. **Persistidos:** contas externas conectadas (OAuth tokens), playlists importadas e normalizadas, histórico de partidas (pós-MVP), recordes pessoais do modo solo.

Precisamos de um banco que:
- Suporte JOINs e queries relacionais simples (playlists ↔ músicas, partidas ↔ jogadores).
- Seja **type-safe** com o resto da stack TS.
- Migrações versionadas, controláveis em CI.
- Open-source, hostável em qualquer cloud.

## Decisão

**PostgreSQL** como banco relacional, **Drizzle ORM** como camada de acesso.

- **Schema** definido em TypeScript em `packages/schema/db/` (ou `apps/api/db/`, decisão pendente para F4).
- **Migrações** geradas via `drizzle-kit generate` e aplicadas via `drizzle-kit migrate`. Commitar arquivos `.sql` gerados.
- **Driver:** `bun:sql` (driver nativo do Bun para Postgres) ou `pg` — Drizzle suporta ambos; preferência pelo nativo Bun se estável.
- **Conexão:** pool com `max=10` por instância. Variáveis em `.env` (`POSTGRES_URL`).

> Drizzle foi escolhido por gerar SQL ergonômico mas explícito — diferente de ORMs "automágicos", o dev vê o que está rodando.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Prisma** | Maduro e ergonômico, mas tem um runtime engine separado (overhead de cold-start no Bun); query builder é menos transparente que Drizzle. |
| **TypeORM** | Decoradores + active record style colidem com nosso estilo functional/Result. |
| **Kysely** | Excelente query builder type-safe, sem schema declarativo central — exige mais código. Considerar como alternativa se Drizzle decepcionar. |
| **SQLite (versão anterior)** | A doc arquivada `DOMAIN_MODELS_v0_gleam.md` mencionava SQLite "pós-MVP". Rejeitado para a stack atual: concorrência de escritas, latência de réplicas e operação multi-instância são fracas em SQLite — Postgres é a escolha óbvia em deploy real. |
| **MongoDB / NoSQL** | Dados são relacionais (playlists, músicas, jogadores). Forçar NoSQL aqui não traz benefício. |

## Consequências

- **Positivas:**
  - Type-safety: schema TS gera tipos para query results. Mudou coluna, compilador acusa.
  - SQL explícito quando precisa (Drizzle é fino sobre SQL, não esconde).
  - Postgres aceito em todos os clouds (managed services maduros).
  - Migrações versionadas em git, rollback trivial.
- **Negativas / trade-offs:**
  - Dependência operacional do Postgres (provisionamento, backup, monitoring). Aceitável.
  - Drizzle é mais novo que Prisma — risco de feature gaps. Mitigação: pinning de versão e atualização gradual.
  - `bun:sql` ainda em iteração — fallback para `pg` se houver bloqueador.
- **Neutras:**
  - Conexão pool e tunning são responsabilidade de operação, documentados em `40-operations/04-runbook.md` (a criar).

## Notas

- Não usamos banco para estado vivo da partida — partidas inteiras vivem e morrem em memória; só o **resultado** vai pro banco. Detalhes em [`20-architecture/03-state-machines.md`](../03-state-machines.md) (a criar).
- Estratégia de armazenamento de OAuth tokens (encrypted at rest? KMS?) será decidida em ADR separado quando chegarmos em LGPD/security ([`40-operations/02-privacy-lgpd.md`](../../../40-operations/02-privacy-lgpd.md)).
