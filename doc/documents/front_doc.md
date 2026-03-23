# MERMÃ, A MÚSICA! — Especificação de Arquitetura Frontend

**Documento complementar ao DDD, Infraestrutura, GDD, Sistema de Áudio e Contrato de API**
**Versão 2.0 — MVP | Março 2026**

---

## ⚠️ AVISO: Stack Atualizada (v2.0)

Este documento foi originalmente escrito para SolidJS + SolidStart. A stack foi alterada para:

| Antes (v1.0) | Agora (v2.0) | Motivo |
|---|---|---|
| SolidJS + SolidStart | **Vanilla TypeScript puro** | Zero frameworks, aprendizado, 100% Bun nativo |
| @preact/signals-core | **Observer pattern vanilla** | Zero libs de reatividade — implementado à mão (~30 linhas) |
| Vinxi/Vite (bundler) | **Bun nativo** (`bun ./index.html`) | Dev server + bundler nativo, zero config externa |
| JSX/TSX | **DOM API nativa** | Sem transpilação JSX, sem Babel |
| File-based routing | **Router manual** (History API, ~50 linhas) | Sem SolidStart |
| Solid UI + Kobalte | **Nenhuma** | Componentes escritos à mão com Tailwind |
| Context API (SolidJS) | **Módulo singleton** | ViewModels criados 1x no main.ts, importados diretamente |

**O que permanece válido deste documento:**
- Princípios de design (DX, performance, mobile-friendly, acessibilidade)
- Design system (cores, tipografia, dark mode)
- Estrutura MVVM (Models, ViewModels, Views) + Repository Pattern
- Comunicação com backend (REST + Phoenix Channels)
- Rotas e fluxo de navegação
- Player de áudio (HTML5 Audio API)
- Variáveis de ambiente e deploy

**O que NÃO se aplica mais:**
- Referências a SolidJS, SolidStart, Vinxi, JSX/TSX
- Referências a Solid UI, Kobalte, createSignal, createMemo, createStore
- Referências a `<Show>`, `<For>`, `<Switch>`, helpers reactive.tsx
- File-based routing e app.config.ts

**Dependências do frontend (v2.0):**
- `phoenix` — client oficial Phoenix Channels (ÚNICA dep externa de runtime)
- `tailwindcss` + `bun-plugin-tailwind` — estilização (dev)
- `oxlint` — linting (dev)
- `typescript` — type checking (dev)

**Arquitetura de camadas:**
```
Models (tipos puros) → Services (fetch/WS/Audio) → Repositories (cache + storage)
                                                          ↓
                                                   ViewModels (observable vanilla + actions)
                                                          ↓
                                                   Views (DOM API + subscribe)
```

---

## 1. Visão Geral

Este documento define a arquitetura, stack tecnológica, estrutura de pastas, design system e decisões técnicas do frontend do projeto "Mermã, a Música!".

### 1.1 Princípios de Design do Frontend

- **DX first**: produtividade e prazer de codar são prioridade número 1.
- **Performance**: bundle pequeno, renderização rápida, leve pro servidor e pro browser.
- **Mobile-friendly**: responsivo, PWA-ready, funcionar bem em 4G.
- **Acessibilidade**: componentes com ARIA, navegação por teclado, contraste adequado.
- **Simplicidade**: menos dependências, menos configuração, menos mágica.

### 1.2 Stack Confirmada

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Framework | **SolidJS + SolidStart** | Reatividade fine-grained, JSX/TSX nativo, ~7KB bundle, performance superior |
| Runtime | **Bun** | Rápido, single binary, sem node_modules pesado, test runner built-in |
| Estilização | **Tailwind CSS** | Utility-first, rápido de prototipar, sem CSS custom pra manter |
| Component Library | **Solid UI** (shadcn/ui port) + **Kobalte** (headless) | Componentes acessíveis, copy-paste, customizáveis com Tailwind |
| Linting/Formatting | **Oxlint** | Super rápido, tudo em um, moderno |
| Testes | **Bun test** | Built-in no Bun, zero config, rápido |
| Modo de Renderização | **SPA** (Single Page Application) | Leve pro servidor (só serve estáticos), sem SSR desnecessário |
| Linguagem | **TypeScript (TSX)** | Type safety, DX com autocomplete, documentação viva |

