# ADR 0011: Consultar a doc das libs pelas fontes oficiais para IA, sem snapshots no repo

- **Status:** accepted
- **Data:** 2026-10-21
- **Decisores:** core

## Contexto

Em 2026-05 o repo ganhou `handbook/references/` (15 MB, 1834 arquivos): snapshots offline das docs de Bun, Solid, Zod, React, TanStack e TypeScript, regenerados à mão por scripts `.split.py`/`.index.py`. Os ADRs 0001, 0002, 0005 e 0008 citam esses snapshots como mitigação para "doc indisponível" ou "comunidade pequena".

Cinco meses depois, o modelo tinha três problemas:

- **Envelhece calado.** Um snapshot não avisa que está velho. O agente lê a doc de uma versão anterior com a mesma confiança com que leria a atual.
- **Custa manutenção.** Os scripts de split/index e a sanitização de tokens-exemplo (o GitHub Push Protection barrava) não fazem parte do produto.
- **Pacotes que nem estão na stack.** React e TanStack entraram no snapshot e nunca foram escolhidos por ADR.

Enquanto isso, as tecnologias da stack passaram a publicar canais oficiais feitos para agentes: MCP de docs, CLI com saída para agente, `llms.txt`, skills e plugins oficiais. Já o ambiente local tem LSP de TypeScript (`tsgo-lsp`) e Claude in Chrome para depurar o frontend.

## Decisão

**A documentação de terceiros é consultada em tempo real pela fonte oficial da própria tecnologia. Nada de snapshot versionado no repo.**

Ordem de preferência para cada tecnologia: **MCP oficial → CLI oficial para agentes → skill/plugin oficial → `llms.txt` → doc HTML**. Para código, o LSP vem antes de qualquer doc.

| Tecnologia | Fonte oficial (aferida em 2026-10-21) |
|---|---|
| Bun | MCP `https://bun.com/docs/mcp` (`bun-docs` no `.mcp.json`) · `bun.com/docs/llms.txt` |
| Hono | plugin `hono@hono` (marketplace `honojs/skills`) · CLI `@hono/cli` (`hono docs`, `hono search`, `hono request`) · `hono.dev/llms.txt` |
| SolidJS | `docs.solidjs.com/llms.txt` |
| Drizzle | `orm.drizzle.team/llms.txt` |
| Zod | `zod.dev/llms.txt` |
| Redis | plugin `redis-development@claude-plugins-official` (repo `redis/agent-skills`) · MCP `redis/mcp-redis` quando houver dado para inspecionar · `redis.io/llms.txt` |
| Sentry | plugin `sentry@claude-plugins-official` + MCP `mcp.sentry.dev` **quando o projeto Sentry existir** · `docs.sentry.io/llms.txt` |
| oxlint | `oxc.rs/llms.txt` · LSP via `oxlint --lsp` |
| TypeScript | LSP `tsgo-lsp` (plugin local da máquina). Sem `llms.txt` oficial |
| Tailwind, Postgres, Caddy, Deezer | sem canal oficial para IA. Usar a doc HTML oficial (Caddy também tem o MCP `reverse-proxy` da VPS) |
| Spotify | `developer.spotify.com/llms.txt` |

`handbook/api_responses/` **fica**. Não é doc de lib: são respostas reais das APIs de streaming, usadas como fixture.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| Manter os snapshots e automatizar a regeneração (CI) | Continua sendo uma cópia defasada entre um run e outro, mais um pipeline a manter. A fonte oficial já resolve. |
| Context7 / agregadores de doc de terceiros | Intermediário que não é da tecnologia. A regra é buscar na fonte. |
| Skills da comunidade (skills.sh, marketplaces abertos) | Qualidade variável, sem revisão do mantenedor da lib. Só entram as publicadas pela própria org da tecnologia. |

## Consequências

- **Positivas:**
  - A doc consultada é sempre a da versão atual.
  - 15 MB e 1834 arquivos a menos no repo, e os scripts de regeneração somem.
  - Os agentes passam a usar o ferramental que cada tecnologia mantém para eles.
- **Negativas / trade-offs:**
  - Exige rede. Trabalhar offline volta a ser lento para consultar doc.
  - O ferramental para IA muda rápido. A tabela acima precisa ser reaferida de tempos em tempos (está datada).
- **Neutras:**
  - Substitui as menções a snapshots offline em `handbook/references/` nas consequências dos ADRs **0001**, **0002**, **0005** e **0008**. O resto desses ADRs continua valendo.

## Notas

- O histórico dos snapshots continua no git (último commit com eles: `c8a1b28`).
