---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Runbook Operacional

> Como rodar, deployar, debugar e recuperar o Mermã em produção.
>
> Este documento é **vivo** — atualizar após cada incidente novo. A meta é que qualquer pessoa com acesso SSH à VPS consiga executar as operações daqui sem contexto adicional.

## Sumário

1. [Estrutura da VPS](#1-estrutura-da-vps)
2. [Setup inicial](#2-setup-inicial-uma-vez)
3. [Deploy rotineiro](#3-deploy-rotineiro)
4. [Operações diárias](#4-operações-diárias)
5. [Diagnóstico de problemas comuns](#5-diagnóstico-de-problemas-comuns)
6. [Recovery e disaster scenarios](#6-recovery-e-disaster-scenarios)
7. [Queries úteis](#7-queries-úteis)

---

## 1. Estrutura da VPS

### 1.1 Layout de arquivos

```
/root/                      ← acesso administrativo
/etc/merma/.env             ← variáveis de ambiente (chmod 600)
/etc/caddy/Caddyfile        ← config do reverse proxy
/etc/systemd/system/
  merma-api.service         ← unit do Bun
  postgres.service          ← managed pelo pacote
  redis.service             ← managed pelo pacote
  caddy.service             ← managed pelo pacote
/srv/merma/
  apps/                     ← código fonte (git clone)
    api/
    web/dist/               ← bundle estático servido pelo Caddy
  packages/
/var/lib/postgresql/16/main ← dados Postgres
/var/lib/redis/             ← dados Redis (AOF)
/var/log/                   ← journald + logs Caddy
```

### 1.2 Usuários e permissões

| Usuário | Função |
|---|---|
| `root` | Acesso administrativo via SSH key apenas (senha desabilitada) |
| `merma` | Owner do `/srv/merma/` e do processo `apps/api` |
| `postgres` | Owner do Postgres |
| `redis` | Owner do Redis |
| `caddy` | Owner do Caddy |

### 1.3 Portas

| Porta | Serviço | Exposição |
|---|---|---|
| 22 | SSH | Internet (firewall + key only) |
| 80 | Caddy HTTP→HTTPS redirect | Internet |
| 443 | Caddy HTTPS | Internet |
| 3000 | `apps/api` Bun | **Loopback apenas** |
| 5432 | Postgres | **Loopback apenas** |
| 6379 | Redis | **Loopback apenas** |

Firewall (ufw):

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 2. Setup Inicial (uma vez)

### 2.1 VPS provisionada

Ubuntu 24.04 LTS, 2 vCPU, 4 GB RAM mínimo recomendado.

### 2.2 Instalação base

```bash
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban htop

# Bun
curl -fsSL https://bun.sh/install | bash
mv ~/.bun/bin/bun /usr/local/bin/

# Postgres 16
apt install -y postgresql-16 postgresql-contrib
systemctl enable --now postgresql

# Redis 7.x
apt install -y redis-server
# Edit /etc/redis/redis.conf:
#   bind 127.0.0.1
#   requirepass <senha forte>
#   appendonly yes
systemctl restart redis-server
systemctl enable redis-server

# Caddy 2.x
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### 2.3 Usuário `merma`

```bash
useradd -m -s /bin/bash merma
mkdir -p /srv/merma
chown -R merma:merma /srv/merma
```

### 2.4 Clone do código

```bash
sudo -u merma -i
cd /srv/merma
git clone https://github.com/<org>/merma-a-musica.git .
bun install
```

### 2.5 `.env`

```bash
install -m 600 -o merma -g merma /dev/null /etc/merma/.env
nano /etc/merma/.env
# preencher conforme [`../20-architecture/05-deployment.md`](../20-architecture/05-deployment.md) §Variáveis
```

### 2.6 Banco Postgres

```bash
sudo -u postgres psql
CREATE USER merma WITH PASSWORD '...';
CREATE DATABASE merma OWNER merma;
\q
# Aplicar migrations
cd /srv/merma && sudo -u merma bun run db:migrate
```

### 2.7 systemd units

`/etc/systemd/system/merma-api.service`:

```ini
[Unit]
Description=Merma a Musica API (Bun)
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
Type=simple
User=merma
Group=merma
WorkingDirectory=/srv/merma
EnvironmentFile=/etc/merma/.env
ExecStart=/usr/local/bin/bun run apps/api/src/server.ts
Restart=always
RestartSec=2
StandardOutput=journal
StandardError=journal
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now merma-api
```

### 2.8 Caddyfile

Ver [`../20-architecture/05-deployment.md`](../20-architecture/05-deployment.md) §Caddyfile.

```bash
nano /etc/caddy/Caddyfile
systemctl reload caddy
```

DNS já configurado apontando para a VPS — Caddy automaticamente obtém certificado TLS no primeiro request.

---

## 3. Deploy Rotineiro

### 3.1 Hard-cut (Fase 0 — MVP, 1 VPS)

```bash
# 1. Anunciar deploy se em horário de uso (opcional)
# 2. SSH na VPS
ssh root@merma.example.com

# 3. Pull do código
cd /srv/merma
sudo -u merma git pull --ff-only

# 4. Install + build
sudo -u merma bun install
sudo -u merma bun run --filter "@merma/web" build

# 5. Migrations Postgres (se houver)
sudo -u merma bun run db:migrate

# 6. Restart da API
systemctl restart merma-api

# 7. Verificar
systemctl status merma-api
journalctl -u merma-api -n 50

# 8. Health check
curl -fsSL https://merma.example.com/health
```

**Downtime esperado:** ~10-30s entre `systemctl restart` e API aceitar conexões.

**Recovery automático:** RoomActors com partidas ativas são re-hidratados de Redis snapshots ao subir (ver [§6.1](#61-crash-do-processo-bun)).

### 3.2 Rolling drain (Fase 1 — N VPS, futuro)

A descrever quando chegarmos em N≥2 nodes. Esqueleto:

```bash
# Em LB Caddy: marcar node A como drain (não roteia salas novas)
# Esperar lobbies vivos de A esvaziarem
# Update + restart de A
# Re-incluir A no pool
# Repetir para B...
```

### 3.3 Rollback

```bash
cd /srv/merma
sudo -u merma git log --oneline -10
sudo -u merma git checkout <commit-hash-anterior>
sudo -u merma bun install
sudo -u merma bun run --filter "@merma/web" build
systemctl restart merma-api
```

Migrations Postgres têm `down` quando aplicáveis:

```bash
sudo -u merma bun run db:rollback
```

---

## 4. Operações Diárias

### 4.1 Verificar saúde

```bash
# health endpoint
curl -fsSL https://merma.example.com/health

# métricas (com token)
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" https://merma.example.com/metrics | grep merma_

# salas ativas
psql $POSTGRES_URL -c "SELECT state, COUNT(*) FROM rooms_active WHERE last_activity > now() - interval '5 min' GROUP BY state;"

# top jogadores na semana
psql $POSTGRES_URL -c "SELECT player_uuid, COUNT(*) FROM matches WHERE created_at > now() - interval '7 days' GROUP BY player_uuid ORDER BY 2 DESC LIMIT 10;"
```

### 4.2 Logs

```bash
# tail dos logs da API
journalctl -u merma-api -f

# filtrar por evento específico
journalctl -u merma-api --output=json -f | jq 'select(.event == "match_completed")'

# erros recentes
journalctl -u merma-api -p err --since "1 hour ago"

# por sala (player_uuid)
journalctl -u merma-api --output=json | jq 'select(.room_id == "abc123-...")'
```

### 4.3 Backup do Postgres

Cron diário (instalar):

```bash
# /etc/cron.d/merma-backup
0 4 * * * postgres /usr/local/bin/merma-backup.sh
```

`/usr/local/bin/merma-backup.sh`:

```bash
#!/usr/bin/env bash
set -e
TS=$(date +%Y%m%d-%H%M)
pg_dump merma | gzip | openssl enc -aes-256-cbc -salt -pbkdf2 \
  -pass "file:/etc/merma/backup-key" \
  -out "/tmp/merma-${TS}.sql.gz.enc"
# Upload para B2
b2 file upload merma-backups "/tmp/merma-${TS}.sql.gz.enc" "/${TS}.sql.gz.enc"
rm "/tmp/merma-${TS}.sql.gz.enc"
# Limpar backups locais antigos
find /tmp -name "merma-*.sql.gz.enc" -mtime +1 -delete
```

---

## 5. Diagnóstico de Problemas Comuns

### 5.1 "API não responde"

```bash
# 1. API está rodando?
systemctl status merma-api
# se "failed": journalctl -u merma-api --since "5 min ago" para causa

# 2. Caddy está rodando?
systemctl status caddy

# 3. Postgres acessível?
sudo -u merma psql $POSTGRES_URL -c "SELECT 1"

# 4. Redis acessível?
redis-cli -a $REDIS_PASSWORD PING

# 5. Disco cheio?
df -h /

# 6. RAM cheia?
free -h

# 7. Resposta básica?
curl -v https://merma.example.com/health
```

### 5.2 "Latência alta"

```bash
# Ver p95 atual
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" https://merma.example.com/metrics \
  | grep submit_answer_duration

# Carga atual
top -bn1 | head -20

# Salas ativas
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" https://merma.example.com/metrics \
  | grep rooms_active

# Se >200 salas: considerar trigger de Fase 1
```

### 5.3 "Música não toca"

```bash
# Logs de áudio
journalctl -u merma-api --output=json --since "10 min ago" \
  | jq 'select(.event == "audio_unavailable" or .event == "deezer_request_failed")'

# Deezer respondendo?
curl -fsSL "https://api.deezer.com/2.0/track/3135556"

# Rate limit Deezer pisando o nosso?
journalctl -u merma-api --output=json --since "10 min ago" \
  | jq 'select(.event == "deezer_rate_limited")'
```

### 5.4 "Player não consegue reconectar"

```bash
# Snapshot existe no Redis?
redis-cli -a $REDIS_PASSWORD KEYS "room:*:snapshot"

# Carregar o snapshot pra ver estado
redis-cli -a $REDIS_PASSWORD GET "room:ABC123:snapshot" | jq

# Conexões WS abertas
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" https://merma.example.com/metrics \
  | grep ws_connections
```

### 5.5 "OAuth falha"

```bash
# State CSRF correto?
journalctl -u merma-api --output=json --since "10 min ago" \
  | jq 'select(.event == "oauth_state_mismatch" or .event == "oauth_failure")'

# Plataforma upstream OK?
curl -fsSL https://api.spotify.com/v1/me  # vai dar 401 sem token, mas confirma DNS+TLS
```

---

## 6. Recovery e Disaster Scenarios

### 6.1 Crash do processo Bun

**Sintomas:** `systemctl status merma-api` mostra `failed` ou `restarted`.

**Recovery automático:**
1. systemd reinicia em 2s.
2. `RecoveryService` lê snapshots Redis → recria `RoomActor`s.
3. Jogadores reconectam (cliente faz auto-reconnect) → recebem `room_state` fresco.

**Manual:** `systemctl restart merma-api`.

### 6.2 Crash da VPS inteira

**Sintomas:** site fora do ar; ping não responde.

**Ação:**
1. Verificar painel do provedor (Hostinger/Magalu) — pode ser host issue.
2. Reboot soft via painel.
3. Se sobe: tudo se auto-recupera (systemd + recovery service).
4. Se não sobe: contato com suporte do provedor; **RTO < 60min**.

### 6.3 Redis corrompido

**Sintomas:** `apps/api` no boot loga `redis_recovery_failed` repetidamente.

**Ação:**
1. `redis-cli -a $REDIS_PASSWORD FLUSHALL` (perde TODOS os snapshots — partidas ativas viram, ranking pra finalizadas é perdido).
2. Restart `apps/api`.
3. Aceito como **incidente** — registrar em `40-operations/incidents/`.

### 6.4 Postgres corrompido

**Sintomas:** queries falham com erro de relação ou disco.

**Ação:**
1. Modo manutenção: pausar `apps/api` (`systemctl stop merma-api`).
2. Tentar `VACUUM FULL` + `REINDEX`.
3. Se persistir: restore do último backup B2 (RTO ~30 min).
4. Anunciar perda de dados conforme janela do backup (≤24h).
5. Postmortem obrigatório.

### 6.5 Vazamento de OAuth tokens

**Sintomas:** alerta de Spotify/Deezer/Google sobre uso anômalo; user report.

**Ação imediata:**
1. Revogar todas as sessões: `psql -c "DELETE FROM connected_accounts;"`
2. Rotacionar `OAUTH_TOKEN_ENCRYPTION_KEY` em `.env` + restart.
3. Comunicado público + email aos usuários afetados (se temos email — não temos no MVP).
4. Reportar à ANPD em ≤72h se vazamento confirmado.
5. Postmortem público.

### 6.6 Domain expirado / DNS quebrado

**Sintomas:** Caddy não emite cert; site inacessível.

**Ação:**
1. Renovar domínio (provedor de DNS).
2. Verificar registros A/CNAME apontando para VPS.
3. `systemctl restart caddy` para forçar nova tentativa de ACME.

---

## 7. Queries Úteis

### 7.1 Saúde geral

```sql
-- Salas ativas agora
SELECT state, COUNT(*) FROM rooms_view WHERE active = true GROUP BY state;

-- Partidas hoje
SELECT COUNT(*) FROM matches WHERE created_at > now() - interval '1 day';

-- Conexões OAuth por plataforma
SELECT platform, COUNT(*) FROM connected_accounts GROUP BY platform;
```

### 7.2 Métricas de produto

```sql
-- DAU (jogadores únicos no dia)
SELECT DATE(last_seen_at) AS day, COUNT(DISTINCT player_uuid) AS dau
FROM player_sessions
WHERE last_seen_at > now() - interval '30 days'
GROUP BY day ORDER BY day;

-- Partidas/sessão média
SELECT AVG(matches_per_session) FROM (
  SELECT session_id, COUNT(*) AS matches_per_session
  FROM session_matches
  WHERE session_started > now() - interval '7 days'
  GROUP BY session_id
) t;

-- Recordes solo batidos esta semana
SELECT COUNT(*) FROM solo_personal_best_history
WHERE created_at > now() - interval '7 days' AND beat_previous = true;
```

### 7.3 Diagnóstico

```sql
-- Salas com partidas longas demais (possível leak)
SELECT room_id, invite_code, started_at, now() - started_at AS duration
FROM matches WHERE state = 'in_match'
ORDER BY duration DESC LIMIT 20;

-- Jogadores com taxa de erro suspeita (anti-cheat sinal)
SELECT player_uuid, COUNT(*) AS total, AVG(CASE WHEN is_correct THEN 1 ELSE 0 END) AS accuracy
FROM round_answers
WHERE created_at > now() - interval '1 day'
GROUP BY player_uuid HAVING COUNT(*) > 30 AND AVG(CASE WHEN is_correct THEN 1 ELSE 0 END) > 0.95;
```

---

## Changelog

- **2026-05-13:** primeira versão. Setup inicial completo do zero, deploy hard-cut da Fase 0, diagnóstico de 5 problemas comuns, recovery de 6 disaster scenarios, queries SQL úteis. Atualizar após primeiro deploy real e após cada incidente.
