---
id: ADR-0008
title: Frontend em SolidJS 1.x, com build pelo Vite
status: accepted
date: 2026-05-13
revised: 2026-10-21
supersedes: ADR-0003
scope: ["apps/web/**"]
revisit_when: "Solid 2.x estável com ganho concreto, ou o bundle passar das metas de docs/operations.md"
---

# ADR-0008 — Frontend em SolidJS 1.x, com build pelo Vite

## Contexto

O cliente é guiado por WebSocket (timer, respostas, placar, presença, autocomplete), tem 5 a 7 telas, é mobile-first e precisa de um bundle pequeno. O [ADR-0003](0003-frontend-sem-framework.md) previa um observer próprio que reimplementava signals.

## Decisão

- **SolidJS 1.x** com signals, stores e `@solidjs/router`. Sem SolidStart e sem SSR. Tailwind para estilo.
- **Build e dev com Vite + `vite-plugin-solid`**, rodando com `bunx --bun vite`. Corrigido em 2026-10-21: a versão de maio previa `bun build` + `babel-preset-solid`, mas a CLI do `bun build` não aplica plugins, então não compilaria o JSX do Solid.
- Estado: o WebSocket alimenta o store e a view reage. A tela é escolhida pela `phase` ([`../architecture.md`](../architecture.md)).

## Restrições

- **ADR-0008.R1** MUST usar Solid 1.x (não 2.x) enquanto este ADR valer. — Check: pendente — versão travada em `apps/web/package.json`
- **ADR-0008.R2** MUST NOT importar `@merma/domain` no cliente. — Check: `.oxlintrc.json` (`no-restricted-imports`)
- **ADR-0008.R3** MUST NOT usar React, SolidStart nem SSR. — Check: pendente — `no-restricted-imports` de `react`/`@solidjs/start` ao criar o `apps/web`

## Consequências

- O runtime do Solid tem ~7 KB. Sem VDOM: o JSX compila para chamadas diretas.
- O Vite entra como devDep do `apps/web`, a única ferramenta além do Bun, por ser o caminho oficial do Solid.
- Esquecer os parênteses dos signals (`count` em vez de `count()`) é o erro clássico. A mitigação é o lint ([ADR-0015](0015-lint-com-oxlint.md)).
- A comunidade é menor que a do React. A API é pequena e a doc oficial tem `llms.txt`.

## Alternativas descartadas

- Vanilla TS ([ADR-0003](0003-frontend-sem-framework.md)): observer próprio + DOM manual.
- Web Components/Lit: resolvem encapsulamento, não reatividade.
- React: bundle ~6× maior, VDOM.
- Svelte 5: empate técnico. Solid ganhou por ter signals explícitos e JSX.
- `Bun.build` com plugin de Solid: o plugin é da comunidade, o que fere o [ADR-0011](0011-docs-de-libs-por-fontes-oficiais.md).

## Fontes

- `docs.solidjs.com/llms.txt` (quick start com Vite).
- Bun + Vite: https://bun.com/guides/ecosystem/vite
- Aviso sobre plugins na CLI: https://bun.com/docs/bundler/fullstack
