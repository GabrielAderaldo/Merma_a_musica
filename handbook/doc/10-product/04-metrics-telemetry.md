---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Métricas & Telemetria

Plano de **o que medir** e **como medir**, alinhado com as restrições de observabilidade ([ADR-0010](../20-architecture/adrs/0010-observability-minimal.md)) e privacidade ([`../40-operations/02-privacy-lgpd.md`](../40-operations/02-privacy-lgpd.md) — F6).

Princípios:

1. **Medir o que move decisão.** Métricas que ninguém olha são ruído.
2. **Privacidade primeiro.** Sem PII desnecessária. Sem fingerprinting.
3. **Quantitativo + qualitativo.** Números mostram **o quê**, conversas com jogadores mostram **por quê**.
4. **Custo zero infra-extra no MVP.** Tudo via `/metrics` + logs + Sentry — sem analytics SaaS externo.

---

## 1. KPIs de Produto

Métricas que importam para julgar se o **produto está bom**.

### 1.1 Engajamento

| KPI | Definição | Alvo MVP | Como medir |
|---|---|---|---|
| **Partidas completadas / sessão** | Média de partidas terminadas em uma sessão de browser | ≥ 2 | Evento `match_completed` agrupado por `session_id` |
| **Duração média da sessão** | Tempo entre primeiro evento e último na mesma sessão | 10–25 min | `session_end - session_start` |
| **% sessões que completam ≥1 partida** | (sessões com `match_completed`) / total | ≥ 60% | derivado |
| **Reentry rate** | % sessões que jogam ≥2 partidas seguidas no mesmo lobby | ≥ 40% | sequência de eventos `match_completed → match_started` |

### 1.2 Retenção (pós-MVP — precisa identidade persistente)

| KPI | Definição | Alvo |
|---|---|---|
| **D1 retention** | % jogadores que voltam no dia seguinte | ≥ 20% |
| **D7 retention** | % que voltam em 7 dias | ≥ 10% |
| **D30 retention** | % que voltam em 30 dias | ≥ 5% |

Esses dependem de `player_uuid` persistente em cookie e jogador retornando — **monitoramos no MVP, mas não são gate-de-shipping**.

### 1.3 Adoção de plataformas externas

| KPI | Definição | Alvo |
|---|---|---|
| **% partidas com ≥1 playlist importada** | Sessões onde algum jogador trouxe playlist | ≥ 70% |
| **% jogadores que conectaram conta** | Out of `player_uuid` distintos | ≥ 40% |
| **Distribuição de plataformas** | Spotify / Deezer / YouTube Music | informativo — sem alvo |

### 1.4 Modo Solo

| KPI | Definição | Alvo |
|---|---|---|
| **% sessões que jogam solo** | Sessões com pelo menos 1 partida solo | informativo |
| **% solo grinder** | Jogadores com ≥5 partidas solo no histórico | informativo |
| **% partidas onde bate recorde** | (matches solo que bateram personal best) / total solo | ≥ 30% (jogadores em evolução) |

---

## 2. Saúde Técnica (NFRs operacionais)

Estes vivem no endpoint `/metrics` Prometheus ([ADR-0010](../20-architecture/adrs/0010-observability-minimal.md)).

| Métrica | Tipo | Alvo SLO |
|---|---|---|
| `merma_rooms_active{state}` | gauge | informativo — saturação operacional |
| `merma_ws_connections` | gauge | informativo |
| `merma_submit_answer_duration_seconds` | histogram | p95 < 80ms |
| `merma_round_duration_seconds` | histogram | informativo (média ~30s) |
| `merma_audio_first_byte_seconds` | histogram | p95 < 500ms |
| `merma_deezer_request_total{status}` | counter | erro rate < 1% |
| `merma_deezer_resolve_duration_seconds` | histogram | p95 < 1s |
| `merma_redis_snapshot_total{result}` | counter | success rate > 99.5% |
| `merma_recovery_total` | counter | informativo — incidentes |
| `merma_process_memory_bytes` | gauge | alvo informal — ficar abaixo da RAM da VPS |
| `merma_match_completion_rate` | gauge derivado | (matches finished) / (matches started + crashes) — alvo > 95% |
| `merma_player_timeout_rate` | gauge derivado | players que viraram `timeout` durante partida — alvo < 5% |

### Alvos derivados de NFRs

Detalhados em [`../40-operations/01-nfrs.md`](../40-operations/01-nfrs.md) (F6). Em resumo:

- `submit_answer` p95 < 80ms.
- `timer_started` jitter entre clientes < 100ms.
- Áudio TTFB < 500ms.
- Disponibilidade > 99% (MVP, sem aspiração de 99.9+).

---

## 3. Eventos de Telemetria (Plano de Logging)

Eventos emitidos em logs JSON estruturados (`stdout`). Cada evento tem schema mínimo:

```jsonc
{
  "ts": "2026-05-13T20:45:32.123Z",
  "level": "info",
  "event": "match_started",                 // nome do evento (snake_case)
  "trace_id": "uuid-v4",                    // ID de correlação
  "session_id": "uuid-v4",                  // por browser-session
  "room_id": "uuid-v4",                     // se aplicável
  "player_uuid": "uuid-v4",                 // se aplicável
  // ... campos específicos do evento
}
```

> **PII:** nunca logamos `email`, `oauth_token`, `nickname` (esse é considerado pseudonimo — fica fora por simplicidade).

### 3.1 Eventos do funil de jogador

