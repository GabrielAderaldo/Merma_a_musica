---
id: ADR-0022
title: Documentação verificável, com link de ADR para spec vencido aceito como referência ao git
status: accepted
date: 2026-10-26
supersedes: ADR-0019
scope: ["CLAUDE.md", "docs/**", ".claude/**", "scripts/docs-check.ts"]
revisit_when: "O CLAUDE.md passar de 100 linhas; o agente ignorar regra que está nos docs; a lista de restrições pendentes parar de diminuir quando os pacotes nascerem"
---

# ADR-0022 — Documentação verificável, com link de ADR para spec vencido aceito como referência ao git

## Contexto

O [ADR-0019](0019-restricao-verificada-pela-citacao-do-id.md) se contradizia: a R4 manda apagar o spec pré-código quando o pacote do `until:` nasce, a R5 proíbe link relativo quebrado, e a R2 impede editar ADR aceito. Os ADRs 0012 e 0014 linkam `specs/protocol.md`, que é apagado quando nasce o `packages/schema`. Em 2026-10-26 o mantenedor decidiu abrir a exceção por ADR novo.

## Decisão

Fica tudo do ADR-0019 (o verificador cita o ID da restrição; `pendente (<caminho>)` vira erro quando o caminho existe; ADR aceito comparado com o git a partir de `f3d58ea`), com uma mudança: **um link de ADR para um arquivo de `docs/specs/` que não existe mais é válido.** O spec vencido continua no git, e o link vira referência histórica. Fora de `docs/adr/`, link quebrado continua sendo erro.

## Restrições

- **ADR-0022.R1** MUST manter o `CLAUDE.md` raiz com menos de 100 linhas. — Check: `bun run docs:check`
- **ADR-0022.R2** MUST NOT editar o corpo de um ADR `accepted` ou `superseded`; no frontmatter só `status`, `superseded_by` e `revised` mudam. — Check: hook `.claude/hooks/guard-accepted-adr.ts` + `bun run docs:check` (contra o git)
- **ADR-0022.R3** MUST ter, em toda restrição de ADR, um `Check:` ou um `Review:`. — Check: `bun run docs:check`
- **ADR-0022.R4** MUST NOT manter um spec pré-código depois que o arquivo do seu `until:` existir. — Check: `bun run docs:check`
- **ADR-0022.R5** MUST NOT ter link relativo quebrado nem `R-NNN` inexistente em `docs/`, `CLAUDE.md` e `.claude/`, exceto link de ADR para spec vencido de `docs/specs/`. — Check: `bun run docs:check`
- **ADR-0022.R6** MUST NOT o agente marcar um ADR como `accepted` sem decisão explícita do mantenedor na conversa. — Check: Review: mantenedor
- **ADR-0022.R7** MUST ter, para toda restrição com `Check:` que não diz `pendente`, um verificador que cite o ID. — Check: `bun run docs:check`
- **ADR-0022.R8** MUST ter, para toda restrição `pendente`, o caminho onde o verificador nasce; existindo o caminho, o ID MUST estar citado. — Check: `bun run docs:check`
- **ADR-0022.R9** MUST NOT citar fora de `docs/` um ID de restrição inexistente ou de ADR `superseded` ou `deprecated`. — Check: `bun run docs:check`

## Consequências

- Apagar um spec vencido não exige mexer em ADR nenhum.
- Quem segue o link de um ADR antigo cai em arquivo inexistente e precisa do `git log -- docs/specs/<arquivo>`.

## Alternativas descartadas

- Aceitar o link só no `docs:check`, sem ADR: o código divergiria do texto do ADR-0019.R5.
- Manter o spec até decidir: o pacote não poderia ter `package.json`.

## Fontes

- [ADR-0019](0019-restricao-verificada-pela-citacao-do-id.md) e [ADR-0012](0012-documentacao-executavel-para-agentes.md).
