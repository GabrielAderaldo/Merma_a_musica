---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Personas

> Estas são **personas síntese** — não pesquisa quantitativa. Servem para alinhar conversas de design e priorização ("isso atende a Camila ou só ao Bruno?"). Atualizar conforme aprendizado real.

Três personas no MVP:

| # | Persona | Motivação primária | Modo principal |
|---|---|---|---|
| 1 | **Camila — A Anfitriã** | Quer momento social com amigos | Multiplayer, host |
| 2 | **Bruno — O Casual** | Foi convidado, quer se divertir | Multiplayer, convidado |
| 3 | **Diego — O Solo Grinder** | Quer testar conhecimento musical entre sessões | Solo |

---

## 1. Camila — A Anfitriã 🎤

### Resumo

| Atributo | Valor |
|---|---|
| Idade | 27 |
| Ocupação | Designer / freelance |
| Frequência de jogo | 1–2 vezes/semana (sextas/sábados) |
| Plataforma musical favorita | Spotify Premium |
| Dispositivo principal | Notebook + celular como controle |

### Cenário típico

Sexta à noite, 22h. Grupo de 5 amigos no Discord ou pessoalmente. Camila propõe: "Bora jogar Mermã?". Cria sala, gera link, cola no chat. Configura a partida (modo `BOTH`, SpeedBonus, 12 músicas). Espera os amigos pronto e clica em iniciar. Durante o jogo, ri das respostas absurdas. No final, conversa sobre quem é o "rei/rainha da música" do grupo.

### O que ela valoriza

- **Velocidade do setup**: criar sala em 1 clique, compartilhar link, jogar em segundos.
- **Controle granular** da partida: tempo, modo, total de músicas.
- **Momentos sociais**: ver quem digitou bobagem na revelação é o ponto alto.
- **Confiabilidade**: se a partida cair, deveria voltar de onde parou ("a noite não acaba por causa de um bug").

### Pain points

- Apps existentes (AMQ, etc.) têm **catálogo fixo** — não consegue jogar com a galera curtindo o que cada um gosta.
- Plataformas musicais com "modo party" têm **fricção** (precisa todo mundo logar no Spotify, etc.).
- Quiz genéricos (Kahoot) não têm **áudio**.

### User stories

- Como Camila, **quero criar uma sala em menos de 10 segundos** depois de abrir o site, para não atrasar a vibe.
- Como Camila, **quero compartilhar a sala por link copy-paste**, para não precisar ditar código por voz no Discord.
- Como Camila, **quero importar minhas playlists do Spotify uma vez**, para não fazer login a cada partida.
- Como Camila, **quero configurar tempo e modo da partida**, para adaptar à energia do grupo (rápido se cansativo, lento se conversado).
- Como Camila (host), **quero poder iniciar a partida mesmo se 1 jogador ainda não está ready**, porque a galera demora pra clicar.
- Como Camila, **quero sinalizar que vou ao banheiro (AFK)**, para o grupo entender que estou ausente sem precisar explicar.
- Como Camila, **se meu Wi-Fi cair**, quero voltar à mesma partida quando reconectar — não recomeçar.

### Métricas que importam para ela (telemetria — F3.4)

- Tempo desde landing até primeira partida: < 30s alvo.
- Latência percebida: "partidas fluem" — sem freeze, sem reload manual.

---

## 2. Bruno — O Casual 🎧

### Resumo

| Atributo | Valor |
|---|---|
| Idade | 32 |
| Ocupação | Comercial / dev de QA |
| Frequência de jogo | Quando alguém convida (esporádico) |
| Plataforma musical favorita | Spotify free (não Premium) |
| Dispositivo principal | Celular (Android) |

### Cenário típico

Recebe link da Camila no WhatsApp: "Bora jogar Mermã?". Clica do celular. **Não quer criar conta**. Define nickname "Bruh" e entra. Não tem playlist importada — espera pelos outros. Tenta acertar usando memória de músicas que tocaram em festas. Erra muito, ri muito, mas se diverte porque é descontraído.

### O que ele valoriza

- **Zero fricção de entrada**: clicar no link, digitar nick, jogar. Sem cadastro.
- **Funciona no celular sem app**: browser apenas. Mobile-first é obrigatório.
- **Não precisa contribuir playlist** para participar (pode jogar mesmo sem importar).
- **Diversão sem pressão**: pode errar todas e ainda assim ser legal.

### Pain points

- App de quiz com cadastro obrigatório → desiste.
- Jogo que precisa de Premium em alguma plataforma → desiste se ele é free.
- Site lento no celular ou que exige Wi-Fi turbo → desiste.
- UI que castiga erro (animação de erro pesada, contagem regressiva de vergonha) → fica chato.

### User stories

