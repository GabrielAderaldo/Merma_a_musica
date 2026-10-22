---
id: ADR-0018
title: Design no Penpot, operado por IA pelo MCP remoto oficial
status: proposed
date: 2026-10-21
supersedes: null
scope: ["docs/design/**", ".mcp.json"]
revisit_when: "O MCP do Penpot sair do beta, mudar de transporte/autenticação, ou o Penpot SaaS deixar de oferecê-lo no plano da conta"
---

# ADR-0018 — Design no Penpot, operado por IA pelo MCP remoto oficial

## Contexto

O design (tokens, componentes, 13 telas do [brief](../design/brief.md)) é feito pela IA, porque não há designer no projeto. O brief §12 pedia "tokens em Figma". O mantenedor escolheu o Penpot: é open-source como o projeto, e o Penpot publica um MCP oficial. Esse MCP deixa o agente ler e escrever o arquivo de design executando código da Plugin API dentro da aba aberta. O tradeoff central é entre o servidor remoto hospedado, que não exige processo local, e o local, que acessa disco.

## Decisão

A fonte de verdade do design é um arquivo no **Penpot SaaS** (`design.penpot.app`, 2.18.4 aferido em 2026-10-21). O agente o opera pelo **MCP remoto oficial**, `https://design.penpot.app/mcp/stream?userToken=${PENPOT_MCP_KEY}`, declarado no `.mcp.json`. A chave mora no cofre sops do caninha_games (bucket `penpot`, operado pelo `sbox`). Ela só entra no ambiente quando o Claude Code é aberto via `sbox run penpot -- claude`. O guia operacional está em [`docs/design/penpot.md`](../design/penpot.md).

## Restrições

- **ADR-0018.R1** MUST NOT versionar a chave do MCP: o `.mcp.json` só referencia `${PENPOT_MCP_KEY}`. — Check: `scripts/mcp-config.test.ts`
- **ADR-0018.R2** MUST usar o MCP publicado pela org `penpot` (remoto do SaaS ou `@penpot/mcp`), nunca um servidor de terceiros para Penpot. — Check: Review: mantenedor (`.mcp.json`)
- **ADR-0018.R3** MUST ler (`high_level_overview`, `export_shape`) antes de escrever, e descrever a mudança antes de aplicar alterações em lote no arquivo de design. — Check: Review: mantenedor

## Consequências

- O design fica num formato aberto, editável por humano no browser e por IA no MCP. Contribuidores do projeto AGPL não precisam de licença paga.
- O MCP do Penpot está em **beta**. Ele depende de uma aba do Penpot aberta, ativa e conectada (**MCP → Connect**). Se o Chrome congelar a aba, as chamadas falham.
- No remoto não há `import_image` de arquivo local nem export para disco. Asset local (logo SVG, por exemplo) entra pela UI ou pelo MCP local quando precisar.
- O `.mcp.json` com `${PENPOT_MCP_KEY}` não definido só gera aviso no `/mcp`. Os outros MCPs seguem funcionando.

## Alternativas descartadas

- Figma (brief §12): ferramenta proprietária, e contribuidor externo precisaria de conta e plano.
- MCP local `@penpot/mcp`: exige processo e plugin locais, e o README só documenta `npx` (o projeto proíbe npm). Fica como recurso pontual para importar ou exportar arquivos.
- Operar o Penpot só pelo Claude in Chrome (cliques): é frágil e lento, e o MCP expõe a Plugin API inteira.

## Fontes

- Guia oficial: `docs/mcp/index.md` do repo `penpot/penpot` (branch `develop`), espelhado em help.penpot.app/mcp.
- Servidor: `mcp/packages/server/src/PenpotMcpServer.ts` lê a chave só de `req.query.userToken`. Não há header de autenticação.
- Expansão de `${VAR}` em `url` do `.mcp.json`: https://code.claude.com/docs/en/mcp
