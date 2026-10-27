# Produto — por que o Mermã existe

> O **porquê**. As regras estão em [`gdd.md`](gdd.md). Em conflito, vale o GDD.

**Pitch:** quiz musical multiplayer no browser em que você prova que conhece mais música que seus amigos, usando as playlists de todo mundo da sala.

**Fantasia central:** competência reconhecida socialmente sobre algo pessoal, a própria biblioteca musical. As músicas são de alguém da sala, então reconhecer a dos amigos vale tanto quanto reconhecer a sua.

## Pilares (em conflito, vence o de cima)

1. **Diversão social.** Melhor com amigos juntos, gritando respostas. A UX amplifica momentos compartilhados: revelação com tempo para reagir, respostas erradas expostas no fim, destaques que viram meme. O solo existe, mas como complemento.
2. **Personalização total.** O catálogo é o dos jogadores, nunca curado por nós. O host configura tudo. Fuzzy match: não é prova de ortografia.
3. **Ritmo rápido.** Partida de 5 a 15 min, transições automáticas, zero tempo morto. Se o servidor cair, a partida continua.
4. **Acessibilidade.** Joga em segundos: sem cadastro, sem download, mobile-first, em redes brasileiras, pt-BR.

## Para quem

| Persona | Quem é | O que importa para ela |
|---|---|---|
| **Camila, a anfitriã** (27, designer) | Junta amigos 1–2×/semana, Spotify Premium, notebook + celular | Montar a sala rápido, link fácil de espalhar, momento coletivo da revelação |
| **Bruno, o casual** (32, comercial) | Entra quando chamam, Spotify free, celular Android | Entrar sem conta e sem atrito; funcionar bem no celular e na rede ruim |
| **Diego, o solo grinder** (22, estudante) | Joga quase todo dia, usa as 3 plataformas, notebook + fone | Recordes por playlist, métricas detalhadas, compartilhar o resultado |

**Não é para:** DJ procurando ferramenta de trabalho; crianças com menos de 13 anos (privacidade infantil fora do escopo, ver [`privacy.md`](privacy.md)); quem quer ranking competitivo global; quem quer catálogo curado.

## Não-objetivos

Não é streaming (as plataformas são fornecedoras), não é descoberta musical, não tem leaderboard global no MVP, não é rede social (sem perfil público nem chat no MVP) e não é monetizado: é free e open-source (AGPL-3.0).

## Critérios de sucesso do MVP (em ordem)

1. Partida completa sem bug crítico com 1 (solo), 4 e 20 jogadores.
2. Reconexão em até 2 min retomando a partida.
3. Cada jogador traz a própria playlist sem login (link da Deezer ou do YouTube, ou lista colada; Spotify por OAuth opcional, R-002), com áudio universal via Deezer.
4. Latência e disponibilidade dentro das metas de [`operations.md`](operations.md).
5. Modo solo com recordes persistidos.

## KPIs (medidos por eventos de log, sem analytics de terceiros)

| KPI | Alvo MVP |
|---|---|
| Partidas completadas por sessão | ≥ 2 |
| Sessões que completam ≥ 1 partida | ≥ 60% |
| Sessões com ≥ 2 partidas seguidas no mesmo lobby | ≥ 40% |
| Partidas com ≥ 1 playlist importada | ≥ 70% |
| Partidas solo que batem o recorde | ≥ 30% |
| Retenção D1 / D7 / D30 | monitorada, não bloqueia lançamento |

## Pós-MVP (informativo, não é compromisso)

Progressão e ranking (XP, conquistas, leaderboard), chat com moderação, modos temáticos, i18n (EN/ES), pool colaborativo sem plataforma externa.

Concorrentes de referência: Anime Music Quiz (catálogo fixo), SongPop/Spotify Game Night (catálogo fixo, uma plataforma), Kahoot (genérico).
