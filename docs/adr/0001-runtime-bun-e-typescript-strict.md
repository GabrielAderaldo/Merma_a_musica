---
id: ADR-0001
title: Runtime único Bun + TypeScript 6 strict
status: superseded
superseded_by: ADR-0016
date: 2026-05-13
revised: 2026-10-21
scope: ["**"]
revisit_when: "Uma lib essencial não rodar no Bun sem workaround, ou o TS 6 strict travar o desenvolvimento"
---

# ADR-0001 — Runtime único Bun + TypeScript 6 strict

## Contexto

O projeto passou por Elixir/Phoenix e por Gleam no domínio. Múltiplas linguagens e o BEAM em produção custavam caro demais para um quiz de 1 mantenedor. Precisávamos de um runtime que fosse servidor HTTP/WS, test runner, bundler e gerenciador de pacotes, com TypeScript nativo.

## Decisão

**Bun 1.x** é o runtime único. **TypeScript 6** com todas as flags estritas (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, `useUnknownInCatchVariables`), `moduleResolution: bundler`. A referência é o `tsconfig.json` da raiz.

## Restrições

- **ADR-0001.R1** MUST NOT usar `npm`, `pnpm` ou `yarn`; tudo via `bun`/`bunx`. — Check: hook `.claude/hooks/guard-bash.ts` bloqueia o comando
- **ADR-0001.R2** MUST manter as flags estritas do `tsconfig.json` raiz; pacotes só estendem, nunca afrouxam. — Check: pendente — `bunx tsc --noEmit` no CI + revisão do `tsconfig` de cada pacote
- **ADR-0001.R3** MUST NOT usar `any`; `as X` exige comentário justificando. — Check: `.oxlintrc.json` (`typescript/no-explicit-any`); o comentário no cast é Review: mantenedor

## Consequências

- Um runtime só para dev, teste, build e produção. `bun test` tem API compatível com Jest.
- Bun é mais novo que Node: alguma lib de nicho pode falhar. Validar antes de adotar (ver "Adicionar dependência" no `CLAUDE.md`).
- O modo estrito máximo deixa o código mais verboso (`noUncheckedIndexedAccess`) e exige disciplina com branded types e `Result`.

## Alternativas descartadas

- Node + tsx/ts-node: ferramentas fragmentadas (tsc, esbuild, jest, npm).
- Deno: o ecossistema npm era de segunda classe para as libs que nos interessavam.
- Elixir/Phoenix e Gleam (stack anterior): bilinguismo e ferramentas imaturas.

## Fontes

- Doc do Bun: MCP `bun-docs` ([ADR-0011](0011-docs-de-libs-por-fontes-oficiais.md)).
