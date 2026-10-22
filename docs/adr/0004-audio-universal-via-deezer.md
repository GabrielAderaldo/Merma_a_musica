---
id: ADR-0004
title: Áudio universal via Deezer (ISRC primeiro), entregue por proxy com token HMAC
status: accepted
date: 2026-05-13
revised: 2026-10-21
scope: ["apps/api/**/audio/**", "apps/web/**/audio*"]
revisit_when: "Deezer mudar a política da API pública ou do preview; mais de 5% das músicas sem áudio; o fallback Spotify virar regra"
---

# ADR-0004 — Áudio universal via Deezer (ISRC primeiro), entregue por proxy com token HMAC

## Contexto

As playlists vêm de Spotify, Deezer e YouTube Music. Os previews do Spotify são instáveis e o áudio completo exige Premium + SDK. O YouTube não tem API de áudio confiável e o embed expõe a música. O Deezer tem preview público de 30s, estável, sem autenticação. O jogo precisa de áudio sempre disponível e que **não revele** a música no cliente.

## Decisão

1. **Deezer é o motor de áudio de toda música**, de qualquer origem. Resolução: ISRC → busca por nome + artista → fallback Spotify Web Playback SDK (R-801) → descarte com troca pela reserva (R-307).
2. **Proxy** `GET /api/v1/audio/{audio_token}`: o servidor baixa o preview, remove ID3v1/ID3v2 e entrega com `Cache-Control: no-store, private`. Rejeita `Range`.
3. **`audio_token` = HMAC-SHA256(segredo, `player_uuid`, `round_id`, `expiry`)**, de uso único, expira no fim da rodada. O jogador esperado vem da sessão ([ADR-0013](0013-identidade-por-sessao-anonima.md)).
4. **Revelação e reconexão** (decidido em 2026-10-21): o cliente guarda o MP3 num blob e a revelação toca dali, sem novo request (R-131). Ao reconectar com a rodada ativa, o servidor emite um token novo para o mesmo `(player, round)` e invalida o anterior, no máximo 3 por rodada.
5. **Caches** (decidido em 2026-10-21): ISRC → Deezer no **Redis** com TTL de 24h (compartilhado entre nodes, sobrevive a deploy). O MP3 fica na memória do `RoomActor`, por rodada.

## Restrições

- **ADR-0004.R1** MUST NOT expor ao cliente URL, ID ou metadados do Deezer antes de `round_ended`. — Check: pendente — teste "resposta do proxy sem tag ID3" + teste de schema de `round_starting`
- **ADR-0004.R2** MUST rejeitar `Range` com 416 **antes** de consumir o token. — Check: pendente — teste de proxy
- **ADR-0004.R3** MUST recusar token de outro jogador (401) e token reusado (410). — Check: pendente — teste de proxy
- **ADR-0004.R4** MUST respeitar 50 requisições a cada 5s ao Deezer, com fila que espera em vez de descartar. — Check: pendente — teste do throttle
- **ADR-0004.R5** MUST guardar o cache ISRC → Deezer no Redis com chave `isrc:{isrc}:deezer` e TTL 86400. — Check: pendente — teste do resolver

## Consequências

- Um provedor de áudio só: resolução, proxy e depuração simples. ISRC dá match exato entre plataformas.
- Dependência de um único terceiro. O endpoint `track/isrc:` funciona, mas não está documentado oficialmente.
- Música rara sem ISRC nem match some em silêncio.
- O fallback Spotify fura o anti-cheat (o SDK mostra os metadados). Aceito por ser raro (S-15).
- Detalhes de implementação: [`../specs/audio.md`](../specs/audio.md). Ameaças: [`../security.md`](../security.md).

## Alternativas descartadas

- Spotify como motor: previews faltando, Premium obrigatório, sem Safari iOS.
- YouTube Music como motor: API não oficial, ToS proíbe stream programático.
- Cliente baixando direto do Deezer: DevTools revela a música.
- Token sem HMAC (UUID opaco, versão de maio): dava para repassar a URL a outro jogador da sala.
- Single-use rígido sem blob: quem reconecta perde o áudio e a revelação não reinicia.
- Cache ISRC em memória do processo: esvazia a cada deploy e não é compartilhado na Fase 1.

## Fontes

- Respostas observadas da API: [`../apis/deezer.md`](../apis/deezer.md) (2026-03).
- MDN `URL.createObjectURL`: https://developer.mozilla.org/docs/Web/API/URL/createObjectURL_static
