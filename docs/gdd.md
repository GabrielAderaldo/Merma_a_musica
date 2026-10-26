# GDD — regras do jogo

> **Topo da hierarquia.** Em conflito com qualquer outro doc ou com o código, vale o que está aqui.
> Cada regra tem um ID `R-NNN` estável. Os testes citam o ID no nome
> (`test("R-202 speed_bonus: 5s de 30s → 850", …)`). ID não se reaproveita: regra removida vira
> `R-NNN (removida em AAAA-MM-DD)`. `bun run docs:check` falha com ID duplicado ou citado sem existir.
> Para mudar uma regra, use a skill `/change-game-rule`.

Termos em [`glossary.md`](glossary.md). O porquê do produto em [`product.md`](product.md).

## 1. Fluxo e sala

- **R-001** Telas: Home → Criar sala | Entrar em sala | Jogar sozinho. Sala: Lobby → Partida → Resultados → Lobby. Solo: Dashboard solo → Partida solo → Resultado solo → Dashboard solo.
- **R-002** Login OAuth (Spotify, Deezer, YouTube Music) é opcional e nunca bloqueia jogar. Conectar uma plataforma só libera importar playlists. Depois do callback, o jogador volta à tela onde estava.
- **R-003** Jogar anônimo é cidadão de primeira classe: a identidade existe desde a 1ª visita ([ADR-0013](adr/0013-identidade-por-sessao-anonima.md)). Entrar em sala exige `nickname`, editável fora de rodada, sem unicidade.
- **R-004** Criar sala gera `invite_code` de 6 caracteres `[A-Z0-9]` e torna o criador **host**.
- **R-005** Uma sala comporta de 1 a 20 jogadores. O 21º recebe `room_full`.
- **R-006** O lobby mostra, por jogador: nickname, `ready` (exceto host), `afk`, plataforma conectada e se já escolheu playlist.
- **R-007** Só o host configura e inicia a partida. Toda mudança de configuração chega a todos em tempo real.
- **R-008** O host é sempre `ready` e não pode marcar `unready` (`host_is_always_ready`).
- **R-009** O host pode iniciar com ≥1 jogador na sala, mesmo com jogadores `unready`.

## 2. Rodada

- **R-101** Sequência: escolher música → resolver áudio → `round_starting` → grace period de **3s** → `timer_started` → respostas → fim (timer ou pulo) → revelação de **3s** → próxima rodada ou fim da partida.
- **R-102** O servidor é a fonte da verdade do tempo. O cliente só exibe a contagem.
- **R-103** Resposta em campo único de texto livre, com autocomplete opcional.
- **R-104** O autocomplete busca no **pool total** das playlists dos jogadores presentes, não só nas músicas da partida (para não revelar o que vai tocar). Busca por substring, sem fuzzy, mínimo 2 caracteres, máximo 10 sugestões, debounce de 300ms no cliente.
- **R-105** O jogador pode trocar a resposta quantas vezes quiser até o timer acabar. Vale a **última** submissão e o tempo dela.
- **R-106** Durante a rodada, todos veem **quem** já respondeu, nunca **o quê**.
- **R-107** Só se aceita resposta com o timer correndo. No grace period ou na revelação: `round_not_accepting_answers`.
- **R-108** Resposta vazia depois de `trim` conta como "não respondeu".

### Modos de resposta

- **R-110** `answer_type`: `song` (nome da música), `artist` (nome do artista) ou `both` (música **ou** artista; o modo mais fácil, e o default). A UI precisa deixar claro que `both` é o mais fácil.

### Validação da resposta (roda só no servidor)

- **R-111** Normalização, nesta ordem: minúsculas → remover acentos → remover conteúdo entre `()` e `[]` → remover as palavras `o, a, os, as, the, el, la` → colapsar espaços e `trim`. A lista de artigos é fechada (decidido em 2026-10-21: `los`/`las` **não** entram).
- **R-112** Acerta se a distância de Levenshtein entre os normalizados for ≤ `max(1, floor(len(alvo_normalizado) × 0.15))`. Se um dos dois normalizados for vazio, não acerta.
- **R-113** **Na trave** (`near_miss`): errou, mas a distância é ≤ limite + 2.
- **R-114** Em `both`: avalia o nome da música e depois o do artista. Se nenhum acertar, `near_miss` e distância vêm do mais próximo.

Casos canônicos de normalização (R-111):

