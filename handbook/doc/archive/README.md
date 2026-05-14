# `archive/` — Documentos arquivados

Esta pasta preserva versões anteriores da documentação que **não refletem mais a stack ou as regras atuais do projeto**. Os arquivos estão aqui como **referência histórica** — para entender o porquê de decisões já tomadas e o que foi descontinuado.

> ⚠️ **Não use estes documentos como fonte de verdade.** A documentação canônica vive em `handbook/doc/` (raiz e subpastas numeradas). Veja [`../README.md`](../README.md) para o índice mestre.

## Motivo da arquivação

Em 2026-05-13 a documentação descrevia **três versões diferentes do projeto ao mesmo tempo** (Gleam/BEAM/Phoenix, Bun/TS/Hono, SvelteKit). Foi feita uma operação de reconciliação: a stack canônica passou a ser **Bun + TypeScript 6.0 + Hono**, e todos os documentos que ainda referenciavam tecnologias descontinuadas (Gleam, Elixir/BEAM, Phoenix Channels, ETS, SvelteKit) foram arquivados aqui.

## O que está aqui

| Arquivo | Versão | Conteúdo original | Por que foi arquivado |
|---|---|---|---|
| `BLUEPRINT_v2.1.md` | 2.1 | Visão estratégica + DDD + stack | Mistura camadas; superficial. Será substituído por documentos dedicados em `10-product/`, `20-architecture/` e `30-specs/`. |
| `gdd_v1.1.md` | 1.1 | Game Design Document | Melhor documento do conjunto, mas tinha conflitos pontuais com `DOMAIN_MODELS` (divisibilidade de músicas, mínimo de jogadores). Foi reescrito como `10-product/03-gdd.md`. |
| `DOMAIN_MODELS_v0_gleam.md` | — | Bounded contexts (Gleam + Elixir) | Descrevia engine em **Gleam** e orchestrator em **Elixir/BEAM (GenServer)**. Stack descontinuada. Reescrito como `20-architecture/02-bounded-contexts.md`. |
| `SPEC_ENGINE_v0.md` | — | Spec da engine (~40 linhas) | Raso demais para orientar implementação; fórmula de pontuação ausente. Reescrito completo em `30-specs/01-engine.md`. |
| `SPEC_AUDIO_v1.0_ets.md` | 1.0 | Spec do motor de áudio | Mencionava cache em **ETS** (Erlang Term Storage), incompatível com a stack TS. Reescrito em `30-specs/02-audio.md`. |
| `SPEC_FRONTEND_v2.0_phoenixjs.md` | 2.0 | Arquitetura frontend Vanilla TS | Vanilla TS estava certo, mas importava **`phoenix.js`** e descrevia comunicação via Phoenix Channels. Reescrito em `30-specs/03-frontend.md`. |
| `implementation_plan_v0_pivot.md` | — | Pivot tecnológico para Vanilla TS | Já realizado (commits recentes). Convertido em ADRs versionadas em `20-architecture/adrs/`. |
| `Asyncapi_v1.0_phoenix.yaml` | 1.0.0 | AsyncAPI dos WebSockets | Descrevia `/socket/websocket` (path Phoenix), `protocol: ws` sem TLS, frontend SvelteKit, backend BEAM. Reescrito em `30-specs/04-websocket.yaml` com Hono. |
| `Openapi_was_dup_of_asyncapi.yaml` | — | "OpenAPI" | **Bug:** era cópia bit-a-bit do AsyncAPI (mesmo md5). A REST API nunca teve contrato real. Substituído por `30-specs/05-rest.yaml`. |

## O que **não** está aqui

- O histórico Git já preserva tudo. Esta pasta existe para consulta humana rápida, não como backup.
- Documentos que continuam válidos não foram arquivados — apenas os que estavam tecnologicamente desalinhados ou foram substituídos.

## Política

- Arquivos em `archive/` são **read-only** (não editar).
- Para entender *por que* uma decisão foi revertida ou tomada, leia o ADR correspondente em [`../20-architecture/adrs/`](../20-architecture/adrs/).
- Em caso de necessidade de reverter para uma decisão antiga, isto é uma **nova decisão** — abra um novo ADR, não edite o documento arquivado.
