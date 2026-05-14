---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Spec — Motor de Áudio

> Implementação detalhada de como Mermã resolve, entrega e protege o áudio do jogo. Vive em `apps/api/audio/`.
>
> Decisão arquitetural: [ADR-0004](../20-architecture/adrs/0004-audio-deezer-as-engine.md).

## Sumário

1. [Cadeia de resolução](#1-cadeia-de-resolução)
2. [Token de áudio (HMAC)](#2-token-de-áudio-hmac)
3. [Proxy de áudio](#3-proxy-de-áudio)
4. [Cache (ISRC e MP3)](#4-cache-isrc-e-mp3)
5. [Fallback Spotify Web Playback SDK](#5-fallback-spotify-web-playback-sdk)
6. [Anti-cheat completo](#6-anti-cheat-completo)
7. [Rate limit e backpressure](#7-rate-limit-e-backpressure)
8. [Estratégia de testes](#8-estratégia-de-testes)

---

## 1. Cadeia de Resolução

Dada uma `NormalizedSong` qualquer (vinda de qualquer plataforma), o motor produz um `audio_token` opaco que o cliente usa para baixar o stream via proxy.

```
NormalizedSong (raw: spotify_id, name, artist, isrc?)
       │
       ▼
ISRC presente?
   ├── SIM ─► query Redis (cache 24h):  isrc:{ISRC}:deezer
   │             ├── HIT  ─► deezer_track_id
   │             └── MISS ─► GET deezer.com/2.0/track/isrc:{ISRC}
   │                            ├── 200 ─► armazena no Redis (TTL 24h) ─► deezer_track_id
   │                            └── 404 ─► fallback por nome
   │
   └── NÃO ─► fallback por nome
                  ▼
            GET deezer.com/2.0/search?q="track:NAME artist:ARTIST"
                  ├── primeiro hit (com score >0.6) ─► deezer_track_id
                  └── sem hits ─► tentativa Spotify Premium ([§5](#5-fallback-spotify-web-playback-sdk))
                                       └── sem fallback ─► song descartada do pool
```

### 1.1 Module: `apps/api/audio/AudioResolver.ts`

```typescript
import type { NormalizedSong, Isrc } from "@merma/domain";

type ResolvedAudio = Readonly<{
  source: "deezer" | "spotify_sdk";
  deezer_track_id?: string;
  spotify_uri?: string;
  preview_duration_ms: number;
}>;

type ResolveError =
  | "isrc_not_found_anywhere"
  | "deezer_api_error"
  | "deezer_rate_limited"
  | "no_premium_fallback";

export const resolveSongAudio = async (
  song: NormalizedSong,
): Promise<Result<ResolvedAudio, ResolveError>> => { /* ... */ };
```

### 1.2 Throttling do Deezer

API pública Deezer: **50 requisições / 5 segundos** por IP. Implementação via **token bucket** in-memory:

```typescript
class DeezerThrottler {
  private tokens = 50;
  private lastRefill = Date.now();

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens <= 0) {
      const wait_ms = 5000 - (Date.now() - this.lastRefill);
      await sleep(wait_ms);
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    if (Date.now() - this.lastRefill >= 5000) {
      this.tokens = 50;
      this.lastRefill = Date.now();
    }
  }
}
```

Throttler é **singleton por processo Bun**. Em N nodes, cada um tem o seu — se virar problema, mover para Redis Lua (pós-MVP).

---

## 2. Token de Áudio (HMAC)

### 2.1 Estrutura

```
audio_token = base64url( HMAC-SHA256(AUDIO_HMAC_SECRET, payload) || payload )
payload = base64url( JSON.stringify({ p, r, x }) )
```

Onde:
- `p` = `player_uuid`
- `r` = `round_id`
- `x` = `expiry_unix_ms`

Tamanho típico: ~120 caracteres (URL-safe).

### 2.2 Geração

```typescript
import { createHmac, randomUUID } from "node:crypto";

const AUDIO_HMAC_SECRET = process.env.AUDIO_HMAC_SECRET!;

export const generateAudioToken = (
  player_uuid: PlayerUuid,
  round_id: RoundId,
  ttl_ms: number,
): AudioToken => {
  const payload = JSON.stringify({
    p: player_uuid,
    r: round_id,
    x: Date.now() + ttl_ms,
  });
  const payload_b64 = base64UrlEncode(Buffer.from(payload, "utf8"));
  const sig = createHmac("sha256", AUDIO_HMAC_SECRET).update(payload_b64).digest();
  const sig_b64 = base64UrlEncode(sig);
  return `${sig_b64}.${payload_b64}` as AudioToken;
};
```

### 2.3 Verificação

```typescript
export const verifyAudioToken = (
  token: string,
  expected_player_uuid: PlayerUuid,
): Result<{ player_uuid: PlayerUuid; round_id: RoundId; expiry: number }, VerifyError> => {
  const [sig_b64, payload_b64] = token.split(".");
  if (!sig_b64 || !payload_b64) return err("malformed");

  const expected_sig = createHmac("sha256", AUDIO_HMAC_SECRET).update(payload_b64).digest();
  const provided_sig = base64UrlDecode(sig_b64);
  if (!timingSafeEqual(expected_sig, provided_sig)) return err("invalid_signature");

  const payload = JSON.parse(base64UrlDecode(payload_b64).toString("utf8"));
  if (payload.p !== expected_player_uuid) return err("player_mismatch");
  if (Date.now() > payload.x) return err("expired");

  return ok(payload);
};

type VerifyError =
  | "malformed"
  | "invalid_signature"
  | "player_mismatch"
  | "expired";
```

### 2.4 Single-use enforcement

HMAC + expiry **não** garantem single-use por si só. Para isso, mantemos `used_tokens: Set<string>` em memória do RoomActor + lookup em Redis:

```typescript
class RoomActor {
  private used_tokens = new Set<string>();

  async consumeToken(token: string): Promise<Result<true, "already_used">> {
    if (this.used_tokens.has(token)) return err("already_used");
    this.used_tokens.add(token);
    // limpar `used_tokens` no fim da rodada
    return ok(true);
  }
}
```

### 2.5 Por que esse design

- **HMAC** garante que só o servidor pode gerar tokens válidos — frontend não consegue forjar.
- **Player binding (`p`)** impede compartilhar URL para um cúmplice.
- **Round binding (`r`)** permite revogar todos os tokens de uma rodada de uma vez (basta limpar `used_tokens`).
- **Expiry (`x`)** evita reuso fora da janela.
- **Single-use** impede análise repetida pelo mesmo jogador (recarregar a página, baixar 100 vezes).

---

## 3. Proxy de Áudio

### 3.1 Endpoint

```
GET /api/v1/audio/{audio_token}
```

### 3.2 Handler

```typescript
import { Hono } from "hono";
import { verifyAudioToken } from "../audio/token";

const audio = new Hono();

audio.get("/audio/:token", async (c) => {
  const session_player = c.get("player_uuid");
  if (!session_player) return c.json({ error: "unauthenticated" }, 401);

  const verify = verifyAudioToken(c.req.param("token"), session_player);
  if (!verify.ok) {
    return c.json({ error: verify.error }, 401);
  }

  // single-use check (RoomActor)
  const room = roomRegistry.getRoomByRound(verify.value.round_id);
  if (!room) return c.json({ error: "round_expired" }, 410);
  const consume = await room.consumeToken(c.req.param("token"));
  if (!consume.ok) return c.json({ error: "token_already_used" }, 410);

  // Rejeitar range parcial — anti-cheat ([§6](#6-anti-cheat-completo))
  if (c.req.header("range")) {
    return c.json({ error: "partial_request_not_supported" }, 416);
  }

  // buscar MP3 cacheado em memória do RoomActor
  const mp3 = await room.getCachedAudioForRound(verify.value.round_id);
  if (!mp3) return c.json({ error: "audio_not_ready" }, 503);

  // resposta sanitizada
  return new Response(mp3.bytes, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(mp3.bytes.length),
      "Cache-Control": "no-store, private",
      // SEM ID3, SEM "Content-Length" original
    },
  });
});
```

### 3.3 Sanitização do MP3

Quando baixamos o preview do Deezer, ele vem com headers ID3 que incluem `TIT2` (Title), `TPE1` (Artist), `TALB` (Album). Esses **identificam** a música via DevTools.

Pipeline:

```typescript
const buf = await fetch(deezer_preview_url).then(r => r.arrayBuffer());
const cleaned = stripId3(new Uint8Array(buf));
```

`stripId3` remove:
- Tag ID3v2 do início (variable length, identificada por magic bytes `49 44 33` + tamanho declarado em `[6..10]`).
- Tag ID3v1 do fim (128 bytes fixos, magic `54 41 47` no offset `length - 128`).

Implementação ~40 linhas em `apps/api/audio/strip-id3.ts`.

### 3.4 Streaming vs buffer completo

Para previews de 30s (~500 KB em MP3 128kbps), **buffer completo** em memória é aceitável. Não precisamos de streaming progressivo no MVP. Trade-off: TTFB ligeiramente maior (precisa baixar tudo antes de servir), mas controle total sobre o conteúdo entregue ao cliente.

Caso vire dor (pre-buffering largos), considerar streaming com strip ID3 in-flight (mais complexo).

---

## 4. Cache (ISRC e MP3)

### 4.1 Cache de ISRC → Deezer track ID

Vive em **Redis** com TTL de 24h:

```
Key: isrc:Z:{ISRC}:deezer
Val: { deezer_track_id, preview_url, fetched_at }
TTL: 86400
```

Por que Redis (e não memória do processo): cache compartilhado entre nodes (Fase 1) é essencial. Em 1 VPS (Fase 0), Redis local serve igualmente bem.

### 4.2 Cache de preview MP3

Vive em **memória do RoomActor**, NÃO em Redis:

```typescript
class RoomActor {
  // chave: round_id (não song_id — porque ISRC repetido em rounds diferentes tem tokens diferentes)
  private audio_cache = new Map<RoundId, { bytes: Uint8Array; fetched_at: number }>();

  async getCachedAudioForRound(round_id: RoundId): Promise<{ bytes: Uint8Array } | null> {
    const cached = this.audio_cache.get(round_id);
    if (cached) return cached;
    // miss — baixa, strippa, cacheia
    const song = this.match.rounds[this.current_round_index].song;
    const resolved = await resolveSongAudio(song);
    if (!resolved.ok) return null;
    const cleaned = stripId3(await fetchPreview(resolved.value));
    const entry = { bytes: cleaned, fetched_at: Date.now() };
    this.audio_cache.set(round_id, entry);
    return entry;
  }
}
```

**Limpeza:** ao final da rodada (`round_ended`), entrada é removida do cache para liberar memória.

### 4.3 Por que cache local (não Redis) para MP3

- **Tamanho**: ~500 KB × 20 jogadores ativos × 5 rounds em cache = 50 MB. Aceitável em memória; ruim em Redis.
- **Reuso entre jogadores da mesma sala**: 1 download Deezer → 20 streams locais.
- **Reuso entre salas é raro** (cada sala tem pool próprio). Não vale Redis.

---

## 5. Fallback Spotify Web Playback SDK

### 5.1 Quando aciona

- Música **não foi encontrada no Deezer** (ISRC missing + fallback name+artist falhou).
- Música é **vital** (pool de reserva esgotado).
- Dono da música tem **conta Spotify Premium** conectada.
- Browser é **compatível** (Chrome/Edge/Firefox; **não** Safari iOS).

Se qualquer condição falha → música é descartada silenciosamente (próxima do pool de reserva).

### 5.2 Como funciona

- Server emite `round_starting` com `audio_source: "spotify_sdk"` e `spotify_uri` em vez de `audio_token`.
- Cliente carrega Spotify Web Playback SDK (lazy load only quando precisa).
- Cliente chama `player.play({ uris: [spotify_uri] })`.
- Áudio toca **direto do Spotify** — sem passar pelo nosso proxy.
- **Tradeoff**: anti-cheat de áudio não cobre esse caso (cliente vê metadata do Spotify SDK). Mas é caso raro o suficiente que aceitamos.

### 5.3 Frontend handling

```typescript
// apps/web/src/lib/audio-player.ts
export const playAudio = async (params: AudioPayload) => {
  if (params.audio_source === "deezer") {
    const audio = new Audio(`/api/v1/audio/${params.audio_token}`);
    audio.play();
    return audio;
  } else if (params.audio_source === "spotify_sdk") {
    const sdk = await loadSpotifySDK();
    return sdk.play(params.spotify_uri);
  }
};
```

### 5.4 Notificação ao jogador

Se a maioria das rodadas estiver caindo em Spotify SDK, o host vê aviso: "Algumas músicas da playlist não estão disponíveis no Deezer — fallback Spotify Premium em uso." Esse aviso entra em **roadmap pós-MVP**.

---

## 6. Anti-cheat Completo

### 6.1 Modelo de ameaça

| Ataque | Vetor | Mitigação |
|---|---|---|
| **DevTools Network** | Cliente inspeciona requests, vê URL/headers | Proxy via `/api/v1/audio/...` — URL opaca; headers ID3 strippados |
| **Compartilhar URL** | Player A captura URL e manda para Player B da mesma sala baixar e analisar | HMAC vinculado a `player_uuid` — Player B recebe `401 player_mismatch` |
| **Compartilhar URL fora da sala** | Player envia URL para alguém com Shazam | HMAC + single-use + TTL = duração da rodada |
| **Recarregar página** | Player baixa o token de novo via reload e usa em outra aba | Single-use enforcement (token consumido na 1ª request) |
| **Range bytes attack** | Player pede `Range: bytes=0-100` para inspeção fragmentada | Servidor rejeita `Range` header (`416`) |
| **MITM** | Atacante intercepta o tráfego e extrai URL/audio | TLS obrigatório (Caddy força HTTPS); HSTS |
| **Shazam ao fundo** | Player toca o áudio no Mermã e tem Shazam aberto no celular | **Impossível impedir.** Aceita-se como custo de existir. Mitigação: jogo não recompensa "perdedor consistente" excessivamente. |
| **Bot automatizando autocomplete + submit** | Player roda script que ouve áudio, faz Shazam via API, e responde antes do humano | Rate limit por (`player_uuid`, `room_id`); detecção de padrão "instant + 100% accuracy" como flag em métricas |
| **Speedhack (cliente mexe `Date.now()`)** | Para inflar `response_time` | Server é fonte da verdade — `response_time = server_now - timer_started_at_server` |
| **Multiple connections com mesmo `player_uuid`** | Jogador abre 2 abas e responde por 2 navegadores | Server detecta WS duplicado com mesmo `player_uuid` e fecha a antiga (`close code 4001`) |

### 6.2 Audit log

Eventos de segurança (`stdout` JSON, conforme [ADR-0010](../20-architecture/adrs/0010-observability-minimal.md)):

```jsonc
{ "event": "audio_token_invalid_signature",  "level": "warn", ... }
{ "event": "audio_token_player_mismatch",    "level": "warn", ... }
{ "event": "audio_token_already_used",       "level": "warn", ... }
{ "event": "audio_range_request_rejected",   "level": "warn", ... }
{ "event": "ws_duplicate_player_uuid_closed","level": "warn", ... }
```

Alarme manual se algum desses > 100/h — pode indicar tentativa de cheat coordenada.

---

## 7. Rate Limit e Backpressure

### 7.1 Rate limit por jogador

| Endpoint | Limite |
|---|---|
| `GET /api/v1/audio/:token` | **1 request por (player_uuid, round_id)** (enforced via single-use) |
| `WS submit_answer` | 10 req/segundo por (player_uuid, room_id) |
| `WS autocomplete_search` | 5 req/segundo por (player_uuid, room_id) — com debounce 300ms client-side |
| `POST /api/v1/playlists/import` | 5 imports concorrentes por player_uuid |

Implementação: token bucket in-memory por player no `RoomActor`.

### 7.2 Backpressure no Deezer

Throttler global (§1.2): 50 req/5s. Se buffer enche, requests novos **esperam** até liberar — não dropam.

Em caso de Deezer 5xx ou timeout >10s, marca como **música indisponível** e segue para próxima do pool.

---

## 8. Estratégia de Testes

### 8.1 Unit — `verifyAudioToken`

```typescript
describe("verifyAudioToken", () => {
  test("token válido retorna ok", () => { ... });
  test("token modificado retorna invalid_signature", () => { ... });
  test("player_uuid diferente retorna player_mismatch", () => { ... });
  test("token expirado retorna expired", () => { ... });
  test("formato malformado retorna malformed", () => { ... });
  test("timing-safe equal (não vulnerable a timing attack)", () => { ... });
});
```

### 8.2 Integration — `AudioResolver`

Mock do Deezer (Bun MSW ou interceptor de `fetch`):

```typescript
describe("resolveSongAudio", () => {
  test("ISRC presente + cache hit → resolved sem chamar Deezer", async () => { ... });
  test("ISRC presente + cache miss → chama Deezer, cacheia, retorna", async () => { ... });
  test("ISRC missing → fallback name+artist → resolved", async () => { ... });
  test("ISRC missing + name+artist sem match → Spotify fallback se Premium", async () => { ... });
  test("Deezer 429 → throttler espera, retry", async () => { ... });
});
```

### 8.3 Integration — Proxy endpoint

Testes contra `Bun.serve` real:

```typescript
test("GET /audio/:token com token válido retorna 200 + MP3 sanitizado", async () => {
  const res = await app.request(`/api/v1/audio/${token}`, { headers: { cookie: "session=..." } });
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
  const buf = new Uint8Array(await res.arrayBuffer());
  expect(hasId3Tag(buf)).toBe(false);  // sanitização OK
});

test("Range header → 416", async () => { ... });
test("token de outro player → 401 player_mismatch", async () => { ... });
test("token reused → 410 token_already_used", async () => { ... });
```

### 8.4 Property-based — `stripId3`

```typescript
test("stripId3 preserva MP3 frame data", () => {
  fc.assert(fc.property(mp3WithId3Generator, (rawMp3) => {
    const stripped = stripId3(rawMp3);
    return !hasId3Tag(stripped) && isMp3Frame(stripped);
  }));
});
```

---

## Changelog

- **2026-05-13:** primeira versão consolidada. Substitui `archive/SPEC_AUDIO_v1.0_ets.md` (sem ETS; cache em Redis/memória do RoomActor em vez do ETS Erlang). Inclui implementação de referência de HMAC, sanitização ID3, fallback Spotify, anti-cheat completo, rate limits.
