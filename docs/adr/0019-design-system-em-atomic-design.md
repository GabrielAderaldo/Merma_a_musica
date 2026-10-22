---
id: ADR-0019
title: Design system em Atomic Design, com os níveis do Frost no Penpot
status: accepted
date: 2026-10-21
supersedes: null
scope: ["docs/design/**", ".claude/skills/design-pattern/**"]
revisit_when: "O apps/web nascer e a organização por nível começar a atrapalhar a reutilização, ou o Penpot ganhar um recurso nativo de documentação e linhagem de componentes"
---

# ADR-0019 — Design system em Atomic Design, com os níveis do Frost no Penpot

## Contexto

O design do projeto é feito pela IA no Penpot (ADR-0018), e não há designer para segurar a coerência entre 13 telas e cerca de 25 componentes. O brief §7 agrupava os componentes em Primitivos, Domain-specific e Layout. Essa divisão não diz o que compõe o quê, e "Domain-specific" misturava peças simples (VoteSkipButton) com seções inteiras (PersonalBestPanel). O mantenedor escolheu um método publicado e completo: o *Atomic Design* do Brad Frost. O tradeoff central é entre uma hierarquia explícita, que obriga a classificar cada peça, e a liberdade de organizar só por tela.

## Decisão

O design system segue o Atomic Design, com os nomes originais dos níveis: **atoms → molecules → organisms → templates → pages**, e os tokens por baixo de todos. O método, adaptado ao projeto, está em [`docs/design/atomic-design.md`](../design/atomic-design.md). A skill `/design-pattern` cria ou muda um pattern nessa ordem. No Penpot, o arquivo tem **uma página por nível**, na ordem Tokens, Atoms, Molecules, Organisms, Templates, Pages. A hierarquia vale no design. No código (`apps/web`), o componente tem o mesmo nome do pattern, mas as pastas não seguem os níveis.

## Restrições

- **ADR-0019.R1** MUST classificar todo pattern em um dos níveis e mantê-lo na página do Penpot desse nível. — Check: Review: mantenedor (a skill `/design-pattern` audita pelo MCP)
- **ADR-0019.R2** MUST compor só para baixo: atom não contém pattern, molecule só contém atoms, organism contém atoms, molecules ou organisms, e template e page só montam organisms. — Check: Review: mantenedor (auditoria de linhagem da skill `/design-pattern`)
- **ADR-0019.R3** MUST NOT nomear pattern pelo lugar onde ele aparece (`LobbyPlayerCard`, `HomeButton`). Nome de domínio é permitido quando a peça só existe no domínio (`SongRevealCard`). — Check: Review: mantenedor
- **ADR-0019.R4** MUST NOT criar pastas por nível (`atoms/`, `molecules/`, `organisms/`, `templates/`) em `apps/web`. — Check: `scripts/docs-check.ts` (regra 7)
- **ADR-0019.R5** MUST usar no código o mesmo nome do pattern no Penpot. — Check: pendente — comparação entre os componentes da biblioteca do Penpot e os de `apps/web` quando o pacote nascer

## Consequências

- Cada peça tem um lugar e uma ordem de construção. A linhagem (o que compõe o quê e onde é usado) sai de uma consulta pelo MCP, e mostra o que conferir de novo depois de uma mudança.
- Classificar custa discussão nos casos de fronteira (molecule ou organism?). O critério do doc decide, e em caso de dúvida fica o nível mais baixo.
- O brief §7 passa a se organizar por nível, e o `docs/design/penpot.md` troca "componentes numa página própria" por uma página por nível.
- O código fica livre para se organizar como o Solid pedir. O vínculo com o design é o nome.

## Alternativas descartadas

- Renomear os níveis em pt-BR (como a GE fez): perde o vínculo com a literatura, e o identificador viraria pt-BR, contra o CLAUDE.md.
- Manter as categorias do brief §7: elas não expressam composição, que é o motivo de adotar o método.
- Espelhar os níveis em pastas no `apps/web`: é difícil de reverter, e o Frost trata o método como independente da arquitetura de código.

## Fontes

- Brad Frost, *Atomic Design* (2016), https://atomicdesign.bradfrost.com/table-of-contents/, capítulos 1 a 5, lidos em 2026-10-21.
- `docs/design/brief.md` §7 e §15, e `docs/design/penpot.md` (convenções do arquivo).
- Plugin API do Penpot: `LibraryComponent` só tem `name`, `path` e `pluginData`, sem campo de descrição (consultado pelo `penpot_api_info` em 2026-10-21).
