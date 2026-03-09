Perfeito! Vamos agora para o **📦 Bounded Context 2: `Game Orchestrator Context`**, que é **o cérebro da aplicação** no que diz respeito a tempo real, coordenação e orquestração da experiência de jogo.

---

# 📦 3.2 — **Game Orchestrator Context**

> *Elixir / Gleam – Orquestração e coordenação da partida multiplayer*

---

## 🎯 Objetivo deste contexto

Esse contexto é responsável por **controlar o ciclo de vida de uma sala e da partida**:

* Recebe comandos da UI (via HTTP/WebSocket)
* Coordena transições de estado da partida
* Mantém os jogadores conectados
* Garante o tempo das rodadas
* Comunica-se com o `Game Engine` (Gleam) para aplicar regras via chamadas diretas no BEAM
* Dispara notificações para a UI em tempo real

> Ele **não implementa regras de jogo** — isso é papel do `Game Engine` — mas **é quem diz quando essas regras devem ser aplicadas**.

---

## 🧠 Ponto central: cada **sala ativa é um processo isolado**

Usando o modelo de processos do BEAM (Erlang VM), você pode criar **um processo por sala de jogo**, que:

* Mantém o estado da sala na memória
* Controla timers de rodada
* Escuta eventos de entrada (via WebSocket/API)
* Reage aos eventos retornados pela `Game Engine` (Gleam)

Isso permite escalar horizontalmente o jogo sem colisões entre salas.

---

## 📦 Entidades do Contexto

### 1. `Room`

> Representa uma sessão multiplayer aguardando ou rodando uma partida.

| Campo                 | Tipo                                 | Descrição                               |
| --------------------- | ------------------------------------ | --------------------------------------- |
| `id`                  | UUID                                 | Identificador único da sala             |
| `host_id`             | UUID                                 | Jogador que criou a sala                |
| `players`             | Lista de `PlayerInRoom`              | Participantes conectados                |
| `state`               | Enum                                 | `Waiting`, `InMatch`, `Finished`        |
| `invite_code`         | String                               | Código usado para entrar na sala        |
| `running_match`       | Estado interno do jogo (serializado) |                                         |
| `timer`               | Ref de tempo                         | Timer de rodada atual                   |

---

### 2. `PlayerInRoom`

> Representa o jogador durante o ciclo de vida da sala.

| Campo               | Tipo                               | Descrição                                 |
| ------------------- | ---------------------------------- | ----------------------------------------- |
| `id`                | UUID                               | ID único                                  |
| `name`              | String                             | Apelido                                   |
| `playlist`          | Lista de músicas (pré-processadas) |                                           |
| `ready`             | Bool                               | Indicador de que está pronto para iniciar |
| `connection_status` | Enum                               | Connected, Disconnected, Reconnecting     |

---

## 🧩 Value Objects

### `RoomCode`

* String curta e única, compartilhada entre jogadores para ingressar na sala

### `RoomState`

* Enum: `WaitingForPlayers`, `ReadyToStart`, `InGame`, `Finished`

### `StateMessage`

* Estrutura enviada pela WebSocket para a UI refletir o estado atual

---

## 🎯 Comportamentos esperados do Orchestrator

| Comando recebido             | Ação executada                                         |
| ---------------------------- | ------------------------------------------------------ |
| Jogador entra na sala        | Adiciona à lista de jogadores e envia estado da sala   |
| Jogador marca-se como pronto | Atualiza status, verifica se todos estão prontos       |
| Host inicia o jogo           | Gera configuração e envia comando para o `Game Engine` |
| Rodada inicia                | Aciona timer, envia evento `RoundStarted` à UI         |
| Jogador envia resposta       | Encaminha para o `Game Engine`, armazena resultado     |
| Tempo da rodada acaba        | Fecha rodada automaticamente                           |
| Última rodada finalizada     | Marca partida como finalizada e envia resultados       |

---

## 🔄 Interações com outros contextos

| Componente externo      | Tipo de comunicação | Propósito                               |
| ----------------------- | ------------------- | --------------------------------------- |
| **Game Engine**         | Chamadas diretas de módulo Gleam (BEAM) | Aplicar regras da partida               |
| **Frontend (SvelteKit)**| Phoenix Channels + REST | Receber comandos e enviar atualizações  |
| **Playlist Context**    | REST/GraphQL        | Buscar playlists válidas por jogador    |
| **Progressão (futuro)** | Event/Queue         | Enviar eventos como `MatchEnded`        |

---

## 🔧 Serviços internos

| Serviço             | Responsabilidade                       |
| ------------------- | -------------------------------------- |
| `RoomManager`       | Gerencia o registro de salas ativas    |
| `RoundTimer`        | Timer central que aciona fim da rodada |
| `MessageDispatcher` | Envia notificações via WebSocket       |
| `MatchCoordinator`  | Orquestra o início e fim da partida    |

---

## ⚠️ Invariantes importantes

* Só o host pode iniciar a partida
* Todos os jogadores precisam estar prontos para começar
* O número de músicas deve ser divisível pelo número de jogadores
* Cada jogador só pode entrar uma vez por sala
* Quando um jogador desconecta, deve ser possível reconectar (com timeout)
* Sala deve ser destruída se inativa por X minutos

---

## 📘 Glossário do Orchestrator

| Termo de Domínio  | Representação                    |
| ----------------- | -------------------------------- |
| Sala              | Processo isolado                 |
| Jogador           | Entrada ativa na sala            |
| Código de convite | Identificador público da sala    |
| Estado da sala    | Aguardando, Jogando, Finalizada  |
| Timer da rodada   | Contador para encerrar rodada    |
| Comando           | Mensagem recebida do cliente     |
| Evento            | Mensagem recebida do Game Engine |

---
