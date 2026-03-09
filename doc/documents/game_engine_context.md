Excelente! Vamos agora para o **📦 Ponto 3: Detalhamento de cada Bounded Context com seus Aggregates, Entidades e Value Objects**, começando pelo **contexto mais importante do sistema: o `Game Engine Context`**.

---

# 📦 3. Detalhamento dos Bounded Contexts

---

## 🎮 **Game Engine Context** (⚙️ Gleam/BEAM – Core Domain)

> Responsável por toda a **lógica central do jogo**, controlando a partida, suas rodadas, os jogadores, as respostas e a pontuação.
> Este contexto não conhece interfaces gráficas, APIs, nem estado de conexão: ele apenas executa as **regras puras do jogo**.
> Roda no **mesmo nó BEAM** que o Game Orchestrator, comunicando-se via chamadas diretas de módulo e message passing nativo.

---

### 🎯 Objetivo deste contexto

* Gerenciar o ciclo de vida da partida (início → rodadas → fim)
* Validar respostas dos jogadores
* Aplicar regras configuradas (tipo de resposta, tempo, repetição)
* Gerar eventos do domínio que refletem mudanças de estado
* Garantir invariantes do jogo

---

### 📌 Aggregate Principal: `Match`

> Representa uma instância de jogo multiplayer configurado e em andamento.

#### Responsabilidades:

* Coordenar rodadas
* Armazenar configurações
* Controlar o estado de execução
* Delegar respostas para as rodadas
* Calcular pontuação

#### Campos (estado interno):

* `id`: String — Identificador da partida
* `state`: Enum (`WaitingForPlayers`, `InProgress`, `Finished`)
* `config`: VO `MatchConfiguration`
* `players`: Lista de `Player`
* `rounds`: Lista de `Round`
* `current_round_index`: Int (qual rodada está ativa)
* `songs`: Lista de `Song` (músicas selecionadas para a partida)

---

### 🧱 Entidades

#### 1. `PlayerInMatch`

> Representa um jogador específico dentro de uma partida.

| Campo       | Tipo                | Descrição                     |
| ----------- | ------------------- | ----------------------------- |
| `id`        | String              | Identificador único           |
| `name`      | String              | Apelido visível               |
| `playlist`  | Lista<`Song`>       | Músicas extraídas do serviço  |
| `state`     | Enum                | Connected, Ready, Answered    |
| `score`     | Int                 | Pontuação acumulada           |

> **Nota**: O histórico de respostas é mantido dentro de cada `Round` (campo `answers: Dict(String, Answer)`), não no jogador.

---

#### 2. `Round`

> Representa um momento do jogo em que uma música é tocada e os jogadores devem responder.

| Campo       | Tipo                     | Descrição                        |
| ----------- | ------------------------ | -------------------------------- |
| `index`     | Int                      | Número da rodada                 |
| `song`      | `Song`                   | Música sorteada para essa rodada |
| `answers`   | Map<PlayerId, Answer>    | Respostas dadas pelos jogadores  |
| `state`     | Enum                     | InProgress, Ended                |

---

#### 3. `Song`

> Dados da música usada na rodada.

| Campo         | Tipo   | Descrição                           |
| ------------- | ------ | ----------------------------------- |
| `id`          | ID     | Interno                             |
| `name`        | String | Título da música                    |
| `artist`      | String | Nome do artista                     |
| `preview_url` | String | Link para trecho da música (15–30s) |

---

### 🧩 Value Objects (VO)

#### 1. `MatchConfiguration`

| Campo            | Tipo                          | Descrição                                     |
| ---------------- | ----------------------------- | --------------------------------------------- |
| `timePerRound`   | Int                           | Em segundos (ex: 15)                          |
| `totalSongs`     | Int                           | Quantidade total                              |
| `answerType`     | Enum (SONG, ARTIST, BOTH)     | Define o que será aceito como resposta válida |
| `allowRepeats`   | Bool                          | Define se músicas podem se repetir            |
| `scoringRule`    | Enum                          | Simples ou com bônus por velocidade           |

---

#### 2. `Answer`

| Campo         | Tipo   | Descrição                                  |
| ------------- | ------ | ------------------------------------------ |
| `text`        | String | Texto digitado pelo jogador                |
| `answer_time` | Float  | Tempo em segundos desde o início da rodada |
| `is_correct`  | Bool   | Resultado da validação contra a música     |
| `points`      | Int    | Pontos ganhos pela resposta                |

---

### 🔄 Eventos de Domínio (emitidos pelo Aggregate `Match`)

| Evento              | Causa                             | Ação esperada                      |
| ------------------- | --------------------------------- | ---------------------------------- |
| `MatchStarted`      | Todos prontos, regras válidas     | Orquestrador inicia timers         |
| `RoundStarted`      | Avanço de rodada                  | Música tocada, cronômetro iniciado |
| `AnswerProcessed`   | Jogador enviou resposta           | Validar, pontuar e armazenar       |
| `RoundCompleted`    | Todos responderam ou tempo acabou | Calcular resultado, scores parciais|
| `MatchCompleted`    | Última rodada encerrada           | Enviar estatísticas finais         |

---

### 🧠 Invariantes (Regras que sempre devem ser verdadeiras)

* Partida só pode ser iniciada se:

  * Todos os jogadores estiverem `Ready`
  * O número de músicas for divisível pelo número de jogadores
* Jogador só pode responder uma vez por rodada
* Não se aceita resposta após a rodada ser finalizada
* Músicas repetidas só são permitidas se `allowRepeats = true`

---

### 📘 Linguagem Ubíqua (Termos preferidos no código e comunicação)

| Termo de Domínio | Representação no Modelo          |
| ---------------- | -------------------------------- |
| Partida          | Aggregate Root `Match`           |
| Jogador          | `PlayerInMatch`                  |
| Rodada           | `Round` (entidade)               |
| Resposta         | `Answer` (VO)                    |
| Música           | `Song` (entidade)                |
| Configuração     | `MatchConfiguration` (VO)        |
| Evento           | Enum ou struct `DomainEvent`     |

---
