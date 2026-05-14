# ADR 0005: Monorepo com Bun Workspaces

- **Status:** accepted
- **Data:** 2026-05-13
- **Decisores:** core

## Contexto

O projeto tem múltiplas peças que precisam compartilhar tipos e contratos:
- `apps/api` — backend (Hono).
- `apps/web` — frontend (Vanilla TS).
- `packages/domain` — lógica pura do jogo (Result types, Branded IDs, scoring, fuzzy match).
- `packages/schema` — contratos Zod compartilhados (validação de payloads WS/REST).

Precisamos:
- **Type-safety ponta-a-ponta** sem publicar pacotes internos no npm.
- **Build/test/dev orquestrável** com um comando.
- **Sem `node_modules` versionado** (decisão "Zero node_modules" da stack atual).

## Decisão

Adotar **Bun Workspaces** com a estrutura:

```
merma-a-musica/
├── package.json          (private, workspaces: ["apps/*", "packages/*"])
├── tsconfig.json         (config base; apps/packages estendem)
├── apps/
│   ├── api/              (Hono + Bun)
│   └── web/              (Vanilla TS + Tailwind)
└── packages/
    ├── domain/           (lógica pura — depende SÓ de schema)
    └── schema/           (Zod contracts — zero dependências runtime)
```

**Regras de dependência interna** (validadas no review):

```
domain ──────► schema
   ▲              ▲
   │              │
   api ───────────┘
   ▲
   │
   web (não importa domain direto — só via api ou schema)
```

- `web` **não importa `@merma/domain`** — UI não tem lógica de jogo; tudo vem do backend.
- `domain` é "internal first" — sem dependências externas além de `schema`.
- Comandos comuns: `bun --filter "*" dev`, `bun --filter "*" build`, `bun test`.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Repos separados (polyrepo)** | Sincronização de contratos via npm publish é fricção alta. Para um projeto pequeno-médio sem times separados, monorepo ganha. |
| **pnpm workspaces** | Maduro, mas exige instalar pnpm além de Bun; redundância. Bun workspaces é nativo. |
| **Nx / Turborepo** | Útil para monorepo grandes com cache de build distribuído; overkill para o escopo do MVP. Reconsiderar se número de pacotes >10. |
| **Sem workspace, tudo em `src/`** | Funcionaria pra MVP minúsculo, mas não separa concerns nem permite test/build por pacote. |

## Consequências

- **Positivas:**
  - Tipos cruzam fronteiras sem npm publish (`import { MatchConfiguration } from "@merma/schema"`).
  - `bun --filter` permite operações cross-workspace eficientes.
  - Estrutura clara espelha os bounded contexts (ver [`02-bounded-contexts.md`](../02-bounded-contexts.md) — a criar na F4).
  - Sem `node_modules` versionado: cache global Bun resolve dependências on-the-fly.
- **Negativas / trade-offs:**
  - Refatorar um pacote afeta todos os que dependem dele — disciplina de versionamento interno necessária.
  - Bun workspaces ainda têm arestas (ex: peer deps menos polidos que pnpm). Documentação offline em `handbook/references/bun/docs/pm/workspaces.md`.
- **Neutras:**
  - CI precisa rodar `bun install` na raiz para resolver todos os workspaces de uma vez.

## Notas

- `apps/` e `packages/` estão vazios no momento desta decisão — a estrutura será criada conforme a implementação avança.
- Naming pattern: `@merma/<nome>` para pacotes internos (definido no `package.json` de cada um, mesmo sem publicar).
