# Segurança e anti-cheat

> **Regra de ouro:** o cliente é UI, o servidor é a autoridade. Toda validação que afeta o jogo roda no servidor.
> Cada mitigação tem um ID `S-NN` e diz como é verificada. `pendente` = o teste nasce com o pacote.

## Fronteira de confiança

Não confiável: browser, DevTools, extensões, scripts, rede pública, bots. Confiável: Caddy (TLS) → Hono → `RoomActor` → Postgres/Redis.

Fora do modelo de ameaça no MVP: atacante estatal, zero-day em Bun/Postgres/Redis/Caddy, backdoor do provedor de VPS.

## Identidade ([ADR-0013](adr/0013-identidade-por-sessao-anonima.md))

| ID | Mitigação | Verificação |
|---|---|---|
| S-01 | `player_uuid` é emitido pelo servidor no cookie `__Host-session` (`HttpOnly; Secure; SameSite=Strict; Path=/`). Nunca é lido de query, header ou body. | `apps/api/src/http/session.test.ts` (REST) e `apps/api/src/room/gateway.test.ts` (WS) |
| S-02 | O handshake do WS identifica o jogador **só** pelo cookie e valida o `Origin` contra uma allowlist (fecha com 1008). | `apps/api/src/room/gateway.test.ts` |
| S-03 | Segunda conexão do mesmo `player_uuid` na mesma sala fecha a anterior com close code 4001. | `apps/api/src/room/actor.test.ts` |
| S-04 | Mutações REST validam o header `Origin` (CSRF). O cookie de state do OAuth é `__Host-csrf`, `SameSite=Lax`, 10 min. | `apps/api/src/http/auth.test.ts` e `apps/api/src/http/playlists.test.ts` |

## Áudio ([ADR-0004](adr/0004-audio-universal-via-deezer.md))

| ID | Ameaça → mitigação | Verificação |
|---|---|---|
| S-10 | Ver URL ou metadados do Deezer no DevTools → proxy em `/api/v1/audio/{token}`, com ID3v1/ID3v2 removidos e `Cache-Control: no-store, private`. | `apps/api/src/http/audio.test.ts` e `apps/api/src/playlist/audio/id3.test.ts` |
| S-11 | Repassar a URL para outro jogador → `audio_token` = HMAC-SHA256 de `(player_uuid, round_id, expiry)`; outro jogador recebe `401 player_mismatch`. | `apps/api/src/http/audio.test.ts` e `apps/api/src/playlist/audio/token.test.ts` |
| S-12 | Baixar de novo para analisar → token de uso único (`410 token_already_used`). A revelação toca o blob que o cliente já tem. Ao reconectar, o servidor emite um token novo para o mesmo `(player, round)` e invalida o anterior, no máximo 3 por rodada. | `apps/api/src/http/audio.test.ts` e `apps/api/src/room/actor.test.ts` |
| S-13 | Inspeção fragmentada → requisição com `Range` recebe `416`, **antes** de consumir o token. Nunca `Bun.file`, que atende `Range` sozinho. | `apps/api/src/http/audio.test.ts` |
| S-14 | Token vazado para fora da sala → expira no fim previsto da rodada, e a rodada encerrada recusa com `410 round_expired`. | `apps/api/src/http/audio.test.ts`, `apps/api/src/room/actor.test.ts` e `apps/api/src/playlist/audio/token.test.ts` |
| S-15 | Fallback Spotify SDK expõe metadados ao cliente. **Aceito**: é raro (R-801). Desde a [ADR-0024](adr/0024-playlist-por-link-publico-e-lista-resolvidos-na-deezer.md) toda música importada já está na Deezer, e nenhum resolver produz o fallback. | — |

## Tempo, resposta e bots

