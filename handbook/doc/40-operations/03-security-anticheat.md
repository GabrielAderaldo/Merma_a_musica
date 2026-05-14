---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Segurança e Anti-Cheat

> Consolidação do modelo de ameaças e mitigações. Reúne decisões espalhadas em [ADR-0002](../20-architecture/adrs/0002-server-hono.md), [ADR-0004](../20-architecture/adrs/0004-audio-deezer-as-engine.md), [`30-specs/02-audio.md`](../30-specs/02-audio.md), e este documento.

## Sumário

1. [Trust boundary](#1-trust-boundary)
2. [Modelo de ameaça](#2-modelo-de-ameaça)
3. [Mitigações por categoria](#3-mitigações-por-categoria)
4. [Secret management](#4-secret-management)
5. [Headers HTTP de segurança](#5-headers-http-de-segurança)
6. [WebSocket hardening](#6-websocket-hardening)
7. [Auditoria e alerting](#7-auditoria-e-alerting)

---

## 1. Trust Boundary

```
┌──────────────────────────────────────────────────────────────┐
│                  ZONA NÃO CONFIÁVEL                          │
│  (cliente, rede, ferramentas de inspeção, adversário ativo)  │
│                                                              │
│  Browser, DevTools, scripts injetados, MITM, bots,          │
│  Shazam, contas comprometidas, etc.                         │
└─────────────────────────┬────────────────────────────────────┘
                          │  TLS 1.3 (Caddy)
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                  ZONA CONFIÁVEL                              │
│            (servidor — sob nosso controle)                   │
│                                                              │
│  Caddy → Hono → RoomActor → Postgres/Redis                  │
│  Validação Zod, fuzzy match, scoring, audio proxy            │
│  Secrets em env, OAuth tokens encrypted at rest              │
└──────────────────────────────────────────────────────────────┘
```

**Regra de ouro:** **toda validação que importa para correção do jogo é feita no servidor.** Cliente é a UI, server é a autoridade.

Aplicações:
- Fuzzy match e cálculo de pontos **rodam só no server**.
- Timer da rodada é **medido no server**; client apenas exibe contagem.
- Autocomplete consulta pool no **server** (cliente não conhece o pool todo).
- `is_correct` nunca é enviado em `answer_confirmed` — só em `round_ended`.

---

## 2. Modelo de Ameaça

### 2.1 Atores adversários considerados

| Ator | Capacidade | Motivação |
|---|---|---|
| **Jogador "curioso"** | DevTools, inspeção de rede, leitura de payload | Burlar a rodada para vencer amigos |
| **Cúmplice externo** | Recebe URL/token compartilhado fora da sala | Auxiliar amigo via Shazam ou conhecimento |
| **Botnet** | Scripts automatizados que respondem instantaneamente | Inflar pontuação, derrubar servidor, scrape de dados |
| **MITM** | Intercepta tráfego em redes públicas | Roubar sessão, modificar respostas |
| **Vazamento de credenciais** | Acesso a logs, dump de banco | Massa de OAuth tokens |
| **Ataque coordenado** | Multi-conta, criação de salas em massa | DoS, abuso de quota Deezer |

### 2.2 Atores **fora** do modelo

Não consideramos no MVP:

- **Estado-nação** com capacidade ilimitada.
- **Vulnerabilidades zero-day** em Bun/Postgres/Redis/Caddy.
- **Backdoor de provider** (Hostinger, Magalu).

Aceitamos esses riscos como custos de operar.

---

## 3. Mitigações por Categoria

### 3.1 Inspeção do áudio (player tenta identificar música via DevTools)

| Ameaça | Mitigação |
|---|---|
| URL do preview Deezer visível | Proxy via `/api/v1/audio/{audio_token}` — URL opaca |
| Header `Content-Length` original revela tamanho | Strippado pelo proxy |
| Metadata ID3 do MP3 revela título/artista | ID3v1 e ID3v2 strippados (ver [`30-specs/02-audio.md#33`](../30-specs/02-audio.md)) |
| `Range: bytes=` para inspeção fragmentada | Rejeitado pelo proxy com 416 |
| Reusar token para nova análise | Single-use enforcement via `Set` no RoomActor |

### 3.2 Compartilhamento de token

| Ameaça | Mitigação |
|---|---|
| Player A envia URL para player B (mesma sala) | HMAC vinculado a `player_uuid` — B recebe 401 |
| Player envia URL para fora da sala (cúmplice com Shazam) | Token expira no fim da rodada (TTL = `time_per_round`) |
| Múltiplas requests com mesmo token | Single-use; segunda request recebe 410 |

### 3.3 Manipulação de tempo

| Ameaça | Mitigação |
|---|---|
| Cliente fake-respondeu rápido (mexe `Date.now()`) | Server calcula `response_time = server_now - timer_started_at_server` — cliente não influencia |
| Cliente envia `submitted_at` no payload | Server **ignora** qualquer timestamp do cliente; usa o seu |

### 3.4 Múltiplas conexões

| Ameaça | Mitigação |
|---|---|
| Player abre 2 abas com mesma identidade | Server detecta segunda conexão WS com mesmo `player_uuid` em mesma sala, fecha a antiga com close code 4001 |
| Player troca cookies/localStorage para fingir ser outra pessoa | Funciona, mas é **outro player** — não dá ganho. Mecânica do jogo tolera. |
| Player dá login OAuth em duas accs distintas no mesmo browser | Permitido (decisão do GDD — múltiplas accs por client/IP OK) |

### 3.5 Bots

| Ameaça | Mitigação |
|---|---|
| Script que escuta áudio + Shazam API + submit instantâneo | Rate limit `submit_answer` 10/s; padrão "100% accuracy + < 1s response" vira **flag em métricas** (`merma_suspicious_pattern_total`) — investigação manual; sem ação automática no MVP |
| Spam de salas (`POST /api/v1/rooms`) | Rate limit 10 salas/hora por `player_uuid` |
| Spam de autocomplete (DoS leve) | Rate limit 5 req/s; debounce client-side 300ms |
| Spam de imports | Rate limit 5 imports concorrentes por `player_uuid` |

### 3.6 MITM

| Ameaça | Mitigação |
|---|---|
| Interceptação de tráfego em Wi-Fi público | TLS 1.3 obrigatório (Caddy) + HSTS max-age 1 ano |
| Downgrade attack | HSTS `includeSubDomains; preload` |
| Cookie roubado | `__Host-` prefix + `HttpOnly` + `Secure` + `SameSite=Strict` |
| CSRF em POST | `SameSite=Strict` cobre; `Origin` header validado em mutações REST |

### 3.7 Vazamento de credenciais

| Ameaça | Mitigação |
|---|---|
| Dump do Postgres expõe OAuth tokens | Refresh tokens encriptados com AES-256-GCM ([`02-privacy-lgpd.md`](02-privacy-lgpd.md) §7.1) |
| Vazamento da chave de encriptação | Chave em `.env` com `chmod 600`; rotacionável (manualmente). Política de rotação anual. |
| Logs com PII | `answer_text` nunca logado; OAuth tokens nunca logados; revisão de logs antes de habilitar Sentry |
| Backups em B2 vazados | Encriptados antes do upload com chave dedicada; chave **não** está no servidor |

### 3.8 Anti-cheats que **NÃO** implementamos

| Não-mitigação | Razão |
|---|---|
| **Shazam ao fundo** | Tecnicamente impossível detectar/impedir. Aceitamos como custo. |
| **Mods do browser/extensions** | Não temos controle. Não rodamos código privilegiado. |
| **Captcha em login** | Friction de UX > ganho real para um game free anônimo |
| **VPN detection** | Friction sem ganho — não recompensa por região |
| **Device fingerprinting** | Princípio de minimização ([`02-privacy-lgpd.md`](02-privacy-lgpd.md)) |

---

## 4. Secret Management

### 4.1 Lista de secrets

| Secret | Local | Rotação |
|---|---|---|
| `SESSION_SECRET` | `.env` | Anual ou em incidente |
| `AUDIO_HMAC_SECRET` | `.env` | Anual ou em incidente |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | `.env` | Anual; em rotação, re-encrypt em background job |
| `SPOTIFY_CLIENT_SECRET` | `.env` | Conforme política Spotify |
| `DEEZER_APP_SECRET` | `.env` | Conforme política Deezer |
| `GOOGLE_CLIENT_SECRET` | `.env` | Conforme política Google |
| Postgres senha | `.env` (postgres URL) | Anual |
| Redis `requirepass` | `.env` (REDIS_URL) | Anual |
| `METRICS_AUTH_TOKEN` | `.env` | Trimestral |
| `SENTRY_DSN` | `.env` (não é secret crítico) | Em incidente |
| Backup encryption key | **NÃO no servidor** — local seguro do mantenedor | Anual |

### 4.2 Não commitar

`.gitignore` cobre:
```
.env
.env.local
.env.production
*.pem
*.key
```

Pré-commit hook (futuro): scan via `git-secrets` ou `truffleHog` para evitar leak acidental.

### 4.3 Geração

Todos os 32-byte secrets:
```bash
openssl rand -base64 32
```

### 4.4 Distribuição em N VPS (Fase 1)

Quando virar N nodes: secrets compartilhados via **sealed env** (e.g., `sops` ou `age`) commitados encrypted; chave de descriptografia entregue manualmente a cada VPS. Nada vai pro git em claro.

---

## 5. Headers HTTP de Segurança

Aplicados pelo Caddy globalmente:

```caddy
merma.example.com {
    # ...

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; connect-src 'self' wss://merma.example.com https://sdk.scdn.co; img-src 'self' data: https://*.scdn.co https://*.dzcdn.net; media-src 'self' blob:; script-src 'self' https://sdk.scdn.co; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
    }

    # ...
}
```

### 5.1 CSP

- **`script-src 'self' https://sdk.scdn.co`** — permite o Spotify SDK quando carregado dinamicamente; nada de inline scripts.
- **`connect-src 'self' wss://merma.example.com https://sdk.scdn.co`** — WS + Spotify SDK; sem chamadas a third-parties não previstos.
- **`media-src 'self' blob:`** — para áudio servido via proxy.
- **`frame-ancestors 'none'`** — anti-clickjacking.

### 5.2 Cookies

Apenas dois cookies:

| Cookie | Atributos |
|---|---|
| `__Host-session` | `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000` (30d) |
| `__Host-csrf` (durante OAuth) | `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600` (10min) |

`SameSite=Lax` no CSRF cookie é necessário pra funcionar com redirect cross-site da plataforma OAuth.

---

## 6. WebSocket Hardening

### 6.1 Validação de Origin no handshake

```typescript
app.upgradeWebSocket("/ws/room/:invite_code", {
  open: (ws, req) => {
    const origin = req.headers.get("origin");
    const allowed = [
      "https://merma.example.com",
      "http://localhost:5173",   // dev
    ];
    if (!allowed.includes(origin ?? "")) {
      ws.close(1008, "origin not allowed");
      return;
    }
    // ...
  }
});
```

### 6.2 Validação de payload

Toda mensagem WS é parsed e validada via Zod (`@merma/schema`). Payload inválido → fecha conexão com close code 1003 (invalid frame).

### 6.3 Rate limiting

Token bucket por (`player_uuid`, `room_id`):

| Mensagem | Limite |
|---|---|
| `submit_answer` | 10/s |
| `autocomplete_search` | 5/s |
| Qualquer outra | 30/s combinado |

Excedeu → 1ª violação envia `error: rate_limited`; 3ª violação fecha conexão com close code 4029.

### 6.4 Close codes

| Code | Significado |
|---|---|
| 1000 | Normal closure (player saiu) |
| 1003 | Invalid frame data |
| 1008 | Policy violation (origin não permitido) |
| 4001 | Duplicate player_uuid (conexão antiga fechada) |
| 4002 | Banned (não usado no MVP) |
| 4029 | Rate limit excedido repetidamente |

---

## 7. Auditoria e Alerting

### 7.1 Eventos de segurança logados

Nível `audit` no stdout JSON:

```jsonc
{ "event": "audio_token_invalid_signature", "level": "warn", "player_uuid": "...", "remote_ip": "..." }
{ "event": "audio_token_player_mismatch", "level": "warn", ... }
{ "event": "audio_token_already_used", "level": "warn", ... }
{ "event": "audio_range_request_rejected", "level": "warn", ... }
{ "event": "ws_duplicate_player_uuid_closed", "level": "info", ... }
{ "event": "ws_rate_limit_exceeded", "level": "warn", ... }
{ "event": "ws_invalid_payload", "level": "warn", ... }
{ "event": "oauth_state_mismatch", "level": "warn", ... }
{ "event": "rest_csrf_origin_mismatch", "level": "warn", ... }
{ "event": "suspicious_pattern_detected", "level": "warn", "pattern": "instant_100pct_accuracy", ... }
```

### 7.2 Métricas Prometheus para alarme

```
merma_security_event_total{kind="audio_token_invalid"} 0
merma_security_event_total{kind="audio_token_mismatch"} 0
merma_security_event_total{kind="rate_limit_exceeded"} 0
merma_security_event_total{kind="ws_invalid_payload"} 0
```

### 7.3 Limiares de alarme manual

(Não há alertmanager no MVP — checagem manual semanal):

| Métrica | Alarme se |
|---|---|
| `audio_token_invalid_signature` | > 100/h durante 2h consecutivas |
| `ws_duplicate_player_uuid_closed` | > 10× a média normal — pode indicar conta comprometida |
| `oauth_state_mismatch` | > 5/h — pode indicar tentativa de CSRF |
| `suspicious_pattern_detected` | qualquer ocorrência → investigar manualmente |
| HTTP 5xx rate | > 1% por hora |

### 7.4 Vulnerability disclosure

Política pública em `apps/web/legal/security.md` (a criar):

- Como reportar: email ou issue private no GitHub Org.
- Coordinated disclosure: agradecemos 90 dias para correção antes de divulgação pública.
- Sem bounty no MVP (game free), mas com agradecimento público quem ajudar.

---

## Changelog

- **2026-05-13:** primeira versão consolidada. Reúne mitigações de ADR-0002 (sticky), ADR-0004 (HMAC), `30-specs/02-audio.md` (ID3 strip, anti-cheat) + adiciona: trust boundary explícito, modelo de ameaça por ator, secret management, CSP completo, WS hardening, eventos de auditoria.
