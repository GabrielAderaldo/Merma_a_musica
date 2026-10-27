---
name: change-game-rule
description: Muda, adiciona ou remove uma regra do jogo (pontuação, rodada, solo, seleção de músicas etc.) na ordem certa — GDD, glossário, contratos, testes e só então o código. Use sempre que um pedido alterar o comportamento do jogo.
argument-hint: "<regra a mudar, ex.: R-202 ou 'tempo de revelação para 5s'>"
---
<!-- Skill: carregada só quando usada. https://code.claude.com/docs/pt/skills -->

# Mudar regra do jogo

Pedido: $ARGUMENTS

1. Ache a regra em `docs/gdd.md` (`grep -n "R-"`). Liste toda regra afetada, inclusive as que dependem dela (ex.: mudar R-302 afeta R-303 e I-C-2).
2. Se a mudança contradiz outra regra, um ADR ou `docs/security.md`, **pare e pergunte** ao mantenedor com `AskUserQuestion`: opções, tradeoffs, fontes.
3. Edite o `docs/gdd.md`: mude o texto da regra **mantendo o ID**, atualize as tabelas de casos e marque a decisão (`(decidido em AAAA-MM-DD)`). Regra nova recebe o próximo ID livre da seção. Regra removida vira `R-NNN (removida em AAAA-MM-DD)`.
4. Termo novo → `docs/glossary.md`.
5. Se o protocolo muda: schema em `packages/schema` (exemplo em `src/ws.test.ts` e `bun run schema:gen`). Rota REST: o corpo em `packages/schema/src/rest.ts`, a rota na `apps/api` e `bun run openapi:gen`.
6. Testes primeiro: atualize ou crie `test.each` citando o ID (`"R-NNN …"`) e veja falhar. Depois mude o código.
7. Rode `bun run docs:check`, `bun test` e `bun run lint`. Mostre a saída.