- Como Bruno, **quero entrar numa sala via link no celular sem instalar nada**, em ≤ 5 segundos.
- Como Bruno, **quero jogar como anônimo (só com nickname)**, sem ter que criar conta.
- Como Bruno (sem playlist importada), **quero ainda assim participar de todas as rodadas**, porque as músicas vêm dos outros.
- Como Bruno, **quero ver as respostas erradas dos outros na revelação**, porque essa é a parte engraçada.
- Como Bruno, **quero votar para pular a rodada** se já respondi, para não esperar parados.
- Como Bruno, **se eu errar muito, quero que o jogo não me humilhe** — sem animação chamando atenção pro meu erro.

### Métricas que importam para ele

- Tempo desde clicar no link até estar na sala: < 5s alvo.
- Funciona em 3G fraco (rede Brasil mobile típica).
- Bundle JS < 30KB gzipped (objetivo arquitetural — ver [ADR-0008](../20-architecture/adrs/0008-frontend-solidjs.md)).

---

## 3. Diego — O Solo Grinder 🏆

### Resumo

| Atributo | Valor |
|---|---|
| Idade | 22 |
| Ocupação | Estudante de Letras / curador musical hobbyista |
| Frequência de jogo | Quase diária |
| Plataforma musical favorita | Spotify + YouTube Music + Deezer (todos) |
| Dispositivo principal | Notebook + headphones |

### Cenário típico

Não tem grupo regular para jogar. Mas adora música — tem 15 playlists curadas por mood/era. Abre o Mermã sozinho, modo solo, escolhe a playlist "Anos 80 Brasil" e tenta bater seu recorde de 9.450 pontos. Cada partida solo é uma "run" — quer saber se evoluiu, se é mais rápido que ontem, se conseguiu streak maior. Compartilha screenshots de recordes nas redes.

### O que ele valoriza

- **Métricas pessoais detalhadas**: recorde por playlist, melhor streak, tempo médio de resposta.
- **Variedade de configurações no solo**: ele quer SpeedBonus para ter desafio de tempo.
- **Histórico**: quer ver evolução ao longo do tempo, não só recorde atual.
- **Compartilhabilidade**: screenshot/share do recorde para postar no Twitter.

### Pain points

- Modos solo que são "multiplayer com 1 jogador" sem regras próprias → sente que está jogando errado.
- Configurações do multiplayer expostas no solo que não fazem sentido (vote-skip, fair-play distribution) → poluição visual.
- Recorde **só do dia** (sem histórico) → frustrante.

### User stories

- Como Diego, **quero ver meu recorde por playlist** antes de iniciar uma partida solo, para saber se posso quebrar.
- Como Diego, **quero ver minhas estatísticas pessoais** (total de músicas conhecidas, melhor streak, tempo médio) num dashboard.
- Como Diego, **quero que o solo só me mostre configurações relevantes** (sem voto-pular, sem regras de divisão multiplayer), porque o resto polui.
- Como Diego, **quero `allow_repeats` como opção livre** no solo — às vezes quero o desafio, às vezes não.
- Como Diego, **quero um prompt motivacional** ("Bata seu recorde de 9.450 pontos!"), para criar tensão.
- Como Diego, **quero compartilhar meu resultado** com uma imagem gerada (screenshot ou export), para postar.
- Como Diego, **quero ver quando bati um novo recorde** com destaque, porque é o momento de validação.

### Métricas que importam para ele

- Persistência dos recordes: 100% confiável (sem perder dados após crash).
- Dashboard de stats: latência < 200ms de carregamento.
- Telemetria de evolução (gráfico de pontuação por playlist ao longo do tempo): nice-to-have pós-MVP.

---

## Anti-personas (quem **não** é o foco)

| Anti-persona | Por que não focamos |
|---|---|
| **Profissional buscando ferramenta de trabalho** (DJ querendo softare para gigs) | Mermã é leisure, não tool profissional. |
| **Criança < 13 anos** | OAuth + privacidade infantil exigiria conformidade extra (LGPD/COPPA); fora do escopo MVP. |
| **Speedrunner competitivo global** | Não temos leaderboard global no MVP; quem busca isso vai se frustrar. |
| **Jogador que quer catálogo curado pelo Mermã** | Não vamos curar — explicitamente. Quem quer isso vai para AMQ. |

---

## Como usar este documento

- **Em discussão de feature:** "Isso atende qual persona principalmente?" Se a resposta é "ninguém clara", a feature pode ser overkill.
- **Em design de UI:** simular o fluxo na cabeça das 3 personas. Cada uma deveria conseguir cumprir suas user stories sem fricção desnecessária.
- **Em priorização de bugs:** bug que afeta Camila (host) >  bug que afeta Bruno (casual) > bug que afeta Diego (solo) — porque sem Camila, Bruno e Diego não jogam.

## Changelog

- **2026-05-13:** primeira versão. 3 personas + 4 anti-personas. Reflete escopo do MVP (game free, sem ranking global, mobile-first, sem cadastro obrigatório).