---

## 2. Mudanças em Relação à Documentação Original

A stack original (SvelteKit + Deno + Tailwind) foi substituída. Razões e impactos:

| Antes | Depois | Motivo da mudança |
|-------|--------|-------------------|
| SvelteKit | SolidJS + SolidStart | Requisito de JSX/TSX; SolidJS tem reatividade superior e bundle menor |
| Deno | Bun | Mais rápido, sem node_modules, test runner built-in, melhor compat npm |
| Tailwind CSS | Tailwind CSS | Mantido — funciona perfeitamente com SolidJS |
| Sem component lib | Solid UI + Kobalte | Acessibilidade e produtividade desde o dia 1 |
| Sem linter definido | Oxlint | Rápido e moderno |
| Sem test runner | Bun test | Zero config, built-in |

**Impacto nos outros documentos:** A spec de infraestrutura e o contrato de API permanecem válidos — a comunicação (REST + WebSocket/Phoenix Channels) é agnostica ao framework frontend. O GDD e Sistema de Áudio também não são afetados.

---

## 3. Abstrações de Reatividade (Helpers)

Para manter o código JSX limpo sem tags proprietárias, o projeto usa helpers que abstraem os componentes primitivos do SolidJS.

### 3.1 Módulo: `src/lib/helpers/reactive.tsx`

```tsx
import { Show, For, Switch, Match } from "solid-js";
import type { JSX } from "solid-js";

/**
 * Renderiza conteúdo condicionalmente.
 * Abstrai <Show> do SolidJS mantendo a otimização reativa.
 */
export function when<T>(
  condition: () => T | undefined | null | false,
  children: (item: NonNullable<T>) => JSX.Element,
  fallback?: () => JSX.Element
): JSX.Element {
  return (
    <Show when={condition()} fallback={fallback?.()}>
      {(item) => children(item())}
    </Show>
  );
}

/**
 * Itera sobre uma lista reativa.
 * Abstrai <For> do SolidJS mantendo tracking por item.
 */
export function each<T>(
  list: () => T[],
  children: (item: T, index: () => number) => JSX.Element
): JSX.Element {
  return <For each={list()}>{(item, index) => children(item, index)}</For>;
}

/**
 * Switch/case reativo.
 * Abstrai <Switch>/<Match> do SolidJS.
 */
export function match<T>(
  value: () => T,
  cases: Array<{ when: T; render: () => JSX.Element }>,
  fallback?: () => JSX.Element
): JSX.Element {
  return (
    <Switch fallback={fallback?.()}>
      {cases.map((c) => (
        <Match when={value() === c.when}>{c.render()}</Match>
      ))}
    </Switch>
  );
}
```

### 3.2 Uso nos Componentes

```tsx
// Sem helpers (SolidJS puro)
<Show when={player().ready} fallback={<span>Esperando</span>}>
  <span>Pronto</span>
</Show>

<For each={players()}>
  {(player) => <PlayerCard player={player} />}
</For>

// Com helpers (abstraído)
{when(
  () => player().ready,
  () => <span>Pronto</span>,
  () => <span>Esperando</span>
)}

{each(
  () => players(),
  (player) => <PlayerCard player={player} />
)}
```

---

## 4. Estrutura de Pastas

