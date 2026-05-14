# Solid Docs — Índice Mestre

Documentação completa do Solid (Solid core + Solid Router + Solid Meta + SolidStart), separada em arquivos `.md` por seção, espelhando a estrutura de `docs.solidjs.com`.

**Total:** 221 páginas em 47 categorias.

## Categorias

| Categoria | Páginas | Descrição |
|---|---:|---|
| [`./`](./docs/INDEX.md) | 2 | Páginas raiz (index, quick-start). |
| [`concepts/`](./docs/concepts/INDEX.md) | 7 | Conceitos fundamentais: signals, effects, stores, refs, JSX. |
| [`concepts/components/`](./docs/concepts/components/INDEX.md) | 4 | Componentes do Solid (props, children, lifecycle). |
| [`concepts/control-flow/`](./docs/concepts/control-flow/INDEX.md) | 5 | <Show>, <For>, <Index>, <Switch>, <ErrorBoundary>. |
| [`concepts/derived-values/`](./docs/concepts/derived-values/INDEX.md) | 2 | createMemo, derived signals. |
| [`advanced-concepts/`](./docs/advanced-concepts/INDEX.md) | 1 | Fine-grained reactivity por dentro. |
| [`guides/`](./docs/guides/INDEX.md) | 7 | Guias: state management, routing, fetching, styling, testing, deploy. |
| [`guides/styling-components/`](./docs/guides/styling-components/INDEX.md) | 7 | Tailwind, CSS Modules, Styled, etc. |
| [`guides/deployment-options/`](./docs/guides/deployment-options/INDEX.md) | 9 | Deploy do Solid em provedores (Cloudflare, Netlify, Vercel...). |
| [`configuration/`](./docs/configuration/INDEX.md) | 2 | TypeScript config, Vite/Bun bundler. |
| [`reference/basic-reactivity/`](./docs/reference/basic-reactivity/INDEX.md) | 4 | createSignal, createMemo, createEffect, createComputed. |
| [`reference/component-apis/`](./docs/reference/component-apis/INDEX.md) | 5 | createContext, useContext, lazy, mergeProps, splitProps. |
| [`reference/components/`](./docs/reference/components/INDEX.md) | 11 | <For>, <Show>, <Switch>, <Index>, <Dynamic>, <ErrorBoundary>, <Suspense>, <Portal>... |
| [`reference/jsx-attributes/`](./docs/reference/jsx-attributes/INDEX.md) | 12 | ref, classList, style, on:, prop:, attr:, use:... |
| [`reference/lifecycle/`](./docs/reference/lifecycle/INDEX.md) | 2 | onMount, onCleanup. |
| [`reference/reactive-utilities/`](./docs/reference/reactive-utilities/INDEX.md) | 15 | batch, untrack, on, createDeferred, createRoot, getOwner... |
| [`reference/rendering/`](./docs/reference/rendering/INDEX.md) | 9 | render, hydrate, renderToString, isServer. |
| [`reference/secondary-primitives/`](./docs/reference/secondary-primitives/INDEX.md) | 5 | createSelector, createReaction, createUniqueId. |
| [`reference/server-utilities/`](./docs/reference/server-utilities/INDEX.md) | 1 | isServer. |
| [`reference/store-utilities/`](./docs/reference/store-utilities/INDEX.md) | 6 | createStore, produce, reconcile, unwrap. |
| [`solid-router/`](./docs/solid-router/INDEX.md) | 1 | Solid Router — roteamento client/SSR/SSG. |
| [`solid-router/getting-started/`](./docs/solid-router/getting-started/INDEX.md) | 4 | Início rápido do router. |
| [`solid-router/concepts/`](./docs/solid-router/concepts/INDEX.md) | 9 | Conceitos do router. |
| [`solid-router/data-fetching/`](./docs/solid-router/data-fetching/INDEX.md) | 3 | Loaders, actions, cache, mutações. |
| [`solid-router/data-fetching/how-to/`](./docs/solid-router/data-fetching/how-to/INDEX.md) | 2 | Patterns de fetching. |
| [`solid-router/rendering-modes/`](./docs/solid-router/rendering-modes/INDEX.md) | 2 | CSR, SSR, SSG. |
| [`solid-router/advanced-concepts/`](./docs/solid-router/advanced-concepts/INDEX.md) | 2 | Patterns avançados. |
| [`solid-router/guides/`](./docs/solid-router/guides/INDEX.md) | 1 | Guias do router. |
| [`solid-router/reference/components/`](./docs/solid-router/reference/components/INDEX.md) | 6 | <Router>, <Route>, <A>, <Outlet>, <Navigate>... |
| [`solid-router/reference/data-apis/`](./docs/solid-router/reference/data-apis/INDEX.md) | 9 | query, action, redirect, reload, revalidate, json... |
| [`solid-router/reference/preload-functions/`](./docs/solid-router/reference/preload-functions/INDEX.md) | 1 | preload no router. |
| [`solid-router/reference/primitives/`](./docs/solid-router/reference/primitives/INDEX.md) | 10 | useLocation, useNavigate, useParams, useSearchParams... |
| [`solid-router/reference/response-helpers/`](./docs/solid-router/reference/response-helpers/INDEX.md) | 3 | Helpers de resposta (json, redirect, etc.). |
| [`solid-meta/`](./docs/solid-meta/INDEX.md) | 1 | @solidjs/meta — <Title>, <Meta>, <Link> (head tags). |
| [`solid-meta/getting-started/`](./docs/solid-meta/getting-started/INDEX.md) | 3 | Setup do solid-meta. |
| [`solid-meta/reference/meta/`](./docs/solid-meta/reference/meta/INDEX.md) | 7 | API de meta tags. |
| [`solid-start/`](./docs/solid-start/INDEX.md) | 3 | SolidStart — meta-framework com SSR. **Não usamos no Mermã** — referência geral. |
| [`solid-start/building-your-application/`](./docs/solid-start/building-your-application/INDEX.md) | 8 | Estrutura, rotas, layouts. |
| [`solid-start/advanced/`](./docs/solid-start/advanced/INDEX.md) | 7 | API routes, sessions, middleware. |
| [`solid-start/guides/`](./docs/solid-start/guides/INDEX.md) | 4 | Deploy, autenticação. |
| [`solid-start/reference/client/`](./docs/solid-start/reference/client/INDEX.md) | 3 | API client. |
| [`solid-start/reference/config/`](./docs/solid-start/reference/config/INDEX.md) | 1 | Config. |
| [`solid-start/reference/entrypoints/`](./docs/solid-start/reference/entrypoints/INDEX.md) | 4 | Entry points. |
| [`solid-start/reference/routing/`](./docs/solid-start/reference/routing/INDEX.md) | 1 | Routing reference. |
| [`solid-start/reference/server/`](./docs/solid-start/reference/server/INDEX.md) | 8 | Server utilities. |
| [`v2/`](./docs/v2/INDEX.md) | 1 | Solid 2.0 (em alpha) — referência futura. **Não usamos no MVP**. |
| [`v2/reference/basic-reactivity/`](./docs/v2/reference/basic-reactivity/INDEX.md) | 1 | Signals na v2. |

## Como usar

- **Navegação humana:** comece aqui, clique numa categoria → caia no `INDEX.md` da pasta → abra o arquivo `.md` específico.
- **Busca:** `rg <termo> handbook/references/solid/docs` resolve mais rápido que qualquer outra coisa.
- **Decisões do Mermã sobre Solid:** ver [`adrs/0008`](../../doc/20-architecture/adrs/0008-frontend-solidjs.md). Em curto: usaremos **Solid 1.x** + `@solidjs/router`. **Não** usamos SolidStart (sem SSR). **Não** usamos Solid 2.x (em alpha).

## Origem

Gerado a partir do repositório oficial `github.com/solidjs/solid-docs` (clone shallow), pasta `src/routes/**/*.mdx`. Os prefixos `(N)` de SolidStart route groups foram removidos dos caminhos para legibilidade humana. Para regenerar após atualizar:

```bash
cd /tmp && [ -d solid-docs ] && rm -r solid-docs; \
  git clone --depth 1 https://github.com/solidjs/solid-docs.git
cd handbook/references/solid
python3 .split.py   # regera docs/**/*.md a partir de /tmp/solid-docs
python3 .index.py   # regera INDEX.md raiz + INDEX.md por pasta
```
