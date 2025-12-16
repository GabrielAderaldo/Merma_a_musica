Excelente! Vamos agora para o **📦 Ponto 3: Detalhamento de cada Bounded Context com seus Aggregates, Entidades e Value Objects**, começando pelo **contexto mais importante do sistema: o `Game Engine Context`**.

---

# 📦 3. Detalhamento dos Bounded Contexts

---

## 🎮 **Game Engine Context** (⚙️ Swift – Core Domain)

> Responsável por toda a **lógica central do jogo**, controlando a partida, suas rodadas, os jogadores, as respostas e a pontuação.
> Este contexto não conhece interfaces gráficas, APIs, nem estado de conexão: ele apenas executa as **regras puras do jogo**.

---

### 🎯 Objetivo deste contexto

* Gerenciar o ciclo de vida da partida (início → rodadas → fim)
* Validar respostas dos jogadores
* Aplicar regras configuradas (tipo de resposta, tempo, repetição)
* Gerar eventos do domínio que refletem mudanças de estado
* Garantir invariantes do jogo

---

### 📌 Aggregate Principal: `Partida`

> Representa uma instância de jogo multiplayer configurado e em andamento.

#### Responsabilidades:

* Coordenar rodadas
* Armazenar configurações
* Controlar o estado de execução
* Delegar respostas para as rodadas
* Calcular pontuação

#### Campos (estado interno):

* `id`: Identificador da partida
* `estado`: Enum (`EsperandoJogadores`, `EmAndamento`, `Finalizada`)
* `configuracao`: VO `ConfiguracaoDaPartida`
* `jogadores`: Lista de `JogadorNaPartida`
* `rodadas`: Lista de `Rodada`
* `indiceRodadaAtual`: Inteiro (qual rodada está ativa)

---

### 🧱 Entidades

#### 1. `JogadorNaPartida`

> Representa um jogador específico dentro de uma partida.

| Campo       | Tipo                | Descrição                     |
| ----------- | ------------------- | ----------------------------- |
| `id`        | ID                  | Identificador único           |
| `nome`      | String              | Apelido visível               |
| `playlist`  | Lista<`Musica`>     | Músicas extraídas do serviço  |
| `estado`    | Enum                | Conectado, Pronto, Respondido |
| `pontuacao` | Int                 | Pontuação acumulada           |
| `respostas` | Lista de `Resposta` | Histórico da partida          |

---

#### 2. `Rodada`

> Representa um momento do jogo em que uma música é tocada e os jogadores devem responder.

| Campo       | Tipo                     | Descrição                        |
| ----------- | ------------------------ | -------------------------------- |
| `indice`    | Int                      | Número da rodada                 |
| `musica`    | `Musica`                 | Música sorteada para essa rodada |
| `respostas` | Map<JogadorId, Resposta> | Respostas dadas pelos jogadores  |
| `estado`    | Enum                     | EmAndamento, Encerrada           |

---

#### 3. `Musica`

> Dados da música usada na rodada.

| Campo         | Tipo   | Descrição                           |
| ------------- | ------ | ----------------------------------- |
| `id`          | ID     | Interno                             |
| `nome`        | String | Título da música                    |
| `artista`     | String | Nome do artista                     |
| `preview_url` | String | Link para trecho da música (15–30s) |

---

### 🧩 Value Objects (VO)

#### 1. `ConfiguracaoDaPartida`

| Campo                | Tipo                          | Descrição                                     |
| -------------------- | ----------------------------- | --------------------------------------------- |
| `tempoPorRodada`     | Int                           | Em segundos (ex: 15)                          |
| `totalDeMusicas`     | Int                           | Quantidade total                              |
| `tipoDeResposta`     | Enum (MUSICA, ARTISTA, AMBOS) | Define o que será aceito como resposta válida |
| `repeticaoPermitida` | Bool                          | Define se músicas podem se repetir            |
| `regraPontuacao`     | Enum                          | Simples ou com bônus por velocidade           |

---

#### 2. `Resposta`

| Campo           | Tipo   | Descrição                                  |
| --------------- | ------ | ------------------------------------------ |
| `texto`         | String | Texto digitado pelo jogador                |
| `tempoResposta` | Float  | Tempo em segundos desde o início da rodada |
| `valida`        | Bool   | Resultado da validação contra a música     |

---

### 🔄 Eventos de Domínio (emitidos pelo Aggregate `Partida`)

| Evento              | Causa                             | Ação esperada                      |
| ------------------- | --------------------------------- | ---------------------------------- |
| `PartidaIniciada`   | Todos prontos, regras válidas     | Orquestrador inicia timers         |
| `RodadaIniciada`    | Avanço de rodada                  | Música tocada, cronômetro iniciado |
| `RespostaRecebida`  | Jogador enviou resposta           | Validar e armazenar                |
| `RespostaCorreta`   | Texto bate com valor esperado     | Atribuir ponto                     |
| `RodadaFinalizada`  | Todos responderam ou tempo acabou | Calcular resultado                 |
| `PartidaFinalizada` | Última rodada encerrada           | Enviar estatísticas finais         |

---

### 🧠 Invariantes (Regras que sempre devem ser verdadeiras)

* Partida só pode ser iniciada se:

  * Todos os jogadores estiverem `Prontos`
  * O número de músicas for divisível pelo número de jogadores
* Jogador só pode responder uma vez por rodada
* Não se aceita resposta após a rodada ser finalizada
* Músicas repetidas só são permitidas se `repeticaoPermitida = true`

---

### 📘 Linguagem Ubíqua (Termos preferidos no código e comunicação)

| Termo de Domínio | Representação no Modelo          |
| ---------------- | -------------------------------- |
| Partida          | Aggregate Root `Partida`         |
| Jogador          | `JogadorNaPartida`               |
| Rodada           | `Rodada` (entidade)              |
| Resposta         | `Resposta` (VO)                  |
| Música           | `Musica` (entidade)              |
| Configuração     | `ConfiguracaoDaPartida` (VO)     |
| Evento           | Enum ou struct `EventoDeDominio` |

---