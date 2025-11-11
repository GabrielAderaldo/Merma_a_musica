Excelente! Vamos agora para o **📦 Bounded Context 3: Playlist Integration Context**, essencial para dar ao seu jogo o diferencial de **usar playlists pessoais** como fonte de conteúdo.

---

# 📦 3.3 — **Playlist Integration Context**

> *Responsável por conectar com serviços de streaming (Spotify, Deezer, etc.), importar playlists dos jogadores e normalizar as faixas que podem ser usadas no jogo.*

---

## 🎯 Objetivo deste contexto

Este contexto abstrai a complexidade das integrações com APIs externas de música.
Ele:

* Autentica os jogadores com suas contas de streaming
* Recupera playlists e músicas disponíveis
* Filtra apenas as músicas válidas para uso no jogo (com `preview_url`)
* Normaliza os dados para o formato que o `Game Engine` espera

---

## 🧠 Motivação estratégica

Sem esse contexto:

* A lógica de jogo precisaria conhecer as APIs do Spotify/Deezer
* Seria difícil mudar ou expandir suporte para outras plataformas
* O domínio ficaria acoplado à infraestrutura externa

Com esse contexto:

* O domínio continua limpo e agnóstico
* É possível usar múltiplas fontes no futuro (SoundCloud, Apple Music)
* Facilita testes com dados mockados

---

## 🔌 Serviços Externos Integrados

* 🎵 Spotify Web API
* 🎶 Deezer API
* (Outros futuros: YouTube Music, SoundCloud...)

---

## 📦 Entidades

### 1. `ContaConectada`

| Campo           | Tipo                      | Descrição                   |
| --------------- | ------------------------- | --------------------------- |
| `usuario_id`    | UUID                      | Relacionado ao jogador      |
| `plataforma`    | Enum (Spotify, Deezer...) | Origem dos dados            |
| `access_token`  | String                    | Token de acesso (OAuth)     |
| `refresh_token` | String                    | Usado para renovar sessão   |
| `nome_usuario`  | String                    | Nome da conta na plataforma |

---

### 2. `PlaylistImportada`

> Representa uma playlist da conta do jogador, com dados normalizados.

| Campo     | Tipo                         | Descrição                       |
| --------- | ---------------------------- | ------------------------------- |
| `id`      | String                       | ID da playlist na plataforma    |
| `nome`    | String                       | Nome da playlist                |
| `musicas` | Lista de `MusicaNormalizada` | Faixas válidas para o jogo      |
| `total`   | Int                          | Total de músicas após filtragem |
| `dono`    | `usuario_id`                 | Proprietário da playlist        |

---

### 3. `MusicaNormalizada`

> Música extraída e limpa, pronta para uso no jogo.

| Campo         | Tipo   | Descrição                                            |
| ------------- | ------ | ---------------------------------------------------- |
| `id_externo`  | String | ID na plataforma (ex: Spotify ID)                    |
| `nome`        | String | Nome da música                                       |
| `artista`     | String | Nome do artista                                      |
| `preview_url` | URL    | Trecho de 15–30s                                     |
| `duração_ms`  | Int    | Duração total da faixa                               |
| `valida`      | Bool   | Se pode ser usada (baseada na existência de preview) |

---

## 🧩 Value Objects

### `PlataformaDeStreaming`

* Enum: `SPOTIFY`, `DEEZER`, `YOUTUBE_MUSIC`, etc.

### `TokenOAuth`

* Struct com access + refresh + validade

### `ResultadoImportacao`

* Struct contendo listas: válidas, inválidas, erro

---

## 📡 Comportamentos / Serviços

| Serviço                     | Responsabilidade                                       |
| --------------------------- | ------------------------------------------------------ |
| `AutenticadorDePlataforma`  | Realiza OAuth e armazena tokens                        |
| `ImportadorDePlaylists`     | Lista as playlists da conta conectada                  |
| `FiltradorDeMusicasValidas` | Remove músicas sem `preview_url`                       |
| `NormalizadorDeMusicas`     | Converte formato da API externa para o domínio interno |

---

## 🔁 Fluxo de uso

```text
1. Jogador autentica com Spotify (OAuth)
2. Plataforma retorna tokens → armazenados como `ContaConectada`
3. Jogador escolhe uma playlist
4. Serviço importa e filtra músicas
5. `PlaylistImportada` é retornada ao `Game Orchestrator`
6. Orquestrador seleciona músicas para a partida
```

---

## ⚖️ Invariantes (Regras de Negócio)

* Apenas músicas com `preview_url` são válidas para o jogo
* Cada jogador só pode usar suas próprias playlists
* Playlists devem conter ao menos N músicas válidas para serem aceitas
* Se uma playlist for removida na plataforma, deve ser descartada no cache local

---

## 🔗 Comunicação com outros contextos

| Destino             | Propósito                                                   |
| ------------------- | ----------------------------------------------------------- |
| `Game Orchestrator` | Solicita playlists e músicas válidas para montar as rodadas |
| `UI Gateway`        | Exibe playlists disponíveis para o jogador escolher         |

---

## 📘 Linguagem Ubíqua

| Termo             | Significado                                    |
| ----------------- | ---------------------------------------------- |
| **Plataforma**    | Sistema de streaming conectado                 |
| **Playlist**      | Lista de músicas de um jogador                 |
| **Música válida** | Música com preview_url                         |
| **Importação**    | Processo de buscar playlists/músicas da conta  |
| **Token OAuth**   | Credencial de acesso segura para a API externa |

---