---
id: ADR-0025
title: Tocar todo áudio pela Deezer, por proxy com token HMAC, sem fallback do Spotify
status: accepted
date: 2026-10-27
supersedes: ADR-0004
scope: ["apps/api/**/audio/**", "apps/api/src/http/audio.ts", "packages/schema/**", "apps/web/**/audio*"]
revisit_when: "Deezer mudar a política da API pública ou do preview; mais de 5% das rodadas sem áudio; uma fonte de playlist que não passe pela resolução na Deezer"
---

# ADR-0025 — Tocar todo áudio pela Deezer, por proxy com token HMAC, sem fallback do Spotify

## Contexto

A [ADR-0004](0004-audio-universal-via-deezer.md) fez da Deezer o motor de áudio e previa um fallback: o Spotify Web Playback SDK, para a música que não existisse na Deezer, sem reserva e com dono Premium. Desde a [ADR-0024](0024-playlist-por-link-publico-e-lista-resolvidos-na-deezer.md), toda música entra na playlist já resolvida na Deezer (R-010), e a que não é achada fica de fora na importação. O fallback não tem mais como acontecer, e nenhum resolver o produz. Mesmo assim, ele seguia no contrato WS (`audio_source: "spotify_sdk"`), na CSP (`sdk.scdn.co`) e numa ameaça aceita (S-15). O tradeoff: manter um caminho morto, ou substituir uma ADR aceita e renumerar as restrições dela.

## Decisão

A Deezer é a única fonte de áudio. A resolução é `deezer_id` da importação → ISRC → busca por nome e artista → troca pela reserva (R-307). Não há fallback, e o `round_starting` só leva `audio_token`. O resto da ADR-0004 continua:

1. **Proxy** `GET /api/v1/audio/{audio_token}`: o servidor baixa o preview, remove ID3v1/ID3v2 e entrega bytes em memória, com `Cache-Control: no-store, private`. Rejeita `Range`.
2. **`audio_token` = HMAC-SHA256(segredo, `player_uuid`, `round_id`, `expiry`)**, de uso único, expira no fim da rodada. O jogador esperado vem da sessão ([ADR-0013](0013-identidade-por-sessao-anonima.md)).
3. **Revelação e reconexão:** o cliente guarda o MP3 num blob e a revelação toca dali (R-131). Ao reconectar com a rodada ativa, o servidor emite um token novo para o mesmo `(player, round)` e invalida o anterior, no máximo 3 por rodada.
4. **Caches:** ISRC → Deezer no Redis, com TTL de 24h. O MP3 fica na memória do `RoomActor`, por rodada.

## Restrições

- **ADR-0025.R1** MUST NOT expor ao cliente URL, ID ou metadados da Deezer antes de `round_ended`. — Check: `apps/api/src/http/audio.test.ts` (proxy sem ID3 e nada da Deezer no fio)
- **ADR-0025.R2** MUST rejeitar `Range` com 416 **antes** de consumir o token. — Check: `apps/api/src/http/audio.test.ts`
- **ADR-0025.R3** MUST recusar token de outro jogador (401) e token reusado (410). — Check: `apps/api/src/http/audio.test.ts`
- **ADR-0025.R4** MUST respeitar 50 requisições a cada 5s à Deezer, com fila que espera em vez de descartar. — Check: `apps/api/src/playlist/deezer.test.ts`
- **ADR-0025.R5** MUST guardar o cache ISRC → Deezer no Redis com chave `isrc:{isrc}:deezer` e TTL 86400. — Check: `apps/api/src/playlist/audio/resolver.test.ts`
- **ADR-0025.R6** MUST NOT entregar áudio ao cliente por outro caminho que não o proxy: o `round_starting` só aceita `audio_source: "deezer"` com `audio_token`. — Check: `packages/schema/src/ws.test.ts`

## Consequências

- Um provedor de áudio só, e o anti-cheat sem exceção: a S-15 sai, e o `sdk.scdn.co` sai da CSP (S-31).
- O contrato WS perde o `spotify_sdk`. Se o Spotify voltar a ser fonte de áudio, isso pede ADR nova.
- Dependência de um único terceiro. O endpoint `track/isrc:` funciona, mas não está documentado oficialmente.
- A música que não toca na hora da rodada (preview sumido ou região) sai pela reserva, sem aviso ao jogador (R-307).
- As restrições da ADR-0004 mudam de ID (`ADR-0004.Rn` → `ADR-0025.Rn`); o `docs:check` acusa citação antiga.

## Alternativas descartadas

- Manter o fallback como "adiado": o caminho morto ficava no contrato, na CSP e no `apps/web`.
- Mudar o GDD e o código sem ADR nova: a ADR-0004 continuaria citando um fallback que não existe.
- Spotify, YouTube ou cliente baixando direto da Deezer como motor: os motivos da ADR-0004 seguem valendo.

## Fontes

- [ADR-0004](0004-audio-universal-via-deezer.md) e [ADR-0024](0024-playlist-por-link-publico-e-lista-resolvidos-na-deezer.md).
- Respostas observadas da API: [`../apis/deezer.md`](../apis/deezer.md) (2026-03).
- `apps/api/src/playlist/audio/resolver.ts`: nenhum resolver produz `spotify_sdk` (aferido em 2026-10-27).
