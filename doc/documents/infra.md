# MERMÃ, A MÚSICA! — Especificação Técnica de Infraestrutura

**Documento complementar ao Domínio (DDD)**
**Versão 1.0 — MVP | Março 2026**

---

## 1. Visão Geral da Infraestrutura

Este documento define as decisões técnicas de infraestrutura para o MVP do projeto "Mermã, a Música!", complementando a documentação de domínio (DDD) já existente. Cobre persistência, autenticação, comunicação, deploy, áudio, resiliência e limites do sistema.

### 1.1 Princípios Orientadores

- **Low budget**: priorizar soluções open-source (MIT/Apache), gratuitas ou de baixo custo.
- **Simplicidade**: evitar overengineering no MVP; cada decisão deve ser a mais simples que resolve o problema.
- **BEAM-first**: aproveitar ao máximo o runtime do Erlang (processos, supervisors, estado em memória).
- **Gleam como linguagem principal**: minimizar Elixir ao estritamente necessário (Phoenix Channels).
- **Segurança básica**: HTTPS obrigatório, anti-cheat no áudio, backend como fonte da verdade.

### 1.2 Stack Tecnológica Confirmada

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend | SvelteKit + Deno + Tailwind CSS | Performance, DX moderno, SSR nativo |
| Game Engine | Gleam (BEAM) | Tipagem forte, funções puras, zero overhead no BEAM |
| Game Orchestrator | Gleam (BEAM) + Elixir mínimo | Gleam para lógica, Elixir só para Phoenix Channels |
| Comunicação real-time | Phoenix Channels (WebSocket) | Presença, reconexão automática, tópicos |
| API pontual | REST (JSON) | Criação de sala, auth, import playlist |
| Reverse Proxy | Caddy | HTTPS automático via Let's Encrypt, config simples |
| Container | Docker | Deploy reproduzível, isolamento |
| Hospedagem | VPS (Hetzner/DigitalOcean/Vultr) | Custo baixo, controle total |

---

## 2. Persistência e Banco de Dados

### 2.1 Estratégia Geral

No MVP, o estado vivo do jogo (salas, partidas, rodadas) reside inteiramente em processos BEAM na memória. Não há banco de dados relacional para o gameplay.

**Justificativa:** O BEAM é projetado para manter estado em processos isolados com garbage collection independente. Para um jogo real-time, isso elimina latência de I/O e simplifica enormemente a arquitetura. Partidas são efêmeras por natureza.

### 2.2 O que é persistido vs. efêmero

| Dado | Armazenamento | Justificativa |
|------|--------------|---------------|
| Estado da sala/partida | Memória BEAM (processo) | Efêmero, morre com a sala |
| Tokens OAuth (Spotify/Deezer/YT) | Browser (cookie/localStorage) | Simplifica backend, sem banco |
| Resultados de partida | Descartados no MVP | Só persistir quando houver sistema de contas |
| Identidade do jogador | Cookie no browser (UUID) | Permite reconexão sem conta |
| Playlists importadas | Cache em memória durante a sessão | Re-importar a cada nova sessão |

### 2.3 Banco de Dados Escolhido: SQLite

Quando o sistema de contas for implementado (pós-MVP), o banco de dados será **SQLite**.

**Justificativa da escolha:**

- **Zero overhead de infraestrutura**: não precisa de servidor/daemon separado, não consome RAM adicional. Crucial em um VPS de 2GB.
- **Zero configuração**: é um arquivo no disco. Sem container Docker extra, sem gerenciamento de conexões.
- **Backup trivial**: copiar um único arquivo `.db`.
- **Perfil de carga compatível**: as escritas no banco são pontuais (fim de partida, criar conta, registrar conquista) — nunca durante o gameplay real-time (que vive em memória BEAM). O SQLite com WAL mode suporta leituras concorrentes sem problema, e a serialização de escritas não é gargalo para esse perfil.
- **Open-source (domínio público)**: sem restrições de licença.
- **Suporte no ecossistema BEAM**: `ecto_sqlite3` (Elixir/Ecto), `sqlight` e `squirrel` (Gleam).

**O que será persistido no SQLite (pós-MVP):**

