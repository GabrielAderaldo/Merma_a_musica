# MERMÃ, A MÚSICA! — Atomic Design System

**Documento complementar ao GDD, Arquitetura Frontend, Infra e Contrato de API**
**Versão 2.0 — MVP | Março 2026**

---

## Sumário

0. Fundação (Design Tokens & Princípios)
1. Átomos
2. Moléculas
3. Organismos
4. Templates
5. Páginas
6. Animações & Motion
7. Acessibilidade
8. Implementação (CSS + Tailwind)

---

## 0. Fundação (Design Tokens & Princípios)

A Fundação não é uma camada do Atomic Design clássico, mas é o substrato onde tudo se apoia: cores, tipografia, espaçamento, sombras e princípios visuais. Nenhum átomo existe sem ela.

### 0.1 Filosofia de Design

"Mermã, a Música!" é um jogo **social, rápido e divertido**. O design reflete isso: **amigável o suficiente para qualquer pessoa entrar e jogar em 5 segundos**, com personalidade e acabamento que transmitem qualidade.

**Personalidade da Marca:**

| Atributo | Descrição |
|----------|-----------|
| **Energia** | Vibrante, festiva, musical — como uma playlist no volume máximo |
| **Acessibilidade** | Qualquer pessoa joga, sem fricção, sem intimidação |
| **Humor** | Leve, zoeiro, brasileiro — "mermã" já define o tom |
| **Confiança** | Polido, responsivo, sem bugs visuais — parece produto, não protótipo |

**Princípios:**

1. **Clareza acima de tudo** — cada tela tem UMA ação principal. O jogador nunca fica perdido.
2. **Mobile-first, desktop-enhanced** — a maioria dos jogadores estará no celular, com amigos.
3. **Zero tempo morto** — transições rápidas, feedback imediato, animações curtas.
4. **Diversão é visual** — acertos brilham, erros tremem, pontos voam.
5. **Escuro por padrão** — dark mode obrigatório. Combina com a vibe "noite de jogos".

**Tom de Voz (UI Copy):**

| Contexto | Tom | Exemplo |
|----------|-----|---------|
| Botões principais | Direto e convidativo | "Criar Sala", "Bora Jogar!" |
| Estados vazios | Leve e encorajador | "Ninguém aqui ainda... Manda o link!" |
| Erros | Simpático sem ser infantil | "Eita, essa sala não existe. Confere o código?" |
| Acerto | Celebratório | "MANDOU BEM!" |
| Erro de resposta | Empático | "Quase! Era essa aqui ó..." |
| Destaques finais | Zoeiro/carinhoso | "Ninguém segura", "Na trave (de novo)" |

### 0.2 Paleta de Cores

**Superfícies (Dark Theme):**

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg-deep` | `#0B0E17` | Fundo da página, base absoluta |
| `--bg-surface` | `#121829` | Cards, painéis, containers |
| `--bg-elevated` | `#1A2340` | Elementos elevados, inputs, hover |
| `--bg-overlay` | `#232E52` | Modais, dropdowns, tooltips |

**Accent (Marca):**

| Token | Hex | Uso |
|-------|-----|-----|
| `--accent-primary` | `#8B5CF6` | Botões principais, links, CTA |
| `--accent-primary-hover` | `#A78BFA` | Hover de botões |
| `--accent-primary-subtle` | `#8B5CF620` | Tint roxo sutil (12% opacidade) |
| `--accent-gold` | `#F59E0B` | Pontos, rankings, 1º lugar, streaks |
| `--accent-gold-hover` | `#FBBF24` | Hover dourado |
| `--accent-gold-subtle` | `#F59E0B15` | Fundo sutil de pontuação |

**Semânticas (Feedback):**

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-success` | `#22C55E` | Correto, pronto, válido |
| `--color-success-subtle` | `#22C55E18` | Background positivo |
| `--color-error` | `#EF4444` | Errado, indisponível |
| `--color-error-subtle` | `#EF444418` | Background negativo |
| `--color-warning` | `#EAB308` | Aviso, fallback |
| `--color-warning-subtle` | `#EAB30818` | Background de aviso |
| `--color-info` | `#3B82F6` | Informação, dicas |

**Texto:**

| Token | Hex | Uso |
|-------|-----|-----|
| `--text-primary` | `#F1F5F9` | Texto principal, títulos |
| `--text-secondary` | `#94A3B8` | Labels, placeholders |
| `--text-muted` | `#64748B` | Hints, desabilitado |
| `--text-on-accent` | `#FFFFFF` | Texto sobre accent |

**Bordas:**

| Token | Hex | Uso |
|-------|-----|-----|
| `--border-subtle` | `#1E293B` | Cards, divisores leves |
| `--border-default` | `#334155` | Inputs, separadores |
| `--border-strong` | `#475569` | Foco, ativos |

**Cores dos Jogadores (10 slots, cicla se > 10):**

| # | Hex | Nome | # | Hex | Nome |
|---|-----|------|---|-----|------|
| 1 | `#8B5CF6` | Roxo | 6 | `#EC4899` | Rosa |
| 2 | `#F59E0B` | Dourado | 7 | `#14B8A6` | Teal |
| 3 | `#22C55E` | Verde | 8 | `#F97316` | Laranja |
| 4 | `#EF4444` | Vermelho | 9 | `#06B6D4` | Cyan |
| 5 | `#3B82F6` | Azul | 10 | `#A855F7` | Lilás |

### 0.3 Tipografia

| Uso | Fonte | Fallback | Motivo |
|-----|-------|----------|--------|
| **Display/Títulos** | **Fredoka** | `sans-serif` | Arredondada, amigável, lúdica |
| **UI/Body** | **DM Sans** | `system-ui, sans-serif` | Geométrica, moderna, legível |
| **Monospace** | **JetBrains Mono** | `monospace` | Timer, código de sala, pontuação |

**Escala Tipográfica:**

| Token | Size | Peso | Line-height | Fonte | Uso |
|-------|------|------|-------------|-------|-----|
| `--text-display` | 40px | 600 | 1.1 | Fredoka | Logo/branding |
| `--text-h1` | 28px | 600 | 1.2 | Fredoka | Títulos de tela |
| `--text-h2` | 20px | 500 | 1.3 | Fredoka | Subtítulos, seções |
| `--text-h3` | 16px | 600 | 1.4 | DM Sans | Labels, headers de card |
| `--text-body` | 16px | 400 | 1.5 | DM Sans | Texto corrido |
| `--text-small` | 14px | 400 | 1.4 | DM Sans | Auxiliar, metadados |
| `--text-caption` | 12px | 500 | 1.3 | DM Sans | Badges, timestamps |
| `--text-mono-lg` | 32px | 700 | 1.0 | JetBrains Mono | Timer principal |
| `--text-mono-md` | 24px | 600 | 1.0 | JetBrains Mono | Código de sala |
| `--text-mono-sm` | 16px | 500 | 1.2 | JetBrains Mono | Pontuação in-game |

### 0.4 Espaçamento

Escala baseada em múltiplos de 4px.

| Token | Valor | Uso típico |
|-------|-------|-----------|
| `--space-1` | 4px | Gap ícone-texto |
| `--space-2` | 8px | Padding de badges |
| `--space-3` | 12px | Gaps de lista, padding sm |
| `--space-4` | 16px | Padding de cards, gap de grid |
| `--space-5` | 20px | Margem entre seções próximas |
| `--space-6` | 24px | Padding de containers |
| `--space-8` | 32px | Margem entre seções |
| `--space-10` | 40px | Margem entre blocos |
| `--space-12` | 48px | Padding de página (mobile) |
| `--space-16` | 64px | Padding de página (desktop) |

### 0.5 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | 6px | Badges, tags, chips |
| `--radius-md` | 10px | Botões, inputs, selects |
| `--radius-lg` | 14px | Cards, painéis |
| `--radius-xl` | 20px | Modais, containers |
| `--radius-full` | 9999px | Avatares, pills, toggles |

### 0.6 Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Elevação mínima |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.3)` | Cards elevados |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.4)` | Modais, dropdowns |
| `--shadow-glow-primary` | `0 0 24px rgba(139,92,246,0.2)` | Glow roxo (destaque) |
| `--shadow-glow-gold` | `0 0 24px rgba(245,158,11,0.2)` | Glow dourado (vitória) |
| `--shadow-focus` | `0 0 0 4px var(--accent-primary-subtle)` | Ring de foco |

### 0.7 Breakpoints & Containers

| Breakpoint | Valor | Target |
|------------|-------|--------|
| Mobile | 0–639px | Celular (layout padrão) |
| Tablet | 640–1023px | Tablet, landscape |
| Desktop | 1024px+ | Desktop, laptop |

| Contexto de tela | Max-width | Padding lateral |
|-----------------|-----------|----------------|
| Partida (jogo) | 480px | 16px |
| Lobby / Config | 600px | 16px |
| Tela inicial | 480px | 24px |
| Resultados | 560px | 16px |

### 0.8 Iconografia

**Biblioteca:** Lucide (open-source, consistente, 2px stroke)
**Tamanho padrão:** 20px (UI geral), 24px (ações principais), 16px (inline com texto)

| Contexto | Ícone | Contexto | Ícone |
|----------|-------|----------|-------|
| Criar sala | `plus-circle` | Check/Correto | `check` |
| Entrar | `log-in` | Errado/Fechar | `x` |
| Copiar | `copy` | Host | `crown` |
| Compartilhar | `share-2` | Troféu | `trophy` |
| Música | `music` | Velocidade | `zap` |
| Play | `play` | Streak/Fogo | `flame` |
| Timer | `clock` | Config | `settings` |
| Volume | `volume-2` | Sair | `log-out` |

---

## 1. Átomos

Os menores blocos de construção. Não fazem sentido sozinhos no contexto do jogo — existem para serem combinados em Moléculas e Organismos.

### 1.1 Átomo: Texto (Typography)

Elemento de texto estilizado com a escala tipográfica. Mapeia diretamente para os tokens da Fundação.

| Variante | Tag HTML | Fonte | Size | Peso | Cor padrão |
|----------|----------|-------|------|------|------------|
| `Display` | `<h1>` | Fredoka | 40px | 600 | `--text-primary` |
| `Heading1` | `<h1>` | Fredoka | 28px | 600 | `--text-primary` |
| `Heading2` | `<h2>` | Fredoka | 20px | 500 | `--text-primary` |
| `Heading3` | `<h3>` | DM Sans | 16px | 600 | `--text-primary` |
| `Body` | `<p>` | DM Sans | 16px | 400 | `--text-primary` |
| `Small` | `<span>` | DM Sans | 14px | 400 | `--text-secondary` |
| `Caption` | `<span>` | DM Sans | 12px | 500 | `--text-muted` |
| `MonoLarge` | `<span>` | JetBrains Mono | 32px | 700 | contextual |
| `MonoMedium` | `<span>` | JetBrains Mono | 24px | 600 | contextual |
| `MonoSmall` | `<span>` | JetBrains Mono | 16px | 500 | contextual |

### 1.2 Átomo: Ícone (Icon)

Wrapper de Lucide icons com tamanho e cor padronizados.

**Props:**

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `name` | `LucideIconName` | — | Nome do ícone (ex: `"music"`, `"check"`) |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 16px / 20px / 24px |
| `color` | `string` | `--text-secondary` | Cor do stroke |

### 1.3 Átomo: Avatar

Círculo colorido com a inicial do nickname. Cor automática pelo slot do jogador.

**Props:**

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `name` | `string` | — | Nickname (usa primeira letra) |
| `color` | `PlayerColor` | — | Cor do slot (hex da seção 0.2) |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Ver tabela abaixo |

**Tamanhos:**

| Size | Diâmetro | Font | Font-size | Peso | Uso |
|------|----------|------|-----------|------|-----|
| `xs` | 24px | DM Sans | 10px | 600 | Indicadores ultra-compactos |
| `sm` | 28px | DM Sans | 12px | 600 | "Quem respondeu" na rodada |
| `md` | 36px | DM Sans | 14px | 600 | Lista no lobby |
| `lg` | 48px | Fredoka | 18px | 600 | Ranking resultados |
| `xl` | 64px | Fredoka | 24px | 600 | Vencedor, perfil |

**Visual:**
- Background: `{playerColor}` com 12% opacidade
- Borda: `2px solid {playerColor}`
- Border-radius: `--radius-full`
- Texto: `{playerColor}` (cor pura)

### 1.4 Átomo: Badge

Etiqueta compacta de status.

**Props:**

| Prop | Tipo | Default |
|------|------|---------|
| `variant` | `"success" \| "error" \| "warning" \| "info" \| "gold" \| "muted"` | `"muted"` |
| `label` | `string` | — |

**Variantes:**

| Variante | Background | Cor do texto | Exemplos de uso |
|----------|-----------|-------------|-----------------|
| `success` | `--color-success-subtle` | `--color-success` | "Pronto", "Disponível", "Correto" |
| `error` | `--color-error-subtle` | `--color-error` | "Errado", "Indisponível" |
| `warning` | `--color-warning-subtle` | `--color-warning` | "Fallback", "Quase" |
| `info` | `rgba(59,130,246,0.1)` | `--color-info` | "Host", "Respondeu" |
| `gold` | `--accent-gold-subtle` | `--accent-gold` | "1º Lugar", "Streak" |
| `muted` | `rgba(100,116,139,0.1)` | `--text-muted` | "Esperando", "Offline" |

