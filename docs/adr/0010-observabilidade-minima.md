---
id: ADR-0010
title: Observabilidade mínima — logs JSON no stdout, Sentry e /metrics
status: accepted
date: 2026-05-13
revised: 2026-10-21
scope: ["apps/api/**"]
revisit_when: "Precisar monitorar latência continuamente; 2+ pessoas operando; mais de 100 salas simultâneas regulares; bug entre serviços impossível de seguir por log"
---

# ADR-0010 — Observabilidade mínima — logs JSON no stdout, Sentry e /metrics

## Contexto

Fazer deploy às cegas é inaceitável, mas uma stack OpenTelemetry + Grafana completa é mais infra que produto no MVP com 1 VPS.

## Decisão

1. **Logs:** um objeto JSON por linha no stdout (`ts`, `level`, `event`, `trace_id`, `room_id?`, `player_uuid?` + campos do evento), guardados pelo journald. Sem agente.
2. **Erros:** Sentry (free tier), só para erro não tratado ou reportado explicitamente. Desligado no dev.
3. **Métricas:** `GET /metrics` no formato Prometheus, protegido por Bearer `METRICS_AUTH_TOKEN`, com prefixo `merma_`: `rooms_active{phase}`, `ws_connections`, `submit_answer_duration_seconds`, `round_duration_seconds`, `audio_first_byte_seconds`, `deezer_request_total{status}`, `deezer_resolve_duration_seconds`, `redis_snapshot_total{result}`, `recovery_total`, `security_event_total{kind}`, `suspicious_pattern_total`, `process_memory_bytes`.
4. **Eventos do funil (Tier 1):** `match_started`, `match_completed`, `match_abandoned`, `round_completed`, `audio_unavailable`, `player_reconnected`, `player_timeout`, `host_changed`, `solo_personal_best_broken`. Erros que vão ao Sentry: `oauth_failure`, `playlist_import_failed`, `redis_snapshot_failed`, `redis_recovery_failed`, `audio_proxy_failed` (5xx), `engine_invalid_state`.
5. Sem tracing distribuído. O `trace_id` nos logs permite migrar depois.

## Restrições

- **ADR-0010.R1** MUST NOT logar `answer_text`, tokens OAuth, cookies nem `nickname`. — Check: pendente — teste do logger (campos proibidos são removidos)
- **ADR-0010.R2** MUST NOT usar `player_uuid`, `room_id`, `match_id` nem `isrc` como label de métrica. — Check: pendente — teste do registry de métricas
- **ADR-0010.R3** MUST sanitizar o payload antes de enviar ao Sentry. — Check: pendente — teste do `beforeSend`

## Consequências

- Custo zero e ~50 linhas de código. Sem dashboard nem alerta automático: a checagem é manual e semanal.
- Histórico de métricas só rodando um Prometheus à parte.

## Alternativas descartadas

- OTel + Grafana completos: complexidade.
- Grafana Cloud, Datadog, New Relic: lock-in ou custo.
- Só Sentry + `console.log`: sem série temporal.

## Fontes

- `docs.sentry.io/llms.txt`. O plugin e o MCP do Sentry entram quando o projeto Sentry existir.
