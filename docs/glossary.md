# Glossário — linguagem ubíqua

> Um termo do domínio significa **uma** coisa. Se o código usar um termo com outro sentido, o código está errado.
> Termo novo entra aqui **antes** de entrar no código. Narrativa em pt-BR, identificador em inglês, enums em minúsculo.

## Jogo

| Termo (código) | Definição |
|---|---|
| Sala (`Room`) | Espaço onde jogadores se reúnem e jogam partidas em sequência. Identificada pelo `invite_code`. Estados em [`architecture.md`](architecture.md#máquinas-de-estado). |
| Partida (`Match`) | Uma execução completa do jogo dentro da sala, do início ao ranking. Composta por rodadas. |
| Rodada (`Round`) | Um ciclo "ouvir → responder → revelação". |
| Host (`is_host`) | Quem criou a sala, ou quem herdou o papel (R-603). Configura e inicia. Sempre `ready`. |
| Lobby (`lobby`) | Estado da sala entre partidas: escolher playlist, marcar ready, configurar. |
| Ready (`ready`) | Jogador pronto para a próxima partida. Não bloqueia o início (R-009). Não se aplica ao host. |
| AFK (`afk`) | Sinal social de ausência temporária. Não muda regra (R-601). |
| Invite code (`invite_code`) | 6 caracteres `[A-Z0-9]`. Ex.: `ABC123`. |
| Pool (`pool`) | Todas as músicas das playlists dos jogadores presentes. Fonte do autocomplete. |
| Pool de reserva | Músicas do pool que não foram sorteadas para a partida; substituem música sem áudio (R-307). |
| Grace period (`grace_period`) | 3s entre `round_starting` e `timer_started`, para o áudio carregar. |
| Revelação (`reveal`) | Fase final da rodada (3s): música e respostas expostas. Pertence ao `Round`, não ao `Match`. |
| Fase (`phase`) | Valor **derivado** que o cliente recebe para decidir a tela: `lobby`, `countdown`, `playing`, `reveal`, `results`. |
| Modo de jogo (`game_mode`) | `multiplayer` ou `solo`. |
| Modo solo | Partida de 1 jogador, de uma playlist, focada em recorde (R-501 a R-508). |
| Recorde (`personal_best`) | Maior média de pontos por música no solo, por `(player, playlist, answer_type, time_per_round)` (R-504). |
| Streak (`streak`) | Acertos consecutivos na partida (R-203). |

## Resposta e pontuação

| Termo | Definição |
|---|---|
| `answer_type` | `song`, `artist` ou `both`. `both` aceita qualquer um dos dois e é o mais fácil (R-110). |
| `answer_text` | O que o jogador digitou. Pode ser trocado até o timer acabar. Nunca vai para log nem para o histórico. |
| Normalização | Pipeline de R-111. |
| Fuzzy match | Levenshtein com limite de R-112. Só no servidor. |
| Na trave (`near_miss`) | Errou, mas chegou perto (R-113). |
| `scoring_rule` | `simple` ou `speed_bonus` (R-201, R-202). |
| `response_time` | Segundos entre `timer_started` e a última submissão. `null` se não respondeu. |
| `points_earned` | Pontos da rodada. 0 para erro ou sem resposta. |

## Áudio

| Termo | Definição |
|---|---|
| Preview | Trecho de 30s do Deezer. É o que toca no jogo. |
| ISRC (`isrc`) | Código global de uma gravação. Chave para achar "a mesma música" entre plataformas. |
| `audio_token` | Token HMAC por `(player_uuid, round_id, expiry)`, de uso único, usado em `GET /api/v1/audio/{audio_token}` ([ADR-0004](adr/0004-audio-universal-via-deezer.md)). |
| Proxy de áudio | Endpoint que baixa o preview, remove os metadados e o entrega ao cliente. |
| `NormalizedSong` | Música importada, já independente da plataforma: `{ isrc?, name, artist, album?, owner_player_uuid, source_platform }`. |

## Identidade e plataformas

| Termo | Definição |
|---|---|
| `player_uuid` | UUID v4 **gerado pelo servidor** na 1ª visita e guardado no cookie `__Host-session` ([ADR-0013](adr/0013-identidade-por-sessao-anonima.md)). Público dentro da sala; nunca serve de credencial. |
| Sessão (`__Host-session`) | Cookie HttpOnly que prova quem é o jogador. Existe para anônimos e para logados. |
| `nickname` | Nome exibido. Sem unicidade. |
| `connection_status` | `connected`, `reconnecting` ou `disconnected`. Diferente de `ready`. |
| `ConnectedAccount` | Vínculo OAuth entre `player_uuid` e uma plataforma. Guarda o refresh token cifrado. |
| `ImportedPlaylist` | Playlist importada e normalizada, persistida no Postgres. |

## Arquitetura

| Termo | Definição |
|---|---|
| `RoomActor` | Objeto que detém o estado de **uma** sala num único processo; toda mutação passa pela fila dele. |
| Bounded context | Fronteira de modelo: Game Engine, Game Orchestrator, Playlist Integration, Progression. Ver [`architecture.md`](architecture.md). |
| `Result<T, E>` | `{ ok: true, value } \| { ok: false, error }`. Retorno de toda função que pode falhar no domínio. |
| Branded type | `string & { readonly __brand: "X" }`, para não confundir IDs (`RoomId` ≠ `MatchId`). |
| Snapshot | Cópia serializada do estado da sala no Redis, a cada 5s, para recuperação. |
