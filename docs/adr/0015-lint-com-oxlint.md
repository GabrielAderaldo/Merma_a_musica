---
id: ADR-0015
title: Lint com oxlint, fronteiras de pacote por no-restricted-imports e Solid por plugin JS
status: accepted
date: 2026-10-21
scope: [".oxlintrc.json", "apps/**", "packages/**"]
revisit_when: "Os plugins JS do oxlint saírem de alpha, ou o eslint-plugin-solid não funcionar neles"
---

# ADR-0015 — Lint com oxlint, fronteiras de pacote por no-restricted-imports e Solid por plugin JS

## Contexto

O `CLAUDE.md` e o `package.json` usavam oxlint ("não ESLint"), mas:
- o ADR-0008 contava com o `eslint-plugin-solid`;
- o doc de bounded contexts contava com o `no-restricted-imports` do ESLint para as fronteiras.

O oxlint implementa `no-restricted-imports` (desde a v0.15) e aceita plugins JS compatíveis com ESLint, ainda em **alpha**. Não tem plugin nativo de Solid.

## Decisão

- **oxlint** é o único linter (`bun run lint`). A config fica em `.oxlintrc.json`, na raiz.
- As fronteiras entre pacotes ([ADR-0005](0005-monorepo-bun-workspaces.md)) usam `no-restricted-imports` em `overrides` por pasta, com mensagem citando o ADR.
- Regras do Solid: o `eslint-plugin-solid` entra via `jsPlugins` ao criar o `apps/web`. Se ele falhar no oxlint (alpha), o `tsc` e a revisão cobrem até estabilizar, e este ADR registra a falha.
- Regras do domínio sem regra nativa (sem `throw`, sem `class`, sem `Date.now()`) viram um plugin JS próprio em `tools/oxlint-plugin-merma/` quando `packages/domain` nascer.

## Restrições

- **ADR-0015.R1** MUST NOT adicionar ESLint ao projeto. — Check: Review: mantenedor (`package.json`)
- **ADR-0015.R2** MUST citar o ADR na `message` de cada `no-restricted-imports`, para o agente achar o motivo. — Check: Review: mantenedor (`.oxlintrc.json`)
- **ADR-0015.R3** MUST impedir `throw`, `class` e `Date.now()` em `packages/domain`. — Check: pendente — plugin JS `merma/domain-purity`

## Consequências

- Um linter rápido só. A mensagem de erro aponta para o ADR, o que fecha o ciclo "regra → motivo" para o agente.
- Dependência de uma feature alpha para as regras de Solid.

## Alternativas descartadas

- Só oxlint nativo: sem aviso de signal sem parênteses.
- ESLint completo: contradiz a stack e é bem mais lento.

## Fontes

- `no-restricted-imports`: https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-imports.html
- Plugins JS: https://oxc.rs/docs/guide/usage/linter/js-plugins.html
- Config e `overrides`: https://oxc.rs/docs/guide/usage/linter/config.html
