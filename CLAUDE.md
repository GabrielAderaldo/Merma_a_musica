# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Regras Master do Frontend

> **OBRIGATÓRIO — aplicar SEMPRE ao trabalhar em `apps/frontend/`**

1. **NUNCA usar Node.js** — nenhum comando `node`, `npm`, `npx`, `yarn`, `pnpm`. PROIBIDO.
2. **SEMPRE usar Bun** como runtime, package manager e test runner:
   - Instalar deps: `bun install`
   - Adicionar dep: `bun add <lib>`
   - Adicionar dev dep: `bun add -d <lib>`
   - Rodar scripts: `bun run <script>` ou `bun <script>`
   - Testes: `bun test`
   - Executar arquivo: `bun run <file.ts>`
3. **SEMPRE usar APIs nativas do Bun** quando disponíveis (Bun.file, Bun.serve, Bun.write, Bun.env, etc.) em vez de equivalentes Node.js.
4. **SEMPRE consultar a documentação do Bun via MCP antes de usar qualquer API do runtime**: https://bun.sh/docs/mcp — verificar se existe API nativa do Bun antes de recorrer a alternativas.
5. **node_modules nunca deve ser commitado** (já está no .gitignore).

## Sobre o Projeto

"Mermã, a Música!" é um jogo multiplayer de quiz musical online e open-source. Jogadores competem adivinhando músicas usando suas próprias playlists importadas de serviços de streaming (Spotify, Deezer, YouTube Music). Licenciado sob AGPL-3.0.

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Game Engine (Core Domain) | Gleam (BEAM) |
| Game Orchestrator | Gleam (BEAM) + Elixir mínimo (apenas Phoenix Channels) |
| Frontend | Vanilla TypeScript puro + Bun nativo + Tailwind CSS (zero libs de UI/reatividade) |
| Banco de dados (MVP) | Nenhum — estado em memória BEAM + ETS (cache) |
| Banco de dados (pós-MVP) | SQLite |
| Engine ↔ Orchestrator | Chamadas diretas no BEAM (mesmo nó) |
| Front ↔ Back | Phoenix Channels (WebSocket) + REST |
| Autenticação (MVP) | Nickname temporário (UUID no cookie) + OAuth opcional (Spotify, Deezer, YouTube Music) para importar playlists |
| Motor de áudio | Deezer (preview 30s via API pública) — motor universal. Fallback: Spotify Web Playback SDK |
| Servidor (VPS) | 2vCPU, 2GB RAM, 20GB disco, Ubuntu 24.04 LTS |

## Arquitetura

Monorepo modular baseado em DDD (Domain-Driven Design) com bounded contexts:

| Contexto | Tipo | Tecnologia | Diretório |
|---|---|---|---|
| **Game Engine** | Core Domain | Gleam (BEAM) | `apps/game_engine/` |
| **Game Orchestrator** | Supporting | Gleam (BEAM) + Elixir mínimo (Phoenix) | `apps/game_orchestrator/` |
| **Playlist Integration** | Generic | Gleam/Elixir (dentro do Orchestrator) | `apps/game_orchestrator/` |
| **Frontend** | Generic | Vanilla TS puro + Bun nativo (MVVM funcional, zero libs) | `apps/frontend/` |
| **Progressão & Ranking** | Future | - | Fora do escopo MVP |

### Princípios Arquiteturais

- Game Engine e Orchestrator rodam no **mesmo nó BEAM** — comunicação via chamadas de função e message passing nativo
- Game Engine é **puro e agnóstico** — recebe comandos, retorna eventos, sem side effects
- Separação entre Engine e Orchestrator é **lógica (módulos/aplicações OTP)**, não física
- **Elixir é apenas infraestrutura** — serve como lib de infra para Phoenix Channels, exportando funções que o Gleam consome. Minimizar Elixir ao estritamente necessário
- Cada sala = **processo BEAM isolado** no Orchestrator (estado em memória, timers)
- **ETS** para cache de playlists, mapeamento ISRC→Deezer e dados efêmeros
- **Sem banco de dados no MVP** — estado vive em memória BEAM. SQLite será adotado pós-MVP para contas, histórico e progressão
- Frontend é **Vanilla TypeScript puro** SPA com arquitetura **MVVM + Repository Pattern** (100% funcional, zero classes, zero frameworks, zero libs de UI/reatividade):
  - **Zero libs de UI** — sem React, SolidJS, Preact, signals-core. Apenas TS + DOM API nativa
  - **Reatividade vanilla** — observer pattern implementado à mão (`utils/observable.ts`): `createObservable()` + `subscribe()` (~30 linhas)
  - **Dev server nativo Bun** — `bun ./index.html` com HMR, Tailwind via bun-plugin-tailwind, zero Vite/Webpack
  - **Build nativo Bun** — `bun build ./index.html --minify --outdir=dist`
  - **Única dep externa**: `phoenix` (client oficial Phoenix Channels para WebSocket)
  - **Models** (`models/`): tipos puros TS — zero lógica, zero reatividade
  - **Services** (`services/`): side effects puros (fetch, WebSocket, Audio API) — sem estado, sem cache
  - **Repositories** (`repositories/`): abstrai fontes de dados (API, localStorage, sessionStorage, cookie) — cache first
  - **ViewModels** (`viewmodels/`): `createXxxVM()` → retorna `{ state, subscribe, actions }` com observables vanilla. Consome Repositories (NUNCA Services diretamente)
  - **Views** (`views/`): funções TS puras que criam DOM + usam `subscribe()` dos VMs para atualizar. Zero JSX, zero template engine
  - **Utils** (`utils/`): `observable.ts` (reatividade), `dom.ts` (helpers DOM), `router.ts` (History API)
  - ViewModels instanciados UMA VEZ no boot (`main.ts`), compartilhados via módulo singleton
