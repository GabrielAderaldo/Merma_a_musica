# ADR 0010: Observabilidade minimalista (stdout JSON + Sentry + /metrics)

- **Status:** accepted
- **Data:** 2026-05-13
- **Decisores:** core

## Contexto

Observabilidade tem custo de complexidade (SDK, agente, backends, dashboards) que não compensa no MVP se ainda estamos validando a UX do jogo. Por outro lado, **deployar cego é inaceitável** — precisamos detectar erros em produção, medir latência do `submit_answer`, monitorar uso do Deezer.

Tensão: queremos **dados suficientes para operar**, sem montar uma stack completa de observabilidade (OpenTelemetry SDK + Collector + Loki/Tempo/Prometheus + Grafana).

## Decisão

Observabilidade em **três camadas simples**, todas hospedadas (ou triviais) na VPS atual:

### 1. Logs — `stdout` em JSON estruturado

- Toda escrita de log é JSON num único objeto: `{ ts, level, msg, ...context }`.
- Contexto comum: `room_id`, `player_uuid`, `round_index`, `trace_id` (UUID gerado por request/conexão).
- `journalctl -u merma-api` armazena local. Rotação automática do systemd.
- **Sem agente externo** (sem fluentd, sem promtail, sem otel-collector) — se um dia precisar agregação central, plugar é trivial.
- Biblioteca: `pino` (Bun-compatible, performante) ou implementação interna ~30 linhas. Escolha final fica em [`30-specs/01-engine.md`](../../30-specs/01-engine.md).

### 2. Erros — Sentry (free tier)

- SDK `@sentry/bun` (ou `@sentry/node` se Bun ainda não suportado nativo).
- Captura **somente** erros não-tratados e exceções explicitamente reportadas. **Não envia logs normais.**
- Free tier (5k events/mês) cobre o MVP folgado.
- Sentry DSN em `.env`; off por padrão em dev local.
- Source maps do bundle Bun habilitados.

### 3. Métricas — endpoint `/metrics` Prometheus

- A própria API expõe `GET /metrics` em formato texto Prometheus.
- Métricas core (todas com prefixo `merma_`):
  - `merma_rooms_active{state}` — gauge — salas vivas por estado (`waiting`, `in_match`, `finished`).
  - `merma_ws_connections` — gauge — total de WebSockets abertos.
  - `merma_submit_answer_duration_seconds` — histogram — latência server-side de `submit_answer`.
  - `merma_round_duration_seconds` — histogram — duração efetiva de cada rodada.
  - `merma_deezer_request_total{status}` — counter — requisições ao Deezer por status code.
  - `merma_deezer_resolve_duration_seconds` — histogram — tempo de resolução ISRC → preview.
  - `merma_redis_snapshot_total{result}` — counter — snapshots emitidos por resultado.
  - `merma_recovery_total` — counter — recoveries automáticos via Redis.
  - `merma_process_memory_bytes` — gauge — memória do processo.
- **Não rodamos Prometheus na VPS por padrão.** Quando quiser ver: `curl https://merma.example.com/metrics` ou rodar Prometheus local. Quando virar dor, plugar Prometheus+Grafana é trivial.

### 4. Tracing distribuído — skipped no MVP

- Sem OTel SDK por enquanto. Adicionar quando aparecer um bug que exija seguir uma requisição cross-service (audio proxy → Deezer → cache → response).
- Migração para OTel é compatível: `trace_id` já está nos logs como UUID; podemos reaproveitar.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **OpenTelemetry stack completa** (SDK + Collector + Tempo + Loki + Mimir + Grafana) | Complexidade alta para um MVP com 1 VPS; mais infra que código de produto. |
| **Grafana Cloud free tier** | Free tier cobre, mas trade-off: lock-in a SaaS + curva de aprendizado da plataforma; resolveríamos um problema (observabilidade) criando outro (operação). |
| **Datadog/New Relic** | Custo agressivo para projeto free. |
| **Só Sentry + console.log** | Sem métricas, sem séries temporais. Não dá pra falar "latência subiu 30% essa semana". |
| **Só logs (sem Sentry, sem métricas)** | Diagnóstico viável; alertas e visão de saúde do sistema, não. |

## Consequências

- **Positivas:**
  - **Setup mínimo:** ~50 linhas de TS para o logger JSON + endpoint `/metrics`. Sentry é SDK + DSN.
  - **Zero overhead operacional** — sem mais processos na VPS além do já planejado (Bun, Postgres, Redis, Caddy).
  - **Migração futura indolor** — formato Prometheus é padrão da indústria; `trace_id` já presente; logs estruturados parseáveis por qualquer agregador.
  - **Custo zero** no MVP (Sentry free tier cobre).
- **Negativas / trade-offs:**
  - **Sem dashboards visuais imediatos.** Para ver métricas, `curl /metrics`. UX de operação é tosca. Aceitável até virar dor.
  - **Sem alerting automático** — se a latência subir, ninguém é notificado a menos que veja manualmente. Mitigação: Sentry alerta sobre **erros**; latência fica reativa por enquanto.
  - **Sem séries históricas** sem Prometheus — só "snapshot atual" via curl. Reaver histórico exige rodar Prometheus.
- **Neutras:**
  - `trace_id` no log facilita correlacionar eventos numa mesma WS connection sem precisar de tracing distribuído ainda.

## Notas

- **Trigger para evoluir:** quando qualquer destes virar verdade, abrir ADR de upgrade para OTel/Grafana:
  - (a) Latência precisa ser monitorada continuamente, não sob demanda.
  - (b) Equipe ≥ 2 devs operando.
  - (c) >100 salas concorrentes regulares.
  - (d) Suspeita de problema cross-service (audio proxy ↔ Deezer ↔ cache) impossível de debugar com logs.
- **Localização das métricas:** endpoint deve ser **público mas não advertido** (sem link no app, sem doc usuário); ou autenticado por token simples em `Authorization`. Decisão fica em [`30-specs/05-rest.yaml`](../../30-specs/05-rest.yaml) (F5).
- **Privacidade:** logs **nunca** logam payload completo de `submit_answer`, OAuth tokens, ou conteúdo de cookies. Sanitização explícita.
