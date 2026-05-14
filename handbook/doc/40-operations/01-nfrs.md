---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Non-Functional Requirements (NFRs)

> Requisitos de qualidade do sistema. Cada NFR tem **alvo concreto**, **como medir** e **gatilho de alarme**.
>
> Estes são alvos para o **MVP em 1 VPS**. Reavaliação programada após launch + 30 dias de dados.

## Sumário

1. [Latência](#1-latência)
2. [Throughput e Capacidade](#2-throughput-e-capacidade)
3. [Disponibilidade](#3-disponibilidade)
4. [Recovery (RTO / RPO)](#4-recovery-rto--rpo)
5. [Performance do Cliente](#5-performance-do-cliente)
6. [Escalabilidade futura](#6-escalabilidade-futura)
7. [Error Budget](#7-error-budget)

---

## 1. Latência

Toda latência aqui é **server-side** (sem rede cliente—server) salvo nota explícita.

### 1.1 Round-trip de comandos WS

| Métrica | Alvo p95 | Alvo p99 | Como medir |
|---|---:|---:|---|
| `submit_answer` (ack do server) | **< 80ms** | < 200ms | histogram `merma_submit_answer_duration_seconds` |
| `player_ready` / `player_unready` | < 50ms | < 100ms | histogram `merma_ws_command_duration_seconds{command=...}` |
| `start_game` (host → broadcast `game_starting`) | < 100ms | < 250ms | histogram |
| `autocomplete_search` (broadcast `autocomplete_results`) | < 50ms | < 150ms | histogram |

### 1.2 Sincronização entre clientes

| Métrica | Alvo | Como medir |
|---|---:|---|
| Jitter de `timer_started` entre clientes da mesma sala | **< 100ms** | medida manual via 2 clientes em condições de rede iguais; coleta no `apps/web` (`server_now` no payload) |
| Jitter de `round_ended` (revelação aparece "ao mesmo tempo") | < 200ms | medida manual |

### 1.3 Áudio

| Métrica | Alvo p95 | Como medir |
|---|---:|---|
| TTFB do áudio (após `round_starting`) | **< 500ms** | histogram `merma_audio_first_byte_seconds` |
| Resolução ISRC → Deezer (cache miss) | < 1s | histogram `merma_deezer_resolve_duration_seconds` |
| Resolução ISRC → Deezer (cache hit Redis) | < 5ms | histogram (mesma métrica, distribuição bimodal esperada) |
| Download + sanitização do preview MP3 | < 800ms | histogram |

### 1.4 REST endpoints

| Endpoint | Alvo p95 |
|---|---:|
| `POST /api/v1/rooms` | < 100ms |
| `GET /api/v1/rooms/{code}` | < 30ms |
| `GET /api/v1/playlists` | < 80ms |
| `POST /api/v1/playlists/import` (apenas enfileiramento) | < 100ms |
| `GET /api/v1/solo/personal-bests` | < 60ms |
| `GET /health` | < 20ms |
| `GET /metrics` | < 50ms |
| `GET /api/v1/audio/{token}` | < 600ms (inclui buffer do MP3) |

---

## 2. Throughput e Capacidade

### 2.1 Cenário-alvo (Fase 0 — 1 VPS)

Hardware de referência: **VPS 2 vCPU, 4 GB RAM**, SSD, ~250 Mbps de banda (Brasil).

| Métrica | Alvo capacidade Fase 0 |
|---|---:|
| Salas concorrentes ativas | até **200** (≈ 4.000 WS) |
| Salas em `in_match` simultâneas | até 100 |
| `submit_answer` ops/s agregado | até 500/s |
| Imports de playlist concorrentes (queue) | até 20 |
| Saída de banda do proxy de áudio | até 100 Mbps (200 streams × 500 kbps) |

> **Não é o teto pretendido pela arquitetura** — a arquitetura é projetada para 10.000+ lobbies. Mas a Fase 0 com 1 VPS opera nessa faixa com folga. Gatilho para Fase 1 (N VPS) está em [§6](#6-escalabilidade-futura).

### 2.2 Por jogador

| Limite | Valor |
|---|---|
| `submit_answer` por jogador | 10 req/s (rate limit) |
| `autocomplete_search` | 5 req/s + debounce 300ms client-side |
| Conexões WS simultâneas com mesmo `player_uuid` | 1 (a anterior é fechada com close code 4001) |
| Salas criadas por hora | 10 (rate limit por `player_uuid`) |
| Imports de playlist | 5 concorrentes |

### 2.3 Memória por sala

Estimativa (medida via `merma_process_memory_bytes` em produção):

| Componente | Tamanho típico |
|---|---:|
| `RoomActor` + roster (até 20 players) | ~50 KB |
| Cache de preview MP3 da rodada corrente | ~500 KB |
| Cache de `used_tokens` da rodada | ~5 KB |
| Buffers de WS | ~50 KB / conexão |
| **Total por sala in_match** | **~1.5 MB + 50 KB × players** |

Em 100 salas concorrentes in_match com 20 players: ~250 MB de memória só para `RoomActor`s + caches. Cabe em 4 GB.

---

## 3. Disponibilidade

### 3.1 Alvo SLO (MVP)

**99% mensal.** Equivale a ~7 horas de downtime/mês aceito.

> Para um game free em 1 VPS, 99% é honesto. Não buscamos 99.9% no MVP — exigiria infraestrutura mais cara.

### 3.2 Componentes do SLO

| Componente | Definição |
|---|---|
| **Indicador (SLI)** | (requests bem-sucedidos / total requests) em janela rolante de 30 dias |
| **"Bem-sucedido"** | HTTP 2xx/3xx **OU** WS connect+aceite + qualquer evento subsequente em <30s |
| **"Total"** | requests do load balancer (Caddy access log) |

### 3.3 Componentes "out of scope" do SLO

Não contam contra o SLO (são externos):

- Indisponibilidade de Spotify/Deezer/YouTube Music (provedores).
- ISP do jogador.
- DNS de terceiros (Cloudflare/Let's Encrypt durante renovação automática).

---

## 4. Recovery (RTO / RPO)

Snapshot Redis ([ADR-0009](../20-architecture/adrs/0009-redis-snapshot.md)) é o mecanismo.

### 4.1 RTO — Recovery Time Objective

| Cenário | RTO |
|---|---:|
| Crash do processo Bun (`apps/api`) → systemd restart automático | **< 15s** |
| Reboot da VPS completo | **< 60s** |
| Restore de backup Postgres (em caso de corruption) | < 30 min |

Tempo da VPS reboot inclui: BIOS + kernel + systemd + Postgres + Redis + Bun + Caddy.

### 4.2 RPO — Recovery Point Objective

| Cenário | RPO |
|---|---:|
| Crash de `apps/api` durante partida ativa | **≤ 5 segundos** (intervalo do snapshot Redis) |
| Crash do Redis (AOF habilitado) | ≤ 1 segundo |
| Crash do Postgres | até último commit (WAL fsync) |
| Corruption catastrófica + restore de backup off-site | ≤ 24h (backup diário) |

### 4.3 Recovery automático

Implementação em `apps/api/recovery/RecoveryService.ts`:

1. No startup do `apps/api`, antes de aceitar conexões:
2. Conecta no Redis.
3. `SCAN 0 MATCH room:*:snapshot COUNT 100` — pega lista de chaves.
4. Para cada chave, carrega JSON e instancia `RoomActor` com estado restaurado.
5. Marca o tempo do snapshot vs `now` — se >2 min, salas são marcadas como `expired` (timeout natural).
6. `Bun.serve` começa a aceitar conexões.

Métrica: `merma_recovery_total` por execução; alvo: 0 em condições normais; >0 indica recovery real.

---

## 5. Performance do Cliente

Mobile-first ([persona Bruno](../10-product/02-personas.md#2-bruno--o-casual)). Alvos em rede 3G fraca (~400 kbps, ~300ms RTT) e em CPU Snapdragon 4xx (low-end Android).

| Métrica | Alvo |
|---|---:|
| First Contentful Paint (3G fraco) | < 2s |
| Time to Interactive | < 3s |
| Bundle gzipped (chunk principal) | **< 30 KB** |
| Bundle gzipped (com Solid + Tailwind, sem lazy chunks) | < 60 KB |
| Memória do tab após 30 min de partida | < 80 MB |
| FPS durante revelação animada | ≥ 50 |

Medições manuais no MVP (Lighthouse + Chrome DevTools). Automatização em CI fica para roadmap.

---

## 6. Escalabilidade Futura

### 6.1 Gatilhos de upgrade

Quando alguma destas verdades se sustentar **por 2+ semanas consecutivas**, abrir ADR de upgrade:

| Trigger | Ação |
|---|---|
| > 500 salas concorrentes regulares | Migrar para Fase 1 (N VPS, ver [`../20-architecture/05-deployment.md`](../20-architecture/05-deployment.md)). |
| CPU médio > 50% por hora | Aumentar VPS verticalmente (mais vCPUs) OU migrar Fase 1. |
| RAM > 80% por hora | Mais RAM OU Fase 1. |
| `submit_answer` p95 > 80ms regulamente | Investigar gargalo; pode exigir Fase 1. |
| Latência Deezer > 2s p95 | Reverter para cache local maior; investigar fallback Spotify mais agressivo. |
| Falhas de recovery > 1% das tentativas | Investigar snapshot Redis; pode exigir aumentar frequência ou trocar driver. |

### 6.2 Capacidade projetada Fase 1

Com 3 VPS (1 LB Caddy + 2 API nodes + 1 data tier compartilhado):

| Métrica | Alvo Fase 1 |
|---|---:|
| Salas concorrentes ativas | ~2.000 |
| Salas em `in_match` simultâneas | ~1.000 |
| `submit_answer` ops/s agregado | ~5.000/s |

### 6.3 Capacidade alvo arquitetural

A **arquitetura** está dimensionada para **10.000+ lobbies** (decisão consciente como exercício técnico — ver decisões finais da F4). Isto **não** significa que iremos rodar nesse volume — significa que **a estrutura suporta** quando/se chegar lá:

- Sticky sharding por `invite_code` é trivialmente paralelizável horizontalmente.
- Postgres + Redis como tier separado escala vertical até uns ~50k lobbies; depois precisa replicação.
- Caddy escala via DNS round-robin + várias instâncias.

---

## 7. Error Budget

### 7.1 Cálculo

99% disponibilidade mensal = **7h 18min de downtime aceito por mês**.

### 7.2 O que consome o budget

- Crash não recuperado em <15s.
- Deploy hard-cut (Fase 0): ~30s típico → consome ~30s do budget.
- Falha de OAuth com upstream (não 100% culpa nossa, mas conta).
- Failure mode catastrófico (banco corrupto → restore de backup).

### 7.3 Política de uso

- **< 25% do budget consumido na semana** → operação normal; pode deployar features.
- **25–75%** → cuidado; só hotfixes; review de incidentes.
- **> 75%** → freeze de deploys; foco em estabilidade até zerar.
- **100% (orçamento exaurido)** → freeze obrigatório por uma semana; SLO review.

### 7.4 Tracking

Tabela manual em `40-operations/incidents.md` (a criar quando primeiro incidente ocorrer) com:

| Data | Duração | Componente | Categoria | Postmortem? |
|---|---|---|---|---|

Categorias: `deploy`, `bug`, `infra`, `upstream`, `unknown`.

---

## Changelog

- **2026-05-13:** primeira versão. NFRs baseados em discussão arquitetural (escala-alvo 10k+ como exercício, MVP em 1 VPS, p95 `submit_answer` < 80ms, RPO 5s via snapshot, SLO 99%/mês). Alvos calibrados para hardware modesto (2 vCPU / 4 GB).
