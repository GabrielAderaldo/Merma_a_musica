# Operação — metas e topologia

> Metas para o **MVP em 1 VPS**. Reavaliar 30 dias depois do lançamento, com dados reais.
> O runbook passo a passo só será escrito quando existir um deploy real: o que havia antes era especulação ([ADR-0012](adr/0012-documentacao-executavel-para-agentes.md)).

## Latência (no servidor, p95)

| Operação | p95 | p99 |
|---|---:|---:|
| `submit_answer` até o ack | **< 80ms** | < 200ms |
| `player_ready` / `player_unready` | < 50ms | < 100ms |
| `start_game` até o broadcast de `game_starting` | < 100ms | < 250ms |
| `autocomplete_search` | < 50ms | < 150ms |
| Primeiro byte do áudio depois de `round_starting` | < 500ms | — |
| Resolução ISRC → Deezer (miss / hit) | < 1s / < 5ms | — |
| `GET /api/v1/audio/{token}` | < 600ms | — |
| Demais REST | < 100ms (`/health` < 20ms) | — |
| Diferença de `timer_started` entre clientes da sala | < 100ms | — |

## Capacidade (referência: VPS de 2 vCPU e 4 GB)

| Métrica | Fase 0 |
|---|---:|
| Salas ativas | até 200 (~4.000 WS) |
| Salas em partida ao mesmo tempo | até 100 |
| `submit_answer` agregado | até 500/s |
| Saída do proxy de áudio | até 100 Mbps |
| Memória por sala em partida | ~1,5 MB + 50 KB por jogador |

Gatilho para N VPS (Fase 1), mantido por 2 semanas: > 500 salas simultâneas, CPU > 50%, RAM > 80% ou `submit_answer` p95 > 80ms. Cruzou o gatilho → ADR novo.

## Disponibilidade e recuperação

- **SLO: 99% ao mês** (~7h18 de downtime aceito). Não contam: queda das plataformas de música, ISP do jogador e DNS de terceiros.
- **RTO:** crash do processo < 15s (systemd); reboot da VPS < 60s; restore do Postgres < 30 min.
- **RPO:** partida ≤ 5s (snapshot); Redis ≤ 1s (AOF); Postgres até o último commit; desastre ≤ 24h (backup diário).
- **Error budget:** < 25% consumido na semana → normal; 25–75% → só hotfix; > 75% → congela deploy.

## Cliente (mobile-first, 3G fraco, Android low-end)

FCP < 2s · TTI < 3s · chunk principal < 30 KB gzip (< 60 KB com Solid + Tailwind) · aba < 80 MB após 30 min · ≥ 50 FPS na revelação.

## Topologia da Fase 0

> Em avaliação: [ADR-0017](adr/0017-producao-em-containers-com-podman-quadlet.md) (`proposed`) põe estes quatro serviços num pod Podman/Quadlet, com o deploy por imagem fixada por digest. Até ele virar `accepted`, vale o texto abaixo.

Uma VPS rodando, via systemd: Caddy 2 (TLS automático, serve `apps/web/dist`, faz proxy de `/api/*`, `/auth/*` e `/ws/room/*` para `127.0.0.1:3000`), `apps/api` (Bun 1.4.4, [ADR-0018](adr/0018-bun-1-4-4.md), iniciado com `--disallow-code-generation-from-strings=strict`, S-27), **Postgres 17** e **Redis 8** (`requirepass` + AOF), estes três só em loopback. As variáveis canônicas estão em [`.env.example`](../.env.example).

- Deploy hard-cut entre 03h e 05h BRT: parar → `git pull` → `bun install` → build → subir. A `apps/api` aplica as migrações do Drizzle ao subir, antes de aceitar conexões; se falharem, ela não fica saudável. O `RecoveryService` reidrata as salas ([`architecture.md`](architecture.md#recuperação)). Meta: < 30s fora do ar.
- Backup: `pg_dump` diário, cifrado, enviado para fora da VPS, retenção de 14 dias. Redis sem backup (estado transiente).
- Ainda **em aberto**, decidir quando chegar perto do gatilho da Fase 1: como o Caddy faz hash do `invite_code` extraído do path.

Em dev, Postgres e Redis vêm da `~/.infra` (`infra up postgres redis`). A aplicação roda nativa, nunca em container.

## Telemetria

Métricas em `/metrics` (Bearer `METRICS_AUTH_TOKEN`) e eventos em [ADR-0010](adr/0010-observabilidade-minima.md). Labels de métrica só com enums fechados: nunca `player_uuid`, `room_id`, `match_id` ou `isrc` (esses ficam nos logs).

- Sem `METRICS_AUTH_TOKEN`, `/metrics` responde 404; com ele, o token tem 32+ caracteres. Sem `SENTRY_DSN`, nada vai ao Sentry. A API avisa os dois no log ao subir (`metrics_disabled`, `sentry_disabled`).
- Vai ao Sentry todo `logger.error`, que é o "reportado explicitamente" do ADR-0010, mais exceção e rejeição não tratadas. As integrações automáticas do SDK ficam desligadas: elas anexariam URL, header e query, e o `audio_token` anda na URL.
