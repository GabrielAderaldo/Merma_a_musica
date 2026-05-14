# Brief de Design — Mermã, a Música!

> Documento autocontido para conduzir a criação do **design system, design tokens e telas** do produto. Quem lê não precisa de contexto prévio do projeto.
>
> Cada decisão de design aqui é **fundamentada em princípio canônico nomeado** (Krug, Wathan & Schoger, Tamosauskas, Greever, Lowdermilk, Levy). A intenção não é restringir você — é deixar transparente o porquê de cada pedido, pra que você consiga discordar com base se algum princípio for inadequado pro nosso caso.
>
> Entregáveis esperados ao final:
>
> 1. **Design tokens** (cores, tipografia, espaçamento, raios, sombras, animações) — exportáveis para CSS variables / TS const.
> 2. **Biblioteca de componentes** (botões, inputs, cards, badges, modais, toasts, etc.) com variantes e estados.
> 3. **Todas as telas** especificadas em §6, no fluxo conectado, com **mobile-first** + responsivo desktop.
> 4. **Estados especiais** de cada tela (loading, empty, error, reconnecting).
> 5. **Animações e microinterações** propostas para os momentos críticos (revelação, recorde, transições).

---

## 0. Contexto sobre quem faz este projeto (importante)

**O Mermã, a Música! é construído por uma única pessoa + IA.**

Não há time de design, time de produto, time de QA. Todo o trabalho — arquitetura, código, documentação, **e este design** — está sendo feito com auxílio de IA, por **falta de equipe humana**, não por escolha estética. Isso significa:

- Você (Claude Design) **é o time de design real do projeto**. O resultado do seu trabalho vira o produto final, não um mockup descartável.
- **Não há "designer humano sênior" para validar pixel a pixel.** Tome decisões com convicção; quando precisar de input, peça opinião direta ao mantenedor humano (uma pessoa só).
- Espere o tom geral do projeto refletir isso: **pragmático, transparente sobre limitações, aberto a contribuições**.

### Contribuições humanas são MUITO bem-vindas

O projeto é **open-source (AGPL-3.0)** e está hospedado em GitHub. Qualquer pessoa pode contribuir com **o que quiser**:

- 🎨 **Design** — refinar tokens, propor componentes alternativos, redesenhar telas, fazer ilustrações/ícones, animações personalizadas.
- 💡 **Sugestões de produto** — novas mecânicas, modos de jogo, melhorias de UX, regras alternativas.
- 🐛 **Bugs e testes** — reportar problemas, escrever testes, fazer playtest.
- 🌎 **Tradução / i18n** — quando o MVP estiver estável, traduções para EN, ES, etc.
- 📝 **Documentação** — melhorias no handbook, exemplos, tutoriais.
- 🔌 **Código** — features, refactor, plugins, integrações.
- 🤝 **Qualquer outra coisa** que melhore o projeto ou a comunidade ao redor.

**Sem requisito de senioridade, sem processo seletivo.** Issue, PR ou comentário no GitHub Org bastam. **Toda contribuição substantiva vira crédito público** (no README ou em página dedicada de contributors).

> Inclua este espírito de "open hands" em qualquer texto público (footers, "sobre", páginas legais, etc.). Não esconda que IA fez — celebre que mesmo assim, **qualquer humano pode entrar e melhorar**.

---

## 0.5. Princípios canônicos que guiam este brief

Este brief foi escrito consultando **seis obras de referência em design de produto digital**. Cada seção que pede algo de você cita o(s) autor(es) que fundamentam o pedido. Você pode (e deve) discordar quando o princípio não couber — só traga a razão.

| Camada | Obra de referência | Quando consultar |
|---|---|---|
| **Estratégia / MVP** | Jaime Levy — *Estratégia de UX* | Validação, proposição de valor, smoke test |
| **Pesquisa / DCU** | Travis Lowdermilk — *Design Centrado no Usuário* | Personas, princípios clássicos (Gestalt, Hick, Fitts) |
| **Arquitetura de informação** | Thiago Tamosauskas — *AI e UX* | Organização, navegação, taxonomia, "poupe o tempo do leitor" |
| **Usabilidade / clareza** | Steve Krug — *Não me faça pensar* | Escaneamento, convenção, "1ª Lei: não faça pensar" |
| **UI visual / craft** | Adam Wathan & Steve Schoger — *Refactoring UI* | Hierarquia, tipografia, cor (HSL), espaçamento, profundidade |
| **Decisões com stakeholder** | Tom Greever — *Articulando Decisões* | Quando você precisar defender escolha ou discordar do mantenedor |

> Padrão de leitura recomendado: **leia este brief inteiro primeiro**. Depois, ao começar cada bloco do design (tokens → componentes → telas), volte aos capítulos das obras nomeados na seção correspondente.

---

## 1. O que é o produto

**Mermã, a Música!** é um **quiz musical multiplayer online** onde jogadores ouvem trechos de música e tentam adivinhar o nome ou o artista — o catálogo é formado pelas **playlists dos próprios jogadores** (Spotify, Deezer, YouTube Music).

- Tipo: jogo casual web (browser).
- Jogadores por sala: 1 (solo) até 20.
- Duração de uma partida: 5–15 minutos.
- Sem cadastro obrigatório; login opcional só para importar playlists.
- **Free e open-source.**
- **MVP em PT-BR.**

### Tagline
> *Prove que você conhece mais música que seus amigos — usando as playlists deles.*

### Proposição de valor (Levy)

A Levy (cap. 3, *Definindo a proposição de valor inicial*) defende que toda proposição de valor é uma frase testável que une **cliente + problema + solução diferenciada**. A nossa:

> **Para** grupos de amigos que gostam de música e querem se divertir socialmente, **o Mermã** é um quiz multiplayer **que** usa as playlists deles próprios como catálogo, **ao contrário de** quiz com catálogo fixo (AMQ, SongPop) ou de jogos genéricos que não têm áudio (Kahoot).

Use esta frase como teste de aderência: se uma decisão de design enfraquece o diferencial ("usa as playlists deles próprios", "diversão social"), levante a mão.