- Perfis de usuário (conta, nickname, preferências).
- Histórico de partidas e resultados.
- Tokens OAuth persistentes (migrados do localStorage).
- XP, ranking e conquistas (contexto de Progressão).

**Alternativas descartadas:**

- *PostgreSQL*: robusto, mas requer servidor separado, container extra e 100-200MB de RAM. Overengineering para o escopo atual e previsto.
- *MySQL/MariaDB*: mesmos problemas do PostgreSQL, com suporte inferior no ecossistema BEAM. Sem vantagem sobre PostgreSQL ou SQLite para este projeto.
- *Redis*: o BEAM já fornece estado em memória nativo via processos. Redis seria redundante.

**Evolução futura**: se o projeto escalar para múltiplos servidores, a migração de SQLite para PostgreSQL é viável — as queries SQL são compatíveis e o Ecto abstrai boa parte das diferenças.

---

## 3. Autenticação e Identidade

### 3.1 Modelo de Identidade no MVP

O sistema suporta dois tipos de jogadores:

- **Jogador anônimo**: escolhe um nickname ao entrar na sala. Identificado por um UUID gerado no browser e salvo em cookie. Pode jogar, responder e pontuar normalmente. Não pode importar playlists.
- **Jogador autenticado**: faz login via OAuth com Spotify, Deezer ou YouTube Music. Além do nickname e UUID, possui tokens de acesso armazenados no browser. Pode importar e usar playlists pessoais.

### 3.2 Fluxo de Autenticação OAuth

**Plataformas suportadas no MVP:** Spotify, Deezer, YouTube Music.

Fluxo:

1. Jogador clica em "Conectar Spotify" (ou Deezer/YouTube Music) no frontend.
2. Frontend redireciona para a página de autorização OAuth da plataforma.
3. Após autorização, callback retorna ao frontend com authorization code.
4. Frontend troca o code por access_token + refresh_token via backend (proxy).
5. Tokens são armazenados no browser (localStorage) — nunca expostos em URLs.
6. Tokens são enviados ao backend apenas quando necessário (importar playlist).

### 3.3 Reconexão e Identificação

Cada jogador recebe um UUID gerado no browser na primeira visita, salvo em cookie persistente. Esse UUID é enviado ao backend via WebSocket ao conectar na sala. Se o jogador desconectar e reconectar dentro do timeout de 2 minutos, o backend reconhece o UUID e restaura sua posição na partida.

**Para jogadores autenticados:** O ID da plataforma (Spotify user ID, etc.) é vinculado ao UUID do browser como reforço de identidade, mas o UUID permanece como identificador primário.

---

## 4. Protocolo de Comunicação

### 4.1 Divisão REST vs. WebSocket

| Operação | Protocolo | Motivo |
|----------|----------|--------|
| Criar sala | REST (POST) | Ação pontual, resposta única |
| Entrar na sala via código/link | REST (POST) → WebSocket | Valida código via REST, depois conecta WS |
| OAuth callback | REST | Redirect padrão OAuth |
| Importar playlist | REST (POST) | Operação assíncrona pontual |
| Proxy de áudio | REST (GET) com streaming | Entrega áudio sem expor URL original |
| Eventos da sala (in-game) | WebSocket (Phoenix Channels) | Bidirecional, real-time |
| Estado de jogadores | WebSocket | Presença, pronto, conectado |
| Comandos de jogo | WebSocket | Respostas, iniciar, avançar rodada |

### 4.2 Formato de Mensagens WebSocket

Todas as mensagens via WebSocket usam JSON no MVP. O formato segue a convenção de Phoenix Channels:

**Mensagem do cliente (push):** `{ "topic": "room:<code>", "event": "submit_answer", "payload": { ... }, "ref": "1" }`

**Mensagem do servidor (broadcast):** `{ "topic": "room:<code>", "event": "round_started", "payload": { ... } }`

Evolução futura: migrar para formato binário (MessagePack/Protocol Buffers) se necessário por performance.

### 4.3 Tópicos e Eventos

#### 4.3.1 Tópico: `room:<invite_code>`

Cada sala tem um tópico único baseado no código de convite. Todos os jogadores da sala se inscrevem nesse tópico ao conectar.