**Estilo fixo:**
- Padding: `4px 10px`
- Border-radius: `--radius-sm`
- Font: DM Sans 12px/500
- Text-transform: uppercase
- Letter-spacing: 0.5px

### 1.5 Átomo: Botão (Button)

Elemento clicável com variantes visuais e tamanhos.

**Props:**

| Prop | Tipo | Default |
|------|------|---------|
| `variant` | `"primary" \| "secondary" \| "ghost" \| "danger" \| "gold"` | `"primary"` |
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` |
| `disabled` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `fullWidth` | `boolean` | `false` |
| `icon` | `LucideIconName?` | — |

**Variantes visuais:**

| Variante | Background | Texto | Borda | Uso |
|----------|-----------|-------|-------|-----|
| `primary` | `--accent-primary` | `#FFFFFF` | nenhuma | CTA principal |
| `secondary` | `transparent` | `--accent-primary` | `1.5px --accent-primary` | Ação secundária |
| `ghost` | `transparent` | `--text-secondary` | nenhuma | Ação terciária |
| `danger` | `--color-error` | `#FFFFFF` | nenhuma | Destrutiva |
| `gold` | `--accent-gold` | `#1A1A2E` | nenhuma | Destaque (Pronto!) |

**Tamanhos:**

| Size | Height | Padding H | Font-size | Fonte | Radius |
|------|--------|-----------|-----------|-------|--------|
| `sm` | 32px | 16px | 14px | DM Sans 600 | `--radius-sm` |
| `md` | 40px | 24px | 16px | DM Sans 600 | `--radius-md` |
| `lg` | 48px | 32px | 18px | DM Sans 600 | `--radius-md` |
| `xl` | 56px | 40px | 20px | **Fredoka 600** | `--radius-lg` |

**Estados:**

| Estado | Transformação |
|--------|--------------|
| Default | Como descrito acima |
| Hover | Lighten 10%, `scale(1.02)`, transition 150ms |
| Active | Darken 5%, `scale(0.98)`, transition 50ms |
| Disabled | `opacity: 0.4`, `cursor: not-allowed` |
| Loading | Conteúdo `opacity: 0`, spinner centralizado |
| Focus | `--shadow-focus` ring (4px accent-primary-subtle) |

### 1.6 Átomo: Input de Texto (TextInput)

Campo de entrada com label opcional e estados visuais.

**Props:**

| Prop | Tipo | Default |
|------|------|---------|
| `placeholder` | `string` | — |
| `value` | `string` | `""` |
| `label` | `string?` | — |
| `error` | `string?` | — |
| `disabled` | `boolean` | `false` |
| `size` | `"md" \| "lg"` | `"md"` |

**Tamanhos:**

| Size | Height | Font-size | Padding | Uso |
|------|--------|-----------|---------|-----|
| `md` | 44px | 15px (DM Sans 400) | `12px 16px` | Código de sala, nickname |
| `lg` | 56px | 19px (DM Sans 500) | `14px 20px` | **Input de resposta** (rodada) |

**Estilo base:**
- Background: `--bg-elevated`
- Border: `1px --border-default`
- Border-radius: `--radius-md` (md) ou `--radius-lg` (lg)
- Placeholder: `--text-muted`, italic
- Transition: `150ms ease-out`

**Estados:**

| Estado | Border | Shadow | Notas |
|--------|--------|--------|-------|
| Default | `1px --border-default` | nenhum | — |
| Hover | `1px --border-strong` | nenhum | — |
| Focus | `2px --accent-primary` | `--shadow-focus` | — |
| Respondido (lg) | `2px --color-success` | `0 0 0 4px success-subtle` | Apenas no input de resposta |
| Erro | `2px --color-error` | `0 0 0 4px error-subtle` | Com mensagem de erro abaixo |
| Disabled | `1px --border-subtle` | nenhum | `opacity: 0.5` |

### 1.7 Átomo: Toggle (Switch)

Interruptor on/off para configurações binárias.

**Props:**

| Prop | Tipo | Default |
|------|------|---------|
| `checked` | `boolean` | `false` |
| `label` | `string` | — |
| `disabled` | `boolean` | `false` |

**Estilo:**
- Track: 40px × 22px, border-radius `--radius-full`
- Track off: `--bg-overlay`
- Track on: `--accent-primary`
- Thumb: 18px, branco, border-radius `--radius-full`
- Transition: 200ms ease

### 1.8 Átomo: Slider (Range)

Controle deslizante para valores numéricos contínuos.

**Props:**

| Prop | Tipo | Default |
|------|------|---------|
| `min` | `number` | `0` |
| `max` | `number` | `100` |
| `value` | `number` | — |
| `step` | `number` | `1` |
| `label` | `string?` | — |
| `showValue` | `boolean` | `true` |
| `valueFormatter` | `(v: number) => string` | `String(v)` |

**Estilo:**
- Track: height 6px, border-radius 3px
- Track background: `--bg-overlay`
- Track fill (preenchido): `--accent-primary`
- Thumb: 20px, branco, `--shadow-sm`, border-radius `--radius-full`
- Valor exibido: JetBrains Mono 16px/500, `--text-primary`

### 1.9 Átomo: Select (Dropdown)

Menu de seleção para opções discretas.

**Props:**

| Prop | Tipo | Default |
|------|------|---------|
| `options` | `{ value: string, label: string }[]` | — |
| `value` | `string` | — |
| `label` | `string?` | — |
| `placeholder` | `string?` | — |

**Estilo:**
- Trigger: mesmo visual do TextInput `md` + ícone chevron-down
- Dropdown: background `--bg-overlay`, border `1px --border-subtle`, shadow `--shadow-lg`, border-radius `--radius-md`
- Item: height 40px, padding `0 16px`
- Item hover: background `--accent-primary-subtle`
- Item selecionado: background `--accent-primary`, texto branco
- Max-height dropdown: 200px (scroll)

### 1.10 Átomo: Divider

Linha horizontal separadora.

**Variantes:**

| Variante | Estilo |
|----------|--------|
| `line` | `1px solid --border-subtle`, full-width |
| `text` | Linha com texto centralizado (ex: "ou conecte suas playlists") |

Para `text`: linhas `--border-default` com o texto em DM Sans 12px `--text-muted` centralizado.

### 1.11 Átomo: AlbumCover

Exibe a capa do álbum/single de uma música. Usa imagem real da plataforma (Deezer `album.cover_medium`) com fallback gracioso.

**Props:**

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `src` | `string \| null` | `null` | URL da imagem (Deezer `album.cover_medium`, 300×300) |
| `alt` | `string` | — | Nome da música + artista (acessibilidade) |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Ver tabela abaixo |

**Tamanhos:**

| Size | Dimensão | Radius | Uso |
|------|----------|--------|-----|
| `sm` | 40×40px | `--radius-sm` | Inline em listas, TrackRow |
| `md` | 64×64px | `--radius-md` | RoundReveal (revelação pós-rodada) |
| `lg` | 96×96px | `--radius-lg` | Destaque na tela de resultados |

**Estilo:**
- `object-fit: cover` (recorta se não for quadrada)
- Border: `1px solid --border-subtle`
- Background (loading): `--bg-elevated` (preenchimento enquanto carrega)

**Fallback (quando `src` é null ou imagem falha ao carregar):**
- Mostra um container do mesmo tamanho
- Background: `--bg-elevated`
- Ícone `music` (Lucide) centralizado, tamanho 40% do container
- Cor do ícone: `--text-muted`

**Fonte da imagem:**
- O Deezer retorna `album.cover_medium` (300×300px) em toda busca de track
- O backend já possui esse dado no cache de validação de playlist
- O campo deve ser incluído no payload do evento WebSocket `round_ended` → `song.album_cover_url`
- Frontend recebe a URL proxied pelo backend (nunca expor URL direta do Deezer CDN)

**Prioridade de resolução:**
1. Capa do single/álbum via Deezer (`album.cover_medium`) — 300×300, qualidade boa
2. Capa via Spotify (`album.images[1].url`) — 300×300, se Deezer indisponível
3. Fallback com ícone — quando nenhuma imagem está disponível

### 1.12 Átomo: Spinner

Indicador de carregamento.

**Tamanhos:** `sm` (16px), `md` (24px), `lg` (32px)
**Estilo:** Circle stroke, `--accent-primary`, 2px stroke, animação rotate 800ms linear infinite com stroke-dasharray.

### 1.13 Átomo: Progress Bar

Barra de progresso linear.

**Props:**

| Prop | Tipo | Default |
|------|------|---------|
| `value` | `number` (0–100) | `0` |
| `variant` | `"primary" \| "success" \| "warning" \| "error" \| "gold"` | `"primary"` |
| `size` | `"sm" \| "md"` | `"md"` |

**Estilo:**
- Track: height 4px (sm) ou 8px (md), `--bg-overlay`, border-radius `--radius-full`
- Fill: cor da variante, border-radius `--radius-full`, transition `300ms ease-out`

### 1.14 Átomo: PasswordInput

Campo de senha com toggle de visibilidade.

**Props:**

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `placeholder` | `string` | `"Sua senha"` | Texto placeholder |
| `value` | `string` | `""` | Valor do campo |
| `error` | `string?` | — | Mensagem de erro |
| `showStrength` | `boolean` | `false` | Mostra indicador de força (criação de conta) |

**Estilo:**
- Mesmo visual do TextInput `md` (height 44px, bg-elevated, border-default)
- Ícone `eye` / `eye-off` (Lucide, 18px) à direita como botão toggle
- Texto mascarado por padrão (`type="password"`)
- Quando visível: `type="text"`, ícone muda para `eye-off`

**Indicador de força (quando `showStrength=true`):**
- Barra abaixo do input com 4 segmentos
- Cores: 1 seg = `--color-error` (fraca), 2 = `--color-warning` (razoável), 3 = `--accent-primary` (boa), 4 = `--color-success` (forte)
- Label abaixo: "Fraca" / "Razoável" / "Boa" / "Forte" (DM Sans 11px, cor correspondente)
- Critérios: mínimo 8 chars, +1 se tem maiúscula, +1 se tem número, +1 se tem especial

**Estados:** Mesmos do TextInput (default, hover, focus, error, disabled).

### 1.15 Átomo: TextLink

Link de texto clicável para navegação inline.

**Props:**

| Prop | Tipo | Default |
|------|------|---------|
| `label` | `string` | — |
| `href` | `string` | — |
| `variant` | `"primary" \| "muted"` | `"primary"` |
| `size` | `"sm" \| "md"` | `"md"` |

**Estilo:**
- `primary`: cor `--accent-primary`, underline on hover
- `muted`: cor `--text-muted`, underline on hover, lighten para `--text-secondary`
- Font: DM Sans, size sm=12px / md=14px, weight 500
- Cursor: pointer
- Transition: color 150ms

---

## 2. Moléculas

Combinações de 2+ Átomos que formam unidades funcionais pequenas. Cada Molécula resolve UM micro-problema de interface.

### 2.1 Molécula: PlayerIdentity

**Combina:** Avatar + Texto(nome) + Badge(status?)

Exibe a identidade de um jogador: avatar colorido + nickname + badge opcional de status.

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `name` | `string` | Nickname |
| `color` | `PlayerColor` | Cor do slot |
| `avatarSize` | `AvatarSize` | Tamanho do avatar |
| `badge` | `BadgeVariant?` | Badge opcional ("Host", "Pronto", etc.) |
| `badgeLabel` | `string?` | Texto do badge |
| `subtitle` | `string?` | Texto secundário abaixo do nome (ex: "Spotify conectado") |

**Layout:** Flex row, gap 12px. Avatar à esquerda, nome + subtitle + badge à direita.

**Uso em:** PlayerCard (lobby), respostas na revelação, scoreboard.

### 2.2 Molécula: FormField

**Combina:** Texto(label) + TextInput/Slider/Select/Toggle + Texto(error/helper)

Campo de formulário completo com label acima e mensagem auxiliar abaixo.

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `label` | `string` | Texto da label |
| `helper` | `string?` | Texto auxiliar abaixo do input |
| `error` | `string?` | Mensagem de erro (substitui helper) |
| `children` | `Atom` | O átomo de input (TextInput, Slider, Select, Toggle) |

**Layout:** Flex column, gap 6px. Label em DM Sans 14px/600 `--text-secondary`. Helper/Error em DM Sans 12px `--text-muted` ou `--color-error`.

### 2.3 Molécula: InviteCode

**Combina:** Texto(MonoMedium) + Botão(icon: copy)

Exibe o código de convite da sala com botão de copiar.

**Props:**

| Prop | Tipo |
|------|------|
| `code` | `string` |
| `onCopy` | `() => void` |

**Layout:**
- Background: `--bg-elevated`
- Padding: `12px 16px`
- Border-radius: `--radius-md`
- Border: `1px dashed --border-default`
- Código: JetBrains Mono 24px/600, `--text-primary`, letter-spacing 3px
- Botão copiar: Ghost, size sm, ícone `copy`
- Feedback: ao copiar, ícone muda para `check` por 2s com cor `--color-success`

### 2.4 Molécula: TimerDisplay

**Combina:** Texto(MonoLarge) + ProgressBar(circular, SVG)

O timer da rodada — elemento mais dinâmico do jogo.

**Props:**

| Prop | Tipo |
|------|------|
| `secondsRemaining` | `number` |
| `totalSeconds` | `number` |
| `state` | `"idle" \| "running" \| "urgent" \| "critical"` |