```
merma-frontend/
├── bun.lock
├── bunfig.toml
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── app.config.ts                    # Config do SolidStart
├── oxlint.json                      # Config do Oxlint
│
├── public/                          # Assets estáticos
│   ├── favicon.ico
│   ├── manifest.json                # PWA manifest (futuro)
│   └── fonts/
│
├── src/
│   ├── entry-client.tsx             # Entry point do SPA
│   ├── entry-server.tsx             # Entry point SSG (pré-render tela inicial)
│   ├── app.tsx                      # Root component
│   ├── global.css                   # Tailwind base + custom CSS mínimo
│   │
│   ├── routes/                      # File-based routing (SolidStart)
│   │   ├── index.tsx                # / — Tela inicial
│   │   ├── login.tsx                # /login — Login OAuth
│   │   ├── profile/
│   │   │   ├── index.tsx            # /profile — Perfil do jogador
│   │   │   └── playlists.tsx        # /profile/playlists — Gerenciar playlists
│   │   ├── room/
│   │   │   ├── create.tsx           # /room/create — Criar sala
│   │   │   ├── [code].tsx           # /room/:code — Entrar/ver sala (lobby + jogo)
│   │   │   └── join.tsx             # /room/join — Digitar código
│   │   └── [...404].tsx             # Catch-all 404
│   │
│   ├── lib/                         # Lógica compartilhada (não-UI)
│   │   ├── helpers/
│   │   │   └── reactive.tsx         # Abstrações when/each/match
│   │   ├── api/
│   │   │   ├── client.ts            # HTTP client (fetch wrapper)
│   │   │   ├── rooms.ts             # Chamadas REST de salas
│   │   │   ├── auth.ts              # Chamadas REST de auth/OAuth
│   │   │   ├── playlists.ts         # Chamadas REST de playlists
│   │   │   └── audio.ts             # Chamadas REST de áudio
│   │   ├── ws/
│   │   │   ├── channel.ts           # Client Phoenix Channels
│   │   │   ├── events.ts            # Tipos dos eventos (tipados com TS)
│   │   │   └── connection.ts        # Gerenciamento de conexão WS
│   │   ├── stores/
│   │   │   ├── player.ts            # Estado do jogador (uuid, nickname, auth)
│   │   │   ├── room.ts              # Estado da sala (jogadores, config, state)
│   │   │   ├── game.ts              # Estado da partida (rodada, timer, scores)
│   │   │   └── audio.ts             # Estado do áudio (playing, buffered, token)
│   │   ├── audio/
│   │   │   ├── player.ts            # Controlador do player de áudio (HTML5 Audio)
│   │   │   └── spotify-sdk.ts       # Wrapper do Spotify Web Playback SDK (fallback)
│   │   ├── types/
│   │   │   ├── api.ts               # Tipos das respostas REST (gerados do OpenAPI)
│   │   │   ├── ws.ts                # Tipos dos eventos WS (gerados do AsyncAPI)
│   │   │   ├── game.ts              # Tipos do domínio do jogo
│   │   │   └── platform.ts          # Tipos das plataformas (Spotify, Deezer, YT)
│   │   └── utils/
│   │       ├── identity.ts          # UUID do browser, cookie management
│   │       ├── tokens.ts            # Gerenciamento de tokens OAuth no localStorage
│   │       ├── format.ts            # Formatação de tempo, pontos, etc.
│   │       └── debounce.ts          # Debounce pro autocomplete
│   │
│   ├── components/                  # Componentes UI reutilizáveis
│   │   ├── ui/                      # Solid UI (copiados/customizados)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── select.tsx
│   │   │   ├── toast.tsx
│   │   │   └── tooltip.tsx
│   │   ├── layout/
│   │   │   ├── page-layout.tsx      # Layout padrão (header, main, footer)
│   │   │   ├── header.tsx
│   │   │   └── footer.tsx
│   │   ├── player/
│   │   │   ├── player-card.tsx      # Card de jogador no lobby
│   │   │   ├── player-list.tsx      # Lista de jogadores
│   │   │   ├── player-avatar.tsx    # Avatar (inicial do nome, cor aleatória)
│   │   │   └── player-status.tsx    # Badge de status (pronto, respondeu, etc.)
│   │   ├── game/
│   │   │   ├── round-timer.tsx      # Timer visual da rodada
│   │   │   ├── answer-input.tsx     # Campo de resposta com autocomplete
│   │   │   ├── scoreboard.tsx       # Placar durante o jogo
│   │   │   ├── round-reveal.tsx     # Tela de revelação (pós-rodada)
│   │   │   ├── game-results.tsx     # Tela de resultados finais
│   │   │   ├── highlight-card.tsx   # Card de destaque (streak, mais rápido, etc.)
│   │   │   └── skip-vote.tsx        # Botão/contador de votos pra pular
│   │   ├── audio/
│   │   │   ├── audio-player.tsx     # Player de áudio visual (progress bar, ícone)
│   │   │   └── preview-button.tsx   # Botão play 5s (validação de playlist)
│   │   ├── playlist/
│   │   │   ├── playlist-card.tsx    # Card de playlist
│   │   │   ├── playlist-list.tsx    # Lista de playlists disponíveis
│   │   │   ├── track-row.tsx        # Linha de música na validação
│   │   │   └── validation-stats.tsx # Resumo de validação (X válidas, Y indisponíveis)
│   │   ├── lobby/
│   │   │   ├── lobby-view.tsx       # View completa do lobby
│   │   │   ├── config-panel.tsx     # Painel de configuração (só host)
│   │   │   ├── invite-share.tsx     # Código + link + botão copiar
│   │   │   └── ready-button.tsx     # Botão de pronto
│   │   └── auth/
│   │       ├── platform-login.tsx   # Botões de login (Spotify, Deezer, YT)
│   │       └── auth-status.tsx      # Indicador de status de login
│   │
│   └── styles/
│       └── tokens.css               # Design tokens custom (cores do tema, etc.)
│
└── tests/
    ├── unit/
    │   ├── helpers/
    │   │   └── reactive.test.tsx
    │   ├── stores/
    │   │   └── game.test.ts
    │   └── utils/
    │       └── format.test.ts
    └── integration/
        └── api/
            └── rooms.test.ts
```