**Eventos do Cliente → Servidor:**

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `player_join` | `{ nickname, player_uuid }` | Jogador entra na sala |
| `player_ready` | `{ player_uuid }` | Jogador marca-se como pronto |
| `start_game` | `{ player_uuid }` | Host inicia a partida |
| `submit_answer` | `{ player_uuid, answer_text }` | Jogador envia resposta |
| `audio_buffered` | `{ player_uuid }` | Jogador confirma que áudio carregou |
| `player_leave` | `{ player_uuid }` | Jogador sai voluntariamente |

**Eventos do Servidor → Cliente:**

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `room_state` | `{ players, room_state, config }` | Estado completo da sala (ao entrar/reconectar) |
| `player_joined` | `{ player }` | Novo jogador entrou |
| `player_left` | `{ player_uuid }` | Jogador saiu ou timeout |
| `player_ready_changed` | `{ player_uuid, ready }` | Status de pronto mudou |
| `game_starting` | `{ countdown_seconds }` | Contagem regressiva para início |
| `round_starting` | `{ round_index, audio_token, total_rounds }` | Nova rodada, token para buscar áudio |
| `timer_started` | `{ duration_seconds }` | Timer oficial iniciou (após grace period) |
| `answer_confirmed` | `{ player_uuid }` | Confirma recebimento da resposta (sem revelar resultado) |
| `round_ended` | `{ results, scores }` | Rodada encerrada com resultados |
| `game_ended` | `{ final_scores, winner }` | Partida encerrada |
| `host_changed` | `{ new_host_uuid }` | Host mudou (desconexão do anterior) |
| `error` | `{ code, message }` | Erro (não é host, sala cheia, etc.) |

### 4.4 Sistema de Convite

Cada sala possui um código de convite curto (6 caracteres alfanuméricos, maiúsculas, ex: ABC123) e um link compartilhável no formato: `https://<dominio>/sala/<CODIGO>`.

O link redireciona para o frontend que extrai o código e conecta via WebSocket automaticamente.

---

## 5. Sistema de Áudio e Anti-Cheat

### 5.1 Proxy de Áudio

O frontend NUNCA acessa diretamente as URLs de preview do Spotify/Deezer/YouTube Music. Todo áudio passa por um proxy no backend para impedir que jogadores identifiquem a música inspecionando o navegador.

**Fluxo:**

1. Backend envia evento `round_starting` com um `audio_token` (token opaco, único por rodada).
2. Frontend faz `GET /api/audio/<audio_token>` para obter o stream de áudio.
3. Backend resolve o `audio_token` para a `preview_url` real e faz proxy do stream.
4. Headers de resposta são sanitizados: sem metadata de plataforma, Content-Type genérico (`audio/mpeg`).
5. `audio_token` expira após a rodada terminar.

### 5.2 Medidas Anti-Cheat no MVP

- URL da música nunca exposta ao frontend (proxy obrigatório).
- Sem metadata identificadora nos headers da resposta de áudio.
- `audio_token` é single-use e expira com a rodada.
- Timer controlado pelo backend — frontend não pode manipular o tempo.
- Resposta só é aceita enquanto a rodada está ativa no backend.

**Limitação aceita:** Um jogador motivado pode gravar o áudio e usar Shazam/SoundHound. Isso é considerado aceitável para o MVP — mitigações avançadas (fragmentos aleatórios, distorção temporária) ficam para versões futuras.

### 5.3 Sincronização e Timer

**Fonte da verdade:** O BACKEND controla todos os timers. O frontend apenas exibe uma contagem regressiva local sincronizada.

Fluxo de sincronização da rodada:

1. Backend envia `round_starting` com `audio_token`.
2. Cada frontend faz request do áudio e começa a bufferizar.
3. Backend inicia um **grace period fixo** (ex: 3 segundos) para permitir buffer.
4. Após o grace period, backend envia `timer_started` e começa a contagem oficial.
5. Frontend toca o áudio e exibe o timer sincronizado.
6. Se um jogador não conseguiu bufferizar a tempo, ele ainda participa mas com desvantagem de latência — não pausa para ninguém.

**Grace period:** Tempo fixo configurável (padrão: 3 segundos). Não depende de confirmação individual dos clientes — simplifica a lógica e evita que um jogador com internet lenta trave a partida.

### 5.4 Fallback de Música Indisponível