---

## 2. Mood, atmosfera e identidade visual

### 2.1 Mood emocional

O jogo é vivido em momentos de **diversão social descontraída**: amigos no Discord, festa em casa, streamer com a chat. A vibe deve carregar:

- **Energia**: ritmo, batida, movimento — música é vida.
- **Calorismo e humor brasileiro**: o nome "Mermã, a Música!" tem uma graça gírica ("mermã" como "mana"/"irmã" + "espera aí, é essa música"). O produto não é polido-corporativo; é amigável-bagunceiro.
- **Tensão da rodada**: timer correndo, áudio tocando, "eu sei essa, eu sei essa!".
- **Catarse da revelação**: "AH ERA ESSA!" — momento de comédia social, especialmente quando alguém escreve coisa absurda.

> **→ Wathan & Schoger** (*Refactoring UI*, cap. *Choose a personality*): "antes de pixel algum, escolha a personalidade da interface". Eles dão um exercício: pegue 3-5 adjetivos opostos (formal↔informal, profissional↔amigável, sério↔divertido, tradicional↔ousado) e marque onde a interface vive. A nossa: **amigável (8/10), informal (9/10), divertido (10/10), ousado (7/10)**. Cor, tipografia, raios e microinterações deveriam refletir essas marcas.

### 2.2 Identidade visual sugerida

- **Dark mode primário** (e único no MVP). Fadiga visual de sessão longa + sentimento de "neon de festa" em vez de "documento corporativo".
- **Acentos vibrantes**: cor de marca que destaca momentos (acertos, pontos, recordes). Pensar **rosa quente / coral** + um secundário **azul elétrico**.
- **Tipografia bold para números** (timer, pontos, ranking) — é onde a tensão mora.
- **Detalhes ondulares / curvilíneos** que remetem a som / waveform. Sem ser literal demais (sem fones de ouvido como mascote, sem partituras realistas).
- **Microinterações vivas**: pulsação no timer, glow quando acerta, shake leve quando erra (não punitivo — divertido).

> **→ Wathan & Schoger** (*Ditch hex for HSL*, *You need more colors than you think*): cor de marca não é "uma cor" — são **9+ tons** por matiz (50, 100, 200… 900 em escala). Você vai precisar disso pra hover, disabled, glow, background sutil. HSL é mais legível e fácil de derivar tons que hex.

### 2.3 O que evitar

- ❌ Visual de jogo "Sério" (Xadrez, RPG estratégico) — Mermã é casual.
- ❌ Estética kawaii / mascote 3D — não temos arte 2D/3D, manteremos limpo.
- ❌ Skeumorfismo de aparelho de som — clichê.
- ❌ Light mode no MVP (consume da bateria mobile, fadiga em sessão noturna).
- ❌ Excesso de animações que atrasem percepção da rodada (animação > 300ms em transição crítica é perigoso).

---

## 3. Pilares de design (que guiam decisões)

Em ordem de prioridade. Conflito entre pilares resolve-se pelo de cima.

### 1. Diversão social

Tudo amplifica momento compartilhado, especialmente a **revelação** (quem acertou/errou + o que cada um digitou). **Não punir erro visualmente** — erro do amigo é a comédia do jogo.

> **→ Krug** (cap. *Primeira Lei de Usabilidade*, "Não me faça pensar"): a 1ª Lei diz que cada elemento que faz o usuário parar pra pensar é dívida. No nosso caso, a revelação é a **antítese da 1ª Lei** — é onde o jogador PARA, lê, ri, compara. **Esse momento é especial; design dele merece mais carinho que qualquer outro.**

### 2. Personalização total

Suas playlists, sua sala, suas regras. UI permite configurar partida com poucos cliques — não esconde em settings profundo.

> **→ Levy** (*os 4 princípios*, especialmente "UX sem complicações"): personalização que exige 7 cliques nada faz pelo jogador. Toda configuração de partida deve estar **alcançável em ≤2 cliques** a partir do Lobby.

### 3. Ritmo rápido

Partidas de 5–15 min, transições automáticas. **Zero "aperte para continuar" desnecessário**. Skeletons em vez de spinners onde possível.

> **→ Krug** (*1ª Lei*, novamente): cada "aperte continuar" não-necessário é cobrança cognitiva. Se a próxima ação é óbvia, **execute automaticamente** com micro-countdown visível (ex: "Próxima rodada em 3..."). Botão "pular contagem" sempre disponível.

### 4. Acessibilidade

Mobile-first. Sem cadastro. Funciona em 3G. WCAG AA como mínimo.

> **→ Lowdermilk** (cap. 7, *Princípios de design centrado no usuário*): DCU não é fazer o que o usuário pede — é entender o que ele PRECISA. No nosso caso, o jogador anônimo (Bruno) **não pede acessibilidade**, mas precisa dela (rede ruim, celular antigo). Acessibilidade é decisão de empatia que ele não vai verbalizar.

---

## 4. Quem usa (personas)

> **→ Lowdermilk** (DCU): personas existem para forçar empatia, não pra serem decoradas. Cada decisão de design deve passar pelo teste "qual persona isso ajuda mais? alguma persona isso prejudica?".

### 🎤 Camila — A Anfitriã (27, designer freelance)
Hosta sessões sexta à noite com amigos. Mobile (celular como controle) + notebook. **Valoriza velocidade do setup** ("link copy-paste, jogar em 10s"), controle granular da partida, e UX confiável quando o WiFi cai.

### 🎧 Bruno — O Casual (32, comercial)
É convidado, abre o link no celular sem instalar nada. **Joga como anônimo** (só nick). Pode não ter playlist importada — joga com as dos outros. **Valoriza zero fricção** e **funcionar em 3G** + **não ser punido visualmente** por errar.

### 🏆 Diego — O Solo Grinder (22, estudante)
Joga sozinho, quase diariamente. **Foco em recordes pessoais por playlist**. **Valoriza métricas detalhadas** (recorde por playlist, melhor streak, tempo médio), UI específica do solo sem "estamos esperando outros jogadores", e poder compartilhar resultado.

