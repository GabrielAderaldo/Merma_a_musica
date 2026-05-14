# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto crítico antes de qualquer coisa

**Este repo está no modo doc-first: `apps/` e `packages/` ainda não existem.** A implementação será criada do zero a partir dos specs em `handbook/doc/`. **Antes de escrever código novo, leia o spec correspondente.** O projeto foi inteiramente arquitetado em documentação antes da fase de código começar — diferente do fluxo usual de "ler código existente para entender".

**Equipe = 1 dev humano + IA.** Não existe time para consultar ("pergunte ao tech lead", "discuta com o time de design") — não tem time. Use convicção. Quando precisar de validação humana, peça diretamente ao mantenedor (1 pessoa).

## Hierarquia de fonte-da-verdade (CRÍTICO)

Em caso de conflito entre fontes, vence o nível mais alto:

```
produto:      handbook/doc/10-product/03-gdd.md          ← regras do jogo
arquitetura:  handbook/doc/20-architecture/adrs/         ← decisões tomadas
specs:        handbook/doc/30-specs/                     ← contratos técnicos
operações:    handbook/doc/40-operations/                ← NFRs, runbook
código:       apps/ e packages/                          ← deve refletir os 4 acima
```

Para **mudar uma regra do jogo**, edite o GDD **antes** de tocar no código. Para **mudar uma decisão arquitetural**, abra um ADR novo (formato Michael Nygard, template em `handbook/doc/20-architecture/adrs/_template.md`) que faça `supersede` do anterior — **nunca edite ADR aceito**.

## Stack canônica

| Camada | Tech | ADR |
|---|---|---|
| Runtime | Bun 1.x | 0001 |
| Linguagem | TypeScript 6.0 strict (todas as flags) | 0001 |
| HTTP/WS | Hono | 0002 |
| Frontend | SolidJS 1.x + Tailwind (sem SolidStart) | 0008 |
| Banco persistente | PostgreSQL 16 + Drizzle | 0006 |
| Estado transiente | Redis 7.x (snapshot de partida) | 0009 |
| Reverse proxy | Caddy 2.x | — |
| Áudio | Deezer (ISRC-first) + fallback Spotify SDK | 0004 |
| Fuzzy match | Levenshtein in-house | 0007 |
| Monorepo | Bun Workspaces | 0005 |
| Observabilidade | stdout JSON + Sentry + `/metrics` Prometheus | 0010 |

ADRs 0003 (Vanilla TS) está **superseded**. Stack antiga (Gleam/Elixir/Phoenix/SvelteKit) está em `handbook/doc/archive/` apenas para referência histórica — não usar.

## Comandos comuns

```bash
# Instalar dependências (Bun auto-install; sem node_modules versionado)
bun install

# Dev (todos os workspaces em paralelo)
bun --filter "*" dev

# Dev de um workspace específico
bun --filter "@merma/api" dev

# Build
bun --filter "*" build

# Testes (Bun nativo, sintaxe Jest-compatible)
bun test
bun test packages/domain                # apenas um pacote
bun test packages/domain/fuzzy/         # apenas uma pasta
bun test --watch                        # watch mode
bun test path/to/file.test.ts          # apenas um arquivo

# Lint (oxlint — não ESLint)
bun run lint   # equivalente a `oxlint`

# Migrations (quando packages/api existir)
bun run db:migrate
bun run db:rollback
```

**Sem `npm`, sem `pnpm`, sem `yarn`.** Tudo via `bun`. Sem `node_modules/` versionado — Bun resolve via cache global (`~/.bun/install/cache`).

## Convenções de código (TS 6 strict)

Aplicáveis especialmente em `packages/domain/` (Game Engine — core domain):

