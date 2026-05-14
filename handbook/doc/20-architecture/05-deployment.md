---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Deployment

Topologia de produção em duas fases:

- **Fase 0 — MVP (1 VPS, hoje):** tudo num único host. Simples, baixo custo.
- **Fase 1 — Crescimento (N VPS, futuro):** sharding horizontal quando necessário. Estrutura prevista, código preparado para esta evolução desde o dia 1 (sticky routing, snapshot Redis compartilhado).

A **arquitetura** foi desenhada para 10.000+ lobbies simultâneos como exercício técnico ([respostas do escopo](#), pergunta 1 do alinhamento). O **deployment inicial** roda numa única VPS — escala vertical primeiro, horizontal depois quando houver dor real.

---

## Fase 0 — MVP em 1 VPS

```mermaid
flowchart TB
    Internet[(🌐 Internet)]

    subgraph vps["🖥️ VPS — merma.example.com"]
        Caddy["🚦 Caddy 2.x<br/>:443 HTTPS<br/>:80 → :443 redirect"]
        API["⚙️ apps/api (Bun + Hono)<br/>:3000 loopback only"]
        PG[("🗃️ Postgres 16<br/>:5432 loopback only<br/>volume: /var/lib/postgresql")]
        RD[("⚡ Redis 7.x<br/>:6379 loopback only<br/>requirepass + AOF<br/>volume: /var/lib/redis")]
        FS[/"📦 static assets<br/>/srv/merma/web/dist"/]
    end

    Internet --> Caddy
    Caddy --> API
    Caddy -. serve estático .-> FS
    API <--> PG
    API <--> RD

    style vps fill:#f0f4f8,stroke:#333
```

### Por VPS — uma VPS hoje

| Componente | Processo | Porta | Memória estimada | Notas |
|---|---|---|---|---|
| Caddy 2.x | systemd unit | 80/443 público | ~50 MB | TLS auto (Let's Encrypt). Serve `apps/web/dist` direto. |
| `apps/api` (Bun) | systemd unit | 3000 loopback | ~200-500 MB (depende de salas ativas) | Watchdog: restart automático em crash. |
| Postgres 16 | systemd unit | 5432 loopback | ~256-512 MB | Volume persistente para `data/`. |
| Redis 7.x | systemd unit | 6379 loopback | ~64-128 MB | `requirepass` obrigatório. AOF ativo. Volume `/var/lib/redis`. |

**Total estimado:** ~600 MB-1.2 GB de RAM, ~2-4 GB de disco persistente. VPS de 2GB RAM cobre o MVP com folga.

### Configuração do Caddyfile (esqueleto)

```caddy
{
    email seu@email.com
    # rate limiting global pode entrar aqui
}

merma.example.com {
    encode zstd gzip

    # WebSocket route — sticky hash de invite_code
    @ws path /ws/room/*
    handle @ws {
        reverse_proxy 127.0.0.1:3000
        # Em N≥2 nodes, configurar hash sticky aqui:
        # reverse_proxy node1:3000 node2:3000 {
        #     lb_policy header X-Invite-Code
        #     # OU: extract invite_code do path /ws/room/{code}
        # }
    }

    # REST API
    handle_path /api/* {
        reverse_proxy 127.0.0.1:3000
    }

    # OAuth callbacks (fora de /api por convenção)
    handle_path /auth/* {
        reverse_proxy 127.0.0.1:3000
    }

    # static SPA
    root * /srv/merma/web/dist
    try_files {path} /index.html
    file_server
}
```

### Sequência de deploy hard-cut (MVP)

1. Em janela de baixo uso (recomendado: 03h-05h BRT).
2. Snapshot final do estado: nada especial, Redis já tem snapshot recente.
3. `systemctl stop merma-api`.
4. Atualizar bundle: `git pull && bun install && bun build`.
5. Migrações Postgres pendentes: `bun run db:migrate`.
6. `systemctl start merma-api`.
7. `RecoveryService` no startup re-hidrata `RoomActor`s a partir de snapshots Redis.
8. Salas que estavam ativas: jogadores reconectam → retomam.
9. Salas que não estavam ativas: snapshot expira por TTL (30 min).

**Tempo de downtime alvo:** < 30s entre stop e start. Aceitável para janela de baixo uso.

### Variáveis de ambiente principais

```env
# Server
PORT=3000
PUBLIC_BASE_URL=https://merma.example.com

# Database
POSTGRES_URL=postgres://merma:****@127.0.0.1:5432/merma

# Redis
REDIS_URL=redis://:****@127.0.0.1:6379

# OAuth — Spotify
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=https://merma.example.com/auth/spotify/callback

# OAuth — Deezer
DEEZER_APP_ID=...
DEEZER_APP_SECRET=...
DEEZER_REDIRECT_URI=https://merma.example.com/auth/deezer/callback

# OAuth — YouTube Music
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://merma.example.com/auth/youtube/callback

# Crypto
SESSION_SECRET=...               # 32-byte random, para cookie session
AUDIO_HMAC_SECRET=...            # 32-byte random, para audio_token HMAC
OAUTH_TOKEN_ENCRYPTION_KEY=...   # 32-byte random, para encrypt refresh tokens

# Observability
SENTRY_DSN=https://...@sentry.io/...   # opcional; off por padrão em dev
LOG_LEVEL=info
METRICS_AUTH_TOKEN=...           # opcional; protege /metrics
```

Secret store: `.env` no servidor + `chmod 600`. **Não commitado**. Backup criptografado em local seguro.

---

## Fase 1 — N VPS (futuro)

Gatilho para evolução: **>500 lobbies concorrentes consistentemente OU >50% CPU médio no node único**.

```mermaid
flowchart TB
    Internet[(🌐 Internet)]

    subgraph lb["🚦 Caddy LB (1 VPS dedicada)"]
        Caddy["Caddy 2.x<br/>sticky hash por path<br/>(invite_code)"]
    end

    subgraph apinodes["⚙️ API Nodes (N VPS, scale horizontal)"]
        N1["apps/api node 1<br/>RoomActors A..M"]
        N2["apps/api node 2<br/>RoomActors N..Z"]
        N3["apps/api node 3<br/>(spare)"]
    end

    subgraph data["🗃️ Data Tier (1 VPS dedicada)"]
        PG[("Postgres 16<br/>com réplica leitura?<br/>(pós-MVP)")]
        RD[("Redis 7.x<br/>compartilhado<br/>Sentinel opcional")]
    end

    Internet --> Caddy
    Caddy --> N1
    Caddy --> N2
    Caddy --> N3
    N1 --> PG
    N2 --> PG
    N3 --> PG
    N1 --> RD
    N2 --> RD
    N3 --> RD

    style lb fill:#fff3cd
    style apinodes fill:#d4edda
    style data fill:#cce5ff
```

### Mudanças de configuração ao escalar

| Item | Fase 0 (1 VPS) | Fase 1 (N VPS) |
|---|---|---|
| Caddy | Mesma máquina, reverse_proxy localhost | VPS dedicada, sticky upstream pool |
| Routing | Loopback | TCP + sticky por hash do `invite_code` extraído do path |
| Postgres | Mesma máquina | VPS dedicada; cliente aponta via TLS |
| Redis | Mesma máquina | VPS dedicada; cliente aponta via TLS + auth |
| `RecoveryService` | Lê snapshots locais | Lê snapshots remotos (mesmo Redis compartilhado) |
| Snapshot writer | Escreve em Redis local | Escreve em Redis remoto |
| Latência inter-VPS | ~0ms (loopback) | ~0.5-2ms (LAN privada do provedor) |

### Sticky routing — detalhe

O Caddy LB precisa extrair `invite_code` do path da WS request e usar como chave de hash consistente:

```caddy
# pseudo-config — sintaxe real depende da versão do Caddy
@ws path /ws/room/*
handle @ws {
    # capture do invite_code do path
    map {path} {invite_code} {
        ~^/ws/room/([A-Z0-9]+) ${1}
    }
    reverse_proxy {
        to api-node-1:3000 api-node-2:3000 api-node-3:3000
        lb_policy ip_hash      # FALLBACK (não ideal)
        # ideal: hash {invite_code} (verificar suporte da versão Caddy)
    }
}
```

> **A pesquisar:** Caddy v2.x suporta nativamente hash custom por header/path? Se não, alternativa é usar um pequeno proxy intermediário (e.g., HAProxy) ou um plugin Caddy. **Não decidido nesta fase** — não é problema enquanto rodamos 1 VPS. Issue para abrir quando chegar perto do gatilho.

### Migração 0 → 1 (zero-downtime planejado)

1. Subir VPS dedicadas para Postgres e Redis.
2. Migrar dados (`pg_dump`/restore para Postgres; cópia AOF do Redis — janela curta).
3. Ajustar `POSTGRES_URL` e `REDIS_URL` do `apps/api` para apontar nas VPS novas.
4. Restart da `apps/api` (downtime curto).
5. Subir 2ª VPS de `apps/api`; configurar Caddy para fazer sticky entre as duas.
6. A partir daqui, deploys subsequentes podem ser **rolling drain**: drain 1 node, deploy, esperar esvaziar, restart, drain o outro.

---

## Domínio, DNS e TLS

- **Domínio:** já temos (`merma.example.com`). Convenção:
  - `merma.example.com` → app principal.
  - `dev.merma.example.com` (opcional) → staging.
- **DNS:** registros A para a VPS (Fase 0) ou para o Caddy LB (Fase 1).
- **TLS:** Caddy emite e renova automaticamente via Let's Encrypt. Certificado wildcard se algum dia formos multi-subdomain.

---

## Backups

| Recurso | Estratégia |
|---|---|
| **Postgres** | `pg_dump` diário (cron systemd) → arquivo encriptado → backup off-site (S3-compatible, e.g., Backblaze B2 free tier). Retenção: 14 dias. |
| **Redis** | AOF habilitado. Sem backup off-site (estado transiente). |
| **Código + config** | Git (GitHub Org). `.env` em local separado encriptado. |
| **Static assets do `apps/web/dist`** | Rebuild reproduzível do código; não precisa backup. |

---

## Custos estimados (Fase 0)

| Item | Custo mensal |
|---|---|
| VPS (Hostinger / Magalu Cloud / Hetzner 2GB) | ~R$ 30-60 |
| Domínio | já pago anualmente |
| Sentry free tier | R$ 0 |
| Backblaze B2 (backups <10GB) | ~R$ 5 |
| **Total estimado** | **~R$ 35-70/mês** |

Sustentável para um game free indefinidamente.

---

## Changelog

- **2026-05-13:** primeira versão. Cobre Fase 0 (1 VPS, MVP) e Fase 1 (N VPS, futuro). Stack final com Caddy + Bun/Hono + Postgres + Redis.
