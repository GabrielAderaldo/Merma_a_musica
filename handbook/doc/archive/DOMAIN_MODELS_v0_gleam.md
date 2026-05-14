---

## 0. 📜 Fundamentação Teórica

> "It is best for one well-defined, cohesive team of domain experts and developers to focus on one Ubiquitous Language modeled in an explicit Bounded Context."
> — *(Vaughn Vernon, Implementing Domain-Driven Design)*

Esta documentação define os limites explícitos e a linguagem compartilhada para garantir a integridade do modelo de "Mermã, a Música!".

---

# 📦 1. Bounded Contexts
*Lógica pura de jogo em Gleam.*

### Aggregates & Entidades
- **Match (Aggregate Root)**: Controla o ciclo de vida (Waiting, InProgress, Finished).
- **Round (Entity)**: Representa uma música tocada e as respostas coletadas.
- **PlayerInMatch (Entity)**: Estado do jogador na partida (score, ready status).
- **Song (Value Object)**: Metadados da música (ISRC, nome, artista).

### Regras de Ouro (Invariantes)
- Uma partida só inicia se todos os jogadores estiverem `Ready`.
- O número de músicas deve ser divisível pelo número de jogadores (fair play).
- Respostas só são aceitas enquanto o `Round` estiver `InProgress`.

---

## 2. 🧠 Game Orchestrator Context (Supporting Domain)
*Coordenação de processos e tempo real em Elixir.*

### Componentes Chave
- **Room (Process-based)**: Cada sala é um processo BEAM (GenServer) isolado.
- **RoomCode (VO)**: Identificador único curto para convites.
- **RoundTimer**: Gerencia o countdown de cada rodada e dispara o encerramento automático.

### Fluxo de Comunicação
1.  Recebe comandos via **Phoenix Channels**.
2.  Invoca a **Game Engine** para validar lógica.
3.  Persiste estado efêmero em memória e (pós-MVP) histórico no **SQLite**.

---

## 3. 🔌 Playlist Integration Context (Generic Domain)
*Abstração de serviços de streaming externos.*

### Entidades
- **ConnectedAccount**: Armazena tokens OAuth (Spotify/Deezer).
- **ImportedPlaylist**: Lista normalizada de faixas válidas (com preview).
- **NormalizedSong**: Estrutura padrão independente da origem (ISRC + Preview URL).

---

## 4. 📈 Progression & Ranking Context (Future Domain)
*Gamificação e histórico persistente.*

### Entidades (Planejadas)
- **GlobalPlayer**: Acumula XP e Nível.
- **HistoricalMatch**: Snapshot de partidas passadas para estatísticas.
- **Badge**: Conquistas (ex: "10 acertos seguidos").

---

## 📘 Linguagem Ubíqua

| Termo | Contexto | Definição |
| :--- | :--- | :--- |
| **Match** | Engine | Uma instância única de jogo. |
| **Room** | Orchestrator | O "lobby" onde jogadores se reúnem. |
| **Preview** | Audio | O trecho de 30s usado no quiz. |
| **Host** | Orchestrator | O jogador que criou a sala e tem poder de início. |

---
*Grounding: Modelagem baseada em "Domain-Driven Design" (Eric Evans) e "Clean Architecture" (Uncle Bob).*