| ID | Mitigação | Verificação |
|---|---|---|
| S-20 | `response_time = server_now − timer_started_at` (servidor). Timestamp vindo do cliente é ignorado. | `packages/domain/src/match.test.ts`, `packages/schema/src/ws.test.ts`, `apps/api/src/room/actor.test.ts` |
| S-21 | `answer_confirmed` não revela acerto. `is_correct` só sai em `round_ended`. | `apps/api/src/room/actor.test.ts` |
| S-22 | Autocomplete roda no servidor; o cliente nunca recebe o pool inteiro. | `apps/api/src/room/actor.test.ts` |
| S-23 | Rate limit por `(player_uuid, room_id)`: `submit_answer` 10/s, `autocomplete_search` 5/s, demais 30/s somados. 1ª violação → `error: rate_limited`; 3ª → close 4029. Janela fixa de 1s; estourar o limite conta uma violação por janela (o excesso da mesma janela é descartado sem resposta), e a contagem zera após 60s sem violação. (Decidido em 2026-10-26.) | `apps/api/src/room/rate-limit.test.ts`, `apps/api/src/room/gateway.test.ts` |
| S-24 | Payload WS inválido no Zod → `error: invalid_payload`. 3 inválidos → close 1003. (Decidido em 2026-10-21: um cliente com bug não derruba o jogador na 1ª falha.) | `apps/api/src/room/gateway.test.ts` |
| S-25 | REST: 10 salas/hora e 5 importações simultâneas por `player_uuid`. | salas: `apps/api/src/http/rooms.test.ts`; importações: `apps/api/src/playlist/importer.test.ts` |
| S-26 | Padrão "100% de acerto e menos de 1s" vira métrica `merma_suspicious_pattern_total`. Sem ação automática no MVP. | pendente |
| S-27 | Injeção que vire código → o `apps/api` de produção roda com `bun --disallow-code-generation-from-strings=strict`: `eval`, `new Function`, `node:vm`, `import()` de `data:` e `Worker` com `eval` lançam erro no processo inteiro, Workers inclusos (Bun ≥ 1.4.3). (Decidido em 2026-10-21.) O Zod 4 usa `new Function` como otimização e cai no modo sem JIT sob a flag (confirmado em 2026-10-26). Desde a 1.4.4 o `=strict` recusa todo código que não seja do programa, não só uma lista de APIs: plugin que devolve `contents` e macros também caem. | `apps/api/src/strict.test.ts`; o `bun run test` roda a suíte do `apps/api` e dos `packages` também sob a flag (`test:strict`) |

**Não mitigamos, de propósito:** Shazam no celular ao lado (impossível), extensões do browser, captcha (atrito > ganho), detecção de VPN, fingerprinting (fere a minimização).

## Transporte, headers e cookies

- **S-30** TLS 1.3 obrigatório via Caddy, com HSTS `max-age=31536000; includeSubDomains; preload`.
- **S-31** CSP: `default-src 'self'; connect-src 'self' wss://<domínio> https://sdk.scdn.co; img-src 'self' data: https://*.scdn.co https://*.dzcdn.net; media-src 'self' blob:; script-src 'self' https://sdk.scdn.co; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'`. Mais `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **S-32** Só dois cookies: `__Host-session` (30 dias) e `__Host-csrf` (durante o OAuth).

Verificação de S-30 a S-32: pendente, teste de headers contra o Caddyfile quando o deploy existir.

## Segredos

Nomes canônicos no [`.env.example`](../.env.example). Todos de 32 bytes (`openssl rand -base64 32`), em `.env` com `chmod 600`, nunca no git. Rotação anual ou em incidente. A chave dos backups **não** fica no servidor. Com N nodes, os segredos vão cifrados com sops + age.

## Eventos de auditoria (log JSON, nível `warn`)

`audio_token_invalid_signature`, `audio_token_player_mismatch`, `audio_token_already_used`, `audio_range_request_rejected`, `ws_duplicate_player_uuid_closed`, `ws_rate_limit_exceeded`, `ws_invalid_payload`, `oauth_state_mismatch`, `rest_csrf_origin_mismatch`, `suspicious_pattern_detected`.

Revisão manual semanal. Alarme: assinatura inválida > 100/h por 2h; `oauth_state_mismatch` > 5/h; qualquer `suspicious_pattern_detected`.

## Divulgação de vulnerabilidade

Reporte privado (issue privada ou e-mail do mantenedor), 90 dias para correção antes de divulgar. Sem bounty; agradecimento público.