- Frontend totalmente desacoplado — assets estáticos servidos pelo Caddy, conecta via Phoenix Channels e REST
- **Deezer como motor de áudio universal** — todas as músicas tocam via preview do Deezer independente da plataforma de origem. Proxy obrigatório no backend (URL nunca exposta ao frontend)

### Sistema de Áudio

- Deezer é o motor de áudio primário (preview 30s, API pública sem auth)
- Plataformas (Spotify, Deezer, YouTube Music) são importadoras de metadados
- Busca cross-platform: ISRC primeiro, fallback nome+artista
- Fallback de áudio: Spotify Web Playback SDK (exige Premium do jogador dono da música)
- Proxy de áudio obrigatório: `audio_token` opaco, single-use, expira com a rodada
- Anti-cheat: URL nunca exposta, headers sanitizados, timer controlado pelo backend

### Game Design (Resumo)

- **Pontuação**: Simple (1 ponto por acerto) ou SpeedBonus (1000→100 linear por velocidade)
- **Tipo de resposta**: SONG, ARTIST ou BOTH (campo único, BOTH aceita qualquer um)
- **Validação**: Fuzzy matching + normalização (acentos, artigos, parênteses)
- **Rodada**: grace period 3s → timer → revelação → 3s pausa → próxima
- **Skip**: todos responderam + maioria vota pular
- **Range de músicas**: 1-5 por jogador (dinâmico), host escolhe dentro do range
- **Modo solo**: permitido (mínimo 1 jogador)
- **Desempate**: maior streak, depois empate aceito

## Estrutura do Monorepo

```
apps/
  game_engine/       → Gleam — lógica pura da partida (regras, pontuação, rodadas)
  game_orchestrator/  → Gleam + Elixir (Phoenix) — salas, timers, WebSocket, REST, playlists
  frontend/          → Vanilla TS puro + Bun nativo + Tailwind — SPA (MVVM funcional)
    index.html         → Entry point HTML (servido por `bun ./index.html`)
    bunfig.toml        → Config Bun (plugins: tailwind, env vars)
    src/main.ts        → Bootstrap: cria VMs, inicia router, monta app
    src/router.ts      → Router manual (History API, ~50 linhas)
    src/models/        → Tipos puros TS (interfaces, zero lógica)
    src/services/      → Side effects puros (fetch, WebSocket, Audio API)
    src/repositories/  → Abstração de dados (cache, storage, combina services)
    src/viewmodels/    → Estado reativo + lógica (observable vanilla + actions)
    src/views/         → Funções TS que criam DOM + subscribe nos VMs
    src/utils/         → observable.ts (reatividade), dom.ts (helpers), format.ts, debounce.ts
infra/
  caddy/             → Caddyfile para reverse proxy + HTTPS
scripts/             → Utilitários CLI (build, lint, testes)
doc/
  documents/         → Documentação de domínio, arquitetura, contratos e game design
  references/        → Referências externas (Gleam docs, patterns)
```

## Modelo de Domínio (Game Engine)

Aggregate principal: **Match** — controla rodadas, configuração, estado e jogadores.

- Estados da partida: `WaitingForPlayers` → `InProgress` → `Finished`
- Eventos: `MatchStarted`, `RoundStarted`, `AnswerProcessed`, `RoundCompleted`, `MatchCompleted`
- Invariantes: todos prontos antes de iniciar; músicas divisíveis por número de jogadores; uma resposta por jogador por rodada; sem resposta após rodada finalizada

### Contrato do Game Engine (API de módulo Gleam)

| Função | Descrição |
|---|---|
| `new_match` | Cria nova partida |
| `set_player_ready` | Marca jogador como pronto |
| `start_match` | Inicia partida (todos prontos) |
| `start_round` | Avança para a próxima rodada |
| `submit_answer` | Registra resposta de jogador |
| `end_round` | Encerra rodada manualmente/por timeout |
| `end_match` | Força término da partida |
| `all_answered` | Verifica se todos responderam |
| `is_last_round` | Verifica se é a última rodada |