**Estrutura:**
- SVG circle stroke como progress circular (diâmetro 88px, stroke-width 4px)
- Número centralizado: JetBrains Mono 700

**Variações de estado:**

| Estado | Cor | Número | Animação |
|--------|-----|--------|----------|
| `idle` | `--text-muted` | Estático | Nenhuma |
| `running` (> 10s) | `--accent-primary` | Contando | Nenhuma |
| `urgent` (5–10s) | `--accent-gold` | Contando | Nenhuma |
| `critical` (< 5s) | `--color-error` | Contando | `pulse` (scale 1→1.08, 500ms) |

### 2.5 Molécula: AudioWave

**Combina:** Divs animadas (barras de equalizer)

Indicador visual de que áudio está tocando.

**Props:**

| Prop | Tipo |
|------|------|
| `playing` | `boolean` |
| `color` | `string` | Default `--accent-primary` |

**Estilo:**
- 8-12 barras verticais lado a lado, width 3px, gap 3px
- Heights variadas (8–24px), oscilando com animation staggered
- Quando `playing=false`: barras com height mínima, paradas
- Animação: cada barra com `animation-delay` diferente, `ease-in-out 600ms infinite alternate`
- Respeitar `prefers-reduced-motion`: se reduce, barras estáticas com heights fixas variadas

### 2.6 Molécula: PlayerResponseRow

**Combina:** Avatar(xs) + Texto(nome) + Texto(resposta) + Ícone(check/x) + Texto(MonoSmall, pontos)

Uma linha de resultado pós-rodada mostrando a resposta de um jogador.

**Props:**

| Prop | Tipo |
|------|------|
| `name` | `string` |
| `color` | `PlayerColor` |
| `answer` | `string \| null` |
| `correct` | `boolean` |
| `points` | `number` |

**Layout:**
- Flex row, padding `8px 12px`, border-radius `--radius-md`
- Background: `success-subtle` se correto, `error-subtle` se errado
- Border: `1px solid` com cor correspondente a 15% opacidade
- Avatar xs à esquerda
- Nome (DM Sans 13px/600) + resposta (DM Sans 12px, `--text-muted`)
- À direita: pontos em JetBrains Mono 12px/600 dourado (se > 0) + ícone ✅/❌

### 2.7 Molécula: ScoreDisplay

**Combina:** Avatar + Texto(nome) + Texto(MonoSmall, pontos)

Linha compacta de placar.

**Props:**

| Prop | Tipo |
|------|------|
| `position` | `number` |
| `name` | `string` |
| `color` | `PlayerColor` |
| `score` | `number` |
| `isCurrentPlayer` | `boolean` |
| `highlight` | `boolean` (1º lugar = true) |

**Layout:**
- Flex row, height 44px, padding `0 12px`
- Posição: DM Sans 14px/600, `--text-muted`
- Avatar (sm)
- Nome: DM Sans 14px/500
- Score: JetBrains Mono 16px/600, alinhado à direita
- Se `isCurrentPlayer`: border-left `2px --accent-primary`
- Se `highlight` (1º): score em `--accent-gold`

### 2.8 Molécula: PlatformButton

**Combina:** Ícone(plataforma SVG) + Texto(nome da plataforma)

Botão de login OAuth para Spotify/Deezer/YouTube Music.

**Props:**

| Prop | Tipo |
|------|------|
| `platform` | `"spotify" \| "deezer" \| "youtube_music"` |
| `connected` | `boolean` |
| `onClick` | `() => void` |

**Cores por plataforma:**

| Plataforma | Cor | Hex |
|-----------|-----|-----|
| Spotify | Verde Spotify | `#1DB954` |
| Deezer | Roxo Deezer | `#A238FF` |
| YouTube Music | Vermelho YouTube | `#FF0000` |

**Estilo:**
- Height: 40px, padding `0 20px`
- Background: `{platformColor}` a 10% opacidade
- Border: `1px solid {platformColor}` a 25% opacidade
- Texto: `{platformColor}`, DM Sans 13px/600
- Border-radius: `--radius-md`
- Se `connected`: badge ✓ verde ao lado

### 2.9 Molécula: HighlightStat

**Combina:** Ícone/Emoji + Texto(caption, título) + Texto(h2, valor) + Texto(small, jogador)

Card de destaque nos resultados (Maior Streak, Mais Rápida, etc.).

**Props:**

| Prop | Tipo |
|------|------|
| `icon` | `string` (emoji) |
| `title` | `string` |
| `value` | `string` |
| `playerName` | `string` |
| `playerColor` | `PlayerColor` |

**Estilo:**
- Background: gradient sutil `--bg-surface` → `--bg-elevated`
- Border: `1px solid accent-primary` a 20% opacidade
- Border-radius: `--radius-lg`
- Padding: 14px
- Glow: `--shadow-glow-primary` (sutil)
- Icon: 22px, margin-bottom 4px
- Title: DM Sans 12px/600, uppercase, `--text-muted`
- Value: Fredoka 18px/600, `--text-primary`
- Player: DM Sans 12px, `{playerColor}`

### 2.10 Molécula: TrackRow

**Combina:** AlbumCover(sm) + Texto(nome) + Texto(artista) + Badge(status) + Botão(play 5s)

Linha de música na validação de playlist, com capa do álbum.

**Props:**

| Prop | Tipo |
|------|------|
| `trackName` | `string` |
| `artistName` | `string` |
| `albumCoverUrl` | `string \| null` |
| `status` | `"available" \| "fallback" \| "unavailable"` |
| `onPreview` | `(() => void)?` |

**Layout:**
- Flex row, height 56px, padding `8px 12px`, border-bottom `1px --border-subtle`
- AlbumCover (sm, 40×40px) à esquerda
- Track name: DM Sans 14px/500, `--text-primary`
- Artist: DM Sans 13px, `--text-secondary`
- Badge: variante success/warning/error
- Preview button: Botão ghost sm com ícone `play` (só se status = available)

### 2.11 Molécula: PlaylistCard

**Combina:** AlbumCover(sm) + Texto(nome) + Texto(contagem) + Badge(plataforma) + Badge(status?)

Card de playlist na navegação (antes de importar) e na lista de importadas.

**Props:**

| Prop | Tipo |
|------|------|
| `name` | `string` |
| `trackCount` | `number` |
| `coverUrl` | `string \| null` |
| `platform` | `"spotify" \| "deezer" \| "youtube_music"` |
| `isImported` | `boolean` |
| `stats` | `{ available: number, total: number }?` |
| `isSelected` | `boolean` |
| `onAction` | `() => void` |

**Variante "para importar" (PlaylistBrowser):**
- AlbumCover(sm) à esquerda
- Nome: DM Sans 14px/600
- "45 faixas" — DM Sans 12px, `--text-muted`
- Badge da plataforma (pill com cor)
- Botão "Importar" (secondary, sm) à direita

**Variante "importada" (ImportedPlaylistList):**
- AlbumCover(sm) à esquerda
- Nome: DM Sans 14px/600
- Stats: "41/45 disponíveis" — DM Sans 12px, cor semântica
- ProgressBar mini (sm) mostrando % disponível
- Se selecionada: border `2px --accent-primary`, glow
- Ícone de seleção (radio circle) à direita

**Estilo base:**
- Card: `--bg-surface`, border `1px --border-subtle`, radius `--radius-lg`, padding 12px
- Flex row, gap 12px, align-items center
- Hover: border `--border-default`, translate-y -1px

### 2.12 Molécula: SkipVote

**Combina:** Botão(ghost) + Texto(contagem)

Botão de voto para pular rodada com contagem visual.

**Props:**

| Prop | Tipo |
|------|------|
| `currentVotes` | `number` |
| `totalPlayers` | `number` |
| `hasVoted` | `boolean` |
| `onVote` | `() => void` |

**Layout:**
- Botão ghost: "Pular" + contagem (`2/4`)
- Se `hasVoted`: cor `--accent-primary`, ícone check
- Contagem: JetBrains Mono 13px

### 2.13 Molécula: CountdownOverlay

**Combina:** Texto(MonoLarge) + animação

Overlay de contagem regressiva 3-2-1 durante o grace period.

**Estilo:**
- Números aparecem no centro da tela, um por vez
- Fredoka 64px/700, `--accent-primary`
- Animação: `scale(0.5) → scale(1.2) → scale(1)` com fade, 800ms cada
- Background: semi-transparente `--bg-deep` a 60%

### 2.14 Molécula: SocialDivider

**Combina:** Divider(line) + Texto("ou")

Separador visual entre login por email e login social (OAuth).

**Estilo:**
- Duas linhas `--border-default` com texto "ou" centralizado
- Texto: DM Sans 12px/500, `--text-muted`
- Margem vertical: 20px

### 2.15 Molécula: AuthFormField

**Combina:** Texto(label) + TextInput/PasswordInput + Texto(error) + TextLink(auxiliar?)

Campo de formulário de autenticação com label, input e ações auxiliares.

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `label` | `string` | "Email", "Senha", "Confirmar senha" |
| `inputType` | `"email" \| "password" \| "text"` | Tipo do input |
| `error` | `string?` | Mensagem de erro inline |
| `auxiliaryLink` | `{ label: string, href: string }?` | Link auxiliar ao lado da label (ex: "Esqueci minha senha") |
| `showStrength` | `boolean` | Mostra barra de força (só para criação de senha) |

**Layout:**
- Label + link auxiliar em flex row, space-between
- Input abaixo da label, gap 4px
- Mensagem de erro abaixo do input: DM Sans 11px, `--color-error`, com ícone `alert-circle` 12px

---

## 3. Organismos

Seções funcionais completas da interface, compostas por múltiplas Moléculas e Átomos. Cada Organismo é uma "região" autossuficiente de uma tela.

### 3.1 Organismo: AppHeader

**Composto por:** Texto(logo) + InviteCode? + Botão(compartilhar)?

Header persistente no topo da aplicação.

**Variações por contexto:**

| Tela | Conteúdo do Header |
|------|--------------------|
| Tela Inicial | Logo "Mermã" centralizado |
| Login/Cadastro/Senha | Logo compacto + botão voltar |
| Lobby | Logo à esquerda + InviteCode + Botão compartilhar à direita |
| Partida | "Rodada X/N" à esquerda + Score resumido à direita |
| Resultados | "Resultados" centralizado |

**Estilo:**
- Height: 56px
- Padding: `0 16px`
- Background: `--bg-deep` (sem borda inferior, blende com a página)
- Position: sticky top 0, z-index 10

### 3.2 Organismo: PlayerList

**Composto por:** Texto(heading) + lista de PlayerCard(Molécula expandida)

Lista de jogadores no lobby.

**PlayerCard (card de cada jogador):**
- É um Card (`--bg-surface`, border `--border-subtle`, radius `--radius-lg`, padding 16px)
- Dentro: PlayerIdentity + badge de status (Pronto/Esperando)
- Se host: badge "Host" extra (variant info)
- Hover: border-color muda para `--border-default`, translate-y -1px
- Gap entre cards: 8px

**Heading:** Fredoka 20px/500: "Jogadores (3/20)"

**Empty state:** Ícone `users` grande (48px, `--text-muted`), texto "Ninguém aqui ainda... Manda o link!"

### 3.3 Organismo: MatchConfigPanel

**Composto por:** Card + múltiplos FormField(Slider, Select, Toggle)

Painel de configuração da partida, visível apenas para o host no lobby.

**Campos:**

| Campo | Átomo de input | Config |
|-------|---------------|--------|
| Tempo por rodada | Slider | min=10, max=60, step=5, formato "{v}s" |
| Total de músicas | Slider | min=dinâmico, max=dinâmico, step=1 |
| Tipo de resposta | Select | opções: Música / Artista / Qualquer um |
| Permitir repetição | Toggle | — |
| Regra de pontuação | Select | opções: Simples / Velocidade |

**Layout:**
- Card com heading "Configuração da Partida" (DM Sans 16px/600)
- Campos stacked verticalmente, gap 20px
- Padding: 20px
- Para não-host: campos desabilitados com texto "Apenas o host pode configurar"

**Botão "Iniciar Partida":**
- Variante Primary, size lg, fullWidth
- Disabled até todos os jogadores estarem prontos
- Texto dinâmico: "Iniciar Partida" (ativo) / "Esperando jogadores..." (disabled)

### 3.4 Organismo: GamePlayArea

**Composto por:** TimerDisplay + AudioWave + TextInput(lg) + lista de Avatar(sm) + SkipVote

A área central da tela durante uma rodada. É o coração do jogo.

**Layout (vertical, centralizado):**

```
┌─────────────────────────┐
│      TimerDisplay       │  ← Centralizado, grande
│      (88px circle)      │
│                         │
│      AudioWave          │  ← Barras animadas
│                         │
│  ┌───────────────────┐  │
│  │  TextInput (lg)   │  │  ← Input de resposta
│  │  "Digite sua      │  │
│  │   resposta..."    │  │
│  └───────────────────┘  │
│                         │
│  [G✓] [M✓] [J ] [A ]   │  ← Avatares com status
│                         │
│     [ Pular 2/4 ]       │  ← SkipVote (aparece pós-resposta)
└─────────────────────────┘
```

**Comportamento:**
- Input ganha focus automaticamente quando o timer inicia
- Avatares: quem respondeu tem `check` e opacity 1, quem não respondeu opacity 0.4
- SkipVote aparece com `slide-up` depois que o jogador envia resposta

### 3.5 Organismo: AutocompleteOverlay

