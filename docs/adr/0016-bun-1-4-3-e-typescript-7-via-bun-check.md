---
id: ADR-0016
title: Bun ≥ 1.4.3 como runtime único, com TypeScript 7 strict checado pelo bun check
status: superseded
superseded_by: ADR-0018
date: 2026-10-21
supersedes: ADR-0001
scope: ["**"]
revisit_when: "Uma nova versão do Bun mudar a versão de TypeScript do bun check (rodar `bun -p process.versions.typescript` a cada upgrade), ou uma lib essencial não rodar no Bun"
---

# ADR-0016 — Bun ≥ 1.4.3 como runtime único, com TypeScript 7 strict checado pelo bun check

## Contexto

O [ADR-0001](0001-runtime-bun-e-typescript-strict.md) escolheu Bun 1.x + TypeScript 6 strict. Em 2026-10 três coisas mudaram:

- O **Bun 1.4.3** (2026-10-10) trouxe o `bun check`, um port do typescript-go que passa 100% da suíte de conformidade do TypeScript 7.0.2, é de 3 a 6× mais rápido que o `tsc` 7 e **se comporta como o TS 7 seja qual for o `typescript` instalado**. Também existem `bun test --check`, `bun run --check` e `bun build --check`. Com `CLAUDECODE=1`, o erro sai em bloco estruturado para o agente.
- O LSP desta máquina (`tsgo-lsp`) já é o typescript-go, ou seja, TS 7. Manter o gate em TS 6 deixaria editor e checagem divergindo.
- A 1.4.0 e a 1.4.1 tinham regressões que pegam a stack, corrigidas na 1.4.2 e na 1.4.3:
  - `Bun.SQL`: `sql.begin()` resolvia mesmo com rollback, e queries pipelined trocavam linhas;
  - bundler (`var`/`let` colidindo, ciclos com `--splitting`);
  - `util.promisify(setTimeout)` resolvendo na hora;
  - vazamento no `AsyncLocalStorage`.
- Desde o TS 6, o `types` vem vazio por padrão: sem `"types": ["bun"]`, os globais do Bun não existem para o checador. O `tsconfig.json` do projeto não tinha isso.

## Decisão

- **Bun ≥ 1.4.3** é o runtime único (`engines.bun` e `packageManager` no `package.json`).
- **TypeScript 7 strict** é a semântica dos tipos, e o **`bun check` é o checador oficial**: `bun run typecheck` (= `bun check`), `bun test --check` no dia a dia e no CI.
- O pacote `typescript` fica como devDep só para o editor, **travado na versão de `bun -p process.versions.typescript`** (7.0.2 nesta data).
- O `tsconfig.json` raiz segue o recomendado pelo Bun para TS 6/7 (`types: ["bun"]`, `module: Preserve`, `verbatimModuleSyntax`), mais as flags estritas do projeto (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`).
- Sem `tsc` no fluxo. Ele só volta se um dia for preciso gerar `.d.ts`.

## Restrições

- **ADR-0016.R1** MUST NOT usar `npm`, `pnpm` ou `yarn`; tudo via `bun`/`bunx`. — Check: hook `.claude/hooks/guard-bash.ts` bloqueia o comando
- **ADR-0016.R2** MUST passar em `bun check` (TS 7, flags estritas do `tsconfig.json` raiz); pacotes só estendem o raiz, nunca afrouxam. — Check: `bun run typecheck`
- **ADR-0016.R3** MUST NOT usar `any`; `as X` exige comentário justificando. — Check: `.oxlintrc.json` (`typescript/no-explicit-any`); o comentário no cast é Review: mantenedor
- **ADR-0016.R4** MUST rodar com Bun ≥ 1.4.3. — Check: `engines.bun` e `packageManager` no `package.json`
- **ADR-0016.R5** MUST manter o devDep `typescript` igual a `bun -p process.versions.typescript` depois de cada upgrade do Bun. — Check: Review: mantenedor (ao rodar `bun upgrade`)

## Consequências

- Gate, editor e LSP seguem o mesmo TypeScript, e a checagem fica rápida o bastante para rodar a cada teste (`bun test --check`).
- Atualizar o Bun pode trazer um TS novo: a R5 obriga a reconferir.
- Exigir 1.4.3 deixa versões antigas de fora de propósito. Na data, esta máquina foi atualizada de 1.4.0 para 1.4.3.

## Alternativas descartadas

- Manter TS 6 + `tsc`: editor (TS 7) e gate divergem, e a checagem fica mais lenta.
- TS 6 no papel com `bun check` na prática: o ADR diria uma coisa e a ferramenta faria outra.
- Sem trava de versão: o `Bun.SQL` poderia rodar com as regressões da 1.4.0/1.4.1.

## Fontes

- `bun check`: https://bun.com/docs/runtime/check
- TS 6/7 e `types`: https://bun.com/docs/typescript-6
- Bun v1.4.3: https://bun.com/blog/bun-v1.4.3
- Bun v1.4.2: https://bun.com/blog/bun-v1.4.2
