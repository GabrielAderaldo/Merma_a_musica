# MERMÃ, A MÚSICA! — Game Design Document (GDD)

**Documento complementar ao Domínio (DDD) e à Especificação Técnica de Infraestrutura**
**Versão 1.0 — MVP | Março 2026**

---

## 1. Visão Geral do Jogo

**"Mermã, a Música!"** é um jogo multiplayer online de quiz musical onde jogadores escutam trechos de músicas das playlists uns dos outros e tentam adivinhar o nome da música, do artista, ou ambos.

**Gênero:** Quiz musical multiplayer casual.
**Plataforma:** Web (browser — desktop e mobile).
**Público-alvo:** Jogadores casuais, grupos de amigos, streamers.
**Idioma do MVP:** Português (Brasil).
**Sessão típica:** 5 a 15 minutos por partida.

### 1.1 Core Fantasy

"Provar que você conhece mais música que seus amigos usando as playlists de todo mundo."

### 1.2 Pilares de Design

- **Diversão social**: o jogo é melhor jogado com amigos, gritando respostas e rindo dos erros.
- **Personalização total**: suas playlists, suas regras, seu jogo.
- **Ritmo rápido**: rodadas curtas, transições rápidas, zero tempo morto.
- **Acessibilidade**: qualquer pessoa joga em segundos, sem conta obrigatória, sem download.

---

## 2. Fluxo do Jogador (Player Journey)

### 2.1 Fluxo Completo de Telas

```
Tela Inicial → Login Opcional → Criar/Entrar Sala → Lobby → Partida → Resultados → Lobby
```

### 2.2 Detalhamento de Cada Etapa

**Tela Inicial:**
- Branding do jogo e botões principais: "Criar Sala" e "Entrar na Sala".
- Opção de login (Spotify, Deezer, YouTube Music) visível mas não obrigatória.

**Login Opcional:**
- Jogador pode pular e jogar como anônimo (só escolhe nickname).
- Se logar com uma plataforma de música, desbloqueia importação de playlists.
- Plataformas suportadas: Spotify, Deezer, YouTube Music.

**Criar Sala:**
- Jogador vira host.
- Recebe código de convite (6 caracteres, ex: ABC123) + link compartilhável.
- Define nickname se ainda não definiu.

**Entrar na Sala:**
- Digita código de convite ou acessa link direto.
- Define nickname se ainda não definiu.

**Lobby:**
- Lista de jogadores na sala com status (pronto / não pronto).
- Jogadores podem importar playlist (se logados) ou jogar sem.
- Host configura a partida (MatchConfiguration).
- Botão "Iniciar" visível apenas para o host (ativo quando todos estão prontos).

**Partida:**
- Ciclo de rodadas até acabar.
- Cada rodada: ouvir música → responder → revelação → próxima rodada.

**Resultados:**
- Ranking final com estatísticas e destaques.
- Após 5 segundos, volta automaticamente ao lobby.

**Lobby (pós-partida):**
- Jogadores continuam na sala.
- Host pode reconfigurar e iniciar nova partida.
- Jogadores podem sair livremente.

---

## 3. Mecânica de Rodada (Core Loop)

### 3.1 Fluxo de Uma Rodada

```
1. Backend seleciona música da rodada
2. Backend envia audio_token aos jogadores
3. Grace period de 3 segundos (buffer do áudio)
4. Timer oficial começa (backend é fonte da verdade)
5. Áudio toca no browser de cada jogador
6. Jogadores digitam resposta (podem alterar até o timer acabar)
7. Jogadores veem quem já respondeu (mas não o quê)
8. Timer acaba OU todos responderam + maioria vota pular
9. Revelação: música toca com nome, artista, álbum, dono + quem acertou/errou e o que tentaram
10. 3 segundos de pausa
11. Próxima rodada (ou fim da partida)
```

### 3.2 Input de Resposta

- **Campo único** de texto livre com autocomplete opcional.
- Ao digitar, aparecem sugestões vindas do **pool total de músicas de todas as playlists** dos jogadores na sala (não apenas da partida — evita spoiler).
- O jogador pode selecionar uma sugestão ou enviar texto livre.
- **O jogador pode alterar sua resposta** quantas vezes quiser até o timer acabar. Para efeito de SpeedBonus, conta o tempo da **última resposta enviada**.
- Se o jogador não responder nada até o timer acabar, conta como resposta errada (0 pontos).