---

## 5. Design System

### 5.1 Abordagem

O design system é baseado em **Solid UI** (port do shadcn/ui) com customizações via Tailwind CSS. Os componentes são copiados para `src/components/ui/` e customizados livremente — sem dependência de pacote externo.

**Kobalte** é a camada headless por baixo, fornecendo acessibilidade (ARIA), gerenciamento de foco e interações de teclado.

### 5.2 Paleta de Cores (proposta inicial)

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#1A5276` | Botões principais, headers, destaque |
| `--color-primary-light` | `#2E86C1` | Hover, links, badges |
| `--color-secondary` | `#F39C12` | Acento, pontuação, destaques de gameplay |
| `--color-success` | `#27AE60` | Resposta correta, pronto, validação OK |
| `--color-danger` | `#E74C3C` | Resposta errada, erro, indisponível |
| `--color-warning` | `#F1C40F` | Fallback, aviso |
| `--color-bg` | `#0F172A` | Background escuro (dark mode padrão) |
| `--color-bg-card` | `#1E293B` | Cards, painéis |
| `--color-text` | `#F8FAFC` | Texto principal |
| `--color-text-muted` | `#94A3B8` | Texto secundário |

### 5.3 Tipografia

| Elemento | Font | Peso | Tamanho |
|----------|------|------|---------|
| Heading 1 | Inter | 700 (Bold) | 2rem |
| Heading 2 | Inter | 600 (Semibold) | 1.5rem |
| Body | Inter | 400 (Regular) | 1rem |
| Small / Caption | Inter | 400 | 0.875rem |
| Monospace (código/timer) | JetBrains Mono | 500 | 1.25rem |

### 5.4 Componentes Base (Solid UI + Customizações)

| Componente | Base | Customização |
|-----------|------|-------------|
| Button | Solid UI | Variantes: primary, secondary, danger, ghost. Tamanhos: sm, md, lg |
| Input | Solid UI + Kobalte | Campo de texto com label, erro, ícone. Variante com autocomplete |
| Modal | Solid UI + Kobalte | Overlay, animação fade, trap focus |
| Card | Solid UI | Background `bg-card`, border sutil, hover lift |
| Badge | Solid UI | Status: success, danger, warning, muted |
| Toast | Solid UI | Notificações temporárias (canto inferior) |
| Slider | Kobalte | Config de tempo por rodada (10-60s) |
| Select | Kobalte | Dropdowns de configuração (answer_type, scoring_rule) |
| Progress | Solid UI | Barra de progresso (timer, validação) |
| Tooltip | Kobalte | Dicas rápidas sobre configurações |

