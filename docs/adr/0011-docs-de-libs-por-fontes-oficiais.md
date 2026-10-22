---
id: ADR-0011
title: Doc de libs consultada ao vivo pelas fontes oficiais para IA, sem snapshot no repo
status: accepted
date: 2026-10-21
scope: ["docs/**", "CLAUDE.md", ".mcp.json", ".claude/**"]
revisit_when: "Uma tecnologia da stack lançar ou retirar MCP, CLI ou llms.txt oficial (reaferir a tabela a cada trimestre)"
---

# ADR-0011 — Doc de libs consultada ao vivo pelas fontes oficiais para IA, sem snapshot no repo

## Contexto

Em 2026-05 o repo ganhou `handbook/references/` (15 MB, 1.834 arquivos): snapshots das docs de Bun, Solid, Zod, React, TanStack e TypeScript. Snapshot envelhece em silêncio: o agente lê a doc velha com a mesma confiança que leria a atual. Ele também exigia scripts de manutenção e incluía pacotes fora da stack. Enquanto isso, as tecnologias passaram a publicar canais oficiais para agentes.

## Decisão

A documentação de terceiros é consultada **ao vivo, na fonte oficial**, nesta ordem: **MCP oficial → CLI oficial para agentes → skill/plugin oficial → `llms.txt` → doc HTML**. Para código do próprio repo, o LSP vem antes de qualquer doc. A tabela por tecnologia fica no `CLAUDE.md` (aferida em 2026-10-21).

## Restrições

- **ADR-0011.R1** MUST NOT versionar snapshot de doc de terceiros (`references/`, `llms-full*`, `*-api-reference.md`). — Check: `bun run docs:check`
- **ADR-0011.R2** MUST NOT adotar skill/plugin/MCP que não seja publicado pela própria org da tecnologia. — Check: Review: mantenedor (`.claude/settings.json`, `.mcp.json`)

## Consequências

- A doc consultada é sempre a da versão atual, e o repo perdeu 15 MB.
- Exige rede. Os canais para IA mudam rápido, por isso a tabela tem data e gatilho de revisão.
- Respostas **observadas** das APIs de streaming não são doc de lib: ficam em [`../apis/`](../apis/), com data. O `spotify_api_reference.md` (2.383 linhas, cópia da doc do Spotify) saiu em 2026-10-21 por violar a R1. O Spotify tem `developer.spotify.com/llms.txt`.

## Alternativas descartadas

- Regenerar os snapshots no CI: continua sendo cópia defasada entre um run e outro.
- Agregadores de terceiros (Context7 etc.): não são a fonte.
- Skills de comunidade: qualidade sem revisão do mantenedor da lib.

## Fontes

- Último commit com os snapshots: `c8a1b28`.