### Anti-personas (quem **não** é o foco)

- DJ profissional buscando ferramenta de trabalho
- Criança < 13 anos (compliance LGPD/COPPA fora do escopo MVP)
- Speedrunner competitivo global (não temos leaderboard global)
- Jogador querendo catálogo curado (não vamos curar nada)

---

## 5. Restrições técnicas (importantes para design)

- **Stack:** SolidJS + Tailwind CSS. Bundle final alvo **< 30 KB gzipped** (chunk principal). Ícones via SVG inline ou heroicons.
- **Mobile-first.** Tudo deve funcionar em tela 360px de largura primeiro.
- **Dark-mode-only** no MVP.
- **Sem CDN externo de fonte** se possível (latência em 3G). Considerar usar `system-ui` ou fontes self-hosted leves (Inter, IBM Plex).
- **Animações** preferencialmente em CSS (não JS) para performance.
- **Acessibilidade**: navegação por teclado, contraste WCAG AA, screen reader (ARIA labels).

---

## 6. Telas (especificação completa)

### 6.1 Fluxo geral

```
[Home] ─── Criar ────► [Lobby] ─► [Partida (rodadas N)] ─► [Resultados] ─► (volta ao Lobby após 5s)
   │
   ├──── Entrar ───► [Lobby]
   │
   ├──── Solo ────► [Solo Dashboard] ─► [Partida Solo] ─► [Resultado Solo]
   │
   └──── Login opcional ─► [Playlists] (gestão de playlists importadas)
```

> **→ Wathan & Schoger** (*Start with a feature, not a layout*): para cada tela aqui, **NÃO comece desenhando a navegação ou o shell**. Comece pela peça-feature da tela (o input de resposta, o card da música, o ranking). O resto vem depois.

---

### TELA 1 — Home (Tela Inicial)

**Propósito:** Apresentar o produto e dar 3 caminhos imediatos.

**Conteúdo:**
- Logo + tagline ("Prove que você conhece mais música que seus amigos.")
- Big-buttons: **"Criar sala"**, **"Entrar em sala"**, **"Jogar sozinho"**.
- Botão secundário: **"Conectar conta"** (mostra ícones Spotify/Deezer/YouTube Music) — para importar playlists. Opcional.
- Footer pequeno: link para GitHub, política de privacidade.

**Hierarquia:** O ato de jogar é o que mais importa — 3 botões grandes dominam. Login fica subordinado.

**Estados:**
- Já tem conta conectada → mostrar "Olá, Camila ▾" com dropdown (Playlists, Sair).
- Anônimo → mostrar input opcional de nickname salvo em localStorage (se já tem, pré-preenchido).

**Tom:** Convidativo, não-formal. "Bora?".

> **→ Lowdermilk** (*Lei de Hick*): "quanto mais opções, mais tempo o usuário leva pra escolher". Os 3 botões principais são **exatamente** o limite confortável. Não adicione "Como jogar?", "Sobre", "Demo" no nível 1 — empurra pro footer.
>
> **→ Krug** (*convenções e escaneamento*): jogador chega aqui escaneando, não lendo. Hierarquia: marca (1) → CTAs grandes (2) → login subordinado (3). Os 3 botões devem ter **peso visual similar entre si** (são opções legítimas), mas claramente **mais peso que o login** (Wathan: "not all elements are equal").

---

### TELA 2 — Login OAuth (opcional)

**Propósito:** Conectar Spotify, Deezer ou YouTube Music para importar playlists.

**Conteúdo:**
- 3 botões com logos das plataformas.
- Texto explicativo: "Conecte para usar SUAS playlists no jogo. Sem cadastro nosso, sem email."
- Botão "Pular" / "Jogar sem conectar".

**Notas:**
- Cliquei em "Spotify" → redireciona para Spotify OAuth → volta para callback.
- Mostrar loading suave no retorno (skeleton, não spinner).

> **→ Krug** (*texto curto, escaneável*): a frase "Sem cadastro nosso, sem email" remove a fricção de medo. Krug recomenda **mata-objeções antes que elas surjam**, especialmente em onboarding.

---

### TELA 3 — Criar Sala

**Propósito:** Definir nickname (se não tem) e criar a sala.

**Conteúdo:**
- Input "Como te chamamos?" (max 32 chars).
- Botão "Criar sala".
- (depois de criar) Mostra: código da sala em destaque + botão "Copiar link" + "Compartilhar via WhatsApp/Discord/...".

**Notas:**
- Após criar, navega automaticamente para `/room/ABC123` (Lobby).

> **→ Lowdermilk** (*Lei de Fitts*): "quanto maior e mais próximo o alvo, mais rápido o clique". Pós-criação, **botão "Copiar link" deve ser GIGANTE** e fácil de tocar com polegar em mobile. Esse é o ato crítico (a Camila vai colar no WhatsApp).

---

### TELA 4 — Entrar em Sala

**Propósito:** Inserir código de convite + nickname.

**Conteúdo:**
- Input "Código da sala" (6 caracteres, autoformata maiúsculo).
- Input "Nickname".
- Botão "Entrar".

**Estados:**
- Código não existe → mensagem amigável: "Essa sala não existe. Confira o código com seu amigo."
- Sala cheia (20 jogadores) → "Essa sala tá lotada! Bora criar outra?"

> **→ Greever** (*tom empático em mensagens de erro*): "Essa sala não existe" usa "essa" + "confira com seu amigo" — culpa difusa, sem dedo apontado. Compare com "Código inválido" (acusatório). **Sempre devolva o que o usuário pode fazer**, não apenas o que deu errado.

---

### TELA 5 — Lobby

**Propósito:** Esperar/preparar a próxima partida.

**Conteúdo (host):**
- Topo: código da sala + botão "Copiar link". Se host está AFK, mostrar badge.
- **Lista de jogadores** (grid 2–4 colunas dependendo de tamanho):
  - Card por jogador: avatar (inicial colorida), nickname, badges (host 👑, ready ✅ / unready ⭕, AFK 💤, plataforma 🎵), indicador "tem playlist importada".
