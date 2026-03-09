# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sobre o Projeto

"Mermã, a Música!" é um jogo multiplayer de quiz musical online e open-source. Jogadores competem adivinhando músicas usando suas próprias playlists importadas de serviços de streaming (Spotify, Deezer). Licenciado sob AGPL-3.0.

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Game Engine (Core Domain) | Gleam (BEAM) |
| Game Orchestrator | Elixir + Phoenix Channels (BEAM) |
| Frontend | SvelteKit + Deno + Tailwind CSS |
| Banco de dados | PostgreSQL (persistência) + ETS (cache) |
| Engine ↔ Orchestrator | Chamadas diretas no BEAM (mesmo nó) |
| Front ↔ Back | Phoenix Channels (WebSocket) + REST |
| Autenticação (MVP) | Nickname temporário (sem conta). Spotify OAuth apenas para importar playlists. |
| Servidor | 2vCPU, 2GB RAM, 20GB disco, Ubuntu 24.04 LTS |

## Arquitetura

Monorepo modular baseado em DDD (Domain-Driven Design) com bounded contexts:

| Contexto | Tipo | Tecnologia | Diretório |
|---|---|---|---|
| **Game Engine** | Core Domain | Gleam (BEAM) | `apps/game_engine/` |
| **Game Orchestrator** | Supporting | Elixir + Phoenix (BEAM) | `apps/game_orchestrator/` |
| **Playlist Integration** | Generic | Elixir (dentro do Orchestrator) | `apps/game_orchestrator/` |
| **Frontend** | Generic | SvelteKit + Deno | `apps/frontend/` |
| **Progressão & Ranking** | Future | - | Fora do escopo MVP |

### Princípios Arquiteturais

- Game Engine e Orchestrator rodam no **mesmo nó BEAM** — comunicação via chamadas de função e message passing nativo
- Game Engine é **puro e agnóstico** — recebe comandos, retorna eventos, sem side effects
- Separação entre Engine e Orchestrator é **lógica (módulos/aplicações OTP)**, não física
- Cada sala = **processo BEAM isolado** no Orchestrator (estado em memória, timers)
- **ETS** para cache de playlists e dados efêmeros
- **PostgreSQL** para dados persistentes (usuarios futuros, histórico)
- Frontend (SvelteKit) totalmente desacoplado — conecta via Phoenix Channels e REST

## Estrutura do Monorepo

```
apps/
  game_engine/       → Gleam — lógica pura da partida (regras, pontuação, rodadas)
  game_orchestrator/  → Elixir + Phoenix — salas, timers, WebSocket, REST, Spotify integration
  frontend/          → SvelteKit + Deno + Tailwind — UI do jogo
libs/                → Módulos compartilhados (domain, adapters, shared_kernel)
infra/ops/           → IaC, deploy, provisionamento
scripts/             → Utilitários CLI (build, lint, testes)
tools/               → Ferramentas internas
doc/                 → Documentação de domínio e arquitetura
```

## Modelo de Domínio (Game Engine)

Aggregate principal: **Match** — controla rodadas, configuração, estado e jogadores.

- Estados da partida: `WaitingForPlayers` → `InProgress` → `Finished`
- Eventos: `MatchStarted`, `RoundStarted`, `AnswerProcessed`, `RoundEnded`, `MatchEnded`
- Invariantes: todos prontos antes de iniciar; músicas divisíveis por número de jogadores; uma resposta por jogador por rodada

## Plano de Implementação

Detalhado em `doc/plano_implementacao.md`. Resumo das fases:

| Fase | Descrição |
|---|---|
| 0 | Scaffolding (Gleam + Elixir/Phoenix + SvelteKit) |
| 1 | Engine: tipos e modelo de domínio |
| 2 | Engine: lógica central da partida |
| 3 | Orchestrator: GenServer de sala |
| 4 | Orchestrator: Phoenix Channels |
| 5 | Playlist Integration (Spotify) |
| 6 | Frontend: lobby e sala |
| 7 | Frontend: tela de jogo |
| 8 | Deploy e polimento |

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
| Frontend | `cd apps/frontend && deno task dev` | Dev server SvelteKit |
| Frontend | `cd apps/frontend && deno task build` | Build produção |
| Frontend | `cd apps/frontend && deno task check` | Type-check Svelte |

### Interop Gleam↔Elixir

O Game Engine (Gleam) compila para .beam e é integrado via um custom Mix compiler (`Mix.Tasks.Compile.GleamBuild`). O compiler:
1. Roda `gleam build` no diretório do game_engine
2. Copia os .beam files para o ebin do Mix

Módulos Gleam são acessíveis no Elixir como atoms: `:game_engine.main()`.

## Documentação de Referência

- `doc/plano_implementacao.md` — plano de implementação detalhado
- `doc/documents/documento_conciso.md` — documento consolidado de todo o domínio
- `doc/estrutura_monorepo.md` — mapa de diretórios
- `doc/references/gleam/doc.md` — documentação completa da linguagem Gleam (referência para implementação do Game Engine)

## Idioma

Documentação e comunicação do projeto em **português brasileiro**. Código e identificadores técnicos em inglês.
