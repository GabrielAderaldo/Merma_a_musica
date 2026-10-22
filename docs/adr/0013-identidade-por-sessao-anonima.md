---
id: ADR-0013
title: Identidade do jogador por sessão anônima emitida pelo servidor
status: accepted
date: 2026-10-21
scope: ["apps/api/**", "apps/web/**", "packages/schema/**"]
revisit_when: "Precisar de identidade entre dispositivos sem OAuth, ou o cookie de terceiros/partitioned mudar o comportamento dos browsers"
---

# ADR-0013 — Identidade do jogador por sessão anônima emitida pelo servidor

## Contexto

Havia três modelos incompatíveis:
- o frontend gerava o `player_uuid` no `localStorage` e o mandava na query do WS;
- segurança e REST exigiam o cookie `__Host-session`, que só existia depois do OAuth;
- o proxy de áudio aceitava o header `X-Player-Uuid`, que um `<audio src>` não consegue enviar.

Resultado: o anônimo, cidadão de primeira classe pelo GDD, não ouviria áudio nem teria recorde. E como o `player_uuid` é transmitido em `room_state` para a sala inteira, usá-lo como credencial permitiria a qualquer jogador se passar por outro, anulando o vínculo HMAC do token de áudio.

## Decisão

Na primeira requisição sem sessão válida, o servidor gera o `player_uuid` (UUID v4) e o devolve no cookie **`__Host-session`** (`HttpOnly; Secure; SameSite=Strict; Path=/`, 30 dias, renovado no uso), assinado com `SESSION_SECRET`. Isso vale para o anônimo e para o logado; o OAuth só **vincula** uma `ConnectedAccount` ao `player_uuid` existente. O cookie vai sozinho no upgrade do WS, no `fetch` do áudio e no REST.

## Restrições

- **ADR-0013.R1** MUST NOT ler o `player_uuid` de query, header ou body; só da sessão. — Check: pendente — teste de rota e de WS com `?player_uuid=` forjado → ignorado
- **ADR-0013.R2** MUST NOT guardar identidade no `localStorage` (só conveniências: último `nickname`, cache de recordes). — Check: pendente — `no-restricted-syntax`/revisão em `apps/web/src/lib/identity.ts`
- **ADR-0013.R3** MUST emitir a sessão anônima antes de qualquer rota que exija identidade, inclusive `/ws/room/*` e `/api/v1/audio/*`. — Check: pendente — teste de middleware
- **ADR-0013.R4** MUST rotacionar o ID de sessão no login OAuth, mantendo o mesmo `player_uuid`. — Check: pendente — teste do callback

## Consequências

- Anônimo joga, ouve e tem recorde. Um só mecanismo para todos.
- A identidade fica presa ao browser: trocar de dispositivo sem OAuth é começar do zero.
- Limpar os cookies = novo jogador. É aceito: o jogo tolera, e trocar de identidade não traz vantagem.
- O servidor passa a ter sessões anônimas. O `player_uuid` só vai para o Postgres quando há recorde ou partida concluída ([`../privacy.md`](../privacy.md)).

## Alternativas descartadas

- UUID gerado no browser + query (o modelo de maio): forjável.
- UUID no browser + token HMAC no `localStorage`: exposto a XSS e obrigaria o token na URL do `<audio>`.

## Fontes

- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- MDN, prefixo `__Host-`: https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Set-Cookie#cookie_prefixes
- OWASP HTML5 Security (Local Storage): https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