### 3.3 O Que é Respondido (answer_type)

O host configura o tipo de resposta antes de iniciar a partida:

| Modo | O que o jogador precisa acertar | Campo de input |
|------|-------------------------------|----------------|
| **SONG** | Nome da música | Campo único |
| **ARTIST** | Nome do artista | Campo único |
| **BOTH** | Nome da música **OU** nome do artista | Campo único |

**Importante:** O modo BOTH é o **mais fácil**, não o mais difícil. Ele aceita qualquer uma das duas respostas como correta. O jogador digita uma coisa só — se bater com o nome da música ou com o artista, é ponto.

### 3.4 Validação de Respostas

A validação usa **fuzzy matching com normalização**:

- **Normalização aplicada** (antes de comparar): remove acentos, converte para minúsculas, remove artigos (o, a, os, as, the, el, la), remove conteúdo entre parênteses e colchetes (ex: "(feat. X)", "[Remix]"), trim de espaços extras.
- **Fuzzy matching**: tolerância a 1-2 erros de digitação (distância de Levenshtein ou similar). Ex: "Bheemian Rapsody" → match com "Bohemian Rhapsody" se dentro do threshold.
- **A validação roda no backend** (Game Engine) — nunca no frontend.

**Exemplos de match:**

| Resposta do jogador | Música/Artista real | Resultado |
|--------------------|-------------------|-----------|
| "bohemian rhapsody" | "Bohemian Rhapsody" | ✅ Correto |
| "boemian rapsody" | "Bohemian Rhapsody" | ✅ Correto (fuzzy) |
| "Evidencias" | "Evidências" | ✅ Correto (normalização) |
| "The Weeknd" | "The Weeknd" | ✅ Correto |
| "Weekend" | "The Weeknd" | ✅ Correto (fuzzy + normalização) |
| "musica aleatoria" | "Bohemian Rhapsody" | ❌ Errado |

### 3.5 Pular Rodada Antecipadamente

A rodada pode ser encerrada antes do timer se:

1. **Todos os jogadores já responderam** (certo ou errado), E
2. **A maioria dos jogadores vota para pular** (botão "Pular" aparece após responder).

Se as duas condições forem atendidas, a rodada encerra imediatamente e vai para a fase de revelação.

### 3.6 Revelação (Pós-Rodada)

Quando a rodada encerra (timer ou pulo), acontece a revelação:

- A música **continua tocando** (ou recomeça) agora com as informações visíveis.
- **Informações mostradas**: nome da música, nome do artista, álbum, e de qual jogador veio a música.
- **Respostas reveladas**: quem acertou (✅), quem errou (❌) e o que cada jogador digitou.
- **Pontos ganhos** na rodada são mostrados.
- **Placar atualizado** visível.
- Após **3 segundos**, a próxima rodada começa automaticamente.

---

## 4. Sistema de Pontuação

### 4.1 Modo Simple (Pontuação Simples)

- Acertou = **1 ponto**.
- Errou = **0 pontos**.
- Não respondeu = **0 pontos**.

Simples, direto, sem complicação. O total de pontos no final = total de acertos.

### 4.2 Modo SpeedBonus (Bônus por Velocidade)

Fórmula linear decrescente:

```
pontos = max(100, 1000 - ((tempo_resposta / tempo_total_rodada) × 900))
```

Onde:
- `tempo_resposta` = segundos entre o início do timer e o envio da **última** resposta.
- `tempo_total_rodada` = tempo configurado pelo host (10-60 segundos).
- Mínimo: **100 pontos** (respondeu no último segundo).
- Máximo: **1000 pontos** (respondeu instantaneamente).
- Errou = **0 pontos** (independente da velocidade).
- Não respondeu = **0 pontos**.

**Exemplos (rodada de 30 segundos):**

| Tempo de resposta | Pontos |
|-------------------|--------|
| 0s (instantâneo) | 1000 |
| 5s | 850 |
| 10s | 700 |
| 15s | 550 |
| 20s | 400 |
| 25s | 250 |
| 30s (último segundo) | 100 |

**Nota:** como o jogador pode alterar a resposta, o tempo que conta é o da última submissão. Estratégia possível: chutar rápido (pontos altos se acertar) e refinar se tiver tempo.

