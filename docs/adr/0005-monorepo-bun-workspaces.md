---
id: ADR-0005
title: Monorepo com Bun Workspaces
status: accepted
date: 2026-05-13
revised: 2026-10-21
scope: ["package.json", "apps/**", "packages/**"]
revisit_when: "Mais de 10 pacotes, ou build/teste lento a ponto de exigir cache distribuído"
---

# ADR-0005 — Monorepo com Bun Workspaces

## Contexto

API, web, engine e contratos compartilham tipos. Publicar pacotes internos no npm para sincronizar contratos é atrito sem ganho para 1 mantenedor.

## Decisão

Bun Workspaces (`"workspaces": ["apps/*", "packages/*"]` no `package.json` raiz), com pacotes `@merma/<nome>`:

| Pacote | Papel | Pode importar |
|---|---|---|
| `packages/schema` | Contratos Zod ([ADR-0014](0014-contratos-zod-first.md)) | só Zod |
| `packages/domain` | Engine pura | `@merma/schema` |
| `apps/api` | Hono, `RoomActor`, integrações | `@merma/domain`, `@merma/schema` |
| `apps/web` | Solid | `@merma/schema` |

## Restrições

- **ADR-0005.R1** MUST NOT importar `@merma/domain` em `apps/web`. — Check: `.oxlintrc.json` (`no-restricted-imports`, [ADR-0015](0015-lint-com-oxlint.md))
- **ADR-0005.R2** MUST NOT importar `apps/*` de dentro de `packages/*`. — Check: `.oxlintrc.json` (`no-restricted-imports`)
- **ADR-0005.R3** MUST declarar o campo `workspaces` no `package.json` raiz ao criar o primeiro pacote. — Check: pendente — `bun install` falha ao resolver `@merma/*` sem ele

## Consequências

- Tipos cruzam pacotes sem publicação. `bun --filter` orquestra dev, build e teste.
- Mudar um pacote afeta quem depende dele: tudo roda junto no CI.

## Alternativas descartadas

- Polyrepo: sincronizar contratos por npm publish.
- pnpm workspaces: mais uma ferramenta além do Bun.
- Nx/Turborepo: exagero para 4 pacotes.