**Composto por:** Card(overlay) + lista de TextInput suggestions

Dropdown de autocomplete que aparece sobre o input de resposta.

**Estilo:**
- Position: absolute, abaixo do input
- Background: `--bg-overlay`
- Border: `1px --border-subtle`
- Shadow: `--shadow-lg`
- Border-radius: `--radius-md`
- Max-height: 200px (scroll)
- Item: height 44px, padding `0 16px`
- Item hover: `--accent-primary-subtle`
- Item selecionado: `--accent-primary` com texto branco
- Highlight do match: texto bold na parte que coincide
- Animação: `fade-in` 150ms

### 3.6 Organismo: RoundReveal

**Composto por:** AlbumCover(md) + Texto(nome/artista) + lista de PlayerResponseRow + animação de pontos

Card de revelação pós-rodada mostrando a capa do álbum, a resposta correta e o que cada jogador respondeu.

**Props do organismo:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `song` | `RevealedSong` | Dados da música (nome, artista, álbum, `album_cover_url`, dono) |
| `answers` | `PlayerAnswer[]` | Lista de respostas dos jogadores |
| `scores` | `Record<string, number>` | Pontos ganhos na rodada |

**Layout (vertical, centralizado):**

```
┌─────────────────────────────┐
│   ┌──────────┐              │
│   │ ▓▓▓▓▓▓▓▓ │              │  ← AlbumCover (md, 64×64)
│   │ ▓ CAPA ▓ │              │     imagem real do álbum/single
│   │ ▓▓▓▓▓▓▓▓ │              │     fallback: ícone 🎵
│   └──────────┘              │
│                             │
│   Bohemian Rhapsody         │  ← Fredoka 20px/500
│   Queen                     │  ← DM Sans 16px, secondary
│   A Night at the Opera      │  ← DM Sans 13px, muted (nome do álbum)
│   Da playlist de Gabriel    │  ← DM Sans 12px, player color
│                             │
│  ┌─────────────────────────┐│
│  │ [G] Gabriel  Bohemian.. ✅ +920│
│  │ [M] Maria    boemian r. ✅ +680│
│  │ [J] João     We Will R. ❌     │
│  │ [A] Ana      (silêncio) ❌     │
│  └─────────────────────────┘│
│                             │
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░ │  ← ProgressBar (3s auto-advance)
└─────────────────────────────┘
```

**AlbumCover no RoundReveal:**
- Tamanho: `md` (64×64px)
- Centralizado acima do nome da música
- Animação de entrada: `pop` (scale 0.8→1.05→1, 400ms) com leve sombra `--shadow-md`
- Se a imagem não estiver disponível: fallback automático do átomo AlbumCover (container com ícone `music`)

**Informações extras visíveis (adição com a capa):**
- Com a capa do álbum, faz sentido mostrar também o **nome do álbum** (DM Sans 13px, `--text-muted`), pois reforça o reconhecimento visual para o jogador

**Impacto no contrato de API (evento `round_ended`):**
O payload `RevealedSong` precisa incluir o campo `album_cover_url`:
```typescript
interface RevealedSong {
  track_name: string;
  artist_name: string;
  album_name: string;          // já existia
  album_cover_url: string | null;  // NOVO — URL proxied da capa (Deezer cover_medium)
  owner_player_uuid: string;
  owner_nickname: string;
}
```
O backend já possui `album.cover_medium` no cache de validação. Basta incluir no evento. A URL deve ser proxied pelo backend (não expor CDN do Deezer diretamente).

**Animações:**
- AlbumCover aparece com `pop` 400ms
- Card aparece com `slide-up` 400ms (logo depois da capa)
- Nome da música: `fade-in` 300ms (staggered 100ms após capa)
- Respostas aparecem staggered (100ms delay cada)
- Pontos de quem acertou: animação `fly-score` (número voa para cima e some)
- Barra de progresso sutil no bottom mostrando 3s até próxima rodada

### 3.7 Organismo: Scoreboard

**Composto por:** Texto(heading) + lista de ScoreDisplay

Placar ao vivo durante a partida.

**Desktop:** Sidebar fixa à direita (width 220px)
**Mobile:** Barra inferior colapsável (tap para expandir/colapsar)

**Estilo mobile colapsado:**
- Height: 44px, fixo no bottom
- Mostra apenas: posição do jogador + score em linha compacta
- Tap: expande para cima com `slide-up`, mostra ranking completo
- Background: `--bg-surface`, border-top `1px --border-subtle`

**Estilo desktop:**
- Card fixo no lado direito
- Lista de ScoreDisplay ordenada por pontuação
- Update animado: quando posição muda, item move com transition 300ms

### 3.8 Organismo: ResultsPodium

**Composto por:** Avatar(xl/lg) + Texto + animações de celebração

O pódio dos top 3 na tela de resultados.

**Layout:**

```
              ┌─────────┐
              │  🏆 1º  │  ← Avatar xl, glow dourado
              │ Gabriel │
              │  2.850  │
        ┌─────┘         └─────┐
        │  2º           3º   │  ← Avatares lg
        │ Maria         João │
        │ 2.100        1.900 │
        └─────────────────────┘
```

**1º lugar:**
- Avatar xl com glow dourado (`--shadow-glow-gold`)
- Nome em Fredoka 20px/600
- Score em JetBrains Mono 24px/700, `--accent-gold`
- Animação de confete (partículas coloridas caindo, 2s)

**2º e 3º:**
- Avatar lg
- Nome em DM Sans 16px/600
- Score em JetBrains Mono 18px/600, `--text-secondary`

### 3.9 Organismo: HighlightCarousel

**Composto por:** lista horizontal de HighlightStat

Cards de destaques scrolláveis na tela de resultados.

**Layout:** Flex row, overflow-x auto, gap 12px, snap scroll
**Mobile:** Scroll horizontal com snap-align center
**Desktop:** Grid 2×2 ou flex row (cabe 4 cards lado a lado)

**Destaques padrão (do GDD):**

| Destaque | Ícone | Descrição |
|----------|-------|-----------|
| Maior Streak | 🔥 | Mais acertos consecutivos |
| Resposta Mais Rápida | ⚡ | Menor tempo de resposta correta |
| Conhecedor | 🎵 | Mais acertos totais |
| Na Trave | 😅 | Mais quase-acertos (fuzzy próximo) |

### 3.10 Organismo: PlaylistValidation

**Composto por:** Texto(heading) + ValidationStats + lista de TrackRow + ProgressBar(validação) + Botões de ação

Tela detalhada de uma playlist específica, mostrando o resultado de validação de cada música.

**Props:**

| Prop | Tipo |
|------|------|
| `playlist` | `ValidatedPlaylist` |
| `isValidating` | `boolean` |
| `onReimport` | `() => void` |
| `onBack` | `() => void` |

**ValidationStats (resumo no topo):**
- 3 mini metric cards em row:
  - "42 disponíveis" — badge `success`, ícone `check`
  - "3 fallback" — badge `warning`, ícone `alert-triangle`
  - "5 indisponíveis" — badge `error`, ícone `x-circle`
- Card background: `--bg-elevated`, padding 10px, border-radius `--radius-md`
- Número: JetBrains Mono 20px/700
- Label: DM Sans 11px/500, `--text-muted`, uppercase

**Lista de TrackRow:**
- Cada faixa com AlbumCover(sm) + nome + artista + badge + preview
- Ordenada: disponíveis primeiro, fallback depois, indisponíveis por último
- Separador visual entre cada grupo (Divider line)

**Estados de validação:**

| Estado | Visual |
|--------|--------|
| Validando | ProgressBar no topo (animated), TrackRows aparecem incrementalmente com `fade-in` |
| Concluída | Stats visíveis, lista completa |
| Erro (API) | Card de erro: "Não foi possível validar. Tente novamente." + Botão retry |

**Ações:**
- Botão "Re-importar" (secondary, md) — revalida a playlist
- Botão "← Voltar" (ghost, sm) — retorna à lista de playlists
- Preview play (5s) — em cada TrackRow disponível

### 3.12 Organismo: PlaylistBrowser

**Composto por:** Texto(heading) + PlatformTabs + lista de PlaylistCard(molécula) + empty state

Navegador de playlists disponíveis na plataforma conectada, antes de importar.

**Props:**

| Prop | Tipo |
|------|------|
| `playlists` | `PlatformPlaylist[]` |
| `connectedPlatforms` | `Platform[]` |
| `isLoading` | `boolean` |
| `onImport` | `(playlistId: string, platform: string) => void` |
| `onPlatformChange` | `(platform: string) => void` |
| `activePlatform` | `string` |

**PlatformTabs (no topo):**
- Tabs horizontais com ícone + nome da plataforma (Spotify, Deezer, YouTube Music)
- Apenas plataformas conectadas são clicáveis, as demais ficam desabilitadas com label "Conectar"
- Tab ativa: `--accent-primary` underline
- Tab inativa: `--text-muted`

**Layout:**
- Grid de PlaylistCards (ver molécula 2.13)
- Mobile: 1 coluna
- Desktop: 2 colunas

**Empty states:**

| Situação | Visual |
|----------|--------|
| Nenhuma plataforma conectada | Ícone `link` (48px, muted) + "Conecte uma plataforma para importar playlists" + PlatformButtons |
| Plataforma sem playlists | Ícone `music` (48px, muted) + "Nenhuma playlist encontrada no Spotify" |
| Carregando | Grid de 4 PlaylistCard skeletons (pulse animation) |

### 3.13 Organismo: ProfileHeader

**Composto por:** Avatar(xl) + Texto(nickname) + PlatformBadges + Texto(estatísticas)

Cabeçalho do perfil do jogador.

**Props:**

| Prop | Tipo |
|------|------|
| `nickname` | `string` |
| `color` | `PlayerColor` |
| `connectedPlatforms` | `{ platform: string, username: string }[]` |
| `stats` | `{ totalPlaylists: number, totalTracks: number, availableRate: number }` |

**Layout:**

```
┌───────────────────────────────────────┐
│                                       │
│            ┌────┐                     │
│            │ G  │  Avatar (xl, 64px)  │
│            └────┘                     │
│          Gabriel                      │  ← Fredoka 20px/600
│                                       │
│   [🟢 Spotify: gabs123]              │  ← PlatformBadges (connected)
│   [🟣 Deezer: não conectado]         │
│                                       │
│   ┌──────┐ ┌──────┐ ┌──────────┐     │
│   │  3   │ │ 127  │ │   94%    │     │
│   │lists │ │faixas│ │disponível│     │  ← Mini metric cards
│   └──────┘ └──────┘ └──────────┘     │
└───────────────────────────────────────┘
```

**PlatformBadges:**
- Cada plataforma conectada: pill com cor da plataforma + username
- Plataforma não conectada: pill `--text-muted`, texto "Conectar" (clicável → OAuth)
- Layout: flex row, gap 8px, wrap

**Stat cards (bottom row):**
- 3 mini cards inline
- Número: JetBrains Mono 18px/700
- Label: DM Sans 11px, `--text-muted`
- Background: `--bg-elevated`, padding 8px 12px, border-radius `--radius-sm`

### 3.14 Organismo: ImportedPlaylistList

**Composto por:** Texto(heading) + lista de PlaylistCard(importadas) + empty state

Lista das playlists já importadas e validadas pelo jogador.

**Props:**

| Prop | Tipo |
|------|------|
| `playlists` | `ValidatedPlaylist[]` |
| `selectedPlaylistId` | `string \| null` |
| `onSelect` | `(id: string) => void` |
| `onViewDetails` | `(id: string) => void` |
| `onRemove` | `(id: string) => void` |

**Heading:** "Minhas Playlists" (Fredoka 20px/500) + Badge com contagem

**Cada PlaylistCard importada:**
- PlaylistCard com stats resumidos: "41/45 disponíveis" (badge success)
- Checkbox/radio de seleção (para escolher qual usar na partida)
- Botão "Ver detalhes" → navega para PlaylistValidation
- Botão "Remover" (ghost, danger icon) → remove do cache

**Se selecionada para a partida:** border `2px --accent-primary`, glow sutil

**Empty state:** Ícone `disc` (48px, muted) + "Nenhuma playlist importada ainda" + Botão "Importar Playlist" (primary, md)

### 3.11 Organismo: BottomActionBar

**Composto por:** Botão(primary/gold, lg, fullWidth)

Barra fixa no bottom do mobile para ação principal.

**Uso em:**
- Lobby: "Pronto!" (gold) / "Cancelar pronto" (ghost)
- Partida: aparece com SkipVote quando aplicável
- Resultados: ProgressBar de auto-return

**Estilo:**
- Position: fixed bottom 0
- Padding: `12px 16px env(safe-area-inset-bottom)`
- Background: `--bg-surface` com blur sutil
- Border-top: `1px --border-subtle`

### 3.16 Organismo: AuthForm

**Composto por:** Texto(heading) + AuthFormFields + Botão(submit) + SocialDivider + PlatformButtons + TextLinks

Formulário de autenticação reutilizável com 3 variantes (login, cadastro, esqueci senha).

**Props:**

| Prop | Tipo |
|------|------|
| `variant` | `"login" \| "register" \| "forgot_password"` |
| `isLoading` | `boolean` |
| `error` | `string?` (erro geral do formulário) |
| `onSubmit` | `(data) => void` |

**Variante: Login**