- **`throw` é proibido em `packages/domain`.** Toda função que pode falhar retorna `Result<T, E>` (`{ ok: true, value } | { ok: false, error }`). `throw` é permitido apenas em `apps/api` na camada de adapter, convertendo para `Result` antes de subir.
- **`any` é proibido.** Use `unknown` com narrowing. `as X` exige comentário justificando.
- **Branded types** para IDs e strings críticas: `type PlayerUuid = string & { readonly __brand: "PlayerUuid" }`.
- **`readonly` em todo tipo exportado**, `readonly T[]` para arrays, `as const` para literais.
- **Sem `class`** em `packages/domain` — funções puras e tipos imutáveis. Em `apps/api` é OK quando faz sentido (RoomActor, services).
- **`Date.now()` nunca chamado dentro de `packages/domain`.** Passe `now: Timestamp` como parâmetro explícito.
- Detalhes completos em [`handbook/doc/30-specs/01-engine.md`](handbook/doc/30-specs/01-engine.md).

## Linguagem ubíqua

Termos do domínio têm definições canônicas em [`handbook/doc/glossary.md`](handbook/doc/glossary.md). **Antes de criar um termo novo no código, adicione ao glossary primeiro.** Se um termo aparecer no código e no glossary com sentidos diferentes, o código está errado.

Convenção: **português para narrativa, inglês para identificadores** (`Room`, `MatchConfiguration`, `submit_answer`, `game_mode`). Não traduzir nomes de tipos/eventos.

## Topologia do jogo (importante para evitar bugs)

- **Single-writer-per-room**: cada `Room` é detida por exatamente um processo Bun (um `RoomActor` em memória). Toda mutação passa por uma fila assíncrona dentro do RoomActor.
- **Sticky routing por `invite_code`**: Caddy faz hash consistente → mesma sala sempre cai no mesmo node.
- **Estado vivo em memória** + **snapshot Redis a cada 5s** (recovery em crash).
- **Postgres NÃO armazena partidas em andamento** — só o resultado final ao chegar em `game_ended`.
- **Cliente nunca sabe se acertou** até receber `round_ended`. Fuzzy match + scoring rodam SÓ no server.
- Diagramas em [`handbook/doc/20-architecture/03-state-machines.md`](handbook/doc/20-architecture/03-state-machines.md).

## Anti-cheat: regras invioláveis

- **`audio_token` é HMAC** vinculado a `(player_uuid, round_id, expiry)`. **Single-use.** Outro player_uuid recebe 401.
- **Headers ID3 e `Content-Length` original** são strippados do MP3 pelo proxy.
- **`Range: bytes=`** é rejeitado pelo proxy (`416`).
- Toda validação que importa para o jogo roda no server. **Cliente é UI, server é autoridade.**
- Detalhes em [`handbook/doc/30-specs/02-audio.md`](handbook/doc/30-specs/02-audio.md) + [`handbook/doc/40-operations/03-security-anticheat.md`](handbook/doc/40-operations/03-security-anticheat.md).

## Estrutura do handbook

```
handbook/
├── doc/                            ← documentação canônica
│   ├── README.md                   ← entry point com hierarquia
│   ├── glossary.md                 ← linguagem ubíqua
│   ├── 10-product/                 ← vision, personas, GDD, telemetria
│   ├── 20-architecture/            ← C4, bounded contexts, state machines, ADRs, deployment
│   ├── 30-specs/                   ← engine, audio, frontend, websocket.yaml, rest.yaml
│   ├── 40-operations/              ← NFRs, LGPD, security, runbook
│   └── archive/                    ← versões antigas (Gleam/Elixir) — read-only
├── design/
│   └── brief.md                    ← handoff para designer
├── api_responses/                  ← refs de APIs externas (Spotify/Deezer/YouTube)
└── references/                     ← snapshots offline da doc de libs
    ├── bun/ solid/ react/
    ├── tanstack/ typescript/ zod/
    └── (cada um com INDEX.md + docs/**/*.md)
```

## Atualizando references offline

Os snapshots de doc (Bun, Solid, etc.) podem ser regenerados via:

```bash
cd handbook/references/<lib>
# Para Bun:
curl -fsSL https://bun.com/llms-full.txt -o llms-full.md
python3 .split.py    # gera docs/**/*.md
python3 .index.py    # gera INDEX.md raiz + por pasta
```

**`.split.py` do Bun aplica sanitização automática** de tokens-exemplo conhecidos (Discord bot token na guide `ecosystem/discordjs`) — GitHub Push Protection bloqueia esses. Se aparecer um novo, adicione em `KNOWN_SECRETS_TO_REDACT` no script.

## Convenções de commit

Padrão observado no histórico: `<tipo>(<escopo>): <descrição curta>`.

Tipos comuns no projeto:
- `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Escopos: `handbook`, `design`, `api`, `web`, `domain`, `schema`

Exemplos do histórico:
```
docs(handbook): F5 — specs técnicas (engine, audio, frontend, AsyncAPI, OpenAPI REST)
chore: remover código e docs legacy (Gleam/Elixir/SvelteKit/Phoenix)
docs: F7 — reescrever README raiz alinhado com a doc canônica
```

Mensagens de commit em **PT-BR** (consistente com a linguagem do projeto).

## Fluxos prováveis para o Claude que continuar daqui

### "Começar implementação"
1. Leia o spec relevante em `handbook/doc/30-specs/` antes de criar arquivos.
2. Comece por `packages/schema` (contratos Zod) → `packages/domain` (engine pura) → `apps/api` → `apps/web`. Há dependência.
3. Testes seguem a estratégia em [`30-specs/01-engine.md` §7](handbook/doc/30-specs/01-engine.md#7-estratégia-de-testes). Casos parametrizados em tabela para os algoritmos críticos.

### "Mudar uma regra do jogo"
1. Edita primeiro em [`handbook/doc/10-product/03-gdd.md`](handbook/doc/10-product/03-gdd.md).
2. Atualiza `30-specs/01-engine.md` se afeta engine, `04-websocket.yaml` se afeta protocolo.
3. Atualiza `glossary.md` se introduz termo novo.
4. Por último: código.

### "Mudar decisão arquitetural"
Abrir ADR novo `NNNN-titulo-imperativo.md` em `handbook/doc/20-architecture/adrs/`. NUNCA edite ADR aceito (status: superseded by NNNN no ADR antigo, criando o novo).

### "Adicionar dependência npm"
Validar que roda em Bun nativamente. Auto-install via Bun. Se a dep tiver pegadinhas conhecidas, documentar em commit message.

## Stack antiga: NÃO usar

O repo passou por pivots. Estes termos aparecem em `archive/` mas **não devem ser usados em código novo**: Gleam, Elixir, BEAM, GenServer, ETS, Phoenix Channels, SvelteKit, phoenix.js, Mix, Hex. Se aparecer referência em código novo, é bug.

## Links rápidos

- Visão de produto: [`handbook/doc/10-product/01-vision.md`](handbook/doc/10-product/01-vision.md)
- GDD canônico: [`handbook/doc/10-product/03-gdd.md`](handbook/doc/10-product/03-gdd.md)
- C4 (containers): [`handbook/doc/20-architecture/01-c4-context-container.md`](handbook/doc/20-architecture/01-c4-context-container.md)
- Sequence diagrams: [`handbook/doc/20-architecture/04-sequence-diagrams.md`](handbook/doc/20-architecture/04-sequence-diagrams.md)
- AsyncAPI (WebSocket): [`handbook/doc/30-specs/04-websocket.yaml`](handbook/doc/30-specs/04-websocket.yaml)
- OpenAPI (REST): [`handbook/doc/30-specs/05-rest.yaml`](handbook/doc/30-specs/05-rest.yaml)
- Runbook (deploy/debug): [`handbook/doc/40-operations/04-runbook.md`](handbook/doc/40-operations/04-runbook.md)
- Brief de design: [`handbook/design/brief.md`](handbook/design/brief.md)