- **Painel de configuração da partida** (só host vê os controles; outros vêem read-only):
  - Slider: Tempo por rodada (10s–60s, default 30s)
  - Slider: Total de músicas (range dinâmico baseado em jogadores, ex: 4–20)
  - Toggle: Tipo de resposta (Música / Artista / Qualquer um — destaque que "Qualquer um" é o modo fácil)
  - Toggle: Permitir repetição (default off)
  - Toggle: Regra de pontuação (Simples / Bônus por velocidade — default Bônus)
- **Botões inferiores (sticky em mobile):**
  - Para o host: **"Iniciar partida"** (ativo sempre que ≥1 jogador) + "Sair".
  - Para não-host: **"Estou pronto / Não estou pronto"** + "AFK / Voltei" + "Sair".

**Notas críticas:**
- Host é **sempre ready** — não tem botão "ready" pra ele.
- Mudanças de config são broadcast em tempo real (outros jogadores veem ao vivo).
- Botão "Importar playlist" se logado, ou "Conectar conta" se não.

> **→ Tamosauskas** (*5ª Lei de Ranganathan: "poupe o tempo do leitor"*): este é o ponto onde o jogador espera. **Toda informação visível aqui deve responder a "quem está, o que vai rolar, posso começar?"**. Esconda o resto. Configurações avançadas em accordion expansível, se necessário.
>
> **→ Lowdermilk** (*Princípio da proximidade — Gestalt*): agrupe (1) lista de jogadores em uma região, (2) painel de configuração em outra, (3) ações finais sticky em outra. Distância visual entre grupos > distância dentro do grupo. Erro comum: misturar config e roster.
>
> **→ Wathan & Schoger** (*Emphasize by de-emphasizing*): controles read-only para não-host **não** ficam invisíveis — ficam **com opacidade reduzida ou em cinza escuro**, claramente "informativo, não interativo". Esconder muda o layout (config-shock quando vira host por migração).

---

### TELA 6 — Partida (durante a rodada)

**Propósito:** Tocar música e capturar resposta.

**Layout em 3 zonas verticais (mobile) / colunas (desktop):**

**Topo — Header da rodada:**
- Indicador "Rodada 3 de 10".
- **Timer grande** (números bold com pulsação leve nos últimos 5s).
- Indicador de áudio tocando (waveform sutil ou equalizer simulado).

**Centro — Área de resposta:**
- **Input grande** para digitar.
- **Autocomplete** aparece abaixo: lista de sugestões (do pool das playlists dos jogadores). Max 10 itens. Clicar preenche.
- Feedback visual ao digitar: pequeno pulse na borda do input.
- **Botão "Enviar resposta"** (opcional — Enter também envia).
- Indicador silencioso "✓ resposta enviada" (não revela se acertou).
- Quando já respondeu: aparece **botão "Pular rodada"** (se maioria votar, encerra antes do timer).

**Rodapé — Status dos jogadores:**
- Mini-cards horizontais (scroll horizontal em mobile): avatar + nick + indicador "respondeu ✓ / digitando... / não respondeu". **NÃO mostra o que escreveram** (segredo até a revelação).
- Pontuação parcial pequena ao lado de cada nick.

**Notas críticas:**
- **Não revelar acerto/erro** durante a rodada.
- Jogador pode alterar resposta múltiplas vezes até o timer.
- Tempo da última submissão é o que conta para pontuação.

**Acessibilidade:**
- Timer deve ser legível por screen reader periodicamente (não a cada segundo — a cada 10s ou em momentos chave).
- Auto-focus no input ao começar a rodada.

> **→ Krug** (*1ª Lei: não me faça pensar*): durante a rodada, cada microsegundo de pensamento sobre A UI rouba do jogo. **O input é o herói da tela**. Cor de fundo do input contrasta com fundo da página. Placeholder claro: "Digite a música ou o artista...".
>
> **→ Lowdermilk** (*Lei de Fitts*): input deve ser **grande o suficiente pra tocar com polegar sem mirar**. Mobile-first: largura quase total da tela, altura mínima 48px (recomendação iOS/Material).
>
> **→ Lowdermilk** (*Lei de Hick*): durante a rodada, **drasticamente reduza opções visíveis**. Sem menu, sem botão "voltar", sem "sair" exposto. O jogador tem 2 ações possíveis: digitar resposta, votar pular. Mais que isso polui.
>
> **→ Wathan & Schoger** (*Hierarquia*): timer e input dominam. Status dos jogadores ao rodapé é **subordinado** — cinza, pequeno, presente mas não disputando atenção. **Erro comum**: cards de jogadores chamativos demais durante a rodada.

---

### TELA 7 — Revelação (pós-rodada, ~3s)

**Propósito:** Mostrar a resposta certa + respostas de todos + pontos. **Momento mais importante para diversão social.**

**Conteúdo (sequência temporal de 3s):**

1. **(0–500ms)** Banner aparece "REVELAÇÃO" + pausa breve do timer.
2. **(500ms–1.5s)** Card grande da música:
   - Capa (album art) + Nome da música em destaque + Artista + Álbum.
   - **"Música de: @Gabriel 🎵"** (destaque para o dono da música — comédia social).
3. **(1.5s–3s)** Lista de respostas de cada jogador:
   - "@Camila digitou: 'Bohemian Rapsody' → ✅ +850pts"
   - "@Bruno digitou: 'Sweet Child o Mine' → ❌ 0pts"
   - "@Diego digitou: (não respondeu) → ❌ 0pts"
   - "@Edu digitou: 'Bheemian Rapsody' → ✅ +400pts" (fuzzy match)
4. **(3s+)** Placar atualizado em destaque, contagem regressiva visual para próxima rodada (3s).

**Animações sugeridas:**
- Pontos aparecem com "tick-up" rápido (animação de número).
- Acertos têm um pulso de cor de sucesso.
- Erros aparecem sem fanfarra (não punir).
- Música segue tocando durante toda a revelação.

