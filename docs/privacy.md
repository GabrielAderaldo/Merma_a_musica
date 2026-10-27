# Privacidade e LGPD

> Documento operacional (Lei nº 13.709/2018). A política pública para o usuário deriva deste texto.
> O DPO de fato é o mantenedor do projeto.

## Princípios

1. **Minimização** (art. 6º, III): só o necessário para o jogo funcionar. Sem analytics de terceiros, sem fingerprinting, sem rastreio entre sites.
2. **Anônimo por padrão**: jogar não exige cadastro. O `player_uuid` não está ligado a uma identidade real, salvo se o jogador conectar uma plataforma.
3. **Transparência** e **soberania**: exportar e apagar os próprios dados são direitos, com endpoint próprio.

## O que tratamos

| Categoria | Dado | Onde | Base legal |
|---|---|---|---|
| A. Operacional | `player_uuid` (emitido pelo servidor, [ADR-0013](adr/0013-identidade-por-sessao-anonima.md)), `nickname`, estado da partida, IP efêmero | Cookie `__Host-session`, memória, snapshot Redis, logs | Execução de contrato (art. 7º, V) |
| B. Conta conectada | ID externo, refresh token (AES-256-GCM), playlists importadas | Postgres | Consentimento (art. 7º, I) |
| C. Jogo persistido | Histórico de partidas (**sem `answer_text`**), recordes do solo | Postgres | Legítimo interesse (art. 7º, IX) |
| D. Telemetria | Métricas agregadas; logs com `player_uuid` | `/metrics`, stdout | Execução de contrato + legítimo interesse |

- O access token OAuth fica **só em memória**, nunca persistido.
- O jogador anônimo só passa a ter linha no Postgres quando importa uma playlist, gera um recorde solo ou conclui uma partida.

**Não coletamos:** e-mail (não pedimos esse scope no OAuth), telefone, documentos, localização precisa, fingerprint detalhado, histórico de navegação, `answer_text` em log, métrica ou histórico, nem dados de menores de 13 anos (anti-persona).

## Terceiros

| Terceiro | O que recebe |
|---|---|
| Spotify | Só o necessário para chamar a API (token, IDs de playlist) |
| Deezer, YouTube | O ID da playlist colada e, na resolução, o nome e o artista de cada música buscada; nada que identifique o jogador |
| Sentry | Stack trace + contexto técnico, com payload sanitizado |
| Armazenamento de backup (ex.: Backblaze B2) | Backup do Postgres já cifrado |
| Provedor da VPS | Tudo (é o substrato) |

Sentry e backup podem ficar fora do Brasil: execução de contrato + garantia contratual do provedor. Não compartilhamos com anunciantes, brokers nem marketing.

## Retenção

| Dado | Retenção |
|---|---|
| Sessão do jogador anônimo sem dado persistido | 30 dias (vida do cookie) |
| `player_uuid` em logs | 90 dias (rotação do journald) |
| Estado da partida | Vida da partida + TTL de 30 min do snapshot |
| Histórico de partidas | 2 anos; depois agregado e anonimizado |
| Recordes do solo, playlists | Enquanto o jogador existir ou até pedir exclusão. Da playlist do YouTube só se guarda o resolvido na Deezer, mais o ID e o nome dela, renovados a cada reimportação: os termos da YouTube API proíbem guardar dado dela por mais de 30 dias (decidido em 2026-10-26) |
| Refresh token | Enquanto a conta estiver conectada |
| Backups | 14 dias |
| Jogador inativo por 6 meses | Apagado; histórico mantido com `player_uuid` trocado por hash truncado |

## Direitos do titular (art. 18)

Todos por endpoint, com resposta imediata (o prazo legal é de 15 dias). Os contratos nascem em `packages/schema`:

- Confirmação e acesso: `GET /auth/me`, `GET /api/v1/me/export` (JSON com tudo: conta conectada sem o refresh token, playlists com as músicas, recordes e músicas já acertadas no solo, partidas com as respostas do jogador).
- Exclusão: `DELETE /api/v1/me` apaga a conta conectada, as playlists, os recordes do solo e as importações em andamento. No histórico de partidas, o `player_uuid` vira o hash truncado, como no jogador inativo (decidido em 2026-10-27): o placar dos outros fica de pé, mas quem guardou o `player_uuid` antigo ainda acha as linhas, então é pseudonimização. A resposta traz uma sessão com `player_uuid` novo, sem ligação com o apagado.
- Revogar consentimento: `POST /api/v1/auth/disconnect/{platform}`, que apaga os tokens na hora. Manter ou apagar as playlists é escolha do jogador.
- Correção: o `nickname` direto na UI.

## Segurança técnica

Cifra e transporte em [`security.md`](security.md). Acesso ao banco só por SSH com chave. Eventos `audit` com 90 dias de retenção: `oauth_account_connected`, `oauth_account_disconnected`, `data_export_requested`, `account_deleted`, `playlist_deleted`.

## Incidente

1. Contenção em menos de 1h: revogar tokens, fechar o acesso, read-only se preciso.
2. Investigação em menos de 24h: escopo, causa, dados afetados.
3. Aviso aos titulares e à ANPD (art. 48) em até 72h, se houver risco relevante.
4. Postmortem público.
