# Mermã, a Música!

> Quiz musical multiplayer online onde você prova que conhece mais música que seus amigos — **usando as playlists deles**.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)

Cada partida tem um pool **único**, formado pelas playlists dos jogadores presentes. A cada rodada todo mundo ouve um trecho e tenta acertar **a música**, **o artista** ou **qualquer um dos dois** (esse é o modo fácil, sério).

- Playlists de **Spotify**, **Deezer** ou **YouTube Music**
- De 1 (modo solo, com recordes pessoais) a 20 jogadores por sala
- Rodadas de 10 a 60s; partidas de 5 a 15 min
- No browser, sem app e sem cadastro obrigatório
- Open-source e gratuito

## Status

**Doc-first: ainda não há código.** As regras e as decisões estão em [`docs/`](docs/); o código vai nascer delas, nesta ordem: `packages/schema` → `packages/domain` → `apps/api` → `apps/web`.

## Documentação

| Para entender | Leia |
|---|---|
| Por que o jogo existe | [`docs/product.md`](docs/product.md) |
| As regras do jogo (fonte da verdade) | [`docs/gdd.md`](docs/gdd.md) |
| Os termos | [`docs/glossary.md`](docs/glossary.md) |
| Como o sistema se organiza | [`docs/architecture.md`](docs/architecture.md) |
| Por que escolhemos X | [`docs/adr/`](docs/adr/) |
| Segurança e anti-cheat · LGPD · metas de operação | [`docs/security.md`](docs/security.md) · [`docs/privacy.md`](docs/privacy.md) · [`docs/operations.md`](docs/operations.md) |
| Design das telas | [`docs/design/brief.md`](docs/design/brief.md) |

Os docs são curtos de propósito, e `bun run docs:check` acusa quando algum deles envelhece ([ADR-0022](docs/adr/0022-link-de-adr-para-spec-vencido.md)).

## Stack

Bun 1.4.4 · TypeScript 7 strict (checado pelo `bun check`) · Hono · SolidJS + Vite · Zod · PostgreSQL 17 + Drizzle · Redis 8 · Caddy · Deezer como motor de áudio · oxlint. Cada escolha tem o seu ADR em [`docs/adr/`](docs/adr/).

## Rodando localmente

Pré-requisitos: [Bun](https://bun.com) 1.4.4 e Postgres 17 + Redis 8 locais.

```bash
bun install
cp .env.example .env      # preencher
bun run docs:check        # hoje, é o único "teste" do repo
```

Quando os pacotes existirem: `bun --filter "*" dev`, `bun test` (já checa os tipos), `bun run typecheck` e `bun run lint`.

## Contribuindo

1. Regra de jogo muda primeiro no [GDD](docs/gdd.md), depois no código.
2. Decisão de arquitetura nova vira um ADR em [`docs/adr/`](docs/adr/) antes de ser implementada.
3. Commits: `<tipo>(<escopo>): <descrição>` em pt-BR.
4. Vulnerabilidade: **não** abra issue pública; veja [`docs/security.md`](docs/security.md#divulgação-de-vulnerabilidade).

## Licença

[AGPL-3.0](LICENSE).
