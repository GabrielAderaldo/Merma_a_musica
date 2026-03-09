Ótimo! Vamos detalhar agora o **📍Ponto 2: Mapa de Contexto (Context Map)**.

Este ponto responde a perguntas como:

* **Quais são os limites naturais do sistema?**
* **Quais partes falam com quais?**
* **Onde estão as integrações externas?**
* **Quem depende de quem?**
* **Quais contextos são independentes?**

---

# 📍 2. Mapa de Contexto — *"Mermã, a Música!"*

## 🎯 Objetivo

Dividir o sistema em **Bounded Contexts** estratégicos, cada um com sua **linguagem ubíqua**, **modelo de domínio próprio**, e **responsabilidades isoladas**, possibilitando uma arquitetura modular, distribuída e evolutiva.

---

## 🗺️ Visão Geral (Simplificada em Texto)

```plaintext
┌────────────────────────────────────────────────────┐
│              Frontend (SvelteKit + Deno)            │
│ - UI do jogo (Tailwind CSS)                         │
│ - Phoenix Channels (WebSocket) + REST               │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│             Game Orchestrator Context              │
│ - Gerencia salas, rodadas, jogadores               │
│ - Tempo real (Elixir/Gleam)                        │
│ - Controla o fluxo geral da partida                │
└──────┬──────────────────────┬──────────────────────┘
       │                      │
       ▼                      ▼
┌───────────────┐     ┌──────────────────────────────┐
│ Game Engine   │     │ Playlist Integration Context │
│ (Gleam/BEAM)  │     │ - Spotify / Deezer APIs      │
│ - Regras do   │     │ - Autenticação e playlists   │
│   jogo        │     └──────────────────────────────┘
│ - Validação   │
└───────────────┘
       │
       ▼
┌────────────────────────────────────────────────────┐
│           Progressão e Ranking Context             │
│ - Histórico de partidas                            │
│ - XP e conquistas (futuro)                         │
└────────────────────────────────────────────────────┘
```

---

## 🔍 Detalhes de cada Bounded Context

---

### 1. 🎮 **Game Engine Context**

* **Tipo**: Core Domain
* **Responsável por**: Toda a lógica central da partida:

  * Início e fim de rodadas
  * Validação de respostas
  * Pontuação e regras
* **Tecnologia**: Gleam (BEAM) — roda no mesmo nó que o Orchestrator
* **Não conhece nada sobre o mundo externo**: recebe comandos, retorna eventos
* **Comunicação**: chamadas diretas de módulo e message passing no BEAM

---

### 2. 🫂 **Game Orchestrator Context**

* **Tipo**: Supporting Domain (estratégico)
* **Responsável por**:

  * Ciclo de vida de uma sala
  * Entrada e saída de jogadores
  * Orquestração das rodadas com timers
  * Envio/recebimento de mensagens via WebSocket
* **Tecnologia sugerida**: Elixir (BEAM), process model natural
* **Interage com**:

  * `Game Engine` (para lógica de jogo)
  * `Frontend` (para enviar estado ao frontend)
  * `Playlist Context` (para buscar músicas)
* **Design natural**: cada **sala = processo isolado**

---

### 3. 🎵 **Playlist Integration Context**

* **Tipo**: Generic Domain (integração)
* **Responsável por**:

  * Conectar contas do Spotify/Deezer
  * Buscar playlists e faixas
  * Normalizar músicas (ex: nome, artista, preview_url)
* **Tecnologia livre** (pode ser microserviço Node, Go, etc.)
* **Interface externa** com APIs de terceiros
* **Entregas**:

  * `PlaylistNormalizada` com trechos válidos
* **Comunicação**:

  * Fornece dados ao `Game Orchestrator` antes da partida

---

### 4. 🏅 **Progressão e Ranking Context**

* **Tipo**: Future Supporting Domain
* **Responsável por** (futuro):

  * Armazenar histórico de partidas
  * Calcular e manter XP dos jogadores
  * Ranking global e conquistas
* **Tecnologia opcional** (pode ser acoplada ou separada)
* **Pode ser atualizado via eventos do `Game Orchestrator`**
* **Separável para escalar em futuro matchmaking competitivo**

---

### 5. 🎨 **Frontend Context**

* **Tipo**: Generic Domain
* **Responsável por**:

  * Interface do jogo (lobby, sala, partida, placar)
  * Comunicação em tempo real via Phoenix Channels (WebSocket)
  * Chamadas REST para operações pontuais (auth, playlists, perfil)
* **Tecnologia**: SvelteKit + Deno (Tailwind CSS)

---

## 🔗 Tipos de Relacionamento entre Contextos

| Relacionamento                 | Tipo                        | Exemplo                              |
| ------------------------------ | --------------------------- | ------------------------------------ |
| `Frontend` → `Orchestrator`    | Phoenix Channels + REST     | Envia comandos, recebe estado        |
| `Orchestrator` → `Game Engine` | Chamadas de módulo (BEAM)   | Envia comandos, recebe eventos       |
| `Orchestrator` → `Playlist`    | Cliente REST                | Solicita músicas para montar rodadas |
| `Orchestrator` → `Ranking`     | Eventual (event-driven)     | Envia eventos de resultado           |

---

## 📌 Direções estratégicas no contexto map

* **Game Engine é central**: ele **não depende de ninguém**, apenas reage a comandos
* **Orchestrator é o integrador**: sabe de todos os contextos, mas isola responsabilidades
* **Playlist é utilitário externo**: importante, mas não precisa estar sempre ativo
* **Ranking é plugável**: pode ser acoplado depois sem quebrar a base
* **Frontend (SvelteKit) é totalmente desacoplado da lógica**: pode trocar o front ou canal de comunicação no futuro

---
