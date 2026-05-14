# Documentação canônica — Mermã, a Música!

> Esta é a fonte de verdade do projeto. Todo código novo deve refletir o que está aqui; em caso de conflito entre código e documentação, **a documentação ganha** (e abre-se um PR para alinhar o código). Para mudar uma regra, atualize o documento canônico **antes** de tocar no código.

## Mapa da pasta

```
handbook/doc/
├── README.md              ← você está aqui
├── glossary.md            ← linguagem ubíqua (termos do domínio)
│
├── 10-product/            ← o que o jogo é, para quem, como medimos sucesso
│   ├── 01-vision.md
│   ├── 02-personas.md
│   ├── 03-gdd.md          ← Game Design Document (canônico)
│   └── 04-metrics-telemetry.md
│
├── 20-architecture/       ← como o sistema é organizado e por quê
│   ├── 01-c4-context-container.md
│   ├── 02-bounded-contexts.md
│   ├── 03-state-machines.md
│   └── adrs/              ← decisões arquiteturais (1 arquivo = 1 decisão)
│
├── 30-specs/              ← contratos técnicos detalhados
│   ├── 01-engine.md       ← lógica do jogo (fórmulas, invariantes)
│   ├── 02-audio.md        ← motor de áudio + anti-cheat
│   ├── 03-frontend.md     ← arquitetura do client
│   ├── 04-websocket.yaml  ← AsyncAPI (WS contracts)
│   └── 05-rest.yaml       ← OpenAPI (REST contracts)
│
├── 40-operations/         ← como rodamos isso em produção
│   ├── 01-nfrs.md         ← latência, escala, SLO
│   ├── 02-privacy-lgpd.md
│   ├── 03-security-anticheat.md
│   └── 04-runbook.md
│
└── archive/               ← documentos descontinuados (read-only)
```

## Hierarquia de fonte-da-verdade

Quando dois documentos parecerem conflitar, o documento de **nível mais alto** vence. Em caso de conflito real, abra issue ou ADR para resolver na fonte certa, não no documento dependente.

```
                                              ┌─────────────────────────────────┐
   produto (o quê e por quê)                  │  10-product/                    │
                                              │  - vision.md                    │
                                              │  - gdd.md  ← regra do jogo      │
                                              └──────────────┬──────────────────┘
                                                             │
                                                             ▼
                                              ┌─────────────────────────────────┐
   arquitetura (como organizar)               │  20-architecture/               │
                                              │  - bounded-contexts.md          │
                                              │  - adrs/                        │
                                              └──────────────┬──────────────────┘
                                                             │
                                                             ▼
                                              ┌─────────────────────────────────┐
   specs (o que cada peça faz)                │  30-specs/                      │
                                              │  - engine.md  ← lógica/fórmulas │
                                              │  - websocket.yaml/rest.yaml     │
                                              │       ↑ contratos client↔server │
                                              └──────────────┬──────────────────┘
                                                             │
                                                             ▼
                                              ┌─────────────────────────────────┐
   operações (como rodar)                     │  40-operations/                 │
                                              └─────────────────────────────────┘
```

- **GDD** é fonte-da-verdade do produto. Se o engine "implementa" uma regra que o GDD não tem, ou o GDD tem regra que o engine ignora, **resolve no GDD primeiro**.
- **Specs** são fonte-da-verdade da implementação. O código deve refletir; testes provam.
- **ADRs** são fonte-da-verdade das decisões. Para reverter uma decisão, escreva um novo ADR — não edite o antigo.

## Stack canônica (resumida)

| Camada | Tecnologia | ADR |
|---|---|---|
| Runtime | Bun 1.x | [`adrs/0001`](20-architecture/adrs/0001-runtime-bun-and-ts-6.md) |
| Linguagem | TypeScript 6.0 strict | [`adrs/0001`](20-architecture/adrs/0001-runtime-bun-and-ts-6.md) |
| HTTP/WS server | Hono | [`adrs/0002`](20-architecture/adrs/0002-server-hono.md) |
| Frontend | SolidJS 1.x (signals + JSX AOT) | [`adrs/0008`](20-architecture/adrs/0008-frontend-solidjs.md) |
| Áudio | Deezer (engine) + fallback Spotify Premium | [`adrs/0004`](20-architecture/adrs/0004-audio-deezer-as-engine.md) |
| Monorepo | Bun Workspaces | [`adrs/0005`](20-architecture/adrs/0005-monorepo-bun-workspaces.md) |
| Banco persistente | PostgreSQL + Drizzle | [`adrs/0006`](20-architecture/adrs/0006-postgres-drizzle.md) |
| Estado transiente | Redis 7.x (snapshot de partida ativa, cache) | [`adrs/0009`](20-architecture/adrs/0009-redis-snapshot.md) |
| Fuzzy match | Levenshtein (in-house) | [`adrs/0007`](20-architecture/adrs/0007-fuzzy-match-levenshtein.md) |
| Topologia | single-writer-per-room + sticky sharding por `invite_code` | [`adrs/0002`](20-architecture/adrs/0002-server-hono.md) |
| Observabilidade | stdout JSON + Sentry + `/metrics` Prometheus | [`adrs/0010`](20-architecture/adrs/0010-observability-minimal.md) |

## Convenções

### Versionamento dos documentos

- Documentos têm um cabeçalho com **status**, **última revisão** e **donos**.
- Status válidos: `draft`, `active`, `superseded`, `deprecated`.
- Mudanças significativas viram entrada no Changelog ao final do documento. Mudanças triviais (typo, formatação) não precisam.

### ADRs

- Numeração sequencial de 4 dígitos (`0001`, `0002`...).
- Um ADR = uma decisão. Não use para checklists ou notas.
- ADR aceito vira `status: accepted` e é imutável. Para mudar, escreva um novo ADR que **supersedes** o anterior.
- Template em [`20-architecture/adrs/README.md`](20-architecture/adrs/README.md).

### Linguagem

- Termos do domínio sempre como no [`glossary.md`](glossary.md). Se um termo precisar entrar e ainda não existe, adicione-o lá **primeiro**.
- Português para texto narrativo; inglês para identificadores de código, nomes de eventos e schemas (`Room`, `MatchConfiguration`, `submit_answer`).

### Diagramas

- Use **mermaid** sempre que possível (renderiza no GitHub e na maioria dos editores).
- Para C4, use a notação padrão (Context → Container → Component → Code).
- Imagens binárias só quando mermaid não dá conta — guardar em `assets/` da própria pasta.

## Histórico

- **2026-05-13:** reorganização completa da documentação. Stack reconciliada para Bun+TS+Hono; arquivos antigos movidos para [`archive/`](archive/) com nota explicativa.