### 4.3 Regra de Desempate

Se dois ou mais jogadores terminarem com a mesma pontuação final:

- **Critério de desempate**: maior número de **acertos consecutivos** (streak) durante a partida.
- Se ainda empatar: **empate aceito** (múltiplos vencedores na mesma posição).

---

## 5. Seleção de Músicas

### 5.1 Pool de Músicas

As músicas da partida vêm exclusivamente das playlists importadas pelos jogadores na sala. Jogadores sem playlist não contribuem músicas, mas suas "cotas" são redistribuídas.

### 5.2 Range de Músicas por Partida

O número de músicas é dinâmico, baseado no total de jogadores na sala:

- **Mínimo**: 1 música por jogador (ex: 4 jogadores = mínimo 4).
- **Máximo**: 5 músicas por jogador (ex: 4 jogadores = máximo 20).
- Jogadores SEM playlist contribuem para o range: +1 no mínimo, +5 no máximo.
- **Host escolhe** qualquer valor dentro do range.

**Exemplos:**

| Jogadores | Com playlist | Sem playlist | Mínimo | Máximo |
|-----------|-------------|-------------|--------|--------|
| 1 | 1 | 0 | 1 | 5 |
| 4 | 4 | 0 | 4 | 20 |
| 4 | 2 | 2 | 4 | 20 |
| 10 | 7 | 3 | 10 | 50 |
| 20 | 15 | 5 | 20 | 100 |

### 5.3 Distribuição de Músicas entre Jogadores

O total de músicas escolhido pelo host é dividido **igualmente entre os jogadores COM playlist**.

- Se a divisão não for exata, usa-se **round-robin**: os primeiros jogadores da lista (em ordem aleatória) recebem uma música extra cada.
- **Exemplo**: 13 músicas para 3 jogadores com playlist → 5, 4, 4 (ordem aleatória define quem recebe a extra).

### 5.4 Regra de Repetição (allowRepeats)

- **allowRepeats = false** (padrão): a mesma música nunca aparece mais de uma vez na partida, mesmo que esteja na playlist de múltiplos jogadores. Comparação por ID externo da plataforma.
- **allowRepeats = true**: músicas podem aparecer mais de uma vez se estiverem em playlists diferentes.

### 5.5 Todos Podem Responder Suas Próprias Músicas

O jogador que "doou" a música da rodada **pode responder e pontuar normalmente**. Não há distinção ou bloqueio — todos os jogadores são iguais em todas as rodadas.

### 5.6 Ordem das Rodadas

As músicas são embaralhadas aleatoriamente. A ordem não segue nenhum padrão (não alterna entre jogadores, não agrupa por playlist).

---

## 6. Configuração da Partida (MatchConfiguration)

O host configura antes de iniciar. Todas as opções são escolhidas no lobby.

| Configuração | Opções | Padrão |
|-------------|--------|--------|
| **Tempo por rodada** | 10 a 60 segundos (slider) | 30 segundos |
| **Total de músicas** | Range dinâmico (ver seção 5.2) | Máximo do range |
| **Tipo de resposta** | SONG, ARTIST, BOTH | BOTH |
| **Permitir repetição** | Sim / Não | Não |
| **Regra de pontuação** | Simple / SpeedBonus | SpeedBonus |

---

## 7. Tela de Resultados (Pós-Partida)

### 7.1 Ranking Final

Exibido imediatamente após a última rodada:

- Posição de cada jogador (1º, 2º, 3º...).
- Pontuação total.
- Destaque visual para o vencedor (ou vencedores em caso de empate).

### 7.2 Destaques (Melhores Momentos)

Estatísticas especiais que celebram momentos da partida:

| Destaque | Descrição |
|----------|-----------|
| **Maior streak** | Jogador com mais acertos consecutivos |
| **Resposta mais rápida** | Menor tempo de resposta correta da partida |
| **Conhecedor** | Jogador com mais acertos totais |
| **Na trave** | Jogador com mais respostas quase certas (fuzzy match próximo mas não suficiente) |

### 7.3 Retorno ao Lobby

Após **5 segundos** na tela de resultados, os jogadores retornam automaticamente ao lobby da sala. O host pode reconfigurar e iniciar uma nova partida. Jogadores podem sair ou permanecer.

