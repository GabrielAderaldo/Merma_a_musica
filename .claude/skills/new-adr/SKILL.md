---
name: new-adr
description: Registra uma decisão de arquitetura nova, ou substitui uma existente, como ADR em docs/adr/ no formato do projeto (restrições MUST com Check). Use quando uma tarefa exigir uma escolha que nenhum ADR cobre, ou quando for preciso mudar um ADR aceito.
argument-hint: "<título imperativo da decisão>"
---
<!-- Skill: carregada só quando usada. https://code.claude.com/docs/pt/skills · Formato: docs/adr/0012-documentacao-executavel-para-agentes.md -->

# Novo ADR

Decisão: $ARGUMENTS

1. **Precisa mesmo de ADR?** Só se for difícil de reverter, surpreendente sem contexto **e** fruto de um tradeoff real. Nome, formatação ou layout de arquivo vão para lint ou config, não para ADR.
2. Leia os ADRs de `docs/adr/` que tocam o assunto (`grep -l` pelo tema). Se este for substituir um deles, anote o ID.
3. **Pergunte ao mantenedor** com `AskUserQuestion`: 2 a 4 opções, com tradeoffs e uma fonte em cada (doc oficial, arquivo do repo). A recomendada vai primeiro. Você não decide sozinho.
4. Crie `docs/adr/NNNN-titulo-em-kebab.md` com o próximo número livre, a partir de [template.md](template.md).
   - `status: accepted` só se o mantenedor decidiu nesta conversa; senão, `proposed`.
   - Toda restrição em `## Restrições` é uma linha `- **ADR-NNNN.Rn** MUST … — Check: …`. O `Check:` diz qual teste, regra de lint ou hook verifica, e esse verificador **cita o ID** (`ADR-NNNN.Rn`) no nome do teste, num comentário ou na `message`. Se ele ainda não existe: `Check: pendente (<caminho onde nasce, ex.: apps/api>) — <o que vai verificar>`. Sem verificação possível, use `Check: Review: mantenedor`. ([ADR-0022](../../../docs/adr/0022-link-de-adr-para-spec-vencido.md))
   - As alternativas descartadas cabem em uma linha cada. Análise longa não entra.
5. Se substituir outro ADR: no **antigo**, mude só o frontmatter (`status: superseded`, `superseded_by: ADR-NNNN`), que o hook permite. No novo, ponha `supersedes: ADR-XXXX`.
6. Atualize os docs que citam a decisão antiga (`grep -rn "ADR-XXXX" docs CLAUDE.md .claude`).
7. Rode `bun run docs:check` e corrija o que ele apontar.