```
┌─────────────────────────────────┐
│                                 │
│     Mermã, a Música! (logo)     │
│                                 │
│     Entrar na sua conta         │  ← Fredoka 22px/600
│                                 │
│  ┌─────────────────────────┐    │
│  │ Email                   │    │  ← AuthFormField
│  │ [seu@email.com        ] │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ Senha    Esqueci senha → │   │  ← AuthFormField + auxiliaryLink
│  │ [••••••••••         👁] │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │         Entrar          │    │  ← Botão primary, lg, full
│  └─────────────────────────┘    │
│                                 │
│  ─── ou ───────────────────     │  ← SocialDivider
│                                 │
│  [Spotify] [Deezer] [YouTube]   │  ← PlatformButtons
│                                 │
│  Não tem conta? Criar conta →   │  ← TextLink
│                                 │
└─────────────────────────────────┘
```

**Variante: Cadastro (Register)**

```
┌─────────────────────────────────┐
│                                 │
│     Mermã, a Música! (logo)     │
│                                 │
│     Criar sua conta             │  ← Fredoka 22px/600
│                                 │
│  ┌─────────────────────────┐    │
│  │ Nickname                │    │
│  │ [Como quer ser chamado?]│    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ Email                   │    │
│  │ [seu@email.com        ] │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ Senha                   │    │
│  │ [••••••••••         👁] │    │
│  │ ▓▓▓▓▓▓▓▓▓░  Boa        │    │  ← PasswordInput com strength
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ Confirmar senha         │    │
│  │ [••••••••••         👁] │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │       Criar conta       │    │  ← Botão primary, lg, full
│  └─────────────────────────┘    │
│                                 │
│  ─── ou ───────────────────     │
│                                 │
│  [Spotify] [Deezer] [YouTube]   │  ← PlatformButtons (cadastro via OAuth)
│                                 │
│  Já tem conta? Entrar →         │  ← TextLink
│                                 │
└─────────────────────────────────┘
```

**Variante: Esqueci Senha**

```
┌─────────────────────────────────┐
│                                 │
│     Mermã, a Música! (logo)     │
│                                 │
│     Esqueci minha senha         │  ← Fredoka 22px/600
│     Digite seu email e vamos    │  ← DM Sans 14px, secondary
│     te enviar um link para      │
│     redefinir sua senha.        │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Email                   │    │
│  │ [seu@email.com        ] │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Enviar link          │    │  ← Botão primary, lg, full
│  └─────────────────────────┘    │
│                                 │
│  Lembrei! Voltar ao login →     │  ← TextLink
│                                 │
└─────────────────────────────────┘
```

**Estado de sucesso (Esqueci Senha — após enviar):**

```
┌─────────────────────────────────┐
│                                 │
│          ✉️ (ícone mail)        │  ← Lucide `mail`, 48px, accent
│                                 │
│     Email enviado!              │  ← Fredoka 22px/600
│     Confira sua caixa de        │  ← DM Sans 14px, secondary
│     entrada e clique no link    │
│     para redefinir sua senha.   │
│                                 │
│  ┌─────────────────────────┐    │
│  │   Voltar ao login       │    │  ← Botão primary, lg, full
│  └─────────────────────────┘    │
│                                 │
│  Não recebeu? Reenviar →        │  ← TextLink (muted)
│                                 │
└─────────────────────────────────┘
```

**Erro geral do formulário:**
- Card no topo com background `--color-error-subtle`, border `1px --color-error` 20%
- Ícone `alert-circle` + texto do erro (DM Sans 13px)
- Exemplos: "Email ou senha incorretos", "Este email já está cadastrado", "Tente novamente mais tarde"

**Validação inline dos campos:**

| Campo | Regras | Mensagem de erro |
|-------|--------|-----------------|
| Nickname | 2–20 caracteres, sem espaços no início/fim | "Nickname deve ter 2–20 caracteres" |
| Email | Formato de email válido | "Email inválido" |
| Senha | Mínimo 8 caracteres | "Mínimo 8 caracteres" |
| Confirmar senha | Deve ser igual à senha | "As senhas não coincidem" |

**Botão submit:**
- Disabled até todos os campos válidos
- Loading: conteúdo vira Spinner, width mantém

---

## 4. Templates

Layouts estruturais que definem ONDE os Organismos ficam em cada tipo de tela. Templates não possuem dados — são esqueletos posicionais. Definem grid, posicionamento e responsividade.

### 4.1 Template: CenteredSingle

Layout centralizado com conteúdo único. Usado para telas simples e focadas.

```
┌──────────────────────────────────┐
│           [AppHeader]            │
│                                  │
│    ┌────────────────────────┐    │
│    │                        │    │
│    │    Conteúdo central    │    │
│    │    (max-width Xpx)     │    │
│    │                        │    │
│    └────────────────────────┘    │
│                                  │
│       [BottomActionBar?]         │
└──────────────────────────────────┘
```

**Props do template:**
- `maxWidth`: 480px (padrão) ou customizado
- `hasBottomBar`: boolean
- `verticalCenter`: boolean (centraliza verticalmente, útil para tela inicial)

**Usado em:** Tela Inicial, Entrar na Sala, Resultados.

### 4.2 Template: TwoColumn

Layout com duas colunas no desktop, stack no mobile. Usado para telas com sidebar de informação.

**Desktop (≥ 1024px):**

```
┌──────────────────────────────────────────┐
│              [AppHeader]                 │
│                                          │
│  ┌──────────────────┐ ┌──────────────┐  │
│  │                  │ │              │  │
│  │  Coluna          │ │  Sidebar     │  │
│  │  principal       │ │  (320px)     │  │
│  │  (flex 1)        │ │              │  │
│  │                  │ │              │  │
│  └──────────────────┘ └──────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

**Mobile (< 1024px):**

```
┌────────────────────────┐
│      [AppHeader]       │
│                        │
│  ┌──────────────────┐  │
│  │ Coluna principal │  │
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │ Sidebar (abaixo) │  │
│  └──────────────────┘  │
│                        │
│   [BottomActionBar]    │
└────────────────────────┘
```

**Usado em:** Lobby (PlayerList + MatchConfigPanel).

### 4.3 Template: GameFocus

Layout otimizado para a tela de jogo: conteúdo centralizado compacto com scoreboard lateral (desktop) ou inferior (mobile).

**Desktop:**

```
┌──────────────────────────────────────────┐
│ Rodada 3/10                   1.850 pts  │  ← AppHeader (compact)
│                                          │
│      ┌──────────────────┐  ┌─────────┐  │
│      │                  │  │Scoreboard│  │
│      │  GamePlayArea    │  │(220px)   │  │
│      │  (max 480px)     │  │          │  │
│      │                  │  │          │  │
│      └──────────────────┘  └─────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

**Mobile:**

```
┌────────────────────────┐
│ Rodada 3/10   1.850pts │
│                        │
│  ┌──────────────────┐  │
│  │  GamePlayArea    │  │
│  │  (fullwidth)     │  │
│  └──────────────────┘  │
│                        │
│ [Scoreboard collapsed] │  ← Barra inferior
└────────────────────────┘
```

**Usado em:** Tela de jogo (rodada ativa), Revelação.

### 4.4 Template: ResultsStack

Layout vertical com pódio no topo e conteúdo empilhado abaixo.

```
┌──────────────────────────────────┐
│           [AppHeader]            │
│                                  │
│    ┌────────────────────────┐    │
│    │    ResultsPodium       │    │
│    │    (top 3)             │    │
│    └────────────────────────┘    │
│                                  │
│    ┌────────────────────────┐    │
│    │  Ranking completo      │    │
│    │  (demais jogadores)    │    │
│    └────────────────────────┘    │
│                                  │
│    ┌────────────────────────┐    │
│    │  HighlightCarousel     │    │
│    └────────────────────────┘    │
│                                  │
│    [ProgressBar auto-return]     │
└──────────────────────────────────┘
```

**Max-width:** 560px
**Usado em:** Tela de Resultados.

---

## 5. Páginas

Instâncias concretas dos Templates, preenchidas com Organismos conectados a dados reais. Cada Página é uma tela do jogo com comportamento e dados específicos.

### 5.1 Página: Tela Inicial (`/`)

**Template:** CenteredSingle (maxWidth 480px, verticalCenter: true)

**Organismos utilizados:**
- AppHeader (variante: apenas logo)
- Conteúdo central custom

**Composição do conteúdo central:**

| Ordem | Elemento | Especificação |
|-------|----------|--------------|
| 1 | Logo | Texto Display "Mermã, a Música!" com gradiente roxo→dourado |
| 2 | Subtítulo | Body secondary: "Quiz musical com as playlists dos seus amigos" |
| 3 | Espaço | 40px |
| 4 | Botão "Criar Sala" | Primary, xl, fullWidth |
| 5 | Espaço | 12px |
| 6 | Botão "Entrar na Sala" | Secondary, xl, fullWidth |
| 7 | Espaço | 32px |
| 8 | Divider text | "ou entre para salvar seu progresso" |
| 9 | Espaço | 12px |
| 10 | Botão "Entrar na conta" | Ghost, md — navega para `/login` |
| 11 | TextLink | "Não tem conta? Criar conta" — navega para `/register` |

**Comportamento por estado de autenticação:**

| Estado | O que muda |
|--------|-----------|
| Não logado | Mostra botões "Entrar na conta" + "Criar conta" |
| Logado | Substitui por "Olá, Gabriel!" + Avatar + botão "Meu Perfil" |

**Ações:**
- "Criar Sala" → se logado: POST /rooms direto. Se não logado: pede nickname (modal) → POST /rooms
- "Entrar na Sala" → navega para `/room/join`

### 5.2 Página: Login (`/login`)

**Template:** CenteredSingle (maxWidth 420px, verticalCenter: true)

**Organismos:**
1. **AppHeader** (variante: logo compacto + botão voltar)
2. **AuthForm** (variant: `"login"`)

**Composição visual:**

```
┌─────────────────────────────────┐
│  ← Voltar                       │
│                                 │
│     Mermã, a Música! (logo)     │  ← Logo compacto (Fredoka 20px)
│                                 │
│     Entrar na sua conta         │  ← Fredoka 22px/600
│                                 │
│  ┌─────────────────────────┐    │
│  │ Email                   │    │
│  │ [seu@email.com        ] │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ Senha    Esqueci senha → │   │
│  │ [••••••••••         👁] │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │         Entrar          │    │
│  └─────────────────────────┘    │
│                                 │
│  ─────── ou ────────────        │
│                                 │
│  [Spotify] [Deezer] [YouTube]   │
│                                 │
│  Não tem conta? Criar conta →   │
│                                 │
└─────────────────────────────────┘
```

**Fluxo:**
- Submit com email+senha → POST `/api/v1/auth/login`
- Sucesso → salva token no localStorage → redireciona para `/` (ou para sala se veio de um invite link)
- Erro → mensagem inline: "Email ou senha incorretos"
- "Esqueci senha" → navega para `/forgot-password`
- "Criar conta" → navega para `/register`
- PlatformButton → OAuth flow (cria conta automaticamente se não existe)

### 5.3 Página: Criar Conta (`/register`)

**Template:** CenteredSingle (maxWidth 420px, verticalCenter: true)

**Organismos:**
1. **AppHeader** (variante: logo compacto + botão voltar)
2. **AuthForm** (variant: `"register"`)

**Composição visual:**

```
┌─────────────────────────────────┐
│  ← Voltar                       │
│                                 │
│     Mermã, a Música! (logo)     │
│                                 │
│     Criar sua conta             │  ← Fredoka 22px/600
│                                 │
│  ┌─────────────────────────┐    │
│  │ Nickname                │    │
│  │ [Como quer ser chamado?]│    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ Email                   │    │
│  │ [seu@email.com        ] │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ Senha                   │    │
│  │ [••••••••••         👁] │    │
│  │ ▓▓▓▓▓▓▓▓▓░  Boa        │    │  ← Indicador de força
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ Confirmar senha         │    │
│  │ [••••••••••         👁] │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │       Criar conta       │    │
│  └─────────────────────────┘    │
│                                 │
│  ─────── ou ────────────        │
│                                 │
│  [Spotify] [Deezer] [YouTube]   │
│                                 │
│  Já tem conta? Entrar →         │
│                                 │
└─────────────────────────────────┘
```

**Fluxo:**
- Submit → POST `/api/v1/auth/register`
- Sucesso → auto-login → redireciona para `/` com toast "Conta criada!"
- Erro "email já existe" → mensagem inline + TextLink "Entrar com este email?"
- PlatformButton → OAuth flow (cria conta linkada à plataforma)

**Validações em tempo real (antes de submit):**

| Campo | Trigger de validação | Regra |
|-------|---------------------|-------|
| Nickname | `onBlur` | 2–20 chars, sem espaços duplos |
| Email | `onBlur` | Formato válido, não vazio |
| Senha | `onChange` (para strength bar) | Mínimo 8 chars |
| Confirmar | `onChange` | Igual à senha |

### 5.4 Página: Esqueci Minha Senha (`/forgot-password`)

**Template:** CenteredSingle (maxWidth 420px, verticalCenter: true)

**Organismos:**
1. **AppHeader** (variante: logo compacto + botão voltar)
2. **AuthForm** (variant: `"forgot_password"`)

**Composição visual (estado inicial):**

