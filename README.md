# Mermã, a Música!

> Quiz musical multiplayer online onde você prova que conhece mais música que seus amigos — **usando as playlists deles**.

[![Status](https://img.shields.io/badge/status-MVP%20em%20constru%C3%A7%C3%A3o-yellow.svg)]() [![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)

---

## O que é

Cada partida tem um pool **único** formado pelas playlists dos jogadores presentes. Rodada a rodada, todo mundo ouve um trecho de música e tenta adivinhar **o nome da música**, **o artista**, ou **qualquer um dos dois** (modo fácil — não, sério: é o modo fácil).

- 🎧 Importe playlists de **Spotify**, **Deezer** ou **YouTube Music**.
- 👥 De 1 (modo solo com recordes pessoais) a 20 jogadores por sala.
- ⚡ Rodadas curtas (10–60s configuráveis). Sessão típica de 5–15 min.
- 🌐 Roda direto no browser. Sem app, sem cadastro obrigatório.
- 🆓 Open-source e completamente gratuito.

> Documentação canônica do projeto em [`handbook/doc/`](handbook/doc/). Entrada principal: [`handbook/doc/README.md`](handbook/doc/README.md).

---

## Status atual

**MVP em construção.** A arquitetura e a documentação foram consolidadas; o código está sendo escrito do zero seguindo os specs.

Roadmap visual (alto nível):

- [x] Documentação canônica completa (overview, produto, arquitetura, ADRs, specs, operações)
- [x] Estrutura do monorepo (Bun Workspaces)
- [ ] `packages/schema` — contratos Zod compartilhados
- [ ] `packages/domain` — engine pura (Result types, fuzzy match, scoring)
- [ ] `apps/api` — server Hono + Bun (WebSockets, REST, OAuth)
- [ ] `apps/web` — SPA Solid + Tailwind
- [ ] Deploy em VPS própria + Caddy
- [ ] Soft-launch com grupos de teste

Detalhes vivos em [`handbook/doc/10-product/01-vision.md#critérios-de-sucesso-do-mvp`](handbook/doc/10-product/01-vision.md#critérios-de-sucesso-do-mvp).

---

## Stack

| Camada | Tecnologia | ADR |
|---|---|---|
| Runtime | **Bun 1.x** | [0001](handbook/doc/20-architecture/adrs/0001-runtime-bun-and-ts-6.md) |
| Linguagem | **TypeScript 6.0 strict** | [0001](handbook/doc/20-architecture/adrs/0001-runtime-bun-and-ts-6.md) |
| Servidor HTTP/WS | **Hono** | [0002](handbook/doc/20-architecture/adrs/0002-server-hono.md) |
| Frontend | **SolidJS 1.x** (signals + JSX AOT) | [0008](handbook/doc/20-architecture/adrs/0008-frontend-solidjs.md) |
| Estilização | **Tailwind CSS** | [0003 (superseded)](handbook/doc/20-architecture/adrs/0003-no-framework-frontend.md) |
| Banco persistente | **PostgreSQL 16 + Drizzle** | [0006](handbook/doc/20-architecture/adrs/0006-postgres-drizzle.md) |
| Estado transiente | **Redis 7.x** (snapshot de partida ativa) | [0009](handbook/doc/20-architecture/adrs/0009-redis-snapshot.md) |
| Reverse proxy / TLS | **Caddy 2.x** (HTTPS automático) | — |
| Áudio engine | **Deezer** (ISRC-first) + fallback Spotify SDK | [0004](handbook/doc/20-architecture/adrs/0004-audio-deezer-as-engine.md) |
| Validação | **Zod** (schemas compartilhados) | — |
| Monorepo | **Bun Workspaces** | [0005](handbook/doc/20-architecture/adrs/0005-monorepo-bun-workspaces.md) |
| Observabilidade | stdout JSON + Sentry + `/metrics` Prometheus | [0010](handbook/doc/20-architecture/adrs/0010-observability-minimal.md) |
| Fuzzy match | **Levenshtein** in-house | [0007](handbook/doc/20-architecture/adrs/0007-fuzzy-match-levenshtein.md) |

---

## Estrutura do repositório

```
merma-a-musica/
├── apps/
│   ├── api/              # Hono + Bun (HTTP + WS + audio proxy + OAuth)
│   └── web/              # SolidJS SPA
├── packages/
│   ├── domain/           # @merma/domain — engine pura (TS, zero deps)
│   └── schema/           # @merma/schema — contratos Zod compartilhados
├── handbook/             # 📚 documentação canônica + referências
│   ├── doc/              # docs do projeto (entrada: doc/README.md)
│   └── references/       # snapshots offline (Bun, Solid, Zod, React, TS)
├── package.json          # workspaces raiz
├── tsconfig.json         # config base (TS 6 strict)
└── README.md             # você está aqui
```

---

## Documentação

A documentação está organizada em camadas, com hierarquia explícita de fonte-da-verdade. Comece pelo [índice mestre](handbook/doc/README.md).

| Pasta | Para quem | Cobre |
|---|---|---|
| [`handbook/doc/`](handbook/doc/) | Todos | Índice mestre, linguagem ubíqua |
| [`handbook/doc/10-product/`](handbook/doc/10-product/) | Produto, design, stakeholders | Visão, personas, **GDD canônico**, métricas |
| [`handbook/doc/20-architecture/`](handbook/doc/20-architecture/) | Engenheiros | C4, bounded contexts, state machines, sequence diagrams, deployment, **10 ADRs** |
| [`handbook/doc/30-specs/`](handbook/doc/30-specs/) | Implementadores | Engine completo, áudio + anti-cheat, frontend, **AsyncAPI WS**, **OpenAPI REST** |
| [`handbook/doc/40-operations/`](handbook/doc/40-operations/) | Operação | NFRs, LGPD, segurança consolidada, **runbook** |
| [`handbook/doc/archive/`](handbook/doc/archive/) | Histórico | Versões anteriores (Phoenix/Gleam/SvelteKit) |

### Atalhos úteis

- 🎮 Como o jogo funciona (regras completas): [GDD canônico](handbook/doc/10-product/03-gdd.md)
- 🏗️ Como o sistema é organizado: [C4 (Context + Container)](handbook/doc/20-architecture/01-c4-context-container.md)
- 🤔 Por que escolhemos X: [todas as decisões em ADRs](handbook/doc/20-architecture/adrs/)
- 🔌 Contratos cliente↔servidor: [WebSocket](handbook/doc/30-specs/04-websocket.yaml) e [REST](handbook/doc/30-specs/05-rest.yaml)
- 🛠️ Como deployar / debugar em prod: [Runbook](handbook/doc/40-operations/04-runbook.md)

---

## Como rodar localmente

> ⚠️ MVP em construção — instruções abaixo refletem o estado-alvo. Adapte conforme o código for sendo escrito.

### Pré-requisitos

- **Bun 1.x** ([install](https://bun.com/docs/installation))
- **PostgreSQL 16** rodando local (default port 5432)
- **Redis 7.x** rodando local (default port 6379)

### Setup

```bash
# Clonar
git clone https://github.com/<org>/merma-a-musica.git
cd merma-a-musica

# Instalar (zero node_modules — Bun resolve via auto-install)
bun install

# Variáveis de ambiente
cp .env.example .env
# editar .env conforme handbook/doc/20-architecture/05-deployment.md §Variáveis

# Migrations do banco
bun run db:migrate

# Rodar API + web em paralelo
bun --filter "*" dev
```

API roda em http://localhost:3000; SPA em http://localhost:5173.

### Testes

```bash
# Suite completa
bun test

# Apenas um pacote
bun test packages/domain
```

---

## Contribuindo

Contribuições são bem-vindas! Antes de começar:

1. Leia [`handbook/doc/README.md`](handbook/doc/README.md) — entender a hierarquia de fonte-da-verdade.
2. Olhe os **ADRs aceitos** para conhecer as decisões já tomadas. Para propor uma nova decisão arquitetural, abra um ADR `proposed` antes de implementar.
3. Mudanças de **regras de jogo** mexem no [GDD](handbook/doc/10-product/03-gdd.md) **antes** de mexer no código.
4. Siga as convenções de commit: `<tipo>(<escopo>): <descrição curta>`.

Tipos comuns: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

### Reportar bug

Abra issue no GitHub Org com:
- O que aconteceu vs o que esperava.
- Como reproduzir.
- Versão / commit hash.

### Reportar vulnerabilidade

Não abra issue pública. Veja [`handbook/doc/40-operations/03-security-anticheat.md#74-vulnerability-disclosure`](handbook/doc/40-operations/03-security-anticheat.md#74-vulnerability-disclosure).

---

## Licença

**[AGPL-3.0](LICENSE)** — software livre, copyleft. Você pode usar, modificar e distribuir, desde que mantenha os termos. Detalhes na licença.

---

**Esperamos que você se divirta!** 🎶