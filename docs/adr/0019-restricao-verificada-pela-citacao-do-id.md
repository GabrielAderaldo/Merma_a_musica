---
id: ADR-0019
title: Documentação verificável, com cada restrição de ADR citada pelo seu verificador
status: accepted
date: 2026-10-26
supersedes: ADR-0012
scope: ["CLAUDE.md", "docs/**", ".claude/**", "scripts/docs-check.ts"]
revisit_when: "O CLAUDE.md passar de 100 linhas; o agente ignorar regra que está nos docs; a lista de restrições pendentes parar de diminuir quando os pacotes nascerem"
---

# ADR-0019 — Documentação verificável, com cada restrição de ADR citada pelo seu verificador

## Contexto

O [ADR-0012](0012-documentacao-executavel-para-agentes.md) trocou o handbook por docs curtos e verificáveis; o histórico e as contradições resolvidas ficam lá. Ele tinha um defeito: o estado do verificador (`Check: pendente`) morava no **corpo** do ADR, que é imutável. Em 2026-10-26, 29 das 58 restrições ativas estavam `pendente` e nenhuma poderia virar "verificada" sem editar um ADR `accepted`; a ADR-0008.R3 já estava desatualizada (o lint existia, o texto dizia `pendente`). A imutabilidade também só valia para Edit/Write do agente: um `sed -i` passava, e o CI não percebia.

## Decisão

Fica tudo do ADR-0012 (`CLAUDE.md` curto, rules por caminho, skills, hooks, `docs:check`, GDD com `R-NNN`, specs com `until:`), com duas mudanças:

1. **A ligação vai do verificador para a restrição.** O teste, hook, script ou config que verifica uma restrição **cita o ID dela** (`ADR-NNNN.Rn`): no nome do teste, num comentário ou na `message` do lint. O `Check:` do ADR diz *o que* verifica, nunca *se* já existe. Uma restrição está verificada quando algum arquivo fora de `docs/` e de `*.md` cita o ID.
2. **Pendente tem prazo.** Restrição sem verificador declara onde ele vai nascer: `Check: pendente (<caminho>) — <o que vai verificar>`. Quando o caminho existir, o `docs:check` falha até alguém citar o ID. Para os ADRs aceitos antes deste, o caminho fica na tabela `PENDING_SCOPE` do `scripts/docs-check.ts`.

O `docs:check` também passa a comparar o corpo de cada ADR `accepted` ou `superseded` com o do primeiro commit em que ele foi aceito (a partir de `f3d58ea`, quando a imutabilidade passou a valer). Por isso o CI faz checkout com o histórico completo.

## Restrições

- **ADR-0019.R1** MUST manter o `CLAUDE.md` raiz com menos de 100 linhas. — Check: `bun run docs:check`
- **ADR-0019.R2** MUST NOT editar o corpo de um ADR `accepted` ou `superseded`; no frontmatter só `status`, `superseded_by` e `revised` mudam. — Check: hook `.claude/hooks/guard-accepted-adr.ts` + `bun run docs:check` (contra o git)
- **ADR-0019.R3** MUST ter, em toda restrição de ADR, um `Check:` ou um `Review:`. — Check: `bun run docs:check`
- **ADR-0019.R4** MUST NOT manter um spec pré-código depois que o arquivo do seu `until:` existir. — Check: `bun run docs:check`
- **ADR-0019.R5** MUST NOT ter link relativo quebrado nem `R-NNN` inexistente em `docs/`, `CLAUDE.md` e `.claude/`. — Check: `bun run docs:check`
- **ADR-0019.R6** MUST NOT o agente marcar um ADR como `accepted` sem decisão explícita do mantenedor na conversa. — Check: Review: mantenedor
- **ADR-0019.R7** MUST ter, para toda restrição com `Check:` que não diz `pendente`, um verificador que cite o ID. — Check: `bun run docs:check`
- **ADR-0019.R8** MUST ter, para toda restrição `pendente`, o caminho onde o verificador nasce; existindo o caminho, o ID MUST estar citado. — Check: `bun run docs:check`
- **ADR-0019.R9** MUST NOT citar fora de `docs/` um ID de restrição inexistente ou de ADR `superseded`. — Check: `bun run docs:check`

## Consequências

- O ADR nunca precisa mudar quando o teste nasce, e o "pendente" vira erro sozinho quando o pacote aparece, como já acontecia com os specs.
- O `docs:check` mostra quantas restrições estão verificadas, pendentes e só por revisão.
- Ao substituir um ADR, as citações das restrições antigas quebram o `docs:check` até serem trocadas: é o lembrete de atualizar os verificadores.
- Citar o ID num comentário conta como verificação. Quem revisa precisa conferir que o arquivo de fato verifica.

## Alternativas descartadas

- Editar o `Check:` de ADR aceito quando o teste nasce: quebra a imutabilidade e reabre a porta para reescrever decisões.
- Registro separado de checks (`docs/adr/checks.md`): mais um doc para apodrecer; a citação no próprio verificador não apodrece.

## Fontes

- [ADR-0012](0012-documentacao-executavel-para-agentes.md) e as fontes dele.
- Hooks do Claude Code: https://code.claude.com/docs/pt/hooks-guide