Se o `preview_url` de uma música estiver quebrado ou expirado no momento da rodada, o backend automaticamente pula a música e seleciona outra do pool de reserva. O pool de reserva é composto por músicas extras das playlists que não foram selecionadas para as rodadas principais. Se não houver reservas disponíveis, a rodada é pulada e o total de rodadas é reduzido.

---

## 6. Resiliência e Reconexão

### 6.1 Desconexão de Jogador

| Cenário | Comportamento |
|---------|--------------|
| Jogador desconecta no meio da rodada | Rodada continua normalmente. Jogador perde a vez (0 pontos na rodada). Status muda para `Disconnected`. |
| Jogador reconecta dentro de 2 minutos | UUID é reconhecido, jogador volta à sala com estado preservado. Recebe `room_state` com estado atual. |
| Jogador não reconecta em 2 minutos | Jogador é removido da sala. Evento `player_left` é enviado aos demais. |
| Modo solo: jogador desconecta | Sala permanece ativa por 2 minutos. Se reconectar, continua. Se não, sala é destruída. |

### 6.2 Desconexão do Host

Se o host desconectar, o papel de host é automaticamente transferido para o jogador mais antigo na sala (por ordem de entrada). O evento `host_changed` é enviado a todos os jogadores.

Se o host desconectar e reconectar dentro do timeout, ele volta como jogador comum (não recupera o papel de host automaticamente).

### 6.3 Inatividade da Sala

- Sala sem jogadores conectados por 2 minutos: destruída.
- Sala no estado `Waiting` sem atividade por 30 minutos: destruída.
- Sala no estado `Finished`: destruída após 5 minutos (tempo para ver resultados).

### 6.4 Crash do Processo BEAM

Se o processo de uma sala crashar, o Supervisor OTP reinicia automaticamente um novo processo. Porém, como o estado vive apenas em memória, a partida em andamento é perdida. Os jogadores recebem uma notificação de erro e podem criar uma nova sala.

**Evolução futura:** Implementar snapshots periódicos do estado da partida (ETS ou disco) para permitir recuperação após crash. Não é prioridade para o MVP.

---

## 7. Limites e Configurações do Sistema

### 7.1 Limites por Sala

| Parâmetro | Valor | Nota |
|-----------|-------|------|
| Mínimo de jogadores | 1 | Modo solo/prática permitido |
| Máximo de jogadores | 20 | Limite fixo no MVP |
| Timeout de reconexão | 2 minutos | Após isso, jogador é removido |
| Inatividade (sala waiting) | 30 minutos | Sala é destruída |
| Inatividade (sala finished) | 5 minutos | Tempo pra ver resultados |
| Tempo por rodada | 10 a 60 segundos | Configurável pelo host |
| Grace period do áudio | 3 segundos | Fixo, antes do timer começar |

### 7.2 Regra de Músicas por Partida

O número de músicas é dinâmico, baseado no número total de jogadores na sala (incluindo jogadores sem playlist):

- **Mínimo:** 1 música por jogador (ex: 4 jogadores = mínimo 4 músicas).
- **Máximo:** 5 músicas por jogador (ex: 4 jogadores = máximo 20 músicas).
- **Host escolhe:** Qualquer valor dentro desse range.

Para jogadores sem playlist: cada jogador sem playlist ainda contribui +1 para o mínimo e +5 para o máximo do range. As músicas que seriam "dele" são redistribuídas igualmente entre os jogadores que possuem playlist.

### 7.3 Redistribuição de Músicas

O total de músicas selecionadas é dividido igualmente entre os jogadores COM playlist. Se a divisão não for exata, usa-se distribuição round-robin: os primeiros jogadores da lista (em ordem aleatória) recebem uma música extra cada.

**Exemplo:** 13 músicas para 3 jogadores com playlist → 5, 4, 4 (ordem aleatória).

---

## 8. Deploy e Operações

### 8.1 Arquitetura de Deploy

Tudo roda em um único servidor VPS com Docker Compose:

| Container | Serviço | Porta |
|-----------|---------|-------|
| `caddy` | Reverse proxy + HTTPS automático | 80, 443 |
| `app` | BEAM (Gleam + Elixir) + Frontend estático | 4000 (interna) |