Todas as funções retornam `Result(MatchEvent, EngineError)`. Contrato garantido pela tipagem forte do Gleam em tempo de compilação.

## Comandos de Desenvolvimento

### Setup inicial
```bash
./scripts/setup.sh
```

### Desenvolvimento (backend + frontend)
```bash
./scripts/dev.sh
```

### Comandos individuais

| Componente | Comando | Descrição |
|---|---|---|
| Game Engine | `cd apps/game_engine && gleam test` | Testes Gleam |
| Game Engine | `cd apps/game_engine && gleam build` | Build Gleam |
| Orchestrator | `cd apps/game_orchestrator && mix test` | Testes Elixir |
| Orchestrator | `cd apps/game_orchestrator && mix phx.server` | Servidor Phoenix |
| Orchestrator | `cd apps/game_orchestrator && mix precommit` | Lint + format + test |
| Frontend | `cd apps/frontend && bun ./index.html` | Dev server Bun nativo (HMR) |
| Frontend | `cd apps/frontend && bun build ./index.html --minify --outdir=dist` | Build produção (SPA estático) |
| Frontend | `cd apps/frontend && bun test` | Testes (ViewModels + utils) |
| Frontend | `cd apps/frontend && bunx oxlint .` | Lint com Oxlint |

### Interop Gleam↔Elixir

O Game Engine (Gleam) compila para .beam e é integrado via um custom Mix compiler (`Mix.Tasks.Compile.GleamBuild`). O compiler:
1. Roda `gleam build` no diretório do game_engine
2. Copia os .beam files para o ebin do Mix

Módulos Gleam são acessíveis no Elixir como atoms: `:game_engine.main()`.

**Princípio**: Elixir serve como lib de infraestrutura (Phoenix Channels, Endpoint, Router). Toda lógica de negócio e orquestração deve estar em Gleam. Elixir exporta funções que o Gleam consome, não o contrário quando possível.

## Deploy

- **Docker Compose** com 2 containers: `caddy` (reverse proxy + HTTPS) + `app` (BEAM + frontend estático)
- Frontend buildado como SPA estático, copiado para dentro do container `app` e servido pelo Caddy
- **Caddy** gerencia HTTPS automático via Let's Encrypt
- Sem banco de dados no MVP — sem container de DB
- Domínio base: `caninhagames.fortal.br`
  - Frontend: `merma.caninhagames.fortal.br`
  - Backend API + WebSocket: `merma-api.caninhagames.fortal.br`

## Planos de Implementação

- `doc/plano_game_engine.md` — 8 fases: tipos → partida → rodadas → respostas/fuzzy → pontuação → encerramento → seleção de músicas → destaques
- `doc/plano_phoenix_bridge.md` — 6 fases: wrapper FFI MethodChannel/EventChannel que expõe Phoenix como infra consumível pelo Gleam
- `doc/plano_game_orchestrator.md` — 10 fases: scaffolding Phoenix → room server → registry/lifecycle → coordinator → channels → REST → playlists → audio proxy → autocomplete → skip voting
- `doc/plano_frontend.md` — 10 fases: scaffolding SolidJS → helpers/infra → stores → tela inicial/auth → lobby → playlists → gameplay → resultados → rotas auxiliares → polimento

## Documentação de Referência

- `doc/documents/documento_conciso.md` — documento consolidado de todo o domínio
- `doc/documents/front_doc.md` — especificação de arquitetura frontend (SolidJS)
- `doc/documents/infra.md` — especificação técnica de infraestrutura
- `doc/documents/gdd.md` — Game Design Document
- `doc/documents/music_system.md` — especificação do sistema de áudio
- `doc/documents/contract_api.md` — contrato de API (REST + WebSocket)
- `doc/documents/Openapi.yaml` — spec OpenAPI 3.1 (endpoints REST)
- `doc/documents/Asyncapi.yaml` — spec AsyncAPI 3.1 (eventos WebSocket)
- `doc/documents/game_engine_context.md` — bounded context do Game Engine
- `doc/documents/game_orquestration_context.md` — bounded context do Orchestrator
- `doc/documents/playlist_integration_context.md` — bounded context de Playlist
- `doc/documents/progression_ranked_context.md` — bounded context de Progressão (futuro)
- `doc/documents/map_de_contexto.md` — mapa de contexto DDD
- `doc/documents/visão_estrátegica.md` — visão estratégica do produto
- `doc/documents/introdução.md` — documento estratégico de domínio DDD
- `doc/documents/append_1.md` — adendo: integração Gleam↔Elixir no BEAM
- `doc/documents/append_2.md` — adendo: contrato de comandos/eventos do Game Engine
- `doc/references/gleam/doc.md` — documentação completa da linguagem Gleam

## Idioma

Documentação e comunicação do projeto em **português brasileiro**. Código e identificadores técnicos em inglês.