### 5.5 Modo Escuro

O MVP usa **dark mode por padrão** (sem toggle light/dark). Justificativa: jogos são tipicamente em dark mode, reduz fadiga visual em sessões longas, e simplifica o desenvolvimento ao manter uma única paleta.

---

## 6. Gerenciamento de Estado

### 6.1 Estratégia

O SolidJS oferece signals e stores nativamente. Sem necessidade de bibliotecas externas (Redux, Zustand, etc.).

| Store | Escopo | Conteúdo |
|-------|--------|----------|
| `player` | Global (sessão) | UUID, nickname, plataforma autenticada, tokens |
| `room` | Ativo na sala | Jogadores, config, estado da sala, host |
| `game` | Ativo na partida | Rodada atual, timer, scores, respostas, highlights |
| `audio` | Ativo na partida | Token de áudio, estado de playback, buffered |

### 6.2 Exemplo de Store

```tsx
// src/lib/stores/room.ts
import { createStore } from "solid-js/store";
import type { Player, MatchConfiguration, RoomState } from "../types/game";

interface RoomStore {
  room_id: string | null;
  invite_code: string | null;
  state: RoomState;
  host_player_uuid: string | null;
  config: MatchConfiguration | null;
  players: Player[];
  song_range: { min: number; max: number } | null;
}

const [room, setRoom] = createStore<RoomStore>({
  room_id: null,
  invite_code: null,
  state: "waiting",
  host_player_uuid: null,
  config: null,
  players: [],
  song_range: null,
});

export { room, setRoom };
```

---

## 7. Comunicação com Backend

### 7.1 REST Client

```tsx
// src/lib/api/client.ts
const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export async function api<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.error.code, error.error.message, response.status);
  }

  return response.json();
}
```

### 7.2 WebSocket (Phoenix Channels)

O frontend usa a biblioteca `phoenix` (JS client oficial do Phoenix Channels) para comunicação WebSocket. Isso é agnóstico ao framework — funciona com qualquer frontend.

```tsx
// src/lib/ws/connection.ts
import { Socket } from "phoenix";

let socket: Socket | null = null;

export function connectSocket() {
  const url = import.meta.env.VITE_WS_URL || "wss://merma.example.com/socket";
  socket = new Socket(url, { params: {} });
  socket.connect();
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not connected");
  return socket;
}
```

### 7.3 Tipagem dos Eventos

Tipos TypeScript gerados a partir das specs OpenAPI e AsyncAPI garantem type safety na comunicação:

```tsx
// src/lib/types/ws.ts (gerado do AsyncAPI)
export interface RoundStartingPayload {
  round_index: number;
  total_rounds: number;
  audio_token: string;
  audio_source: "deezer" | "spotify_sdk";
  grace_period_seconds: number;
}

export interface RoundEndedPayload {
  round_index: number;
  song: RevealedSong;
  answers: PlayerAnswer[];
  scores: Record<string, number>;
  next_round_in_seconds: number;
}
```

---

## 8. Player de Áudio

### 8.1 Implementação

O player usa a **HTML5 Audio API** nativa do browser para reproduzir o stream do proxy de áudio (Deezer preview via backend).

```tsx
// src/lib/audio/player.ts
class GameAudioPlayer {
  private audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = "anonymous";
  }

  async load(audioToken: string): Promise<void> {
    const url = `${BASE_URL}/audio/${audioToken}`;
    this.audio.src = url;
    await this.audio.load();
  }

  play(): void { this.audio.play(); }
  pause(): void { this.audio.pause(); }
  stop(): void { this.audio.pause(); this.audio.currentTime = 0; }

  get isBuffered(): boolean {
    return this.audio.readyState >= 3; // HAVE_FUTURE_DATA
  }
}
```

