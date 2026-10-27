---
id: ADR-0026
title: Aceitar o link curto da Deezer lendo só o redirect, além das portas da ADR-0024
status: accepted
date: 2026-10-27
supersedes: ADR-0024
scope: ["apps/api/src/playlist/**", "apps/api/src/http/**", "packages/schema/**", ".env.example"]
revisit_when: "A Deezer mudar o formato do redirect do link.deezer.com, bloquear as requisições do servidor (Akamai), reabrir o cadastro de apps, a API pública dela mudar, o Spotify liberar quota, ou mais de 20% das linhas importadas ficarem sem resultado"
---

# ADR-0026 — Aceitar o link curto da Deezer lendo só o redirect, além das portas da ADR-0024

## Contexto

A [ADR-0024](0024-playlist-por-link-publico-e-lista-resolvidos-na-deezer.md) aceita o link longo da Deezer (`www.deezer.com/playlist/{id}`). Mas o botão Compartilhar do app gera `link.deezer.com/s/{código}`, que é o que o jogador cola pelo celular. A R3 dela só permite hosts de API e por isso recusa esse link. O tradeoff é o seguinte: liberar um host que não é API oficial e pode mudar sem aviso, ou manter o atrito no fluxo mais comum do mobile.

Aferido em 2026-10-27: `link.deezer.com/s/{código}` responde `301` para `link.deezer.com/?dest=<link longo>&…`, e o `dest` é `www.deezer.com/{tipo}/{id}?utm_…`. Um código inexistente responde `302` para `www.deezer.com/deezer-links-404`. O host fica atrás do Akamai Bot Manager. O `deezer.page.link` (Firebase Dynamic Links) já responde 404.

## Decisão

Tudo da ADR-0024 continua: quatro portas, resolvedor único na Deezer, job assíncrono acompanhado por polling. A única mudança é que o link curto também entra. O servidor faz **uma** requisição a `link.deezer.com/s/{código}` com `redirect: "manual"`, descarta o corpo sem ler e tira o ID do parâmetro `dest` do `Location`. O resto segue pela API pública, como o link longo. A expansão acontece antes de criar o job: link curto que não leva a uma playlist recebe `invalid_playlist_link` na hora. As restrições da ADR-0024 passam para esta, com a R3 ampliada e a R5 nova.

## Restrições

- **ADR-0026.R1** MUST gravar só as músicas achadas na Deezer, com o nome, o artista e o ISRC dela, e devolver no job as que ficaram de fora. — Check: `apps/api/src/playlist/importer.test.ts`
- **ADR-0026.R2** MUST NOT persistir dado da YouTube API além do ID e do nome da playlist; das músicas, só o resolvido na Deezer (termos da API: no máximo 30 dias). — Check: `apps/api/src/playlist/importer.test.ts` e `apps/api/src/playlist/sources.test.ts`
- **ADR-0026.R3** MUST NOT ler playlist raspando página. JSON só das APIs `api.deezer.com`, `www.googleapis.com/youtube/v3` e `api.spotify.com`/`accounts.spotify.com`; o único outro host é `link.deezer.com`, e só para o cabeçalho `Location` (R5). — Check: `apps/api/src/playlist/sources.test.ts` (as duas listas de hosts) e `apps/api/src/playlist/importer.test.ts` (uma importação só chama esses hosts)
- **ADR-0026.R4** MUST oferecer OAuth só para o Spotify, com PKCE; outra plataforma em `/auth/{platform}` recebe 404. — Check: `apps/api/src/http/auth.test.ts`
- **ADR-0026.R5** MUST expandir o link curto com uma requisição só, sem seguir o redirect e sem ler o corpo; o ID sai do `dest` do `Location` e só vale se o `dest` for link de playlist de `www.deezer.com`. — Check: `apps/api/src/playlist/deezer.test.ts`

## Consequências

- O jogador cola o que o app da Deezer copia, sem passar pelo navegador.
- Mais uma dependência sem contrato: se o formato do redirect mudar, o link curto volta a dar `invalid_playlist_link`, e o link longo continua funcionando.
- O Akamai pode tratar o IP da VPS como robô. Aí o link curto dá `provider_unavailable`. Confirmar no primeiro deploy.
- As restrições da ADR-0024 mudam de ID (`ADR-0024.Rn` → `ADR-0026.Rn`); o `docs:check` acusa citação antiga.

## Alternativas descartadas

- Não aceitar o link curto e ensinar a copiar o link longo: atrito no fluxo mais comum do mobile.
- Seguir o redirect até o fim (`redirect: "follow"`): baixa a página da Deezer, o que a R3 proíbe.
- Expandir no navegador: o CORS do `link.deezer.com` não deixa o cliente ler o `Location`.

## Fontes

- [ADR-0024](0024-playlist-por-link-publico-e-lista-resolvidos-na-deezer.md).
- Redirect observado com `curl` e com `fetch(…, { redirect: "manual" })` do Bun 1.4.4 em `link.deezer.com/s/317dxi4FLkbIFFe4xvcgZ` (aferido em 2026-10-27).
- Bun, `redirect: "manual"`: https://bun.com/docs/runtime/networking/fetch