```
┌─────────────────────────────────┐
│  ← Voltar                       │
│                                 │
│     Mermã, a Música! (logo)     │
│                                 │
│     Esqueci minha senha         │  ← Fredoka 22px/600
│                                 │
│     Digite seu email e vamos    │  ← DM Sans 14px, secondary
│     te enviar um link para      │
│     redefinir sua senha.        │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Email                   │    │
│  │ [seu@email.com        ] │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │     Enviar link         │    │
│  └─────────────────────────┘    │
│                                 │
│  Lembrei! Voltar ao login →     │
│                                 │
└─────────────────────────────────┘
```

**Composição visual (estado de sucesso — após enviar):**

```
┌─────────────────────────────────┐
│  ← Voltar                       │
│                                 │
│          ✉ (ícone mail)         │  ← Lucide `mail`, 48px, accent
│                                 │
│     Email enviado!              │  ← Fredoka 22px/600
│                                 │
│     Confira sua caixa de        │  ← DM Sans 14px, secondary
│     entrada e clique no link    │
│     para redefinir sua senha.   │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Voltar ao login      │    │
│  └─────────────────────────┘    │
│                                 │
│  Não recebeu? Reenviar →        │  ← TextLink muted
│                                 │
└─────────────────────────────────┘
```

**Fluxo:**
- Submit → POST `/api/v1/auth/forgot-password`
- Sempre mostra sucesso (mesmo se email não existe — segurança)
- "Reenviar" → cooldown de 60s com contador: "Reenviar em 45s" (JetBrains Mono, muted)
- "Voltar ao login" → navega para `/login`

### 5.5 Página: Entrar na Sala (`/room/join`)

**Template:** CenteredSingle (maxWidth 400px, verticalCenter: true)

**Composição:**

| Ordem | Elemento |
|-------|----------|
| 1 | Heading2: "Entrar na Sala" |
| 2 | FormField: TextInput com placeholder "Código da sala (ex: ABC123)" |
| 3 | FormField: TextInput com placeholder "Seu nickname" |
| 4 | Botão "Entrar" (Primary, lg, fullWidth, disabled até ambos campos preenchidos) |
| 5 | Botão "Voltar" (Ghost, md) |

### 5.6 Página: Lobby (`/room/:code`)

**Template:** TwoColumn

**Coluna principal — Organismos:**
1. **PlayerList** — lista de jogadores na sala

**Sidebar — Organismos:**
1. **InviteCode** — código + botão copiar + botão compartilhar (Web Share API no mobile)
2. **MatchConfigPanel** — configuração da partida (só editável pelo host)

**BottomActionBar (mobile):**
- Botão "Pronto!" (Gold, lg, fullWidth) / "Cancelar" (Ghost)

**AppHeader:**
- Logo à esquerda
- InviteCode compacto (mobile esconde aqui, mostra no body)
- Botão compartilhar

**Transições:**
- Novo jogador entra: PlayerCard aparece com `slide-up`
- Jogador sai: PlayerCard desaparece com `fade-out`
- Todos prontos: botão "Iniciar" ganha glow e animação `pulse` suave
- Host inicia: CountdownOverlay 3-2-1 → transição para tela de jogo

### 5.7 Página: Partida — Rodada Ativa (`/room/:code`, state: playing)

**Template:** GameFocus

**Organismos:**
1. **AppHeader** (compact: "Rodada X/N" + score)
2. **GamePlayArea** (timer + audio wave + input + player status + skip vote)
3. **Scoreboard** (sidebar desktop / bottom bar mobile)
4. **AutocompleteOverlay** (aparece sobre o input quando jogador digita)

**Fluxo de uma rodada:**

| Fase | Duração | O que acontece na tela |
|------|---------|----------------------|
| Grace Period | 3s | CountdownOverlay 3→2→1 (áudio buffering) |
| Timer Running | 10-60s (config) | Timer contando, AudioWave animando, input focado |
| Respondendo | durante timer | Jogador digita, autocomplete aparece, avatares atualizam |
| All Answered | instantâneo | SkipVote aparece com slide-up |
| Round End | instantâneo | Input desaparece, transição para RoundReveal |

### 5.8 Página: Partida — Revelação (`/room/:code`, state: revealing)

**Template:** GameFocus (sem scoreboard ativo — foco na revelação)

**Organismos:**
1. **AppHeader** (compact: "Rodada X/N")
2. **RoundReveal** (card central com resposta correta + respostas dos jogadores)
3. **Scoreboard** (atualizado com novos pontos)

**Duração:** 3 segundos, auto-advance para próxima rodada.

**Animações sequenciais:**
1. Input de resposta fade-out (200ms)
2. RoundReveal slide-up (400ms)
3. Respostas dos jogadores staggered (100ms cada)
4. Pontos animam fly-score (600ms)
5. Scoreboard atualiza posições (300ms)
6. ProgressBar de 3s no bottom
7. Fade-out tudo → próxima rodada

### 5.9 Página: Resultados (`/room/:code`, state: results)

**Template:** ResultsStack (maxWidth 560px)

**Organismos:**
1. **AppHeader** (variante: "Resultados" centralizado)
2. **ResultsPodium** (top 3 com celebração)
3. **Ranking completo** (ScoreDisplay list dos demais jogadores)
4. **HighlightCarousel** (destaques scrolláveis)
5. **BottomActionBar** (ProgressBar de 5s auto-return ao lobby)

**Animações de entrada:**
1. Podium aparece com slide-up + scale (600ms)
2. 1º lugar ganha confete (2s)
3. Ranking completo fade-in staggered
4. Highlights slide-in from right

**Auto-return:** Após 5s, transição automática de volta ao Lobby.

### 5.10 Página: Perfil (`/profile`)

**Template:** CenteredSingle (maxWidth 600px)

**Organismos:**
1. **AppHeader** (variante: "Meu Perfil", botão voltar)
2. **ProfileHeader** — avatar, nickname, plataformas conectadas, estatísticas
3. **ImportedPlaylistList** — playlists já importadas e validadas
4. **BottomActionBar** — "Importar Playlist" (primary) ou "Voltar ao Lobby" (ghost)

**Fluxo de navegação interna:**

```
/profile
├── ProfileHeader (sempre visível)
├── ImportedPlaylistList (lista de playlists importadas)
│   ├── [clique "Importar Playlist"] → /profile/import
│   ├── [clique "Ver detalhes"] → /profile/playlists/:id
│   └── [clique "Selecionar"] → marca playlist para a partida
│
/profile/import
├── PlaylistBrowser (navegar playlists da plataforma)
│   ├── [clique "Importar"] → valida e redireciona para detalhes
│   └── [clique "Voltar"] → /profile
│
/profile/playlists/:id
├── PlaylistValidation (detalhes de uma playlist específica)
│   ├── [clique "Re-importar"] → revalida
│   └── [clique "Voltar"] → /profile
```

**Composição visual de `/profile`:**

```
┌─────────────────────────────────────┐
│  ← Voltar          Meu Perfil       │  ← AppHeader
│                                     │
│  ┌─────────────────────────────┐    │
│  │          ┌────┐             │    │
│  │          │ G  │             │    │  ← ProfileHeader
│  │          └────┘             │    │
│  │        Gabriel              │    │
│  │                             │    │
│  │  [🟢 Spotify: gabs]        │    │
│  │  [🔴 YouTube: conectar]    │    │
│  │                             │    │
│  │  ┌───┐  ┌───┐  ┌───────┐  │    │
│  │  │ 3 │  │127│  │  94%  │  │    │
│  │  │plt│  │fxs│  │dispon.│  │    │
│  │  └───┘  └───┘  └───────┘  │    │
│  └─────────────────────────────┘    │
│                                     │
│  Minhas Playlists (3)               │  ← Heading
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [🖼] Meus Rocks             │    │  ← PlaylistCard (importada)
│  │     41/45 disponíveis  ◉   │    │     ◉ = selecionada
│  │     ▓▓▓▓▓▓▓▓▓▓▓▓▓░░       │    │     ProgressBar mini
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ [🖼] Pagode Raiz            │    │  ← PlaylistCard (importada)
│  │     38/40 disponíveis  ○   │    │     ○ = não selecionada
│  │     ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░       │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ [🖼] Indie Brasileiro       │    │
│  │     22/30 disponíveis  ○   │    │
│  │     ▓▓▓▓▓▓▓▓▓░░░░░░       │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     Importar Playlist       │    │  ← BottomActionBar
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 5.11 Página: Importar Playlist (`/profile/import`)

**Template:** CenteredSingle (maxWidth 600px)

**Organismos:**
1. **AppHeader** (variante: "Importar Playlist", botão voltar)
2. **PlaylistBrowser** — tabs de plataforma + grid de playlists disponíveis

**Composição visual:**

```
┌─────────────────────────────────────┐
│  ← Voltar     Importar Playlist     │  ← AppHeader
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [Spotify] [Deezer] [YouTube]│    │  ← PlatformTabs
│  │  ━━━━━━                     │    │     underline na ativa
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [🖼] Meus Rocks      [Imp.]│    │  ← PlaylistCard (para importar)
│  │     45 faixas    Spotify    │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ [🖼] Top Brasil 2026 [Imp.]│    │
│  │     50 faixas    Spotify    │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ [🖼] Discover Weekly [Imp.]│    │
│  │     30 faixas    Spotify    │    │
│  └─────────────────────────────┘    │
│           ...mais playlists...      │
│                                     │
└─────────────────────────────────────┘
```

**Fluxo de importação (ao clicar "Importar"):**
1. Botão muda para Spinner + "Importando..."
2. POST `/api/v1/playlists/{platform}/{playlist_id}/import`
3. ProgressBar aparece no card conforme faixas são validadas
4. Ao concluir: redireciona para `/profile/playlists/:id` (PlaylistValidation)

### 5.12 Página: Detalhes da Playlist (`/profile/playlists/:id`)

**Template:** CenteredSingle (maxWidth 600px)

**Organismos:**
1. **AppHeader** (variante: nome da playlist, botão voltar)
2. **PlaylistValidation** — header com stats + lista de TrackRow

**Composição visual:**

```
┌─────────────────────────────────────┐
│  ← Voltar        Meus Rocks        │  ← AppHeader
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────────┐    │
│  │  41  │ │   2  │ │    2     │    │  ← ValidationStats
│  │dispon│ │fallbk│ │indisp.   │    │
│  │  ✅  │ │  ⚠️  │ │   ❌     │    │
│  └──────┘ └──────┘ └──────────┘    │
│                                     │
│  ── Disponíveis (41) ───────────    │  ← Divider text
│                                     │
│  [🖼] Bohemian Rhapsody        [▶]  │  ← TrackRow
│       Queen                   ✅    │
│  [🖼] Stairway to Heaven      [▶]  │
│       Led Zeppelin            ✅    │
│  [🖼] Hotel California         [▶]  │
│       Eagles                  ✅    │
│       ...                           │
│                                     │
│  ── Fallback (2) ──────────────     │  ← Divider text
│                                     │
│  [🖼] Música Regional          ⚠️   │
│       Artista Local   [Sp.Premium] │
│                                     │
│  ── Indisponíveis (2) ────────     │  ← Divider text
│                                     │
│  [ ♪] Faixa Removida           ❌   │
│       Artista  "Substituir na      │
│                 plataforma"        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     Re-importar Playlist    │    │  ← BottomActionBar
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## 6. Animações & Motion

### 6.1 Princípios

| Tipo | Duração | Easing |
|------|---------|--------|
| Micro-interação | 100–150ms | ease-out |
| Feedback | 200–300ms | ease-out |
| Transição de tela | 300–500ms | ease-in-out |
| Celebração | 600–1000ms | spring/bounce |

### 6.2 Catálogo de Animações

| Nome | Keyframes | Uso |
|------|-----------|-----|
| `fade-in` | opacity 0→1, translateY 8→0, 300ms | Entrada de elementos |
| `fade-out` | opacity 1→0, 200ms | Saída de elementos |
| `slide-up` | opacity 0→1, translateY 20→0, 400ms | Cards aparecendo |
| `pop` | scale 0.95→1.05→1, 300ms | Acerto de resposta |
| `shake` | translateX 0→-4→4→-4→4→0, 300ms | Erro de resposta |
| `pulse` | scale 1→1.08→1, 500ms, repeat | Timer crítico |
| `fly-score` | translateY 0→-40, opacity 1→0, 600ms | Pontos ganhos |
| `confetti` | Partículas coloridas caindo, 2s | Vencedor |
| `wave` | Height das barras oscilando, loop | Áudio tocando |
| `countdown` | scale 0.5→1.2→1, opacity 0→1→0, 800ms | Grace period 3-2-1 |

### 6.3 Regra de Reduced Motion

Quando `prefers-reduced-motion: reduce`:
- Todas as animações → opacity instantânea (sem translate/scale)
- Confete → desabilitado
- Wave → barras estáticas
- Timer pulse → desabilitado (apenas cor muda)

---

## 7. Acessibilidade

### 7.1 Contraste (WCAG AA mínimo)

| Combinação | Ratio | Status |
|-----------|-------|--------|
| `--text-primary` / `--bg-deep` | 13.5:1 | AAA |
| `--text-primary` / `--bg-surface` | 11.2:1 | AAA |
| `--text-secondary` / `--bg-surface` | 5.1:1 | AA |
| `--text-muted` / `--bg-surface` | 3.2:1 | AA Large |
| `--accent-primary` / `--bg-surface` | 4.8:1 | AA |
| `--accent-gold` / `--bg-deep` | 8.9:1 | AAA |
| `--text-on-accent` / `--accent-primary` | 6.7:1 | AA |

### 7.2 Teclado