**Notas:**
- Se for última rodada → transição direta para Resultados.
- Se for rodada normal → contagem 3s + próxima.

> **→ Lowdermilk** (*proximidade Gestalt*): para cada jogador, agrupe (avatar + nick + resposta digitada + ✓/❌ + pontos) num único card. Quem ler "passa o olho" e captura todos os atributos numa entidade visual — não em 5 elementos soltos. Distância entre cards > distância dentro do card.
>
> **→ Wathan & Schoger** (*Use shadows to convey elevation*): o card da música revelada é o pico dramático. **Sombra/glow** pra destacar como "elevado da página". Não fique flat e perca o momento.
>
> **→ Krug** (*reduzir ruído visual nos erros*): erro aparece com a mesma estrutura visual de acerto — só muda o ícone ✓→❌ e a cor do número de pontos. **Não diminua o card, não use vermelho gritante**. A graça é ver o que a pessoa escreveu, não envergonhar.
>
> **→ Greever** (*tom de comunicação*): "Música de: @Gabriel 🎵" é a piada — atribui crédito + revela quem traiu a galera com aquele rock progressivo obscuro. Esse é o **gancho social** que diferencia o jogo. Não enterre essa info em letra pequena.

---

### TELA 8 — Resultados (pós-partida, ~5s antes de voltar ao lobby)

**Propósito:** Celebrar o vencedor + dar fechamento à sessão.

**Conteúdo:**
- **Vencedor em destaque** (avatar grande + nick + pontuação total + 🏆).
- **Ranking completo** (lista ordenada de todos os jogadores).
- **Destaques (highlight cards)**:
  - 🔥 **Maior streak**: "@X com 8 acertos seguidos"
  - ⚡ **Resposta mais rápida**: "@Y em 1.2s para 'Bohemian Rhapsody'"
  - 🎯 **Mais acertos**: "@Z com 7/10"
  - 😬 **Na trave**: "@W com 4 respostas quase certas"
- Contagem regressiva visual "Voltando ao lobby em 5..."
- Botão "Voltar para o lobby agora" (pula a contagem).

**Animações:**
- Confete leve no momento de revelar o vencedor.
- Empate: dois ou mais avatares lado a lado no topo.

