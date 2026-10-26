---
id: ADR-0023
title: Dividir a apps/api em pastas de contexto, com a fronteira de Playlist Integration no lint
status: accepted
date: 2026-10-26
supersedes: null
scope: ["apps/api/**", ".oxlintrc.json", "scripts/docs-check.ts", "docs/architecture.md", "docs/specs/**"]
revisit_when: "Um contexto da apps/api virar pacote próprio, ou a apps/api ganhar um contexto fora das pastas daqui"
---

# ADR-0023 — Dividir a apps/api em pastas de contexto, com a fronteira de Playlist Integration no lint

## Contexto

Antes de a `apps/api` nascer, duas coisas travavam:
- O `docs:check` cobra uma restrição `pendente` quando o caminho dela existe ([ADR-0022](0022-link-de-adr-para-spec-vencido.md)). Na tabela `PENDING_SCOPE`, umas 20 restrições apontavam para `apps/api`. Os specs `rest.md` e `audio.md` vencem quando o `apps/api/package.json` existir. Assim, o primeiro arquivo da API cobraria tudo de uma vez, e o hook `Stop` obrigaria a API inteira a nascer num commit só.
- A [`architecture.md`](../architecture.md) dizia que o lint garante "Playlist Integration não importa Orchestrator nem Engine", mas não havia regra nenhuma. E o teste da ADR-0015.R2 exige que toda `message` de `no-restricted-imports` cite uma restrição.

O tradeoff: fixar pastas cedo cria uma estrutura que precisa ser respeitada, mas é o que permite cobrar cada restrição quando o módulo dela nasce.

## Decisão

A `apps/api/src` se divide por bounded context (`room`, `playlist` com o áudio em `playlist/audio`, `progression`) e por camadas transversais (`http`, `db`, `observability`). O `PENDING_SCOPE` e os `until:` dos specs apontam para essas pastas. A fronteira de Playlist Integration entra num `no-restricted-imports` por pasta.

## Restrições

- **ADR-0023.R1** MUST NOT importar `apps/api/src/room` nem `@merma/domain` de dentro de `apps/api/src/playlist`. — Check: `.oxlintrc.json` (`no-restricted-imports`) + `scripts/harness.test.ts`

## Consequências

- A API nasce módulo a módulo, com o `docs:check` passando a cada commit.
- As pastas viram contrato. Código de um contexto criado em outra pasta deixa a restrição pendente sem cobrança. A revisão pega isso, e o `revisit_when` reabre a decisão.
- A 0017.R8 e a 0018.R6 dizem `pendente (apps/api)` no próprio texto. Por isso o primeiro commit da API já traz o teste de SIGTERM com snapshot e o de `close()` com código.

## Alternativas descartadas

- Big-bang (API inteira antes de criar a pasta): não teria commits intermediários com o hook `Stop` passando.
- Pastas só no `PENDING_SCOPE`, sem lint nem doc: pasta com outro nome deixa a restrição pendente para sempre, sem aviso.

## Fontes

- `scripts/docs-check.ts` (seção 8, `PENDING_SCOPE`) e [ADR-0022](0022-link-de-adr-para-spec-vencido.md)
- oxlint `no-restricted-imports`, opção `regex`: https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-imports (aferido em 2026-10-26)
