---
id: ADR-0024
title: Trazer a playlist por link público ou lista colada, resolvida na Deezer, com OAuth só do Spotify
status: accepted
date: 2026-10-26
supersedes: null
scope: ["apps/api/src/playlist/**", "apps/api/src/http/**", "packages/schema/**", ".env.example"]
revisit_when: "A Deezer reabrir o cadastro de apps, o Spotify liberar quota para o projeto, a API pública da Deezer mudar, ou mais de 20% das linhas importadas ficarem sem resultado"
---

# ADR-0024 — Trazer a playlist por link público ou lista colada, resolvida na Deezer, com OAuth só do Spotify

## Contexto

O plano era OAuth em Spotify, Deezer e YouTube Music. Um spike em 2026-10-26 mostrou que os três estão travados para um projeto pessoal:
- **Spotify:** o Development Mode aceita 5 usuários, cadastrados à mão, e exige Premium do dono. O Extended Quota só é dado a organizações com 250 mil usuários ativos por mês.
- **Deezer:** relatos dizem que o portal não aceita apps novos, e o OAuth dela não tem PKCE nem refresh token.
- **YouTube:** o `youtube.readonly` é escopo sensível. Sem a verificação do Google, são 100 usuários na vida do projeto e tokens de 7 dias.

O centro do produto é cada jogador trazer a própria playlist para o mix ([`product.md`](../product.md)). Uma playlist curada por nós não serve.

## Decisão

A playlist do jogador entra por quatro portas, e todas desembocam num resolvedor único na Deezer (R-002, R-010):
1. **Link de playlist pública da Deezer:** API pública da Deezer, sem login. Já traz o ISRC.
2. **Link de playlist pública do YouTube ou do YouTube Music:** YouTube Data API v3 com chave de API (`YOUTUBE_API_KEY`), sem OAuth. O título de cada vídeo é limpo (sai o que está entre parênteses ou colchetes) e buscado na Deezer.
3. **Lista colada:** uma música por linha, buscada na Deezer, com origem `text`.
4. **Spotify por OAuth com PKCE:** opcional e limitado à allowlist do app. O refresh token é cifrado ([ADR-0006](0006-postgres-e-drizzle.md)) e a sessão é rotacionada no callback ([ADR-0013](0013-identidade-por-sessao-anonima.md)).

A importação é um job assíncrono, acompanhado por polling em `GET /api/v1/playlists/imports/{job_id}`. Não existe evento WS de importação concluída.

## Restrições

- **ADR-0024.R1** MUST gravar só as músicas achadas na Deezer, com o nome, o artista e o ISRC dela, e devolver no job as que ficaram de fora. — Check: pendente (apps/api/src/playlist) — teste do importador
- **ADR-0024.R2** MUST NOT persistir dado da YouTube API além do ID e do nome da playlist; das músicas, só o resolvido na Deezer (termos da API: no máximo 30 dias). — Check: pendente (apps/api/src/playlist) — teste do importador do YouTube
- **ADR-0024.R3** MUST NOT ler playlist raspando página; só as APIs `api.deezer.com`, `www.googleapis.com/youtube/v3` e `api.spotify.com`/`accounts.spotify.com`. — Check: pendente (apps/api/src/playlist) — teste da allowlist de hosts do cliente HTTP
- **ADR-0024.R4** MUST oferecer OAuth só para o Spotify, com PKCE; outra plataforma em `/auth/{platform}` recebe 404. — Check: pendente (apps/api/src/playlist) — teste das rotas de auth

## Consequências

- Ninguém precisa de login para trazer a playlist. Quem usa outro serviço (Apple Music, Amazon, Spotify sem login) copia os nomes e cola.
- A importação já sai com o ISRC da Deezer, então o resolvedor de áudio ([ADR-0004](0004-audio-universal-via-deezer.md)) acerta pelo ISRC quase sempre.
- Depende ainda mais da Deezer: os termos dela exigem uso não comercial, o que vale enquanto o projeto for grátis e AGPL.
- Pode pegar a versão errada (ao vivo, remaster). Aceito: o fuzzy match ignora o que está entre parênteses (R-111).
- A cota do YouTube é de 10 mil unidades por dia, e uma página de 50 vídeos custa 1. Isso dá umas 500 mil faixas por dia.

## Alternativas descartadas

- OAuth nas três plataformas: Deezer fechada, YouTube com 100 usuários na vida do projeto, Spotify com 5.
- Raspar o embed do Spotify ou as páginas da Apple Music e do YouTube Music: fere os termos e quebra sem aviso.
- Print da playlist lido por modelo de visão: custo por importação e imagem enviada a um terceiro.
- Playlists da casa (charts e editoriais): contraria o pilar "personalização total".
- song.link (Odesli): a API pública foi desativada (`PUBLIC_API_ACCESS_DEPRECATED`, aferido em 2026-10-26).

## Fontes

- Spotify, quota modes: https://developer.spotify.com/documentation/web-api/concepts/quota-modes (aferido em 2026-10-26)
- Spotify, mudanças de fevereiro de 2026: https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
- Google, limites de app não verificado: https://support.google.com/cloud/answer/15549945
- YouTube, dado público com chave de API: https://developers.google.com/youtube/v3/sample_requests ; cota: https://developers.google.com/youtube/v3/determine_quota_cost
- Deezer, termos: https://developers.deezer.com/termsofuse ; portal fechado (fórum): https://en.deezercommunity.com/other-devices-49/impossible-de-creer-une-app-migration-spotify-vers-deezer-pour-un-projet-de-decouvert-et-jeux-musicaux-82752