| Evento | Disparado quando | Campos extras |
|---|---|---|
| `session_started` | Player abre o site (primeira interação significativa) | `is_returning`, `has_connected_account`, `user_agent_summary` |
| `room_created` | Host cria sala | `creator_player_uuid` |
| `room_joined` | Player entra em sala existente | `room_id`, `invite_method` (`code` or `link`) |
| `playlist_imported` | Importação concluída | `platform`, `track_count`, `duration_ms` |
| `match_started` | `game_starting` emitido | `room_id`, `match_id`, `config`, `player_count` |
| `match_completed` | `game_ended` emitido | `match_id`, `rounds_played`, `duration_ms`, `winner_player_uuids` |
| `match_abandoned` | Todos jogadores saíram antes do fim | `match_id`, `rounds_completed_before_abandon` |
| `round_completed` | Cada `round_ended` | `round_index`, `correct_answer_count`, `skip_voted` |
| `solo_personal_best_broken` | Novo recorde solo registrado | `playlist_id`, `previous_score`, `new_score` |
| `audio_unavailable` | Música pulada por falha Deezer | `isrc`, `reason` |
| `player_reconnected` | Reconexão bem-sucedida | `reconnect_duration_ms` |
| `player_timeout` | Jogador removido por 2min sem reconectar | `disconnect_during_state` |
| `host_changed` | Host migration | `previous_host_uuid`, `new_host_uuid`, `reason` |

### 3.2 Eventos de erro

| Evento | Disparado | Para Sentry? |
|---|---|---|
| `oauth_failure` | Callback OAuth falhou | sim |
| `playlist_import_failed` | Import quebrou no meio | sim |
| `redis_snapshot_failed` | Escrita Redis deu erro | sim |
| `redis_recovery_failed` | Re-hidratação falhou | sim |
| `audio_proxy_failed` | Proxy de áudio quebrou | sim, se 5xx |
| `engine_invalid_state` | Domain layer retornou `Result.err` inesperado | sim |
| `websocket_close_abnormal` | Conexão WS fechou por erro (≠ user leave) | só conta no `/metrics` |

### 3.3 Cardinalidade controlada

Para evitar explosão de séries Prometheus:

- **`{platform}`**: enum fechado (`spotify`/`deezer`/`youtube_music`/`none`).
- **`{state}`** em `merma_rooms_active`: enum (`waiting`/`in_match`/`reveal`/`finished`).
- **`{status}`** em `merma_deezer_request_total`: bucket (`2xx`/`4xx`/`5xx`/`timeout`).
- **`{reason}`**: enum fechado em vez de string livre.

**Nunca** indexar por `player_uuid`, `room_id`, `match_id`, `isrc` em labels de métrica — explode cardinalidade. Esses ficam em **logs**.

---

## 4. O que **NÃO** medimos (privacidade)

Lista explícita do que está **fora dos eventos e métricas**, por design:

| Não medimos | Por quê |
|---|---|
| **Conteúdo de `answer_text`** | Pode revelar viés cultural / linguagem; sem ganho real |
| **Email do usuário** | Não precisamos no MVP |
| **OAuth tokens** | Crítico — proibido em qualquer log |
| **Localização precisa** (lat/lon, CEP) | Sem ganho; complicaria LGPD |
| **Browser fingerprint** detalhado | UA agregado (Chrome/Firefox/Safari/Mobile) é o máximo |
| **Cookies de terceiros** | Não usamos; sem rastro cross-site |
| **`nickname`** | Pseudonimo, mas evitamos por princípio de minimização |

LGPD: política completa em [`../40-operations/02-privacy-lgpd.md`](../40-operations/02-privacy-lgpd.md) (F6).

---

## 5. Plano de Iteração

Métricas evoluem. Esse documento é vivo.

### Tier 1 (MVP) — implementado no dia 1

Eventos críticos: `match_started`, `match_completed`, `round_completed`, `audio_unavailable`, `player_timeout`, eventos de erro para Sentry.

Métricas Prometheus do `/metrics`: lista completa da §2.

### Tier 2 (pós-MVP — 30 dias após launch)

Adicionar:
- **Cohort analysis** de retenção (D1/D7/D30) — exige `player_uuid` confiável.
- **Funnel completo**: landing → criar/entrar → primeira resposta → primeira partida completada.
- **Tempo até primeira partida** (TTV — time to value).
- **Dashboard interno**: subir Prometheus/Grafana na própria VPS quando justificável (gatilho documentado em ADR-0010).

### Tier 3 (validado pós-MVP) — só com hipótese clara

- A/B testing de copy/UI — sem framework no início; provavelmente manual.
- **Análise de respostas erradas** (privacy review necessário antes).
- Recomendação de playlists baseada em histórico.

---

## 6. Como olhar essas métricas hoje (operacional)

No MVP, sem dashboard. Workflow:

```bash
# Health geral via /metrics
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" \
     https://merma.example.com/metrics | grep merma_

# Logs estruturados via journalctl
journalctl -u merma-api -f --output=json | jq 'select(.event == "match_completed")'

# Erros via Sentry dashboard
# (link na pasta da equipe)

# Snapshot de banco para análise ad-hoc
psql $POSTGRES_URL -c "SELECT COUNT(*) FROM matches WHERE created_at > now() - interval '24 hours';"
```

Cookbook de queries comuns em [`../40-operations/04-runbook.md`](../40-operations/04-runbook.md) (F6).

---

## Changelog

- **2026-05-13:** primeira versão. KPIs separados em engajamento/retenção/adoção/solo. Plano de eventos para Tier 1 (MVP) e Tier 2 (pós-launch). Lista explícita do que **não** medimos por privacidade.
