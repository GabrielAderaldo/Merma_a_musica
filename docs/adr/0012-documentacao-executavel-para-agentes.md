---
id: ADR-0012
title: Documentação curta e verificável para agentes, no lugar do handbook
status: superseded
superseded_by: ADR-0019
date: 2026-10-21
scope: ["CLAUDE.md", "docs/**", ".claude/**", "scripts/docs-check.ts"]
revisit_when: "O CLAUDE.md passar de 100 linhas; o agente ignorar regra que está nos docs; mudar a forma como o Claude Code carrega instruções"
---

# ADR-0012 — Documentação curta e verificável para agentes, no lugar do handbook

## Contexto

O `handbook/` tinha ~15 mil linhas para zero linha de código, escritas quase todas em 2 dias de maio/2026. Em outubro ele já se contradizia em pelo menos 20 pontos (ex.: `audio_token` era HMAC em 4 docs e UUIDv4 em 2; havia 5 nomenclaturas para os estados da sala) e mandava que "a documentação ganha do código". O agente obedece doc velha com total confiança.

O que a pesquisa de 2026 mostra:

- Arquivo de contexto gerado por LLM **reduziu** a taxa de acerto em ~3%; o escrito à mão melhorou só ~4%; os dois encareceram a inferência em mais de 20%. Visão geral da arquitetura empurra o agente para exploração sem foco (Gloaguen et al., ETH Zürich/LogicStar, arXiv 2602.11988, fev/2026).
- 91% dos `AGENTS.md`/`CLAUDE.md` de 100 repositórios populares têm algum "smell": repetir regra do linter (62%), repetir o que o código já diz (42%), instrução fixa que deveria ser skill (35%) (dos Santos et al., jun/2026).
- A doc oficial do Claude Code: `CLAUDE.md` com menos de 200 linhas; cada linha deve evitar um erro; ele é *advisory* (orientação), então o que precisa valer sempre vai para hook; regras de uma área do código vão em `.claude/rules/` com `paths`; fluxos ocasionais vão em skills.

## Decisão

**Uma informação que pode mudar precisa ter um verificador. Se não tiver, ela vira código, vai para o git ou é apagada.**

