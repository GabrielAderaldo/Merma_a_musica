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
* Comunica-se com o `Game Engine` para aplicar regras
* Dispara notificações para a UI em tempo real

> Ele **não implementa regras de jogo** — isso é papel do `Game Engine` — mas **é quem diz quando essas regras devem ser aplicadas**.

---

## 🧠 Ponto central: cada **sala ativa é um processo isolado**

Usando o modelo de processos do BEAM (Erlang VM), você pode criar **um processo por sala de jogo**, que:

* Mantém o estado da sala na memória
* Controla timers de rodada
* Escuta eventos de entrada (via WebSocket/API)
* Reage aos eventos emitidos pela `Game Engine`

Isso permite escalar horizontalmente o jogo sem colisões entre salas.

---

## 📦 Entidades do Contexto

### 1. `Sala`

> Representa uma sessão multiplayer aguardando ou rodando uma partida.

| Campo                 | Tipo                                 | Descrição                               |
| --------------------- | ------------------------------------ | --------------------------------------- |
| `id`                  | UUID                                 | Identificador único da sala             |
| `host_id`             | UUID                                 | Jogador que criou a sala                |
| `jogadores`           | Lista de `JogadorNaSala`             | Participantes conectados                |
| `estado`              | Enum                                 | `Aguardando`, `EmPartida`, `Finalizada` |
| `codigo_convite`      | String                               | Código usado para entrar na sala        |
| `partida_em_execucao` | Estado interno do jogo (serializado) |                                         |
| `timer`               | Ref de tempo                         | Timer de rodada atual                   |

---

### 2. `JogadorNaSala`

> Representa o jogador durante o ciclo de vida da sala.

| Campo            | Tipo                               | Descrição                                 |
| ---------------- | ---------------------------------- | ----------------------------------------- |
| `id`             | UUID                               | ID único                                  |
| `nome`           | String                             | Apelido                                   |
| `playlist`       | Lista de músicas (pré-processadas) |                                           |
| `pronto`         | Bool                               | Indicador de que está pronto para iniciar |
| `status_conexao` | Enum                               | Conectado, Desconectado, Reconectando     |

---

## 🧩 Value Objects

### `CodigoDeSala`

* String curta e única, compartilhada entre jogadores para ingressar na sala

### `EstadoDaSala`

* Enum: `AguardandoJogadores`, `ProntaParaComecar`, `EmJogo`, `Finalizada`

### `MensagemDeEstado`

* Estrutura enviada pela WebSocket para a UI refletir o estado atual

---

## 🎯 Comportamentos esperados do Orchestrator

| Comando recebido             | Ação executada                                         |
| ---------------------------- | ------------------------------------------------------ |
| Jogador entra na sala        | Adiciona à lista de jogadores e envia estado da sala   |
| Jogador marca-se como pronto | Atualiza status, verifica se todos estão prontos       |
| Host inicia o jogo           | Gera configuração e envia comando para o `Game Engine` |
| Rodada inicia                | Aciona timer, envia evento `RodadaIniciada` à UI       |
| Jogador envia resposta       | Encaminha para o `Game Engine`, armazena resultado     |
| Tempo da rodada acaba        | Fecha rodada automaticamente                           |
| Última rodada finalizada     | Marca partida como finalizada e envia resultados       |

---

## 🔄 Interações com outros contextos

| Componente externo      | Tipo de comunicação | Propósito                               |
| ----------------------- | ------------------- | --------------------------------------- |
| **Game Engine**         | gRPC                | Aplicar regras da partida               |
| **UI Gateway**          | WebSocket/API       | Receber comandos e enviar atualizações  |
| **Playlist Context**    | REST/GraphQL        | Buscar playlists válidas por jogador    |
| **Progressão (futuro)** | Event/Queue         | Enviar eventos como `PartidaFinalizada` |

---

## 🔧 Serviços internos

| Serviço                 | Responsabilidade                       |
| ----------------------- | -------------------------------------- |
| `GerenciadorDeSalas`    | Gerencia o registro de salas ativas    |
| `RelogioDaRodada`       | Timer central que aciona fim da rodada |
| `DispatcherDeMensagens` | Envia notificações via WebSocket       |
| `CoordenadorDePartida`  | Orquestra o início e fim da partida    |

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