| Entrada | Normalizado |
|---|---|
| `Bohemian Rhapsody` | `bohemian rhapsody` |
| `Evidências` | `evidencias` |
| `The Weeknd` | `weeknd` |
| `Hey Jude (feat. Paul)` | `hey jude` |
| `  El   tonto  ` | `tonto` |
| `O O O` | `` |
| `Los Hermanos` | `los hermanos` |
| `` / `   ` | `` |

Casos canônicos de acerto (R-112 a R-114):

| Resposta | Alvo | Resultado | Por quê |
|---|---|---|---|
| `bohemian rhapsody` | Bohemian Rhapsody | acerta | só caixa |
| `boemian rapsody` | Bohemian Rhapsody | acerta | distância 2, limite 2 |
| `Evidencias` | Evidências | acerta | acento |
| `Weekend` | The Weeknd | acerta | artigo removido, distância 1, limite 1 |
| `musica aleatoria` | Bohemian Rhapsody | erra | distância grande |
| `(qualquer coisa)` | Bohemian Rhapsody | erra | entrada normaliza para vazio |
| `hermanos` | Los Hermanos | erra | `los` não é artigo (R-111), distância 4 |

### Pular rodada

- **R-120** A rodada termina antes do timer se **todos** os jogadores já responderam **e** a maioria votou pular. Maioria = `floor(N/2) + 1`. Só vota quem já respondeu. Solo não tem pular.

### Revelação

- **R-130** Mostra música, artista, álbum, capa, dono (nickname de quem a trouxe), o que cada um digitou, quem acertou, errou ou não respondeu, os pontos da rodada e o placar acumulado. Dura 3s.
- **R-131** Na revelação a música continua tocando. Se o trecho já tinha acabado, recomeça do início, tocando o áudio que o cliente já baixou ([ADR-0004](adr/0004-audio-universal-via-deezer.md)).

## 3. Pontuação

- **R-201** `simple`: acerto = 1 ponto; erro ou sem resposta = 0.
- **R-202** `speed_bonus`: `pontos = round(max(100, 1000 − (t / T) × 900))`, com `t` = segundos entre `timer_started` e a última submissão (limitado a `T`) e `T` = `time_per_round`. Erro ou sem resposta = 0, sem penalidade.
- **R-203** **Streak**: acertos consecutivos dentro da partida. Zera ao errar ou não responder.
- **R-204** Desempate final: maior streak máxima da partida. Persistindo o empate, os jogadores dividem a posição.

| `t` numa rodada de 30s | Pontos (R-202) |
|---:|---:|
| 0s | 1000 |
| 5s | 850 |
| 10s | 700 |
| 15s | 550 |
| 20s | 400 |
| 25s | 250 |
| 30s | 100 |
| 35s (limitado a 30) | 100 |

## 4. Seleção de músicas (multiplayer)

- **R-301** O pool da partida vem só das playlists escolhidas pelos jogadores presentes.
- **R-302** Total de músicas: mínimo = 1 × jogadores, máximo = 5 × jogadores. Jogadores sem playlist **contam** no range. O host escolhe qualquer valor no range; default = máximo.
- **R-303** O total é dividido igualmente entre os jogadores **com** playlist. A sobra vai uma a uma, em ordem aleatória. Ex.: 13 músicas para 3 jogadores com playlist → 5, 4, 4.
- **R-304** `allow_repeats = false` (default): a mesma música aparece no máximo uma vez, comparando por ISRC e, sem ISRC, por `(nome, artista)` normalizados. `true`: pode repetir se vier de playlists diferentes.
- **R-305** O dono responde à própria música normalmente.
- **R-306** A ordem das rodadas é aleatória.
- **R-307** Música sem áudio é trocada por outra do pool de reserva, sem o jogador perceber. Sem reserva, a rodada é pulada e `total_rounds` diminui em 1.

| Jogadores | Com playlist | Mín | Máx |
|---:|---:|---:|---:|
| 4 | 4 | 4 | 20 |
| 4 | 2 | 4 | 20 |
| 10 | 7 | 10 | 50 |
| 20 | 15 | 20 | 100 |

## 5. Configuração da partida

- **R-401** `MatchConfiguration`, definida no lobby antes de iniciar:

| Campo | Valores | Default |
|---|---|---|
| `time_per_round` | 10–60s | 30s |
| `total_songs` | R-302 (multiplayer) · R-502 (solo) | máximo do range (multiplayer) · 10 (solo) |
| `answer_type` | `song` · `artist` · `both` | `both` |
| `allow_repeats` | `true` · `false` | `false` |
| `scoring_rule` | `simple` · `speed_bonus` | `speed_bonus` |
| `game_mode` | `multiplayer` · `solo` | `multiplayer` |

