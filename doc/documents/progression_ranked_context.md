Excelente, vamos fechar com chave de ouro agora o **📦 Bounded Context 4: Progressão e Ranking**, mesmo sendo um módulo futuro. Isso é uma prática muito boa em DDD: **modelar desde cedo os contextos que ainda não serão implementados**, para que o sistema **já nasça preparado para crescer com coerência**.

---

# 📦 3.4 — **Progressão e Ranking Context**

> *Futuro contexto responsável por XP, ranking global, conquistas e histórico de partidas.*

---

## 🎯 Objetivo deste contexto

Este contexto tem como missão **acompanhar a evolução dos jogadores ao longo do tempo**, recompensando a participação, o desempenho, e fomentando a competição saudável.

> Ele **não interfere no funcionamento da partida**, mas **reage aos eventos emitidos por ela**, construindo **indicadores persistentes** como:

* Pontos de experiência (XP)
* Nível de jogador
* Histórico de partidas
* Ranking global
* Conquistas e medalhas

---

## 🧠 Papel estratégico

* Pode ser implementado **posteriormente** sem quebrar o domínio principal
* Pode escutar eventos como `MatchEnded`, `PlayerScored`, etc.
* Pode ser escalado separadamente como serviço
* Permite **gamificação leve**, sem afetar o core

---

## 🔄 Integração com outros contextos

| Fonte               | Evento recebido                   | Ação esperada                        |
| ------------------- | --------------------------------- | ------------------------------------ |
| `Game Orchestrator` | `MatchEnded`, `ScoreCalculated`   | Calcular XP, registrar histórico     |
| `UI Gateway`        | Consulta de ranking, nível e conquistas | Fornecer dados agregados por jogador |

---

## 📦 Entidades

### 1. `GlobalPlayer`

> Representa um jogador no sistema de progressão, agregando todos os dados históricos.

| Campo          | Tipo            | Descrição                            |
| -------------- | --------------- | ------------------------------------ |
| `user_id`      | UUID            | Referência ao jogador                |
| `total_xp`     | Int             | Total acumulado de experiência       |
| `level`        | Int             | Nível atual calculado com base no XP |
| `ranking`      | Int             | Posição relativa global (opcional)   |
| `achievements` | Lista de `Badge`| Conquistas desbloqueadas             |

---

### 2. `HistoricalMatch`

> Uma instância passada de uma partida finalizada.

| Campo           | Tipo                           | Descrição              |
| --------------- | ------------------------------ | ---------------------- |
| `id`            | UUID                           | ID da partida          |
| `data`          | DateTime                       | Quando aconteceu       |
| `participants`  | Lista de `PlayerPerformance`   | Resumo de cada jogador |
| `config`        | Config usada na partida        |                        |
| `used_songs`    | Lista de faixas jogadas        |                        |

---

### 3. `PlayerPerformance`

| Campo                   | Tipo  | Descrição        |
| ----------------------- | ----- | ---------------- |
| `player_id`             | UUID  | ID do jogador    |
| `score`                 | Int   | Pontos finais    |
| `average_response_time` | Float | Em segundos      |
| `correct_answers`       | Int   | Total de acertos |

---

### 4. `Badge` (Conquista)

| Campo         | Tipo         | Descrição                         |
| ------------- | ------------ | --------------------------------- |
| `id`          | String       | Identificador                     |
| `name`        | String       | Nome da medalha                   |
| `condition`   | Enum / regra | Ex: "Acertar 10 músicas seguidas" |
| `unlocked_at` | Date         | Quando foi conquistada            |

---

## 🧩 Value Objects

### `ExperiencePoints`

* Int (com função de cálculo para XP por pontuação e tempo)

### `Level`

* Int (nível do jogador, calculado por XP total)

### `GlobalRanking`

* Tabela ordenada por XP total (opcionalmente segmentada)

---

## 🧪 Regras e invariantes

* XP é ganho apenas em partidas completas
* Nível é derivado do XP (por faixas configuráveis)
* Ranking é atualizado periodicamente (batch ou em tempo real)
* Não há perda de XP (sem punição)
* Conquistas devem ser únicas e não reatribuídas
* Histórico não pode ser editado após salvo

---

## ⚙️ Serviços e funcionalidades

| Serviço              | Responsabilidade                      |
| -------------------- | ------------------------------------- |
| `XPService`          | Converte desempenho em pontos de XP   |
| `LevelService`       | Calcula o nível atual baseado no XP   |
| `AchievementService` | Avalia e desbloqueia conquistas       |
| `HistoryService`     | Armazena e consulta partidas passadas |
| `RankingService`     | Ordena jogadores com base no XP total |

---

## 📘 Glossário

| Termo     | Significado                                |
| --------- | ------------------------------------------ |
| XP        | Pontos de experiência ganhos em partidas   |
| Level     | Representação de progressão, baseada em XP |
| Badge     | Meta desbloqueada com uma ação notável     |
| History   | Registro completo das partidas jogadas     |
| Ranking   | Lista ordenada dos melhores jogadores      |

---

## 🛠️ Implementação sugerida (futura)

* Banco relacional ou NoSQL para armazenar histórico
* Escuta de eventos via fila (ex: RabbitMQ, Kafka, Pub/Sub)
* API REST para consulta de ranking e histórico
* Eventual consistência: pode ser atualizado em background

---

## ✅ Conclusão do `Progressão e Ranking Context`

Esse contexto é um **apoio valioso**, que **aumenta a vida útil do jogo**, promove engajamento e incentiva a competitividade. Ele:

* É **totalmente separado da lógica de jogo**
* Pode ser adicionado **a qualquer momento**
* Permite que o core continue limpo e rápido
* Abre portas para **monetização leve** (futuro)

---