> **→ Tamosauskas** (*hierarquia de informação*): primeira coisa que entra na retina é **o vencedor** (1 elemento). Depois ranking (lista). Depois destaques (cards opcionais). Não inverta — destaques antes do ranking confunde sobre "o que importa".
>
> **→ Wathan & Schoger** (*Don't overlook empty states*): se foi empate triplo, mostre 3 avatares lado a lado. Se "@W com 4 quase certas" não existir (porque ninguém errou perto), **esconda o card** — não mostre "Na trave: ninguém". Cards vazios são depressivos.

---

### TELA 9 — Modo Solo (Dashboard)

**Propósito:** Mostrar recordes pessoais + permitir configurar uma partida solo.

**Conteúdo:**

**Header:**
- "🏆 Modo Solo" + avatar do jogador + breve "Bora bater seu recorde?".

**Seletor de playlist:**
- Dropdown: lista das playlists importadas do jogador.

**Para a playlist selecionada — Card de Recordes:**
- 🎯 Maior pontuação: **9.450 pts** (data: 28/04)
- 🔥 Maior streak: **8 acertos**
- ⚡ Tempo médio: **6.3s**
- 🎵 Músicas conhecidas: **47/120**

**Card de Recordes Globais (todas as playlists):**
- Streak máximo de todos os tempos: 14
- Resposta mais rápida: 1.2s
- Total de partidas solo: 23

**Configuração da partida solo:**
- Tempo por rodada (slider 10–60s)
- Total de músicas (slider 1–5 × músicas na playlist)
- Tipo de resposta (Música / Artista / Qualquer um)
- Permitir repetição (toggle)
- *(Sem opção de scoring rule — solo é sempre SpeedBonus. Sem voto-pular — não faz sentido sozinho.)*

**Call to action:**
- Botão **"INICIAR — Bata seu recorde!"** (texto adaptativo: se não há recorde, "Primeira partida nessa playlist!").

**Tom:** Encorajador, não competitivo-tóxico. Quem joga solo quer evoluir, não ser humilhado.

> **→ Tamosauskas** (*taxonomia*): há **duas categorias claras de métrica** — "por playlist" e "global". Não misture cards. Use **agrupamento visual + label clara**.
>
> **→ Wathan & Schoger** (*Establish a type scale*): números de recorde (9.450) são **a feature emocional do solo**. Use a escala tipográfica grande (5xl/6xl, peso 700+). Compare com Diego (persona) que tira screenshot pra postar — esse número precisa ser fotogênico.
>
> **→ Krug** (*texto adaptativo do CTA*): "Bata seu recorde!" só faz sentido se há recorde. Senão "Primeira partida nessa playlist!" é mais honesto e convidativo. **Não fingir contexto que não existe.**

---

### TELA 10 — Partida Solo

Idêntica à TELA 6 (Partida multiplayer), mas:

- **Sem lista de outros jogadores** (não tem).
- **Sem botão "Pular"** (não tem maioria).
- **Indicador de "Recorde atual: 9.450 pts"** persistente em algum canto sutil (motivação).
- **Pode incluir prompts sutis**: "Faltam 200 pontos para o recorde!" se está perto (não-invasivo).

> **→ Krug** (*sutileza durante foco*): "Faltam 200 pontos" aparece como **whisper UI** — pequeno, sem fanfarra, pode ser ignorado. Mostrar isso no centro da tela atrapalha quem está concentrado tentando ouvir a música.

---

### TELA 11 — Resultado Solo

**Propósito:** Comparar diretamente com o recorde anterior.

**Dois cenários:**

**Cenário A — Bateu recorde** (🎉 momento de celebração):
- Banner gigante "🎉 NOVO RECORDE!"
- Pontuação: **9.580 pts** (+130 do anterior)
- Comparações: streak novo 12 (anterior 8) ↑ ; tempo médio 5.8s (anterior 6.3s) ↑
- Botão "Compartilhar resultado" (gera texto pronto).
- Botão "Jogar de novo" / "Trocar playlist".

**Cenário B — Não bateu recorde** (encorajador):
- "Partida concluída"
- Pontuação: **8.230 pts** (recorde: 9.450 — faltaram 1.220)
- Tom: "Quase! Tenta de novo?"
- Botões "Tentar de novo" / "Trocar playlist".

> **→ Greever** (*tom em comunicação*): cenário B é onde muitos produtos erram — "você perdeu". Em vez disso: "**Partida concluída**" + comparação fria + convite gentil. **Sem usar a palavra "perdeu", "errado", "falhou"** no MVP do solo. Diego (persona) joga várias vezes; humilhar a cada tentativa quebra o ciclo.

---

### TELA 12 — Gestão de Playlists

**Propósito:** Listar playlists importadas + importar nova + excluir.

**Conteúdo:**
- Lista de playlists com: capa + nome + nº de músicas + plataforma de origem + data de import.
- Botão "Importar playlist" → abre lista das playlists disponíveis na plataforma do user.
- Cada playlist tem ações: usar como ativa (futuro feature), excluir (com confirmação).

**Estados:**
- Sem playlist importada: estado vazio amigável "Conecte uma conta e importe sua primeira playlist!".
- Import em andamento: progress bar "Importando 'Top Hits Brasil' — 230/500 músicas".

> **→ Wathan & Schoger** (*Don't overlook empty states*): estado vazio aqui é a primeira tela do user logado — **chance de educar**. Não é "nenhum item encontrado" genérico. É call-to-action com explicação curta + botão claro.

---

### TELA 13 — Estados especiais (reutilizáveis)

Estes são **modais / overlays** que aparecem sobre qualquer tela.

#### Reconnecting
- Banner amarelo no topo, persistente: "🟡 Reconectando... (tentativa 2)".
- Não bloqueia a tela.

#### Connection lost
- Modal fullscreen quando reconexão falha após 2 min: "Conexão perdida. Recarregar?".
- Botão "Tentar de novo".

#### Empty: sala não existe
- Tela amigável: "Essa sala não existe ou expirou. Verifique o código."
- Botão "Voltar ao início".

#### Toasts
- Top-right ou top-center (responsivo): info / warning / error / success.
- Auto-dismiss em 4s.
- Exemplos de mensagens: "Apenas o host pode iniciar a partida.", "Música indisponível — pulando para a próxima.", "Recorde batido!".

#### Loading skeleton
- Em vez de spinner, **skeleton screens** para lobby/playlist/dashboard.

> **→ Krug** (*"Onde estou?" sempre respondido*): reconnecting deve dizer ao usuário **o que está acontecendo + o que ele pode fazer (ou não fazer) enquanto isso**. Spinners genéricos quebram a 1ª Lei.

---

## 7. Componentes reutilizáveis necessários

### 7.1 Primitivos

| Componente | Variantes | Estados |
|---|---|---|
| **Button** | primary, secondary, danger, ghost, icon | default, hover, active, disabled, loading |
| **Input** | text, number, slider | default, focus, error, disabled |
| **Autocomplete** | — | open, closed, loading sugestões |
| **Toggle / Switch** | — | on, off, disabled |
| **Tabs** | — | active, inactive |
| **Modal** | small, medium, fullscreen | open, closing |
| **Toast** | info, success, warning, error | entering, visible, leaving |
| **Spinner / Skeleton** | — | — |
| **Tooltip** | — | hidden, visible |
| **Avatar** | small, medium, large | with image, with initial (cor derivada do hash do nickname) |

> **→ Wathan & Schoger** (*Supercharge the defaults*): cada estado **importa**. Default sem hover/focus visível é trabalho mal feito. Cobra todos os estados desde o token.

### 7.2 Domain-specific

| Componente | Descrição |
|---|---|
| **PlayerCard** | avatar + nick + badges (host, ready, AFK, plataforma) + indicador "tem playlist" + score parcial (in-match) |
| **Timer** | número grande + barra/anel de progresso visual + pulsação nos últimos 5s |
| **AudioIndicator** | sinal de "tocando agora" — pode ser equalizer simulado em CSS |
| **AnswerCard** (revelação) | nick + resposta digitada + ícone ✓/❌ + pontos ganhos |
| **HighlightCard** (resultados) | emoji + nome do destaque + nick do vencedor + métrica |
| **SongRevealCard** | capa + nome + artista + álbum + "contribuído por X" |
| **PersonalBestPanel** (solo) | recordes pessoais por playlist em layout de cards |
| **RoomCodeDisplay** | código grande + botão de copiar + animação ao copiar |
| **ReadyToggle / AfkToggle** | toggle especializado para esses estados |
| **VoteSkipButton** | botão com contador "(2/3 votos)" |
| **MotivationBanner** (solo) | banner com "Bata seu recorde de X pts!" |

### 7.3 Layout

- **AppShell**: header + main + footer (responsivo).
- **PageHeader**: título + breadcrumb + actions.
- **EmptyState**: ícone + título + descrição + CTA.

---

## 8. Design Tokens — categorias esperadas

> **→ Wathan & Schoger** (*Establish a spacing and sizing system*): "estabelecer um sistema de espaçamento e tamanho deve ser uma das primeiras coisas a fazer ao iniciar um projeto". **Não invente tamanho ad-hoc** depois — todos os componentes usam o mesmo conjunto pequeno de tokens.

Quem implementa fará via `tailwind.config.ts` + arquivo TS de tokens importáveis. Tokens organizados por categoria:

### 8.1 Cores semânticas

> **→ Wathan & Schoger** (*Ditch hex for HSL* + *You need more colors than you think*): use HSL. Para cada matiz, gere 9+ tons (`50, 100, 200, ..., 900`). Cinza não é cinza — defina cinzas com leve tonalidade (frios para tech, quentes para humanos). Nossa "personalidade amigável-divertida" pede **cinza levemente quente ou neutro** — não cinza azul corporativo.

```
colors:
  bg:
    primary       (fundo principal — quase preto, mas com leve azul/púrpura)
    secondary     (cards, panels)
    elevated      (modais, dropdown)
    overlay       (rgba black com transparência para backdrop)
  text:
    primary       (texto principal — quase branco)
    secondary     (texto auxiliar — cinza claro)
    muted         (placeholder, hint — cinza médio)
    inverse       (texto em fundo claro)
  accent:
    primary       (cor de marca — coral/pink quente sugerido, com 9+ tons)
    primary-hover
    secondary     (azul elétrico sugerido)
  feedback:
    success       (verde — acertos)
    danger        (vermelho — erros, sair)
    warning       (amarelo/laranja — reconnecting, AFK)
    info          (azul claro)
  platform:
    spotify       (#1DB954 oficial)
    deezer        (#A238FF oficial)
    youtube-music (#FF0000 oficial)
```

### 8.2 Tipografia

> **→ Wathan & Schoger** (*Establish a type scale*): defina uma **escala pequena** (não infinitas opções). Cada uso (body, h1-h4, caption, button, número-gigante de timer) mapeia pra um nível dessa escala. Comece com tipografia **maior do que parece necessária** — é mais fácil reduzir.

```
font-family:
  sans:  system-ui ou Inter (self-hosted, .woff2)
  mono:  ui-monospace ou IBM Plex Mono (para código de sala)
size:
  xs (12px), sm (14px), base (16px), lg (18px), xl (20px),
  2xl (24px), 3xl (32px), 4xl (40px), 5xl (56px), 6xl (72px)
  → o 5xl e 6xl são para timer e pontos
weight: 400, 500, 600, 700, 800
line-height: tight (1.2), normal (1.5), relaxed (1.75)
```

### 8.3 Espaçamento

> **→ Wathan & Schoger** (*Avoid ambiguous spacing*): se um item tem 16px acima e 24px abaixo, **agrupa-se com o de cima** (proximidade Gestalt — Lowdermilk reforça). Sistema multiplo de 4 facilita decisão consistente.

Sistema múltiplo de 4: `0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`.

### 8.4 Border radius

```
sm: 6px    (badges, inputs pequenos)
md: 12px   (cards, inputs)
lg: 20px   (modais, botões grandes)
pill: 9999px (avatares, toggles, badges arredondados)
```

> Raios mais arredondados (md/lg/pill) reforçam "amigável" — coerente com a personalidade (§2.1).

### 8.5 Sombras

> **→ Wathan & Schoger** (*Use shadows to convey elevation* + *Shadows can have two parts*): sombra serve pra comunicar **camada** (modal sobre página, card sobre fundo). Em dark mode, sombra com glow (uma sombra colorida sutil) funciona melhor que sombra preta — preta some no fundo escuro.

```
sm:  sombra leve (cards)
md:  sombra média (cards elevados)
lg:  sombra grande (modais, dropdowns)
glow: sombra com cor de accent (para destaques de acerto/recorde)
```

### 8.6 Transições / Animações

```
duration:
  fast: 150ms     (hover, focus)
  base: 250ms     (entrada/saída)
  slow: 400ms     (mudanças de tela suaves)
  reveal: 600ms   (revelação dramatic)
easing:
  default: cubic-bezier(0.4, 0, 0.2, 1)
  bounce:  cubic-bezier(0.34, 1.56, 0.64, 1)  (para celebrações)
```

### 8.7 Breakpoints (mobile-first)

```
sm:  >= 640px
md:  >= 768px
lg:  >= 1024px
xl:  >= 1280px
```

Maioria das telas pensada para `sm` primeiro.

### 8.8 Opacidades

```
disabled: 0.5
muted:    0.7
overlay:  0.85  (backdrop de modais)
```

---

## 9. Acessibilidade — alvo MVP

> **→ Lowdermilk** (cap. 7) + **Wathan & Schoger** (*Don't rely on color alone*, *Accessible doesn't have to mean ugly*): acessibilidade não é tax — é DCU. Cada decisão abaixo melhora o jogo pra **todos**, não só pra quem tem deficiência.

- **WCAG 2.1 nível AA** mínimo.
- Contraste mínimo **4.5:1** para texto normal, **3:1** para texto grande.
- Navegação por **teclado completa** (Tab, Enter, Esc, setas em listas).
- **Focus visível** em todos os elementos interativos (não remover outline sem fallback claro).
- **ARIA labels** em ícones-only buttons.
- **Live regions** para mudanças críticas (rodada começou, resposta confirmada, recorde batido) — para screen readers.
- **Não depender só de cor** para comunicar estado (sempre combinar com ícone/texto).

---

## 10. Notas sobre microinterações

Coisas que **valem o esforço** de animar com cuidado:

- **Revelação de música**: card aparece com leve "drop" + áudio toca → momento de impacto.
- **Pontos somando**: tick-up animado (não instantâneo).
- **Recorde batido**: confete sutil + glow no número.
- **Copiar código da sala**: feedback de "Copiado! ✓" em 1s.
- **Timer entrando nos últimos 5s**: pulse + cor mudando para warning.
- **Acerto na resposta**: pulse de cor success no input + número subindo.
- **Player join/leave**: card desliza para dentro/fora do lobby.

Coisas que **NÃO valem animação custosa** (passe rápido):
- Navegação entre rotas — fade simples.
- Abertura de modais — fade + scale.

> **→ Krug** (*não atrapalhe o escaneamento*): microinteração que não comunica algo concreto é decoração — e decoração pesa. Toda animação deve responder "o que mudou?". Animação > 300ms em transição crítica é cobrança cognitiva.

---

## 11. Brand — nome e tom

- O nome é **"Mermã, a Música!"** (com vírgula e exclamação). Tratar como marca registrada visual — não trocar capitalização.
- Tom de UI: **amigável + brasileiro casual**. Use **"você"** (não "tu"), use **gerúndio** quando natural ("carregando...", "esperando..."), **emojis com moderação** (1-2 por tela max).
- **Não usar inglês** em UI principal no MVP (jogo é PT-BR).
- Mensagens de erro: **empáticas**, não acusatórias. "Essa sala não existe — confere com seu amigo?" em vez de "Sala inexistente. Código inválido."

> **→ Greever** (*tom em todo texto público*): qualquer cópia que escrever (botão, erro, prompt) é uma mini-decisão de design. Pergunte sempre: "isso convida ou expulsa?". A diferença entre "Sala inválida" e "Essa sala não existe — confere com seu amigo?" é a diferença entre product e tool.

---

## 12. Entregáveis esperados

Por favor, ao final do trabalho:

1. **Design tokens em Figma + export para TS/CSS variables**.
2. **Biblioteca de componentes** com cada componente da §7, com todas as variantes/estados.
3. **Todas as 13 telas** descritas na §6, no fluxo conectado (mobile + desktop).
4. **Especificação de animações** (pode ser via Smart Animate no Figma + notas).
5. **Sample do estado completo** de uma partida (lobby → partida → revelação → resultados) para tirar dúvidas de fluxo.

### Critérios de "está pronto":

- ☑ Componentes parametrizáveis (props claros: variant, size, state).
- ☑ Tokens com nomes semânticos (não literais).
- ☑ Telas legíveis em 360px de largura.
- ☑ Contrastes WCAG AA verificados.
- ☑ Estados de loading/empty/error de cada tela cobertos.
- ☑ Pelo menos 1 protótipo navegável (Home → Lobby → Partida → Revelação → Resultado).

---

## 13. Referências para inspiração (sugestões, não copiar)

Pesquisar para mood (não copiar diretamente):

- **Spotify Wrapped** — animações de celebração, números grandes coloridos.
- **Discord** — dark mode bem feito, social-first.
- **Among Us** — UI de quiz social, lobby com avatares coloridos.
- **Kahoot mobile** — clareza em tela pequena durante quiz.
- **Letterboxd** — combinação de personalização (suas listas) + comunidade.

---

## 14. Perguntas em aberto

(Para o designer responder durante o processo)

- **Mascote ou ilustração de identidade?** Sugestão: NÃO no MVP. Logo tipográfico é suficiente.
- **Sound effects (SFX)?** Sugestão pessoal: pequenos SFX em acerto, recorde, timer-final — mas NUNCA confundir com áudio da música (volume claramente menor). Decisão final com o designer.
- **Variantes de tema (dark com paleta alternativa)?** Pós-MVP.
- **Internacionalização — espaço para textos mais longos (DE, FR)?** Considerar, mas no MVP é só PT-BR — textos curtos.

> **→ Greever** (*comece com SIM*): se você discordar de algo no brief, **abra discutindo o que tem de bom na ideia atual antes de propor mudança**. Mantenedor é só uma pessoa — feedback "tudo errado" é desmotivador; feedback "isso aqui funciona, mas tem trade-off X, e eu proponho Y porque Z" abre conversa de verdade.

---

## 15. Fluxo de entrega sugerido

1. **Discovery (1 dia):** revisitar este brief, mood board, sketch inicial de 2-3 telas-chave (Home + Partida + Revelação).
2. **Tokens + componentes primitivos (2-3 dias):** estabelecer fundação. Apresentar para validação.
3. **Telas críticas (3-5 dias):** Lobby, Partida, Revelação, Resultados.
4. **Telas auxiliares (2 dias):** Solo, Playlists, estados especiais.
5. **Refinement + protótipo navegável (2 dias):** ajustes finais, smart animate, handoff.

Total estimado: **2 semanas** de design focado.

> **→ Levy** (*validação antes de cobrir todas as superfícies*): se tiver dúvida sobre uma decisão grande (paleta dominante, layout do Partida), **pare na etapa 2 e proponha 2-3 variantes** antes de gastar 5 dias modelando todas as telas no caminho errado. Smoke test interno é grátis.

---

## 16. Mapa de princípios aplicados (resumo executivo)

Para consulta rápida durante o trabalho. Cada princípio aqui aparece **detalhado em alguma seção acima**.

| Quando você estiver projetando... | Consulte primeiro... | E lembre que... |
|---|---|---|
| Lobby (organização de jogadores + config) | **Tamosauskas** (5ª Lei de Ranganathan) + **Lowdermilk** (proximidade Gestalt) | "Poupe o tempo do leitor" — agrupe semanticamente |
| Partida (rodada ao vivo) | **Krug** (1ª Lei) + **Lowdermilk** (Hick, Fitts) | Reduza opções drasticamente; input é o herói |
| Revelação (pós-rodada) | **Lowdermilk** (proximidade) + **Wathan** (elevação + hierarquia) | Esse é O momento — investe |
| Solo Dashboard (recordes) | **Tamosauskas** (taxonomia) + **Wathan** (type scale) | Números grandes são a feature emocional |
| Cor, espaço, sombra | **Wathan & Schoger** (caps. *Hierarchy*, *Layout & Spacing*, *Working with Color*, *Creating Depth*) | HSL, 9+ tons, sistema pequeno |
| Mensagens (erro, sucesso, vazio) | **Greever** (tom empático) + **Krug** (convenção) | Convide, não expulse |
| Decisão estratégica (defaults, variantes) | **Levy** (validação leve antes) | Smoke test antes de espalhar |

---

**Tudo nesse brief é negociável** — se algum item te parecer prejudicial ao produto, traga sua opinião (com nome do princípio que sustenta sua crítica, idealmente). O objetivo final é jogadores se divertindo, não o documento.

E, retomando a §0: **este projeto não tem time. Você é o time de design.** Use convicção. Não tem designer sênior pra validar; tem você + um mantenedor humano. E qualquer pessoa do mundo que quiser melhorar é bem-vinda (design, código, sugestão, tradução, o que for) — o projeto é open-source AGPL-3.0 e isso fica explícito em qualquer texto público que você escrever.

Boa! 🎶
