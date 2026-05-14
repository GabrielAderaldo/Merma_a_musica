---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Visão de Produto

> Este documento é a fonte da verdade do **por que** Mermã existe e do **que** ele faz (em alto nível). Decisões de design, mecânica e UI devem ser justificáveis em referência a esta visão.

## Pitch em uma frase

**Mermã, a Música!** é um quiz musical multiplayer online onde você prova que conhece mais música que seus amigos — usando as playlists de todo mundo da sala.

## Core fantasy

> *"Provar que conheço mais música que meus amigos, usando playlists de qualquer um."*

A fantasia central é **competência reconhecida socialmente** sobre algo que importa para o jogador: sua biblioteca musical. Diferente de quiz de cultura geral, aqui as músicas são pessoais para alguém da sala — e o jogador é desafiado a reconhecer músicas dos amigos tanto quanto as suas próprias.

## Pilares de design

Toda decisão deve ser avaliada contra estes 4 pilares. Conflito entre pilares se resolve por prioridade (ordem listada).

### 1. Diversão social

O jogo é **melhor jogado com amigos no mesmo ambiente** — gritando respostas, rindo dos erros, "Eu jurava que era do Queen!". A UX deve **amplificar momentos compartilhados**, não substituir conversa.

Consequências:
- Revelação pós-rodada é **lenta o suficiente** (3s) para reagir.
- Respostas dos outros são **mostradas ao final**, incluindo quem errou e o quê — comédia social.
- Destaques no fim da partida (melhor streak, resposta mais rápida) viram **memes da sessão**.
- **Modo Solo existe**, mas como complemento — não é o pilar.

### 2. Personalização total

Suas playlists, suas regras, seu jogo. O catálogo do jogo **é o seu**.

Consequências:
- Sem catálogo curado pelo Mermã — todo conteúdo vem das playlists dos jogadores.
- Host configura **tudo** antes da partida: tempo, regras, modo de resposta.
- Plataformas suportadas: Spotify, Deezer, YouTube Music (extensível).
- Tolerância a erros de digitação (fuzzy match) — não é prova de ortografia.

### 3. Ritmo rápido

Sessões curtas. Zero tempo morto entre interações.

Consequências:
- Partida típica: **5 a 15 minutos**.
- Rodada: 10–60 segundos (configurável).
- Transições automáticas — sem "aperte para continuar" desnecessário.
- Retorno automático ao lobby após a partida (5s).
- **Crash do servidor = partida deve continuar** — recovery via Redis ([ADR-0009](../20-architecture/adrs/0009-redis-snapshot.md)).

### 4. Acessibilidade

Qualquer pessoa joga **em segundos**, sem fricção.

Consequências:
- **Sem cadastro obrigatório** — anônimo + nickname basta para entrar e jogar.
- **Sem download** — funciona em qualquer browser moderno.
- **Mobile-first** — funciona com touch, em telas pequenas, em redes brasileiras.
- **Português Brasil** no MVP (i18n estruturado para expansão).
- Acessibilidade WCAG **prevista mas não exaustiva** no MVP — auditoria detalhada em [`../40-operations/`](../40-operations/) (F6).

## Público-alvo

| Persona | Frequência | Como joga |
|---|---|---|
| **Grupos de amigos** (primário) | Esporádica, com amigos em call ou presenciais | Cria sala, espalha link, joga 1–3 partidas, sai. |
| **Streamers / criadores de conteúdo** | Recorrente, sessões longas | Roda partidas com chat ou convidados; usa como gameplay/entretenimento. |
| **Jogadores casuais solo** | Diária ou regular | Modo Solo para "praticar" e bater recordes pessoais entre as sessões com amigos. |

Detalhes em [`02-personas.md`](02-personas.md).

## Diferenciação

| Concorrente | O que faz | Como Mermã difere |
|---|---|---|
| **Anime Music Quiz (AMQ)** | Quiz com catálogo fixo de animes | Catálogo é **das playlists dos jogadores**, não curado |
| **SongPop / Spotify Game Night** | Quiz com catálogo fixo + plataforma única | Multi-plataforma; jogadores trazem o conteúdo |
| **Kahoot musical** | Quiz genérico aplicado a música | Foco em quiz musical real, não educacional |

## Não-objetivos (o que Mermã **não** é)

- **Não é** um serviço de streaming musical. Não pretendemos competir com Spotify/Deezer/YouTube. Eles **são fornecedores**.
- **Não é** plataforma de descoberta musical. Recomendação não é o ponto — o ponto é jogar com o que você já curte.
- **Não é** ranking competitivo global no MVP. Há recordes pessoais (solo), mas não leaderboard mundial. Pode entrar pós-MVP via Bounded Context Progression & Ranking.
- **Não é** rede social. Sem perfis públicos, sem amigos persistentes, sem chat (no MVP — pode-se reavaliar depois).
- **Não é** monetizado. Game free e open-source.

## Critérios de sucesso do MVP

Em ordem decrescente de importância:

1. **Partida completa sem bug crítico** em 3 cenários: 1 jogador (solo), 4 jogadores, 20 jogadores no mesmo lobby.
2. **Reconexão funcional** em ≤2 min: jogador retoma estado da partida.
3. **Suporte real às 3 plataformas** (Spotify, Deezer, YouTube Music) para import + áudio universal via Deezer.
4. **Latência p95 < 100ms** em `submit_answer` round-trip no Brasil.
5. **Modo Solo com recordes pessoais persistidos** por playlist + jogador.

Métricas operacionais detalhadas em [`04-metrics-telemetry.md`](04-metrics-telemetry.md).

## Roadmap pós-MVP (informativo, não compromisso)

- **Progression & Ranking** (XP, conquistas, leaderboards).
- **Chat in-game** opcional na sala (com moderação automática).
- **Modos de partida temáticos** (apenas dos anos 90, apenas Brasil, apenas rock, etc.).
- **i18n** (EN, ES inicialmente).
- **Editor de playlist colaborativo** (cria pool sem importar de plataforma externa).

Esses itens **não** entram em planejamento ativo até o MVP estar estável em produção.

## Changelog

- **2026-05-13:** primeira versão consolidada, reescrita a partir das seções de visão dispersas em `archive/BLUEPRINT_v2.1.md` e `archive/gdd_v1.1.md`.
