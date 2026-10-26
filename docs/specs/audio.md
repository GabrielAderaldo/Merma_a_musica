---
until: apps/api/src/playlist/audio
---

# Spec pré-código — motor de áudio (`apps/api`)

> **Rascunho com prazo de validade.** Quando `apps/api/src/playlist/audio` existir, isto vira código e testes,
> e o arquivo é apagado. A decisão está em [ADR-0004](../adr/0004-audio-universal-via-deezer.md); as
> ameaças, em [`security.md`](../security.md) (S-10 a S-15).

## Resolução

```
NormalizedSong
  ├─ tem ISRC → Redis isrc:{ISRC}:deezer (TTL 24h)
  │     hit  → deezer_track_id
  │     miss → GET api.deezer.com/2.0/track/isrc:{ISRC}
  │              200 → grava no Redis → deezer_track_id
  │              404 → busca por nome
  └─ sem ISRC → GET api.deezer.com/search?q=track:"NOME" artist:"ARTISTA"
                  1º resultado com score > 0.6 → deezer_track_id
                  nada → fallback Spotify SDK (R-801) → senão descarta (R-307)
```

- O endpoint `track/isrc:` funciona, mas não está documentado oficialmente (observado em 2026-03, ver [`../apis/deezer.md`](../apis/deezer.md)).
- Cliente HTTP do Deezer: um `Bun.FetchSession` próprio (Bun ≥ 1.4.3), com pool de conexões e keep-alive separados do resto da API. Confira a API atual pelo MCP `bun-docs`.
- Throttle do Deezer: 50 requisições a cada 5s por IP. Token bucket em memória, um por processo. Fila cheia **espera**, não descarta. 5xx ou timeout > 10s → música indisponível.

## Token

```
payload = base64url(JSON({ p: player_uuid, r: round_id, x: expiry_unix_ms }))
token   = base64url(HMAC-SHA256(AUDIO_HMAC_SECRET, payload)) + "." + payload
```

- Verifica com `timingSafeEqual`. Erros: `malformed`, `invalid_signature`, `player_mismatch` e `expired`.
- O `player_uuid` esperado vem da **sessão** (cookie), nunca da requisição ([ADR-0013](../adr/0013-identidade-por-sessao-anonima.md)).
- Uso único: `Set` de tokens consumidos no `RoomActor`, limpo no fim da rodada.
- Reemissão: ao reconectar com a rodada ainda ativa, o `RoomActor` gera um token novo para o mesmo `(player, round)` e coloca o anterior no `Set`. No máximo 3 emissões por jogador por rodada.

## Proxy `GET /api/v1/audio/{audio_token}`

Ordem obrigatória das checagens:

| # | Checagem | Falhou → |
|---|---|---|
| 1 | Tem sessão | `401 unauthenticated` |
| 2 | Sem header `Range` (antes de consumir o token) | `416 partial_request_not_supported` |
| 3 | HMAC válido e `p` igual ao jogador da sessão | `401 <erro>` |
| 4 | Não expirou | `410 expired` |
| 5 | Rodada ainda existe | `410 round_expired` |
| 6 | Token ainda não foi usado | `410 token_already_used` |
| 7 | MP3 pronto | `503 audio_not_ready` |

Resposta `200`: `Content-Type: audio/mpeg`, `Content-Length` do arquivo **limpo**, `Cache-Control: no-store, private`.

- **Remover ID3:** ID3v2 no início (magic `49 44 33`, tamanho syncsafe nos bytes 6–9) e ID3v1 no fim (128 bytes, magic `54 41 47`).
- **Nunca** sirva o MP3 como `Bun.file` (nem gravado em disco, nem por rota `{ dir }`): desde a 1.4.3 o `Bun.serve` atende `Range` e `If-Range` sozinho nesses casos, o que furaria a S-13. Responda sempre com os bytes em memória (`new Response(bytes)`).
- **Buffer completo** (~500 KB por preview de 30s). Streaming com remoção em trânsito só se o TTFB virar problema.
- **Cache do MP3:** `Map<RoundId, bytes>` no `RoomActor`. Um download do Deezer serve a sala toda; é limpo em `round_ended`.

## Fallback Spotify SDK

`round_starting` traz `audio_source: "spotify_sdk"` e `spotify_uri` em vez de `audio_token`. O cliente carrega o SDK sob demanda (lazy). Não passa pelo proxy; é aceito como exceção (S-15).

## Testes

- Token: válido, adulterado, de outro jogador, expirado, malformado, comparação em tempo constante.
- Resolver (com `fetch` mockado): cache hit sem chamar o Deezer; miss que grava; sem ISRC busca por nome; sem resultado cai no Spotify; 429 espera no throttle.
- Proxy contra o servidor real: 200 sem ID3, `Range` → 416 sem consumir o token, outro jogador → 401, token reusado → 410.
- `stripId3` com teste de propriedade: a saída nunca tem tag e continua começando num frame MP3.
