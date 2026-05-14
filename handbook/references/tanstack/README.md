# TanStack Docs Snapshot (Router / Query / Table)

**Fontes:**
- Índice: `https://tanstack.com/llms.txt`
- Router: `https://github.com/TanStack/router` → `docs/router/`
- Query: `https://github.com/TanStack/query` → `docs/`
- Table: `https://github.com/TanStack/table` → `docs/`

**Capturado em:** 2026-05-12 (`main` branch de cada repo)

## Conteúdo

| Sub-lib | Pasta | Arquivos `.md` | Conteúdo |
|---|---|---|---|
| **Router** | `router/` | 163 | Type-safe routing, file-based routes, route loaders, search params, navigation, ESLint plugin, integrações. **Sem TanStack Start** (fora de escopo — viola R1 do ADR-024). |
| **Query** | `query/` | 93 | Server state management, queries, mutations, cache, infinite queries, suspense, devtools. **Apenas variant React** + reference + ESLint (sem Angular/Vue/Solid/Svelte/Preact/Lit). |
| **Table** | `table/` | 767 | Headless tables, sorting, filtering, pagination, virtualization, column pinning, row selection. **Apenas variant React** + guide + reference (sem outros frameworks). 666 dos 767 arquivos são API reference auto-gerado (TypeDoc, 1 arquivo por função/type — útil para LLM/IA buscar assinatura específica). |

## Por que está aqui

Suporte ao **ADR-024 (Web App Stack)** — TanStack Router/Query/Table são as 3 libs de TanStack adotadas formalmente. **NÃO inclui TanStack Start** (rejeitado por R1: sem BFF-do-BFF) **nem TanStack Form** (rejeitado por ADR-024 §Alternativa: React Hook Form preferido).

Cobre as decisões: roteamento client-side type-safe (Router), data fetching contra o BFF Shelf via OpenAPI codegen (Query), tabelas densas como Pacientes/Coordenação (Table).

## Estrutura espelhada do GitHub

```
tanstack/
├── README.md          (este arquivo)
├── llms.txt           (índice agregado de TODAS as libs do TanStack, raiz oficial)
│
├── router/            (de TanStack/router @ main / docs/router/)
│   ├── guide/         (conceitos, mental model)
│   ├── routing/       (file-based, code-based, route trees)
│   ├── installation/  (setup com Vite, frameworks)
│   ├── how-to/        (recipes — auth, layouts, code splitting)
│   ├── integrations/  (Query, devtools, etc)
│   ├── api/           (API reference)
│   └── eslint/        (plugin lints)
│
├── query/             (de TanStack/query @ main / docs/)
│   ├── react/         (framework=react — useQuery, useMutation, hooks)
│   ├── reference/     (API reference framework-agnostic)
│   └── eslint/        (plugin lints)
│
└── table/             (de TanStack/table @ main / docs/)
    ├── react/         (framework=react — useReactTable, ColumnDef)
    ├── guide/         (mental model, headless approach)
    └── reference/     (API reference — 666 arquivos auto-gen por função/type)
```

## Como atualizar

```bash
cd handbook/references/tanstack

# Re-pull índice agregado
curl -fsSL https://tanstack.com/llms.txt -o llms.txt

# Re-pull Router (apenas docs/router/, sem docs/start/)
rm -rf /tmp/tr && git clone --depth 1 --filter=blob:none --sparse https://github.com/TanStack/router.git /tmp/tr
(cd /tmp/tr && git sparse-checkout set docs)
rm -rf router && mkdir router && cp -r /tmp/tr/docs/router/. router/ && rm -rf router/assets
rm -rf /tmp/tr

# Re-pull Query (apenas react + reference + eslint)
rm -rf /tmp/tq && git clone --depth 1 --filter=blob:none --sparse https://github.com/TanStack/query.git /tmp/tq
(cd /tmp/tq && git sparse-checkout set docs)
rm -rf query && mkdir query && \
  cp -r /tmp/tq/docs/framework/react query/ && \
  cp -r /tmp/tq/docs/reference query/ && \
  cp -r /tmp/tq/docs/eslint query/ && \
  find /tmp/tq/docs -maxdepth 1 -name "*.md" -exec cp {} query/ \;
rm -rf /tmp/tq

# Re-pull Table (apenas react + guide + reference)
rm -rf /tmp/tt && git clone --depth 1 --filter=blob:none --sparse https://github.com/TanStack/table.git /tmp/tt
(cd /tmp/tt && git sparse-checkout set docs)
rm -rf table && mkdir table && \
  cp -r /tmp/tt/docs/framework/react table/ && \
  cp -r /tmp/tt/docs/guide table/ && \
  cp -r /tmp/tt/docs/reference table/ && \
  find /tmp/tt/docs -maxdepth 1 -name "*.md" -exec cp {} table/ \;
rm -rf /tmp/tt
```

Commit: `docs(handbook): refresh TanStack docs snapshot (router/query/table, YYYY-MM-DD)`.

## Limitações conhecidas

- TanStack **não tem llms.txt por sub-lib** (issue [#398](https://github.com/TanStack/tanstack.com/issues/398) reconhece o gap). Por isso o pull é via git sparse-checkout do repo de cada lib.
- `tanstack.com/<lib>/latest/docs/.../page.md` retorna `200` com payload `{"isNotFound":true}` — SPA fallback enganoso. **Não usar** essa rota; usar **sempre** o GitHub raw.
- Variantes de framework (Angular, Vue, Svelte, Solid, Preact, Lit, Vanilla) **não foram copiadas** intencionalmente. Se algum dia precisar, adicionar no script de atualização.

## O que NÃO está aqui

| Lib TanStack | Por quê não |
|---|---|
| **Start** | Viola R1 (sem BFF-do-BFF) — ADR-024. |
| **Form** | ADR-024 escolheu React Hook Form. |
| **DB / Store** | Não usamos — estado client é local (`useState`/`useReducer`) ou TanStack Query (cache de fetch). |
| **AI / Hotkeys / Virtual / Pacer / CLI / Intent / Devtools / Config** | Fora de escopo Phase 6 inicial. Adicionar caso a caso. |
