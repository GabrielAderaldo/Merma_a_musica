---
id: ADR-0020
title: Doc de libs pelas fontes oficiais para IA, com exceção nominal para os MCPs do mantenedor
status: accepted
date: 2026-10-26
supersedes: ADR-0011
scope: ["docs/**", "CLAUDE.md", ".mcp.json", ".claude/**"]
revisit_when: "Uma tecnologia da stack lançar ou retirar MCP, CLI ou llms.txt oficial (reaferir a tabela a cada trimestre), ou um MCP do mantenedor sair da VPS"
---

# ADR-0020 — Doc de libs pelas fontes oficiais para IA, com exceção nominal para os MCPs do mantenedor

## Contexto

O [ADR-0011](0011-docs-de-libs-por-fontes-oficiais.md) decidiu consultar doc de terceiros ao vivo, na fonte oficial, e proibiu (R2) skill, plugin ou MCP que não fosse da própria org da tecnologia. Mas o `.mcp.json` sempre usou três servidores do mantenedor, na VPS dele, pela tailnet: `acdg-skills` (DDD/TDD), `security` (segurança e anti-cheat) e `reverse-proxy` (Caddy). O R2 e a prática se contradiziam. Em 2026-10-26 o mantenedor decidiu manter os três como exceção explícita.

## Decisão

- Continua a ordem do ADR-0011: **MCP oficial → CLI oficial → skill/plugin oficial → `llms.txt` → HTML**, sem snapshot no repo. A tabela por tecnologia fica no `CLAUDE.md`.
- **Exceção nominal:** os MCPs do próprio mantenedor `acdg-skills`, `security` e `reverse-proxy` são permitidos. Um servidor novo do mantenedor entra por ADR, não por edição do `.mcp.json`.
- A lista do que o projeto carrega (`.mcp.json` e `enabledPlugins` ligados no `.claude/settings.json`) é conferida por teste.

## Restrições

- **ADR-0020.R1** MUST NOT versionar snapshot de doc de terceiros (`references/`, `llms-full*`, `*-api-reference.md`). — Check: `bun run docs:check`
- **ADR-0020.R2** MUST NOT carregar no projeto skill, plugin ou MCP que não seja da org da tecnologia, exceto `acdg-skills`, `security` e `reverse-proxy` do mantenedor. — Check: `scripts/harness.test.ts` (lista permitida de `.mcp.json` e `enabledPlugins`)

## Consequências

- A contradição some, e um MCP novo de terceiro quebra o teste em vez de passar despercebido.
- Plugins e conectores do nível do usuário (`~/.claude`, claude.ai) ficam fora do alcance do repo. Os que poluem o contexto são desligados por projeto (`enabledPlugins: false`, `/mcp`).

## Alternativas descartadas

- Remover os MCPs do mantenedor: perde a consulta de segurança, DDD/TDD e Caddy, que não têm fonte oficial equivalente.
- Manter a contradição: o agente não sabe qual das duas regras seguir.

## Fontes

- [ADR-0011](0011-docs-de-libs-por-fontes-oficiais.md).
- Settings do Claude Code (`enabledPlugins`): https://code.claude.com/docs/en/settings-reference
