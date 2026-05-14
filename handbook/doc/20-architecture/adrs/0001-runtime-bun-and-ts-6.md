# ADR 0001: Runtime Bun + TypeScript 6.0 strict

- **Status:** accepted
- **Data:** 2026-05-13
- **Decisores:** core

## Contexto

O projeto Mermã passou por iterações arquiteturais anteriores (Elixir/BEAM/Phoenix; Gleam para o domínio). A complexidade operacional dessas stacks — múltiplas linguagens, BEAM como dependência de produção, tooling fragmentado — não se justificava para o escopo de um quiz multiplayer com requisitos de latência razoáveis mas não extremos. Precisamos de:

- Um único runtime que cubra: HTTP server, WebSocket server, test runner, bundler, package manager.
- Suporte nativo e moderno a TypeScript, sem etapa de transpile manual.
- Inicialização rápida (importante para hot-reload em dev e cold-starts em deploy).
- Comunidade saudável, mas sem o peso de evergreen de Node.

## Decisão

Adotar **Bun 1.x como runtime único** do projeto, com **TypeScript 6.0 em modo strict máximo** (todas as flags `strict*`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`).

Configuração de referência: `package.json` raiz declara TypeScript ^6.0.0; `tsconfig.json` herda do raiz e usa `module: ESNext`, `moduleResolution: bundler`, `allowImportingTsExtensions: true`. Sem `node_modules` versionados — Bun resolve dependências via auto-install + cache global (`~/.bun/install/cache`).

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Node.js + tsx/ts-node** | Tooling fragmentado (Node + tsc + esbuild + jest + npm), cold-start mais lento, ecossistema ESM vs CJS ainda complicado. |
| **Deno** | Boa proposta técnica, mas o ecossistema npm é tratado como cidadão de segunda classe — ferramentas musicais (libs de audio streaming) frequentemente não são publicadas em JSR. |
| **Elixir/BEAM + Phoenix (stack anterior)** | Excelente para concorrência pesada, mas overkill para a escala do MVP; força bilinguismo (Elixir + JS no frontend); curva de contratação alta. |
| **Gleam para o domínio** | Tipos fortes interessantes, mas tooling imaturo, ecossistema mínimo, e a interop com a stack web exigia infraestrutura que não compensava. |

## Consequências

- **Positivas:**
  - Um único runtime para tudo (dev, test, build, run) reduz overhead mental e de CI.
  - TS 6.0 strict elimina classes inteiras de bugs em tempo de compilação (null/undefined, index access, missing fields).
  - `bun test` é compatível com a API do Jest — migração futura é trivial caso necessário.
  - Cold-start sub-segundo facilita deploy serverless ou pequenos workers.
- **Negativas / trade-offs:**
  - Bun ainda é mais novo que Node — algumas libs nicho podem ter incompatibilidades. Mitigação: documentamos as libs validadas em `handbook/references/bun/`.
  - TS 6.0 com flags máximas exige disciplina extra do dev (tipos branded, `Result<T, E>`); pode atritar com onboarding.
  - `noUncheckedIndexedAccess` força checagens em arrays/objetos indexados; código mais verboso em alguns pontos.
- **Neutras:**
  - Lockfile binário (`bun.lockb`) precisa de configuração git para diff legível (já documentado em `handbook/references/bun/docs/guides/install/git-diff-bun-lockfile.md`).

## Notas

- Decisão consolidada após o pivot documentado em `handbook/doc/archive/implementation_plan_v0_pivot.md` (arquivado).
- O `package.json` raiz já reflete essa decisão (script `bun --filter "*" dev`, devDep `typescript: ^6.0.0`).
- Snapshot offline da doc do Bun em `handbook/references/bun/llms-full.md` para consulta sem rede.