## 6. Modo solo

Modo próprio, com regras e UI próprias, focado em bater os próprios recordes. Não é "multiplayer com 1 pessoa".

- **R-501** Entra-se pelo "Jogar sozinho" ou, sendo o único jogador do lobby, por "Iniciar como solo". Tem exatamente 1 jogador.
- **R-502** A partida inteira sai de **uma** playlist escolhida. `total_songs`: de 5 a 50, limitado ao número de músicas tocáveis da playlist (com menos de 5, o range vai de 1 ao tamanho dela). Default 10. (Decidido em 2026-10-21; a fórmula de R-302 não vale no solo.)
- **R-503** O jogador escolhe `time_per_round`, `total_songs`, `answer_type` e `allow_repeats`. São forçados: `scoring_rule = speed_bonus` e `game_mode = solo`. Não existe pular.
- **R-504** **Recorde** = pontuação **média por música** da partida (pontos ÷ rodadas jogadas, de 0 a 1000), guardado por `(player, playlist, answer_type, time_per_round)`. Rodadas jogadas = `total_rounds` depois das puladas por falta de áudio (R-307); se todas foram puladas, a partida não tem média nem mexe no recorde. Bate o recorde quem supera a média anterior. A UI mostra também o total de pontos da partida. (Decidido em 2026-10-21: totais de partidas com tamanhos diferentes não se comparam. Decidido em 2026-10-26: divide pelas rodadas jogadas, não por `total_songs`, para música sem áudio não pesar contra o jogador.)
- **R-505** Por playlist também se guardam: maior streak, tempo médio de resposta, músicas conhecidas (distintas já acertadas / total da playlist) e data da última partida.
- **R-506** Estatísticas globais do jogador: maior streak de sempre, resposta certa mais rápida, partidas solo concluídas e músicas distintas já acertadas (por ISRC; sem ISRC, por `(nome, artista)`).
- **R-507** Mensagens: antes de iniciar, "Bata seu recorde: X pts por música!" ou, sem recorde, "Primeira partida nessa playlist — qual será sua marca?". Durante, aviso discreto quando estiver perto. Depois, celebração com a diferença se bateu; tom encorajador se não bateu.
- **R-508** Compartilhar gera um texto com o resultado e o link da playlist (se for pública). Imagem para compartilhar fica fora do MVP.

## 7. Estados especiais

- **R-601** **AFK** é sinal social por jogador (inclusive o host): não muda regra, não bloqueia início, não pula rodada. Volta a `false` em qualquer interação.
- **R-602** **Reconexão**: janela de 2 min. As respostas dadas são preservadas. Ao voltar, o jogador recebe o estado completo da sala; se a rodada ainda corre, pode responder e recebe o áudio de novo. Sem voltar em 2 min, sai com motivo `timeout`.
- **R-603** **Troca de host**: host desconectado por 60s passa o papel ao jogador conectado há mais tempo. Se voltar antes, continua host. Não há troca manual no MVP.
- **R-604** **Queda do servidor**: a partida é restaurada do último snapshot (até 5s de atraso) e os jogadores reconectam ([ADR-0009](adr/0009-snapshot-da-partida-em-redis.md)).
- **R-605** O mesmo jogador em duas abas: vale a conexão mais nova e a antiga é fechada.

## 8. Resultados

- **R-701** Ranking final: posição, pontuação total e destaque para os vencedores, empates inclusos.
- **R-702** Destaques: maior streak, resposta certa mais rápida, mais acertos e "na trave" (mais `near_miss`).
- **R-703** Volta automática ao lobby após 5s. O host pode reconfigurar e iniciar outra partida.
- **R-704** Resultado solo: compara com o recorde anterior (R-504): média por música, streak, tempo médio e músicas conhecidas.

## 9. Áudio

- **R-801** Todo áudio é o preview de 30s do Deezer, resolvido por ISRC e depois por nome + artista. Fallback: Spotify Web Playback SDK, só quando a música não existe no Deezer, não há reserva e o dono tem Premium (não funciona no Safari iOS). Detalhes em [ADR-0004](adr/0004-audio-universal-via-deezer.md).
- **R-802** O áudio toca durante o timer. Com `time_per_round` > 30s, o resto da rodada fica em silêncio.
- **R-803** Nada no cliente pode revelar a música antes de `round_ended` ([`security.md`](security.md)).

## Fora do MVP

Leaderboard global, chat na sala, imagem para compartilhar, modos temáticos, i18n, expulsar jogador.