| Tecla | Ação |
|-------|------|
| `Tab` | Navegar entre focáveis |
| `Enter` | Ativar botão/link, enviar resposta |
| `Space` | Toggle/checkbox, votar pular |
| `Escape` | Fechar modal/dropdown, limpar input |
| `↑ / ↓` | Navegar autocomplete |

### 7.3 ARIA

| Componente | Atributos |
|-----------|-----------|
| TimerDisplay | `role="timer"`, `aria-live="polite"`, `aria-label="Tempo restante: Xs"` |
| Scoreboard | `role="list"`, items `role="listitem"` |
| TextInput (resposta) | `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-controls="autocomplete-list"` |
| AutocompleteOverlay | `role="listbox"`, `id="autocomplete-list"`, items `role="option"` |
| Avatar (status) | `aria-label="[Nome] respondeu"` / `"[Nome] esperando"` |
| ResultsPodium | `role="list"`, `aria-label="Ranking final"` |
| SkipVote | `aria-label="Votar para pular rodada, X de Y votos"` |
| CountdownOverlay | `aria-live="assertive"`, `role="alert"` |

### 7.4 Safe Areas (Mobile)

Aplicar `env(safe-area-inset-*)` em:
- BottomActionBar (padding-bottom)
- AppHeader (padding-top)
- Modais (margin)

---

## 8. Implementação

### 8.1 CSS Custom Properties (tokens.css)

```css
:root {
  /* Superfícies */
  --bg-deep: #0B0E17;
  --bg-surface: #121829;
  --bg-elevated: #1A2340;
  --bg-overlay: #232E52;

  /* Accent */
  --accent-primary: #8B5CF6;
  --accent-primary-hover: #A78BFA;
  --accent-primary-subtle: rgba(139, 92, 246, 0.12);
  --accent-gold: #F59E0B;
  --accent-gold-hover: #FBBF24;
  --accent-gold-subtle: rgba(245, 158, 11, 0.08);

  /* Semânticas */
  --color-success: #22C55E;
  --color-success-subtle: rgba(34, 197, 94, 0.1);
  --color-error: #EF4444;
  --color-error-subtle: rgba(239, 68, 68, 0.1);
  --color-warning: #EAB308;
  --color-warning-subtle: rgba(234, 179, 8, 0.1);
  --color-info: #3B82F6;

  /* Texto */
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --text-on-accent: #FFFFFF;

  /* Bordas */
  --border-subtle: #1E293B;
  --border-default: #334155;
  --border-strong: #475569;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Espaçamento */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Tipografia */
  --font-display: 'Fredoka', sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-glow-primary: 0 0 24px rgba(139, 92, 246, 0.2);
  --shadow-glow-gold: 0 0 24px rgba(245, 158, 11, 0.2);
  --shadow-focus: 0 0 0 4px rgba(139, 92, 246, 0.12);

  /* Transições */
  --transition-fast: 150ms ease-out;
  --transition-normal: 300ms ease-in-out;
  --transition-slow: 500ms ease-in-out;
}
```

### 8.2 Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,html}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#0B0E17',
          surface: '#121829',
          elevated: '#1A2340',
          overlay: '#232E52',
        },
        accent: {
          primary: '#8B5CF6',
          'primary-hover': '#A78BFA',
          'primary-subtle': 'rgba(139, 92, 246, 0.12)',
          gold: '#F59E0B',
          'gold-hover': '#FBBF24',
          'gold-subtle': 'rgba(245, 158, 11, 0.08)',
        },
        success: { DEFAULT: '#22C55E', subtle: 'rgba(34, 197, 94, 0.1)' },
        error: { DEFAULT: '#EF4444', subtle: 'rgba(239, 68, 68, 0.1)' },
        warning: { DEFAULT: '#EAB308', subtle: 'rgba(234, 179, 8, 0.1)' },
        info: '#3B82F6',
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        border: {
          subtle: '#1E293B',
          DEFAULT: '#334155',
          strong: '#475569',
        },
        player: {
          1: '#8B5CF6', 2: '#F59E0B', 3: '#22C55E', 4: '#EF4444', 5: '#3B82F6',
          6: '#EC4899', 7: '#14B8A6', 8: '#F97316', 9: '#06B6D4', 10: '#A855F7',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.3)',
        md: '0 4px 12px rgba(0,0,0,0.3)',
        lg: '0 8px 32px rgba(0,0,0,0.4)',
        'glow-primary': '0 0 24px rgba(139,92,246,0.2)',
        'glow-gold': '0 0 24px rgba(245,158,11,0.2)',
        focus: '0 0 0 4px rgba(139,92,246,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'fade-out': 'fadeOut 200ms ease-out',
        'slide-up': 'slideUp 400ms ease-out',
        pop: 'pop 300ms ease-out',
        shake: 'shake 300ms ease-out',
        'pulse-timer': 'pulseTimer 500ms ease-in-out infinite',
        'fly-score': 'flyScore 600ms ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        pulseTimer: {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        flyScore: {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(-40px)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

### 8.3 Hierarquia de Pastas (sugestão alinhada ao Atomic Design)

```
src/
├── design-tokens/
│   └── tokens.css                    # CSS Custom Properties (seção 8.1)
│
├── atoms/                            # Camada 1 — Átomos
│   ├── text.ts                       # Tipografia (helper de criação de elementos)
│   ├── icon.ts                       # Wrapper Lucide
│   ├── avatar.ts                     # Avatar circular
│   ├── badge.ts                      # Badge de status
│   ├── button.ts                     # Botão (variantes + tamanhos)
│   ├── text-input.ts                 # Input de texto
│   ├── toggle.ts                     # Switch on/off
│   ├── slider.ts                     # Range slider
│   ├── select.ts                     # Dropdown select
│   ├── divider.ts                    # Divisor com ou sem texto
│   ├── album-cover.ts               # Capa de álbum/single com fallback
│   ├── spinner.ts                    # Loading spinner
│   ├── progress-bar.ts              # Barra de progresso
│   ├── password-input.ts            # Input de senha com toggle + strength
│   └── text-link.ts                 # Link de texto navegável
│
├── molecules/                        # Camada 2 — Moléculas
│   ├── player-identity.ts            # Avatar + Nome + Badge
│   ├── form-field.ts                 # Label + Input + Helper/Error
│   ├── invite-code.ts                # Código + Copiar
│   ├── timer-display.ts              # Timer circular + número
│   ├── audio-wave.ts                 # Barras de equalizer
│   ├── player-response-row.ts        # Resposta de jogador (revelação)
│   ├── score-display.ts              # Linha de placar
│   ├── platform-button.ts            # Botão OAuth de plataforma
│   ├── highlight-stat.ts             # Card de destaque
│   ├── track-row.ts                  # Linha de música (validação)
│   ├── playlist-card.ts              # Card de playlist (import + importada)
│   ├── skip-vote.ts                  # Botão pular + contagem
│   ├── countdown-overlay.ts          # Overlay 3-2-1
│   ├── social-divider.ts             # Divisor "ou" entre auth methods
│   └── auth-form-field.ts            # Campo de formulário de auth
│
├── organisms/                        # Camada 3 — Organismos
│   ├── app-header.ts                 # Header da aplicação
│   ├── player-list.ts                # Lista de jogadores
│   ├── match-config-panel.ts         # Painel de configuração
│   ├── game-play-area.ts             # Área de jogo (timer + input + status)
│   ├── autocomplete-overlay.ts       # Dropdown de sugestões
│   ├── round-reveal.ts               # Revelação pós-rodada
│   ├── scoreboard.ts                 # Placar ao vivo
│   ├── results-podium.ts             # Pódio top 3
│   ├── highlight-carousel.ts         # Carrossel de destaques
│   ├── playlist-validation.ts        # Validação detalhada de playlist
│   ├── playlist-browser.ts           # Navegador de playlists da plataforma
│   ├── profile-header.ts             # Cabeçalho do perfil
│   ├── imported-playlist-list.ts     # Lista de playlists importadas
│   ├── auth-form.ts                  # Formulário de auth (login/register/forgot)
│   └── bottom-action-bar.ts          # Barra de ação fixa (mobile)
│
├── templates/                        # Camada 4 — Templates (layouts)
│   ├── centered-single.ts            # Layout centralizado simples
│   ├── two-column.ts                 # Duas colunas / stack mobile
│   ├── game-focus.ts                 # Layout otimizado para jogo
│   └── results-stack.ts              # Layout de resultados empilhado
│
└── pages/                            # Camada 5 — Páginas
    ├── home.ts                       # Tela Inicial
    ├── login.ts                      # Login (email/senha + OAuth)
    ├── register.ts                   # Criar Conta
    ├── forgot-password.ts            # Esqueci Minha Senha
    ├── join-room.ts                  # Entrar na Sala
    ├── lobby.ts                      # Lobby
    ├── game-round.ts                 # Rodada Ativa
    ├── game-reveal.ts                # Revelação
    ├── results.ts                    # Resultados
    ├── profile.ts                    # Perfil (playlists importadas)
    ├── import-playlist.ts            # Importar nova playlist
    └── playlist-details.ts           # Detalhes/validação de uma playlist
```

---

## 9. Mapa de Composição (Referência Rápida)

Diagrama de como cada camada se compõe para formar as telas finais:

```
FUNDAÇÃO
  Cores, Tipografia, Espaçamento, Sombras, Ícones
    │
    ▼
ÁTOMOS (15)
  Text, Icon, Avatar, Badge, Button, TextInput, Toggle,
  Slider, Select, Divider, AlbumCover, Spinner, ProgressBar,
  PasswordInput, TextLink
    │
    ▼
MOLÉCULAS (15)
  PlayerIdentity, FormField, InviteCode, TimerDisplay,
  AudioWave, PlayerResponseRow, ScoreDisplay, PlatformButton,
  HighlightStat, TrackRow, PlaylistCard, SkipVote, CountdownOverlay,
  SocialDivider, AuthFormField
    │
    ▼
ORGANISMOS (15)
  AppHeader, PlayerList, MatchConfigPanel, GamePlayArea,
  AutocompleteOverlay, RoundReveal, Scoreboard, ResultsPodium,
  HighlightCarousel, PlaylistValidation, BottomActionBar,
  PlaylistBrowser, ProfileHeader, ImportedPlaylistList, AuthForm
    │
    ▼
TEMPLATES (4)
  CenteredSingle, TwoColumn, GameFocus, ResultsStack
    │
    ▼
PÁGINAS (12)
  Home, Login, Register, ForgotPassword, JoinRoom, Lobby,
  GameRound, GameReveal, Results, Profile, ImportPlaylist,
  PlaylistDetails
```

**Contagem total: 15 átomos + 15 moléculas + 15 organismos + 4 templates + 12 páginas = 61 componentes**

---

## 10. Estados & Edge Cases

Esta seção documenta todos os estados possíveis de cada componente e como a interface se comporta em situações atípicas. Essencial para evitar telas quebradas ou vazias durante o desenvolvimento.

### 10.1 Estados Globais

| Estado | Descrição | Comportamento visual |
|--------|-----------|---------------------|
| **Loading** | Dados sendo carregados do backend | Skeleton shimmer ou Spinner centralizado |
| **Empty** | Dados carregados mas lista vazia | Ícone grande (48px, muted) + texto explicativo + CTA |
| **Error** | Falha na requisição | Card com borda `--color-error-subtle`, ícone `alert-triangle`, mensagem + botão retry |
| **Offline** | Sem conexão à internet | Banner topo: "Sem conexão. Reconectando..." com Spinner sm |
| **Reconnecting** | WebSocket reconectando | Banner topo: "Reconectando..." com Spinner + ProgressBar indeterminada |

**Skeleton shimmer (Loading):**
- Blocos retangulares com border-radius correspondente ao componente
- Background: `--bg-elevated`
- Animação: gradient horizontal `--bg-elevated → --bg-overlay → --bg-elevated`, 1.5s infinite
- Deve mimetizar o layout do componente final (mesmas alturas/larguras)

### 10.2 Átomos — Estados

**Button:**

| Estado | Visual | Notas |
|--------|--------|-------|
| Default | Como spec base | — |
| Hover | Lighten 10%, scale(1.02) | Não aplica em touch (mobile) |
| Active/Pressed | Darken 5%, scale(0.98) | 50ms transition |
| Disabled | opacity 0.4, cursor not-allowed | Não responde a eventos |
| Loading | Conteúdo invisível, Spinner md centralizado | Width mantém a mesma (evita layout shift) |
| Focus (teclado) | `--shadow-focus` ring | Não aparece em click, só tab |

**TextInput:**

| Estado | Border | Shadow | Ícone |
|--------|--------|--------|-------|
| Default | `1px --border-default` | nenhum | — |
| Hover | `1px --border-strong` | nenhum | — |
| Focus | `2px --accent-primary` | `--shadow-focus` | — |
| Filled | `1px --border-default` | nenhum | — |
| Error | `2px --color-error` | error-subtle ring | Ícone `alert-circle` vermelho |
| Disabled | `1px --border-subtle`, opacity 0.5 | nenhum | — |
| Respondido (lg only) | `2px --color-success` | success-subtle ring | Ícone `check` verde |

**TextInput (lg) — Input de resposta, estados específicos do jogo:**

| Estado do jogo | Visual do input |
|----------------|----------------|
| Grace period (3-2-1) | Disabled, placeholder "Prepare-se...", opacity 0.6 |
| Timer rodando, sem resposta | Focus state, placeholder "Digite sua resposta..." |
| Timer rodando, com resposta | Respondido (borda verde, check), texto visível |
| Timer rodando, alterando resposta | Focus state novamente, texto editável |
| Rodada encerrada | Disabled, texto final visível, sem interação |
| Revelação | Desaparece com `fade-out` |