| Peça | Papel | Mecanismo do Claude Code |
|---|---|---|
| `CLAUDE.md` (< 100 linhas) | Comandos, hierarquia, invariantes globais, ponteiros | [Memória / CLAUDE.md](https://code.claude.com/docs/pt/memory) |
| `.claude/rules/*.md` com `paths:` | Regras de uma área, carregadas só ao tocar nela | [Regras por caminho](https://code.claude.com/docs/pt/memory) · [Repos grandes](https://code.claude.com/docs/pt/large-codebases) |
| `.claude/skills/new-adr`, `change-game-rule` | Fluxos ocasionais, carregados sob demanda | [Skills](https://code.claude.com/docs/pt/skills) |
| `.claude/hooks/*.ts` + `.claude/settings.json` | O que tem de valer sempre: ADR aceito imutável, só `bun` | [Hooks](https://code.claude.com/docs/pt/hooks-guide) · [Settings](https://code.claude.com/docs/pt/settings) |
| `scripts/docs-check.ts` (`bun run docs:check`) | Detecta apodrecimento: link morto, ID de regra inexistente, ADR mal formado, spec pré-código vencido, termo de stack antiga, snapshot de doc | — |
| `docs/gdd.md` com IDs `R-NNN` | Regras do jogo; os testes citam o ID | — |
| `docs/adr/` (este formato) | Decisão + restrições `MUST` com `Check:` | — |
| `docs/specs/` com `until:` | Rascunho pré-código que **expira** quando o pacote nasce | — |
| `CLAUDE.md` dentro de cada pacote, quando ele existir | Contexto local, carregado sob demanda | [CLAUDE.md em subpastas](https://code.claude.com/docs/pt/memory) |
| git | Histórico e versões antigas (o `archive/` saiu) | — |

O que mudou de lugar:
- Saíram: `archive/`; C4; diagramas de sequência; runbook especulativo; Fase 1 detalhada; personas longas; os YAMLs AsyncAPI/OpenAPI escritos à mão; `spotify_api_reference.md`.
- Foram condensados: em `product.md`, `gdd.md`, `glossary.md`, `architecture.md`, `security.md`, `privacy.md`, `operations.md` e `specs/`.
- O `design/brief.md` (handoff para designer) foi mantido.
- Os ADRs 0001–0011 foram **reescritos neste formato** em 2026-10-21, preservando as decisões. Onde uma decisão mudou, o ADR diz "decidido em 2026-10-21".

### Contradições resolvidas pelo mantenedor em 2026-10-21

| # | Contradição | Decisão | Onde ficou |
|---|---|---|---|
| 1 | Identidade: UUID do browser na query × cookie só pós-OAuth × `X-Player-Uuid` no `<audio>` | Sessão anônima emitida pelo servidor | [ADR-0013](0013-identidade-por-sessao-anonima.md) |
| 2 | 5 nomenclaturas de estado | Máquinas hierárquicas, `reveal` só no Round, `phase` derivada | [`architecture.md`](../architecture.md) |
| 3 | Token single-use × revelação que reinicia × reconexão | Single-use + blob no cliente + reemissão ao reconectar | [ADR-0004](0004-audio-universal-via-deezer.md), R-131, S-12 |
| 4 | Cache ISRC em memória × Redis | Redis, TTL 24h | [ADR-0004](0004-audio-universal-via-deezer.md) |
| 5 | Músicas no solo: 1–5 × mockup com 10 | Range próprio: 5–50, default 10 | R-502 |
| 6 | Chave do recorde solo (3 versões, sem `total_songs`) | Média por música, chave `(player, playlist, answer_type, time_per_round)` | R-504 |
| 7 | Contratos: YAML escrito à mão × Zod | Zod-first, specs e JSON Schema gerados | [ADR-0014](0014-contratos-zod-first.md) |
| 8 | `bun build` + plugin (não funciona na CLI) | Vite + `vite-plugin-solid` | [ADR-0008](0008-frontend-solidjs-com-vite.md) |
| 9 | oxlint × ESLint | oxlint + plugin JS do Solid | [ADR-0015](0015-lint-com-oxlint.md) |
| 10 | Postgres 16/Redis 7 × `~/.infra` com 17/8 | Postgres 17 + Redis 8 | [ADR-0006](0006-postgres-e-drizzle.md), [ADR-0009](0009-snapshot-da-partida-em-redis.md) |
| 11 | Histórico com respostas × LGPD sem `answer_text` | Sem `answer_text` | [`privacy.md`](../privacy.md) |
| 12 | Artigos com ou sem `los`/`las` | Lista do GDD, sem `los`/`las` | R-111 |
| 13 | Enums `SONG` × `song` | Minúsculo em tudo | [`glossary.md`](../glossary.md) |
| 14 | Payload WS inválido: close × error | `error`; close só após 3 | S-24 |
| 15 | Códigos legados (`not_all_ready`, `already_answered`, `kicked`, `is_host_and_solo_mode`) | Removidos | [`specs/protocol.md`](../specs/protocol.md) |

Contradições que se resolveram sozinhas (texto apenas desatualizado): menções a "Vanilla TS" (vale o ADR-0008), "Próximo ADR é 0008" e a meta de latência repetida em dois docs (agora só em `operations.md`).

## Restrições

- **ADR-0012.R1** MUST manter o `CLAUDE.md` raiz com menos de 100 linhas. — Check: `bun run docs:check`
- **ADR-0012.R2** MUST NOT editar o corpo de um ADR `accepted`; só `status`, `superseded_by` e `revised` podem mudar. — Check: hook `.claude/hooks/guard-accepted-adr.ts`
- **ADR-0012.R3** MUST ter, em toda restrição de ADR, um `Check:` ou um `Review:`. — Check: `bun run docs:check`
- **ADR-0012.R4** MUST NOT manter um spec pré-código depois que o arquivo do seu `until:` existir. — Check: `bun run docs:check`
- **ADR-0012.R5** MUST NOT ter link relativo quebrado nem `R-NNN` inexistente em `docs/`, `CLAUDE.md` e `.claude/`. — Check: `bun run docs:check`
- **ADR-0012.R6** MUST NOT o agente marcar um ADR como `accepted` sem decisão explícita do mantenedor na conversa. — Check: Review: mantenedor

## Consequências

- Foi de ~15 mil para ~2 mil linhas. O que é carregado sempre é só o `CLAUDE.md`; o resto entra quando é relevante.
- Muitos `Check:` estão `pendente` até o código existir: são a lista de testes que nascem com cada pacote.
- O texto antigo continua no git (até o commit `6337149`).

## Alternativas descartadas

- Manter o handbook e corrigir as contradições: em 5 meses ele voltaria a divergir, sem nada que acusasse.
- `AGENTS.md` como arquivo principal: o projeto usa só Claude Code; o `CLAUDE.md` pode importar um `AGENTS.md` se outro agente entrar.
- Gerar o `CLAUDE.md` com `/init`: o estudo da ETH mostra perda de acerto com arquivo gerado.

## Fontes

- Visão geral do Claude Code: https://code.claude.com/docs/pt/overview
- Boas práticas: https://code.claude.com/docs/pt/best-practices
- Recursos e quando usar cada um: https://code.claude.com/docs/pt/features-overview
- Gloaguen et al., "Evaluating AGENTS.md", arXiv 2602.11988.
- Resumo dos três estudos de 2026: https://codex.danielvaughan.com/2026/07/27/do-auto-generated-agents-md-files-actually-help-codex-cli/
- ADR com restrições verificáveis: https://developertoolkit.ai/en/workflows/plan/architecture-decisions/
