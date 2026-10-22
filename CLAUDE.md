<!--
Carregado em TODA sessão do Claude Code. Teto: 100 linhas (bun run docs:check verifica).
Cada linha precisa evitar um erro concreto; o que vale só para uma área vai para .claude/rules/.
Mecanismo: https://code.claude.com/docs/pt/memory · Por que este formato: docs/adr/0012-documentacao-executavel-para-agentes.md
-->
# Mermã, a Música!

Quiz musical multiplayer no browser; o pool de músicas sai das playlists dos jogadores.
**Doc-first:** `apps/` e `packages/` ainda não existem. O código nasce de `docs/`.
Equipe: 1 mantenedor + IA. O que não está nos docs se pergunta ao mantenedor, com as opções e os tradeoffs.

## Comandos

- `bun install` · `bun test [caminho]` (já roda com `--check`) · `bun run typecheck` · `bun run lint` (oxlint) · `bun run docs:check`
- Bun ≥ 1.4.3. Os tipos são TypeScript 7, checados pelo `bun check`; não use `tsc`. Depois de `bun upgrade`, alinhe o devDep `typescript` com `bun -p process.versions.typescript` (ADR-0016).
- Só `bun`/`bunx`. Nunca npm, pnpm ou yarn (um hook bloqueia).
- Postgres 17 e Redis 8 de dev vêm da `~/.infra` (`infra up postgres redis`). Nada de docker-compose no projeto.
- Antes de dar uma tarefa por concluída: `bun run docs:check`, `bun run typecheck` e, quando houver código, `bun test` e `bun run lint`.

## Onde está a verdade (em conflito, vence o de cima)

1. `docs/gdd.md`: regras do jogo, com IDs `R-NNN` que os testes citam
2. `docs/adr/`: decisões; toda restrição `MUST` diz qual `Check:` a garante
3. `docs/architecture.md` · `docs/security.md` · `docs/privacy.md` · `docs/operations.md`
4. `docs/specs/`: rascunhos pré-código que **expiram** quando o pacote do `until:` nasce
5. Código: quando existir, testes e tipos são a fonte do "como"

- Mudar regra do jogo → skill `/change-game-rule`. Mudar decisão → skill `/new-adr`.
- ADR `accepted` não se edita (um hook bloqueia). Muda-se com ADR novo que faz supersede.
- Termo novo do domínio entra em `docs/glossary.md` antes de entrar no código.
- Contradição entre docs: **não escolha sozinho.** Pergunte ao mantenedor, com as opções, os tradeoffs e as fontes.

## Invariantes globais

- O servidor é a autoridade: fuzzy match, pontuação e timer só nele. O cliente só sabe se acertou em `round_ended`.
- A identidade é o `player_uuid` que o servidor emite no cookie `__Host-session` (ADR-0013). Nunca aceitar `player_uuid` vindo de query, header ou body.
- Contratos WS/REST nascem em Zod (`packages/schema`). OpenAPI, AsyncAPI e JSON Schema são gerados, nunca escritos à mão (ADR-0014).
- `answer_text`, tokens OAuth, cookies e `nickname` nunca vão para log, métrica ou Sentry.
- Regras de cada área (`packages/domain`, `apps/api`, `apps/web`, `docs/`) carregam sozinhas de `.claude/rules/` quando você abre arquivos dela.

## Linguagem e commits

- Narrativa em pt-BR; identificadores em inglês (`Room`, `submit_answer`); enums em minúsculo.
- Commit `<tipo>(<escopo>): <descrição>` em pt-BR. Tipos: feat, fix, docs, refactor, test, chore. Escopos: docs, schema, domain, api, web, harness.

## Docs de terceiros (ADR-0011)

Nunca responda de memória sobre API de lib. Ordem: MCP oficial → CLI oficial → skill/plugin oficial → `llms.txt` → HTML.

| Tecnologia | Onde consultar (aferido em 2026-10-21) |
|---|---|
| Bun | MCP `bun-docs` |
| Hono | plugin `hono@hono` · `bunx @hono/cli docs <path>` / `search` / `request` |
| Solid · Drizzle · Zod · oxlint | `llms.txt` de docs.solidjs.com · orm.drizzle.team · zod.dev · oxc.rs |
| Redis | plugin `redis-development` |
| Sentry | `docs.sentry.io/llms.txt` (plugin e MCP quando o projeto Sentry existir) |
| Caddy · segurança/anti-cheat · DDD/TDD | MCPs `reverse-proxy` · `security` · `acdg-skills` (VPS, só pela tailnet: se falharem, cheque o Tailscale) |
| Spotify | `developer.spotify.com/llms.txt` |

- Código: LSP (`tsgo-lsp`) antes de grep. Frontend: depurar com Claude in Chrome (console, rede, DOM).
- Skill, plugin ou MCP só entra se for publicado pela org da própria tecnologia.

## Stack antiga

Gleam, Elixir, Phoenix, SvelteKit, ETS e GenServer são proibidos em código novo. O `docs:check` acusa se aparecerem nos docs.