---

## 8. Modo Solo / Prática

O jogo permite jogar sozinho (mínimo de 1 jogador):

- Funciona exatamente como o multiplayer, mas sem competição.
- O jogador é o host e o único participante.
- Útil para: testar playlists, praticar, ou simplesmente se divertir.
- Todas as configurações de partida estão disponíveis.
- Tela de resultados mostra estatísticas pessoais (acertos, tempo médio, streak).

---

## 9. Áudio e Experiência Sonora

### 9.1 Reprodução de Áudio

- O áudio vem dos **previews das plataformas** (Spotify, Deezer, YouTube Music) — trechos de 15-30 segundos.
- O áudio é entregue via **proxy no backend** (jogador nunca vê a URL original).
- O trecho toca pelo tempo configurado da rodada (10-60 segundos). Se o preview for mais curto que o timer, ele toca até acabar e o jogador tem o tempo restante em silêncio para responder.

### 9.2 Revelação (Áudio Pós-Rodada)

Ao final da rodada, a música **continua tocando ou reinicia** durante os 3 segundos de revelação. Isso cria o momento de "ahh, era essa!" que é central para a diversão social.

### 9.3 Música Indisponível

Se o preview de uma música estiver quebrado ou expirado:
- Backend pula automaticamente e seleciona outra música do pool de reserva.
- Se não houver reservas, a rodada é pulada e o total de rodadas diminui.
- Jogadores não percebem — a experiência flui sem interrupção.

---

## 10. Glossário de Game Design

| Termo | Definição |
|-------|-----------|
| **Rodada** | Um ciclo de ouvir música → responder → revelação |
| **Partida** | Conjunto completo de rodadas |
| **Lobby** | Tela de espera onde jogadores se preparam e host configura |
| **Host** | Jogador que criou a sala e controla configurações |
| **Streak** | Número de acertos consecutivos sem errar |
| **Revelação** | Momento pós-rodada onde a resposta correta e informações são mostradas |
| **Pool** | Conjunto total de músicas disponíveis de todas as playlists |
| **Grace period** | 3 segundos antes do timer oficial para buffering do áudio |
| **Pular** | Encerrar rodada antecipadamente quando todos responderam e maioria votou |
| **answer_type** | Tipo de resposta configurado: SONG, ARTIST ou BOTH |
| **allowRepeats** | Configuração que permite ou proíbe músicas repetidas na partida |

---

## 11. Resumo das Decisões de Game Design

| Decisão | Escolha |
|---------|---------|
| Mecanismo de resposta | Texto livre com autocomplete opcional |
| Fonte do autocomplete | Pool total das playlists dos jogadores (sem spoiler) |
| Validação | Fuzzy matching + normalização (acentos, artigos, parênteses) |
| answer_type BOTH | Campo único, aceita música OU artista (modo mais fácil) |
| Pontuação Simple | 1 ponto por acerto, 0 por erro |
| Pontuação SpeedBonus | 1000 (instantâneo) a 100 (último segundo), linear |
| Resposta errada | 0 pontos, sem punição |
| Não respondeu | 0 pontos, conta como erro |
| Alterar resposta | Permitido até o timer acabar (tempo da última submissão conta) |
| Visibilidade durante rodada | Todos veem quem respondeu, mas não o quê |
| Pular rodada | Todos responderam + maioria vota pular |
| Revelação pós-rodada | Música toca + nome/artista/álbum/dono + respostas de todos |
| Tempo entre rodadas | 3 segundos |
| Tela de resultados | Ranking + destaques (streak, resposta mais rápida, etc.) |
| Retorno pós-partida | Automático ao lobby após 5 segundos |
| Dono da música pode responder | Sim, todos iguais |
| Desempate | Maior streak, depois empate aceito |
| Repetição de músicas | allowRepeats=false impede mesma música mesmo entre playlists |
| Range de músicas | 1-5 por jogador (dinâmico com total de jogadores) |
| Redistribuição (sem playlist) | Cotas redistribuídas via round-robin |
| Modo solo | Permitido (1 jogador mínimo) |
| Fluxo de telas | Tela inicial → Login opcional → Criar/Entrar → Lobby → Partida → Resultados → Lobby |

---

*Fim do Game Design Document*