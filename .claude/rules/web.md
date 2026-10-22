---
paths:
  - "apps/web/**"
---
<!-- Regra por caminho. https://code.claude.com/docs/pt/memory -->
# apps/web — Solid 1.x + Vite (ADR-0008, ADR-0013)

- Solid 1.x com signals e stores; sem React, SolidStart ou SSR. Build e dev via `bunx --bun vite` (o `bun build` pela CLI não compila Solid).
- Nunca importe `@merma/domain`. O cliente não sabe regra de jogo: só exibe o que o servidor mandou.
- A tela sai de `phase` (`lobby`, `countdown`, `playing`, `reveal`, `results`), não de estados internos.
- Todo evento WS passa pelo parser Zod de `packages/schema` antes do store.
- Identidade é o cookie. `localStorage` só para conveniência (último `nickname`, cache de recordes).
- Áudio: baixe uma vez, guarde num blob e toque a revelação dali (R-131). Revogue a URL no fim.
- Lembre de chamar o signal: `count()`, não `count`.
- Antes de dizer que funciona, verifique no browser com Claude in Chrome (console, rede, DOM).
- Telas e identidade visual: `docs/design/brief.md`.
