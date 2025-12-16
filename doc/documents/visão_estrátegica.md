Perfeito! Vamos então detalhar o **📘 Primeiro Ponto do Documento de Domínio: Visão Geral Estratégica**.

---

# 📘 1. Visão Geral Estratégica — *"Mermã, a Música!"*

### 🧠 **Propósito do Sistema**

**"Mermã, a Música!"** é um jogo multiplayer de quiz musical online que permite aos jogadores competirem entre si usando músicas de suas próprias playlists, conectadas por meio de serviços de streaming como Spotify ou Deezer.

O sistema combina:

* **Jogo casual divertido**
* **Customização total da experiência**
* **Interação multiplayer em tempo real**
* **Modelo open-source com comunidade ativa**

---

## 🧩 **Problema que o sistema resolve**

Jogos de quiz musicais existentes (como *Anime Music Quiz*) são altamente nichados e limitados a um catálogo específico.
Não existe uma plataforma multiplayer, em tempo real, que permita os jogadores **usarem suas próprias playlists** de música como base para um jogo competitivo e personalizável.

**"Mermã, a Música!" resolve isso** oferecendo:

| Diferencial             | Como é resolvido                                           |
| ----------------------- | ---------------------------------------------------------- |
| Catálogo limitado       | Usa playlists pessoais dos usuários                        |
| Falta de personalização | Regras da partida são configuráveis pelo host              |
| Jogos previsíveis       | Rodadas geradas dinamicamente a partir de múltiplas fontes |
| Interface fechada       | Projeto open-source com contribuições da comunidade        |

---

## 🎯 **Objetivos estratégicos do produto**

| Objetivo                                      | Descrição                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 🎮 Criar uma experiência divertida e imersiva | Foco na mecânica de jogo simples, rápida e recompensadora                                   |
| 🤝 Estimular o jogo entre amigos              | Multiplayer real-time com salas privadas                                                    |
| 🎧 Usar playlists pessoais como diferencial   | Integração direta com Spotify/Deezer para personalização                                    |
| 🚀 Criar base para expansão                   | Arquitetura modular, baseada em eventos, com suporte a modos ranqueados e progressão futura |
| 🧑‍💻 Ser um projeto open-source vivo         | Código aberto com guia de contribuição, roadmap público e comunidade ativa                  |

---

## 🧑‍🤝‍🧑 **Perfil dos Usuários**

| Tipo de Usuário              | Características                                                |
| ---------------------------- | -------------------------------------------------------------- |
| **Jogador Casual**           | Entra para jogar com amigos; valoriza a simplicidade           |
| **Host da Partida**          | Cria salas, configura as regras, convida amigos                |
| **Contribuidor Open-source** | Desenvolvedor, designer ou tradutor que colabora com o projeto |
| **Streamer/Influencer**      | Usa o jogo como conteúdo para live com seguidores              |

---

## 🧱 **Escopo da Primeira Versão (MVP)**

### 🟢 Incluído:

* Criação de salas multiplayer
* Conexão com Spotify para importar playlists
* Rodadas com reprodução de trechos musicais
* Campo de resposta com validação exata (com autocomplete)
* Regras configuráveis:

  * Total de músicas
  * Tempo por rodada
  * Tipo de resposta (música, artista, ambos)
  * Pontuação simples ou com bônus
* Placar final com pontuações

### 🔴 Fora do escopo inicial:

* Modo ranqueado global
* Progressão de nível ou XP
* Integração com outras plataformas além do Spotify
* Modo espectador ou chat integrado
* Matchmaking público automatizado

---

## 🛠️ **Tecnologia e Arquitetura Estratégica**

| Camada                | Tecnologia        | Responsabilidade                                  |
| --------------------- | ----------------- | ------------------------------------------------- |
| 🖼️ UI                | **Bun + TS/JS**   | Interface, WebSocket e API gateway                |
| 🔁 Orquestração       | **Elixir (BEAM)** | Gerencia salas, rodadas, mensagens                |
| ⚙️ Lógica de jogo     | **Swift**         | Engine pura do jogo: rodada, pontuação, validação |
| 🗣️ Comunicação MS      | **gRPC**          | Comunicação entre os microsserviços                |
| 🎵 Integração externa | REST/GraphQL      | Spotify, Deezer, etc.                             |

---

## 🌱 **Evolução futura planejada**

| Fase    | Funcionalidades                                                                   |
| ------- | --------------------------------------------------------------------------------- |
| 🟢 MVP  | Jogo multiplayer básico com playlists pessoais                                    |
| 🔵 v1.1 | Tela de estatísticas pós-jogo, modo espectador, integração com Discord            |
| 🟣 v1.2 | Progressão com XP, ranking global, conquistas                                     |
| 🟠 v2.0 | Matchmaking público, torneios, suporte a novas fontes (YouTube, SoundCloud, etc.) |

---

## 📌 **Resumo estratégico**

> **"Mermã, a Música!"** é um sistema de quiz musical multiplayer baseado em playlists pessoais, focado em diversão, personalização e multiplayer leve. Ele adota princípios modernos de design de software (DDD, Event-Driven, arquitetura distribuída) e visa se tornar um projeto open-source referência no nicho de jogos sociais.