**Avatar:**

| Estado | Visual |
|--------|--------|
| Normal | Cor do slot, inicial do nome |
| Respondeu (durante rodada) | Ícone `check` substitui a inicial, opacity 1 |
| Não respondeu | Inicial visível, opacity 0.4 |
| Desconectado | Borda dashed, opacity 0.3, tooltip "Desconectado" |
| Host | Badge `crown` (ícone Lucide) acima do avatar (absolute positioned) |

**Badge:**

| Estado | Visual |
|--------|--------|
| Static | Como spec base |
| Com animação de entrada | `pop` 200ms (quando muda de "Esperando" para "Pronto") |
| Pulse | Badge de "Host" pulsa suavemente em loop lento (3s, scale 1→1.05) |

**Toggle:**

| Estado | Track | Thumb |
|--------|-------|-------|
| Off | `--bg-overlay` | Esquerda, branco |
| On | `--accent-primary` | Direita, branco |
| Disabled | opacity 0.4 | cursor not-allowed |
| Transitioning | — | Thumb slide 200ms ease |

**AlbumCover:**

| Estado | Visual |
|--------|--------|
| Loading | Skeleton shimmer (rect com radius correspondente) |
| Loaded | Imagem com `fade-in` 200ms |
| Error (imagem quebrada) | Fallback: container `--bg-elevated` + ícone `music` centralizado |
| Null src | Fallback direto (sem tentar carregar) |

### 10.3 Moléculas — Estados

**TimerDisplay:**

| Estado | Número | Cor | Barra | Animação |
|--------|--------|-----|-------|----------|
| Idle (pré-rodada) | Tempo total (ex: "30") | `--text-muted` | Cheia, muted | Nenhuma |
| Running (> 10s) | Contando | `--accent-primary` | Diminuindo | Nenhuma |
| Urgent (5-10s) | Contando | `--accent-gold` | Diminuindo, mais rápida | Nenhuma |
| Critical (< 5s) | Contando | `--color-error` | Quase vazia | `pulse` |
| Ended (0s) | "0" | `--color-error` | Vazia | Flash 1x |

**PlayerResponseRow:**

| Estado | Background | Texto da resposta |
|--------|-----------|-------------------|
| Correto + pontos | `success-subtle` | Resposta em `--text-primary` |
| Correto + fuzzy match | `success-subtle` + ícone `~` | Resposta original + "≈ [nome correto]" |
| Errado | `error-subtle` | Resposta em `--text-muted` |
| Não respondeu | `error-subtle` | Itálico: "Não respondeu" em `--text-muted` |
| Quase acertou (Na Trave) | `warning-subtle` | Resposta + badge `warning` "Quase" |

**InviteCode:**

| Estado | Visual |
|--------|--------|
| Default | Código visível + botão "Copiar" |
| Copiado | Ícone muda para `check` (verde), texto "Copiado!", 2s depois volta |
| Compartilhando (mobile) | Abre Web Share API nativa |
| Erro ao copiar | Toast "Não foi possível copiar. Tente manualmente." |

**PlaylistCard:**

| Estado | Visual |
|--------|--------|
| Para importar (default) | Botão "Importar" (secondary, sm) |
| Importando | Botão vira Spinner + "Importando...", card desabilitado |
| Já importada | Badge "Importada" (success), botão desabilitado |
| Importada + selecionada | Border `2px --accent-primary`, glow, radio preenchido |
| Importada + não selecionada | Border padrão, radio vazio |
| Importação falhou | Badge "Erro" (error), botão "Tentar novamente" |

**TrackRow:**

| Estado | Visual |
|--------|--------|
| Disponível | AlbumCover + nome + badge success + botão preview |
| Fallback (Spotify Premium) | AlbumCover + nome + badge warning "Spotify Premium" |
| Indisponível | AlbumCover(fallback) + nome riscado + badge error + texto "Substituir na plataforma" |
| Preview tocando | Botão play vira pause, progress circular no botão (5s), AudioWave mini |
| Validando | Skeleton shimmer no lugar do badge + spinner sm |

### 10.4 Organismos — Estados

**PlayerList (Lobby):**

| Estado | Visual |
|--------|--------|
| Vazia (só o host) | 1 PlayerCard (host) + texto "Compartilhe o código para convidar amigos!" |
| Preenchendo | Cards aparecem com `slide-up` staggered |
| Todos prontos | Todos badges "Pronto" (success), borda do painel pisca suavemente |
| Jogador saiu | Card desaparece com `fade-out` 200ms |
| Jogador desconectou | Avatar fica dashed + opacity 0.3, badge "Offline" (muted) |
| Jogador reconectou | Avatar volta ao normal com `pop`, badge volta ao anterior |
| Sala cheia (20/20) | Heading mostra "20/20" em `--color-warning`, sem mais entradas |

**MatchConfigPanel:**

| Estado | Visual |
|--------|--------|
| Host editando | Todos os inputs ativos, valores mudam em tempo real |
| Não-host visualizando | Inputs disabled, label "Apenas o host configura" (muted, italic) |
| Valores inválidos | Input com borda error + mensagem abaixo |
| Botão "Iniciar" | Disabled com tooltip "X jogadores não estão prontos" |
| Botão "Iniciar" ativo | Enabled com glow sutil, `pulse` lento |
| Sem músicas suficientes | Banner warning: "Jogadores sem playlist. Mínimo X músicas." |
| Config salva (WS sync) | Valores atualizam em tempo real para todos na sala |

**GamePlayArea:**

| Estado | Visual |
|--------|--------|
| Grace period | CountdownOverlay 3-2-1, input disabled |
| Rodada ativa | Timer contando, AudioWave animando, input focado |
| Jogador respondeu | Input com borda success, check icon, SkipVote aparece |
| Jogador alterando resposta | Input volta a focus state, borda accent |
| Todos responderam | Todos avatares com check, SkipVote mostra "Todos responderam!" |
| Áudio falhou | AudioWave para, ícone `volume-x` (muted), texto "Áudio indisponível" |
| Áudio buffering | AudioWave parada, Spinner sm no lugar, texto "Carregando..." |
| Timer acabou | Input disabled, transição automática para revelação |

**RoundReveal:**

| Estado | Visual |
|--------|--------|
| Entrando | Card slide-up, AlbumCover pop, respostas staggered |
| AlbumCover indisponível | Fallback com ícone music (container bg-elevated) |
| Empate na rodada | Múltiplos jogadores com mesma pontuação, badge "Empate" |
| Ninguém acertou | Texto destacado: "Ninguém acertou essa!" em `--color-warning` |
| Todos acertaram | Texto destacado: "Todo mundo sabia!" em `--color-success` |
| Transicionando | ProgressBar de 3s no bottom, tudo faz fade-out ao final |

**Scoreboard:**

| Estado | Visual |
|--------|--------|
| Desktop (sidebar) | Card fixo à direita, sempre visível |
| Mobile (colapsado) | Barra 44px no bottom: "[1º G 2.850] ▲" |
| Mobile (expandido) | Expande para cima com lista completa |
| Posição mudou | Item anima para nova posição (translate-y 300ms) |
| Novo líder | Flash dourado no 1º lugar |

**ResultsPodium:**

| Estado | Visual |
|--------|--------|
| Normal (3+ jogadores) | Pódio completo: 2º - 1º - 3º |
| 2 jogadores | Apenas 1º e 2º (sem 3º) |
| 1 jogador (solo) | Apenas 1º centralizado, sem pódio comparativo |
| Empate no 1º lugar | Dois avatares xl lado a lado, ambos com glow dourado |
| Confete | Partículas coloridas caindo do topo, 2s, só para 1º lugar |

**PlaylistBrowser:**

| Estado | Visual |
|--------|--------|
| Carregando playlists | Grid de 4 PlaylistCard skeletons |
| Plataforma sem playlists | Empty state: ícone music + "Nenhuma playlist encontrada" |
| Nenhuma plataforma conectada | Empty state: ícone link + texto + PlatformButtons |
| Importação em andamento | PlaylistCard com spinner + progresso |
| Erro ao listar | Card de erro + botão retry |
| Trocando de plataforma | Skeleton loading na transição |

**PlaylistValidation:**

| Estado | Visual |
|--------|--------|
| Validando | ProgressBar animated no topo, TrackRows aparecem incrementalmente |
| Concluída | Stats completas + lista completa |
| Tudo disponível | Stats: badge success "100% disponível!", sem seção de indisponíveis |
| Muitas indisponíveis (>50%) | Banner warning: "Muitas músicas indisponíveis. Considere outra playlist." |
| Playlist vazia | Empty state: "Playlist vazia ou sem faixas válidas" |
| Erro de API | Card erro: "Não foi possível validar" + botão "Tentar novamente" |
| Re-importando | ProgressBar reseta, TrackRows fazem `fade-out` e reaparecem |

**ProfileHeader:**

| Estado | Visual |
|--------|--------|
| Nenhuma plataforma conectada | PlatformBadges: todas como "Conectar" (clicáveis) |
| 1+ plataformas conectadas | Badges com cor da plataforma + username |
| Sem playlists importadas | Stats: "0 playlists · 0 faixas · —" |
| OAuth expirado | Badge da plataforma com ícone `alert-circle`, texto "Reconectar" |

### 10.5 Templates — Edge Cases

**CenteredSingle:**

| Edge case | Comportamento |
|-----------|--------------|
| Conteúdo menor que a viewport | `verticalCenter: true` centraliza verticalmente |
| Conteúdo maior que a viewport | Scroll natural, sem centrar verticalmente |
| Teclado virtual aberto (mobile) | Viewport reduz, conteúdo scrolla para manter input visível |
| BottomActionBar + teclado | BottomActionBar esconde quando teclado está aberto |

**TwoColumn:**

| Edge case | Comportamento |
|-----------|--------------|
| Sidebar mais alta que main | Sidebar scrolla independente (desktop) |
| Mobile com sidebar longa | Stack vertical, tudo scrolla junto |
| Resize de desktop para mobile | Transição suave para stack (300ms) |

**GameFocus:**

| Edge case | Comportamento |
|-----------|--------------|
| Scoreboard colapsado + teclado aberto | Scoreboard esconde completamente |
| Orientação landscape (mobile) | Timer e input ficam lado a lado |
| Tela muito pequena (<320px) | Timer reduz para 56px, font 20px |

### 10.6 Páginas — Edge Cases Globais

**Reconexão WebSocket:**

| Cenário | Comportamento |
|---------|--------------|
| Desconexão < 5s | Reconecta silenciosamente, sem feedback visual |
| Desconexão 5-30s | Banner "Reconectando..." no topo |
| Desconexão > 30s | Banner "Conexão perdida. Tentando reconectar..." + botão "Reconectar manualmente" |
| Reconexão durante partida | Backend envia `room_state` completo, frontend sincroniza |
| Reconexão pós-partida | Se resultados ainda visíveis, mostra. Senão, vai pro lobby. |

**Navegação inesperada:**

| Cenário | Comportamento |
|---------|--------------|
| Refresh durante partida | Reconecta WS → backend envia estado atual da rodada |
| Voltar no browser durante jogo | Confirm dialog: "Sair vai te tirar da partida. Tem certeza?" |
| URL direta para sala inexistente | Tela de erro: "Sala não encontrada" + botão "Voltar ao início" |
| URL direta para sala em partida | Tela: "Partida em andamento. Aguarde o fim para entrar." |
| 2 abas com mesma sala | Segunda aba recebe erro: "Você já está conectado em outra aba" |

**Limites e edge cases numéricos:**

| Cenário | Comportamento |
|---------|--------------|
| Nickname muito longo (>20 chars) | Trunca com ellipsis no Avatar e PlayerCard |
| Pontuação > 9999 | JetBrains Mono reduz para font-size menor ou usa "10K+" |
| Playlist com 200+ faixas | Validação mostra ProgressBar + lista virtualizada (render sob demanda) |
| 20 jogadores no lobby | Lista scrolla, performance ok (não virtualiza, são poucos) |
| Código de sala inválido | Input shake + erro: "Código inválido. Use 6 caracteres (ex: ABC123)" |
| OAuth callback falhou | Toast error: "Não foi possível conectar. Tente novamente." |
| Timer desync (lag) | Frontend usa timer local mas aceita correção do backend (server é verdade) |

---

## 11. Resumo das Decisões de Design

| Decisão | Escolha |
|---------|---------|
| Metodologia | Atomic Design (5 camadas) |
| Tema | Dark mode exclusivo (sem toggle no MVP) |
| Cor primária | Roxo `#8B5CF6` |
| Cor de destaque | Dourado `#F59E0B` |
| Fonte display | Fredoka (arredondada, lúdica) |
| Fonte body | DM Sans (geométrica, legível) |
| Fonte mono | JetBrains Mono (timer, código) |
| Ícones | Lucide (open-source, 2px stroke) |
| Radius padrão | 10px botões, 14px cards |
| Animações | < 300ms feedback, < 600ms transições |
| Acessibilidade | WCAG AA, teclado, ARIA, reduced motion |
| Responsividade | Mobile-first, 3 breakpoints |
| Espaçamento | Múltiplos de 4px |
| Total de componentes | 61 (15+15+15+4+12) |

---

*Fim do Atomic Design System — Mermã, a Música!*