### 8.2 Fallback Spotify Web Playback SDK

Para músicas que só estão disponíveis via Spotify (fallback), o frontend carrega o SDK dinamicamente apenas quando necessário:

```tsx
// src/lib/audio/spotify-sdk.ts
// Carregado dinamicamente só quando audio_source === "spotify_sdk"
// Requer que o jogador dono da música tenha Spotify Premium
```

---

## 9. Rotas e Fluxo de Navegação

```
/                           → Tela inicial (criar sala, entrar, login)
/login                      → Fluxo OAuth (Spotify, Deezer, YouTube Music)
/profile                    → Perfil do jogador
/profile/playlists          → Gerenciar/validar playlists
/room/create                → Criar sala (gera código, redireciona pra sala)
/room/join                  → Digitar código de convite
/room/:code                 → Sala (lobby → jogo → resultados → lobby)
```

A rota `/room/:code` é a mais complexa — ela gerencia três estados internos (lobby, jogo, resultados) sem mudar de URL. A transição entre estados é controlada pelo store `room.state` que é atualizado via eventos WebSocket do backend.

---

## 10. PWA (Futuro)

O MVP não implementa PWA completa, mas a estrutura é preparada:

- `manifest.json` presente em `public/`.
- Meta tags de viewport e theme-color configuradas.
- Assets estáticos cacheable pelo Caddy.
- Service worker pode ser adicionado no futuro sem refatoração.

---

## 11. Deploy do Frontend

### 11.1 Build

```bash
bun run build
```

SolidStart com modo SPA gera assets estáticos (`dist/public/`) que podem ser servidos por qualquer servidor HTTP.

### 11.2 Integração com Backend

Os assets estáticos do frontend são copiados para dentro do container Docker do backend. O Caddy serve os arquivos estáticos diretamente e faz proxy das requisições `/api/*` e `/socket/*` para o BEAM.

```
Caddy
├── / → serve dist/public/ (assets estáticos do SPA)
├── /api/* → proxy para BEAM:4000
└── /socket/* → proxy WebSocket para BEAM:4000
```

### 11.3 Variáveis de Ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| `VITE_API_URL` | Base URL da API REST | `/api/v1` |
| `VITE_WS_URL` | URL do WebSocket | `wss://<domain>/socket` |
| `VITE_SPOTIFY_CLIENT_ID` | Client ID do Spotify OAuth | — |
| `VITE_DEEZER_APP_ID` | App ID do Deezer OAuth | — |
| `VITE_GOOGLE_CLIENT_ID` | Client ID do Google (YouTube Music) | — |

---

## 12. Resumo das Decisões

| Decisão | Escolha |
|---------|---------|
| Framework | SolidJS + SolidStart |
| Runtime | Bun |
| Linguagem | TypeScript (TSX) |
| Estilização | Tailwind CSS |
| Component Library | Solid UI (shadcn/ui port) + Kobalte (headless) |
| Linting/Formatting | Oxlint |
| Testes | Bun test |
| Renderização | SPA (Single Page Application) |
| Estado | Signals + Stores nativos do SolidJS (sem lib externa) |
| Abstrações reativas | Helpers `when()`, `each()`, `match()` sobre primitivos Solid |
| WebSocket client | Phoenix JS client (`phoenix` npm) |
| Player de áudio | HTML5 Audio API nativa |
| Fallback Spotify | Web Playback SDK (carregado dinamicamente) |
| Tema visual | Dark mode padrão (sem toggle no MVP) |
| Design tokens | CSS custom properties + Tailwind config |
| Tipografia | Inter (UI) + JetBrains Mono (código/timer) |
| PWA | Preparada mas não implementada no MVP |
| Deploy | Assets estáticos servidos pelo Caddy, proxy para BEAM |

---

*Fim do Documento de Especificação de Arquitetura Frontend*