O frontend SvelteKit é buildado como assets estáticos e servido pelo mesmo servidor BEAM ou pelo Caddy diretamente. Isso elimina a necessidade de um container separado para o frontend.

### 8.2 Requisitos Mínimos do Servidor

| Recurso | Mínimo MVP | Recomendado |
|---------|-----------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 2 GB | 4 GB |
| Disco | 20 GB SSD | 40 GB SSD |
| Banda | 1 TB/mês | 2 TB/mês |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

**Custo estimado:** EUR 4-8/mês em Hetzner (CX22 ou similar).

### 8.3 HTTPS e Domínio

HTTPS é obrigatório desde o dia 1 (requisito do OAuth do Spotify/Deezer/YouTube Music). O Caddy gerencia certificados Let's Encrypt automaticamente, sem configuração manual.

Domínio próprio já registrado. DNS apontando para o IP da VPS.

### 8.4 Monitoramento

No MVP, monitoramento básico:

- Logs estruturados do BEAM (Erlang logger) com nível configurável.
- Métricas básicas expostas: número de salas ativas, jogadores conectados, memória usada.
- Health check endpoint (`GET /health`) para monitoramento externo.
- Alertas via webhook simples (ex: Discord/Telegram) se o servidor ficar indisponível.

**Evolução futura:** Prometheus + Grafana para dashboards detalhados, tracing distribuído com OpenTelemetry.

---

## 9. Internacionalização

O MVP é exclusivamente em Português (Brasil). Toda a interface, mensagens de erro e comunicação do sistema usam pt-BR.

A arquitetura deve prever i18n para futuras traduções (strings externalizadas, sem texto hardcoded na lógica), mas a implementação de outros idiomas fica fora do escopo do MVP.

---

## 10. Decisões Pendentes e Notas para o GDD

Os seguintes itens são decisões de game design que impactam a infraestrutura e serão definidos no GDD (Game Design Document):

| Item | Impacto em Infra | Status |
|------|-----------------|--------|
| Algoritmo de validação de respostas (fuzzy matching, tolerância a typos) | CPU da engine, complexidade do Game Engine | Pendente — GDD |
| Fórmula de pontuação (Simple vs SpeedBonus) | Lógica na engine, payload dos eventos | Pendente — GDD |
| Regra de desempate | Lógica na engine | Pendente — GDD |
| Se dono da música pode responder a própria música | Lógica na engine | Pendente — GDD |
| Comportamento do jogador que não responde (timeout) | Engine + evento específico | Pendente — GDD |
| Duração do trecho de áudio tocado | Proxy de áudio, buffer | Pendente — GDD |
| Fluxo completo de UX (telas, transições) | Frontend + eventos WebSocket | Pendente — GDD |

---

## 11. Resumo das Decisões

| Decisão | Escolha |
|---------|---------|
| Banco de dados no MVP | Nenhum — estado em memória BEAM |
| Banco de dados (pós-MVP) | SQLite (arquivo local, zero overhead) |
| Persistência de resultados | Apenas com sistema de contas (futuro, SQLite) |
| Tokens OAuth | Browser (localStorage) |
| Identidade do jogador | UUID no cookie + OAuth opcional |
| Login obrigatório | Não — anônimo permitido, login para playlist |
| Plataformas de música | Spotify, Deezer, YouTube Music |
| Convite | Código curto (6 chars) + link |
| REST vs WebSocket | REST pontual + WebSocket na sala |
| Formato de mensagens | JSON (MVP), binário futuro |
| Áudio | Proxy no backend, URL nunca exposta |
| Timer | Backend é fonte da verdade |
| Grace period | 3 segundos fixos |
| Música indisponível | Pula e usa reserva do pool |
| Desconexão mid-round | Rodada continua, jogador perde vez |
| Host desconecta | Segundo mais antigo assume |
| Timeout reconexão | 2 minutos |
| Max jogadores | 20 por sala |
| Músicas por partida | 1-5 por jogador (dinâmico) |
| Tempo por rodada | 10-60 segundos |
| Deploy | Docker Compose em VPS |
| HTTPS | Caddy + Let's Encrypt |
| Idioma MVP | Português (BR) |
| Monitoramento | Logs BEAM + métricas básicas + health check |

---

*Fim do Documento de Especificação Técnica de Infraestrutura*
