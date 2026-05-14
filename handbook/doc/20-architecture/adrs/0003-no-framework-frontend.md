# ADR 0003: Frontend sem framework — Vanilla TS + MVVM

- **Status:** superseded by [ADR-0008](0008-frontend-solidjs.md) em 2026-05-13
- **Data:** 2026-05-13
- **Decisores:** core

> ⚠️ **Esta decisão foi revisitada no mesmo dia em que foi aceita.** Após comparação prática entre Vanilla TS, Web Components e SolidJS, ficou claro que o "observer in-house" planejado aqui era exatamente o que signals do Solid já entregam (de graça, mais bem testados, com bundle menor no final). Veja o [ADR-0008](0008-frontend-solidjs.md) para a decisão atual. O conteúdo abaixo permanece **inalterado** como registro histórico.

---

## Contexto

A versão anterior do frontend usava SvelteKit. As superfícies de UI do Mermã (lobby, partida, revelação, resultados) são poucas e relativamente simples — a complexidade está mais em **gerenciamento de estado real-time vinda de WebSocket** do que em renderização. Em paralelo:

- O bundle final deve ser **pequeno** (mobile-friendly, baixa latência de primeira pintura).
- O time não tem capacidade nem necessidade de manter expertise profunda em múltiplos frameworks.
- A stack já depende de Bun como bundler nativo (`bun build`) — adicionar Vite/Webpack para um framework seria fricção extra.

## Decisão

Frontend `apps/web` em **TypeScript puro (Vanilla TS)**, com padrão **MVVM** simples:

- **Models:** interfaces TS que espelham `@merma/schema` (Zod).
- **Repositories:** camada de I/O (REST via `fetch`, WebSocket via `WebSocket` nativo, persistência via `localStorage`).
- **ViewModels:** singletons que mantêm estado reativo via **padrão Observer** in-house (sem libs).
- **Views:** funções que manipulam DOM e fazem `subscribe()` em ViewModels.
- **Build:** `bun build --target browser --splitting --minify` produzindo um bundle por app.

Estilização: **Tailwind CSS** (utilitário, processado pelo Bun build) + tokens em TS importáveis.

> Nota: a versão arquivada (`SPEC_FRONTEND_v2.0_phoenixjs.md`) importava `phoenix.js` para WebSocket. Isto foi removido — usaremos a API nativa `WebSocket` do browser conversando direto com Hono.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **SvelteKit (versão anterior)** | Bundle aceitável e DX boa, mas era uma camada a mais para problemas que não tínhamos. Pivot tecnológico (ver `archive/implementation_plan_v0_pivot.md`) buscou simplificação. |
| **React + Vite** | Ecossistema dominante, mas overhead de virtual DOM e bundle inicial são significativos para um app com poucas telas. JSX exige tooling extra além de Bun. |
| **Solid** | Performance excelente e modelo reativo elegante, mas time não tem familiaridade e a comunidade é menor — risco extra de bus factor. |
| **HTMX + servidor renderizando HTML** | Encaixaria bem em REST, mas o jogo é fortemente WebSocket-driven; HTMX não brilha em transmissões push densas como timer/answers em tempo real. |

## Consequências

- **Positivas:**
  - Bundle alvo estimado em < 30KB gzipped (sem framework, só app code + Tailwind purgado).
  - Zero camada de abstração entre WebSocket message → reducer/observable → DOM. Debugging trivial.
  - Build trivial: `bun build` direto, sem configuração de bundler externo.
  - Sem **lock-in** a um framework — se um dia migrarmos para algo, só portamos as Views.
- **Negativas / trade-offs:**
  - Devs precisam escrever DOM manipulation manual (`createElement`, `appendChild`, `addEventListener`). Curva inicial para quem está acostumado a JSX.
  - Sem ecossistema de "components prontos" — UI primitives (modal, dropdown, toast) precisam ser implementados.
  - Risco de divergência de padrões entre devs sem framework prescritivo. Mitigação: lint rules + revisão estrita + componentes utilitários compartilhados em `apps/web/src/views/components/ui/`.
- **Neutras:**
  - Tailwind é a opção pragmática para estilização rápida sem CSS Modules ou CSS-in-JS — bundle de classes purgado é pequeno.

## Notas

- Pattern de observable in-house ficará em `apps/web/src/utils/observable.ts` (~30 linhas). Especificado em [`30-specs/03-frontend.md`](../../30-specs/03-frontend.md) (a criar na F5).
- Se a complexidade do estado crescer (mais de 5–6 ViewModels grandes), reavaliar — Zustand minimalista pode ser injetado sem reescrever tudo.
