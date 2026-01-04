Perfeito, Gabriel! Agora vamos formalizar tudo que exploramos até aqui em um **📄 Documento Estratégico de Domínio (DDD)** para o projeto **"Mermã, a Música!"**.

Esse documento será composto por:

1. ✅ Visão Geral Estratégica
2. ✅ Mapa de Contexto (Context Map)
3. ✅ Bounded Contexts com explicação
4. ✅ Entidades, Aggregates e Value Objects por Contexto
5. ✅ Glossário de termos do domínio

Esse documento é seu **guia de domínio completo** para continuar o desenvolvimento técnico, comunicar com contribuidores e tomar decisões de design de forma alinhada com a visão do negócio.

---

# 📘 Documento de Domínio — **"Mermã, a Música!"**

## 1. 🎯 Visão Geral Estratégica

**"Mermã, a Música!"** é um jogo multiplayer online de quiz musical, inspirado em *Anime Music Quiz*, mas com suporte para playlists pessoais de plataformas como Spotify, Deezer, etc.

O foco principal do domínio é a **partida multiplayer competitiva**, na qual os jogadores escutam trechos de músicas de suas próprias playlists e tentam adivinhar corretamente os nomes das faixas, artistas ou ambos — dependendo das configurações da partida.

---

## 2. 🗺️ Mapa de Contexto (Context Map)

Aqui está a separação dos principais **Bounded Contexts** e como eles se relacionam:

```text
                                      ┌──────────────────────────────┐
                                      │     🎨 UI / Gateway (Bun)     │
                                      │ Frontend + WebSocket/HTTP API│
                                      └────────────┬─────────────────┘
                                                   │
                         ┌─────────────────────────┴──────────────────────────┐
                         │             🎮 Game Orchestrator Context           │
                         │         (Elixir / Gleam - Phoenix Channels)       │
                         └────────────┬────────────────────────────┬─────────┘
                                      │                            │
                       ┌──────────────┘                            └──────────────┐
                       ▼                                                       ▼
         ┌──────────────────────────────┐                        ┌──────────────────────────────┐
         │   ⚙️ Game Engine Context       │                        │     🎵 Playlist Context       │
         │      (Swift - lógica de jogo)  │                        │ Integrações Spotify/Deezer   │
         └──────────────────────────────┘                        └──────────────────────────────┘

                                  ┌──────────────────────────────┐
                                  │ 🏅 Progressão / Ranking Context│
                                  └──────────────────────────────┘
```

### Tipos de relacionamento:

* 🔗 **Upstream / Downstream**: `Playlist Context` é fornecedor para o `Game Engine Context`
* 💬 **Protocolos de integração**:

  * `Gateway ↔ Game Orchestrator`: HTTP/WebSocket
  * `Orchestrator ↔ Game Engine`: gRPC
  * `Game Engine ↔ Playlist Context`: Requisição de dados de entrada

---

## 3. 🧭 Bounded Contexts (Detalhados)

---

### 🎮 **1. Game Engine Context (Core Domain)**

> *Responsável por toda a lógica central da partida: rodadas, respostas, pontuação, regras, fluxo de jogo.*

#### 📦 Aggregates:

* `Match`

  * Controla estado do jogo, jogadores, rodadas e regras
* `Round`

  * Responsável por reproduzir trecho e aceitar respostas
* `Scoreboard`

  * Mantém pontuação dos jogadores

#### 🧱 Entidades:

* `PlayerInMatch`

  * Identidade única, estado (pronto, respondido), playlist

* `Song`

  * ID, nome, artista, trecho disponível

#### 🎯 Value Objects:

* `MatchConfiguration`

  * Número de músicas, tempo por rodada, tipo de resposta (musica/artista/ambos), se permite repetição

* `Answer`

  * Texto enviado pelo jogador (validado estritamente)

* `RoundResult`

  * Respostas certas/erradas, tempos de resposta, pontuação atribuída

#### 🔄 Eventos de domínio:

* `MatchStarted`
* `RoundStarted`
* `AnswerReceived`
* `RoundEnded`
* `MatchEnded`

---

### 🫂 **2. Game Orchestrator Context**

> *Responsável por gerenciar o ciclo de vida da sala, estado dos jogadores, orquestrar os fluxos, enviar mensagens de tempo real.*

#### 📦 Entidades:

* `Room`

  * ID, host, estado (esperando, jogando, finalizada), jogadores

* `PlayerInRoom`

  * Conectado, pronto, playlist associada

#### 🎯 Value Objects:

* `RoomCode`
* `PlayerState`

#### Serviços:

* `RoomManager`
* `RoundTimer` (timer de execução)
* `MessageDispatcher`

---

### 🎵 **3. Playlist Context**

> *Responsável por integrar com plataformas externas de música e fornecer dados normalizados.*

#### 🧱 Entidades:

* `ExternalPlaylist`

  * ID da plataforma, nome, dono, músicas com trecho disponível

* `PlaylistSong`

  * Nome, artista, preview_url (15–30s), gênero (opcional)

#### Serviços externos:

* `SpotifyService`
* `DeezerService`

#### ⚖️ Regras:

* Apenas músicas com `preview_url` válido podem ser usadas
* Cada jogador só pode usar suas próprias playlists conectadas

---

### 🏅 **4. Progressão / Ranking Context**

> *Calcula XP, ranking global, histórico de partidas e conquistas.*

#### 📦 Entidades:

* `GlobalPlayer`

  * userId, XP, ranking, conquistas

* `HistoricalMatch`

  * Data, resultado, pontuação, tempo de resposta médio

#### 🎯 Value Objects:

* `ExperiencePoints`
* `PlayerLevel`
* `Badge`

---

## 4. 📘 Glossário de Termos do Domínio

| Termo                    | Significado                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Match**                | Sessão de jogo, composta por rodadas e jogadores                             |
| **Round**                | Um momento único onde uma música é tocada e os jogadores respondem           |
| **Player**               | Participante com identidade única na partida                                 |
| **Playlist**             | Lista de músicas conectada do streaming                                      |
| **Answer**               | Texto enviado pelo jogador tentando acertar                                  |
| **Match Configuration**  | Conjunto de regras da partida (número de músicas, tempo, modo de pontuação)  |
| **Song Repetition**      | Define se músicas repetidas entre playlists podem ser usadas mais de uma vez |
| **Score**                | Total de acertos atribuídos ao jogador                                       |
| **Ranking**              | Posição do jogador entre todos os participantes do sistema                   |
| **XP**                   | Sistema de progressão baseado em participação e desempenho                   |

---

## 5. ✅ Status atual por contexto

| Contexto             | Tipo de Domínio | Maturidade                             |
| -------------------- | --------------- | -------------------------------------- |
| Game Engine          | ⭐ **Core**      | Modelado e pronto para implementação   |
| Game Orchestrator    | **Supporting**  | Planejado, precisa orquestração        |
| Playlist Integration | **Supporting**  | Parcial, depende da lib de integração  |
| Progressão / Ranking | **Future**      | Ainda indefinido, fora do escopo atual |

---