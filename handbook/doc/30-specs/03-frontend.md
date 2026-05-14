---
status: active
last-reviewed: 2026-05-13
owners: [core]
---

# Spec — `apps/web` (Frontend Solid)

> Implementação detalhada do client. SolidJS 1.x + signals + Tailwind. Sem SolidStart, sem SSR.
>
> Decisões base: [ADR-0008](../20-architecture/adrs/0008-frontend-solidjs.md), [ADR-0003 superseded](../20-architecture/adrs/0003-no-framework-frontend.md).

## Sumário

1. [Estrutura de pastas](#1-estrutura-de-pastas)
2. [Bootstrap e build](#2-bootstrap-e-build)
3. [Padrão de estado](#3-padrão-de-estado-stores--signals)
4. [WebSocket client](#4-websocket-client)
5. [Audio player](#5-audio-player)
6. [Roteamento](#6-roteamento-solid-router)
7. [Persistência local](#7-persistência-local-localstorage)
8. [Estilização](#8-estilização-tailwind--tokens)
9. [Reconexão e error handling](#9-reconexão-e-error-handling)
10. [Estratégia de testes](#10-estratégia-de-testes)

---

## 1. Estrutura de Pastas

```
apps/web/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx                ← entry, render()
│   ├── App.tsx                 ← <Router> shell
│   ├── routes/                 ← Solid Router file-based
│   │   ├── index.tsx           ← home (tela inicial)
│   │   ├── login.tsx           ← login OAuth opcional
│   │   ├── room/
│   │   │   ├── (create).tsx    ← criar sala
│   │   │   ├── (join).tsx      ← entrar via código
│   │   │   └── [code].tsx      ← lobby/partida/revelação/resultados (uma página, estados via signal)
│   │   ├── solo/
│   │   │   ├── index.tsx       ← dashboard solo
│   │   │   └── play.tsx        ← partida solo
│   │   ├── playlists.tsx       ← gestão de playlists
│   │   └── (404).tsx           ← not found
│   ├── components/
│   │   ├── ui/                 ← primitivos genéricos
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Avatar.tsx
│   │   ├── lobby/
│   │   │   ├── PlayerList.tsx
│   │   │   ├── PlayerCard.tsx
│   │   │   ├── ReadyToggle.tsx
│   │   │   ├── AfkBadge.tsx
│   │   │   └── ConfigPanel.tsx
│   │   ├── match/
│   │   │   ├── Timer.tsx
│   │   │   ├── AnswerInput.tsx
│   │   │   ├── AutocompleteList.tsx
│   │   │   ├── PlayerStatusGrid.tsx
│   │   │   └── SkipVoteButton.tsx
│   │   ├── reveal/
│   │   │   ├── SongCard.tsx
│   │   │   ├── AnswerList.tsx
│   │   │   └── PointsAnimation.tsx
│   │   ├── results/
│   │   │   ├── Ranking.tsx
│   │   │   ├── HighlightCard.tsx
│   │   │   └── SoloComparisonCard.tsx
│   │   └── solo/
│   │       ├── PersonalBestPanel.tsx
│   │       ├── SoloHeader.tsx
│   │       └── MotivationPrompt.tsx
│   ├── stores/
│   │   ├── room.store.ts       ← createStore<RoomState>
│   │   ├── audio.store.ts      ← signal de áudio corrente
│   │   ├── playlists.store.ts  ← lista de playlists do user
│   │   ├── solo.store.ts       ← recordes pessoais
│   │   └── connection.store.ts ← status do WS
│   ├── lib/
│   │   ├── ws-client.ts        ← WebSocket nativo + signal emission
│   │   ├── api-client.ts       ← fetch wrappers
│   │   ├── audio-player.ts     ← controla <audio> element
│   │   ├── identity.ts         ← player_uuid em cookie
│   │   └── debounce.ts         ← utility
│   ├── styles/
│   │   ├── tailwind.css        ← @tailwind directives
│   │   └── tokens.ts           ← design tokens em TS
│   └── types/
│       └── index.ts            ← re-export de @merma/schema
└── public/
    ├── favicon.svg
    └── og-image.png
```

---

## 2. Bootstrap e Build

### 2.1 `package.json`

```jsonc
{
  "name": "@merma/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --hot src/main.tsx",
    "build": "bun build src/main.tsx --outdir dist --target browser --splitting --minify",
    "test": "bun test"
  },
  "dependencies": {
    "solid-js": "^1.9.0",
    "@solidjs/router": "^0.15.0",
    "@merma/schema": "workspace:*"
  },
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "@types/bun": "latest"
  }
}
```

### 2.2 `tsconfig.json`

```jsonc
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "moduleResolution": "bundler",
    "types": ["bun"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

### 2.3 `main.tsx`

```typescript
import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import { App } from "./App";
import "./styles/tailwind.css";

const root = document.getElementById("app")!;
render(() => <Router root={App} />, root);
```

### 2.4 `index.html` (bundle entry)

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mermã, a Música!</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</head>
<body class="bg-bg-primary text-text-primary">
  <div id="app"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

---

## 3. Padrão de Estado (Stores + Signals)

### 3.1 Filosofia

- **Stores** (`createStore`) para estado complexo aninhado (Room, Match).
- **Signals** (`createSignal`) para valores simples (timer atual, query do autocomplete).
- **Memos** (`createMemo`) para derivações reativas (e.g., "is host?", "votes needed to skip").

Repositories são **consumidores de estado**: WebSocket emite → store é atualizado → view reage.

### 3.2 `room.store.ts`

```typescript
import { createStore, produce } from "solid-js/store";
import type { RoomState } from "@merma/schema";

const [roomState, setRoomState] = createStore<RoomState | null>(null);

export const room = roomState;

export const setRoom = (state: RoomState) => setRoomState(state);

export const updateRoom = (updater: (draft: RoomState) => void) => {
  setRoomState(produce(updater));
};

export const handleWsEvent = (event: WsEvent) => {
  switch (event.type) {
    case "room_state":
      setRoomState(event.payload);
      break;
    case "player_joined":
      setRoomState(produce(draft => {
        if (draft) draft.players.push(event.payload.player);
      }));
      break;
    case "player_ready_changed":
      setRoomState(produce(draft => {
        if (!draft) return;
        const p = draft.players.find(p => p.player_uuid === event.payload.player_uuid);
        if (p) p.ready = event.payload.ready;
      }));
      break;
    // ... (cobertura completa em ws-client.ts)
  }
};
```

### 3.3 `audio.store.ts`

```typescript
import { createSignal } from "solid-js";

type AudioPayload = {
  audio_source: "deezer" | "spotify_sdk";
  audio_token?: string;
  spotify_uri?: string;
  duration_ms: number;
};

const [currentAudio, setCurrentAudio] = createSignal<AudioPayload | null>(null);
const [audioState, setAudioState] = createSignal<"idle" | "loading" | "playing" | "paused" | "error">("idle");

export const audio = currentAudio;
export const audioState_;export { audioState as audioStateGet, setAudioState };
export const setAudio = setCurrentAudio;
```

### 3.4 `connection.store.ts`

```typescript
import { createSignal } from "solid-js";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";
const [connState, setConnState] = createSignal<ConnectionState>("disconnected");
export const connection = connState;
export const setConnection = setConnState;
```

### 3.5 Componente exemplo

```tsx
// components/lobby/PlayerList.tsx
import { For } from "solid-js";
import { room } from "../../stores/room.store";
import { PlayerCard } from "./PlayerCard";

export const PlayerList = () => {
  return (
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <For each={room?.players}>
        {(player) => <PlayerCard player={player} />}
      </For>
    </div>
  );
};
```

---

## 4. WebSocket Client

### 4.1 `lib/ws-client.ts`

```typescript
import { handleWsEvent } from "../stores/room.store";
import { setConnection } from "../stores/connection.store";

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

class WsClient {
  private ws: WebSocket | null = null;
  private invite_code: string | null = null;
  private reconnect_attempt = 0;
  private heartbeat_interval: number | null = null;

  connect(invite_code: string, player_uuid: string, nickname: string) {
    this.invite_code = invite_code;
    setConnection("connecting");

    const url = `${wsBase()}/ws/room/${invite_code}?player_uuid=${player_uuid}&nickname=${encodeURIComponent(nickname)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      setConnection("connected");
      this.reconnect_attempt = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        handleWsEvent(event);
      } catch (err) {
        console.error("Invalid WS message", err);
      }
    };

    this.ws.onclose = (e) => {
      this.stopHeartbeat();
      // 4xxx = códigos do servidor (não reconectar em alguns)
      if (e.code === 4001 /* duplicate player */ || e.code === 4002 /* banned */) {
        setConnection("disconnected");
        return;
      }
      setConnection("reconnecting");
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose vai ser chamado em seguida
    };
  }

  send(message: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private scheduleReconnect() {
    const delay = RECONNECT_DELAYS[Math.min(this.reconnect_attempt, RECONNECT_DELAYS.length - 1)];
    this.reconnect_attempt++;
    setTimeout(() => {
      if (this.invite_code) {
        const player_uuid = getPlayerUuid();
        const nickname = getNickname();
        this.connect(this.invite_code, player_uuid, nickname);
      }
    }, delay);
  }

  private startHeartbeat() {
    this.heartbeat_interval = setInterval(() => {
      this.send({ type: "ping" });
    }, 30000) as unknown as number;
  }

  private stopHeartbeat() {
    if (this.heartbeat_interval) clearInterval(this.heartbeat_interval);
  }

  disconnect() {
    this.invite_code = null;
    this.ws?.close(1000);
  }
}

export const wsClient = new WsClient();
```

### 4.2 Emissores de eventos (com retry simples)

```typescript
export const submitAnswer = (answer_text: string) => {
  wsClient.send({ type: "submit_answer", answer_text });
};

export const voteSkip = () => wsClient.send({ type: "vote_skip" });
export const playerReady = (ready: boolean) => wsClient.send({ type: ready ? "player_ready" : "player_unready" });
export const playerAfkChanged = (afk: boolean) => wsClient.send({ type: "player_afk_changed", afk });
// ...
```

### 4.3 Backoff exponencial

Delays: 1s → 2s → 5s → 10s → 30s, com **jitter** (±10%) para evitar thundering herd:

```typescript
const delay_with_jitter = (base: number) => {
  const jitter = base * 0.1 * (Math.random() - 0.5) * 2;
  return base + jitter;
};
```

---

## 5. Audio Player

### 5.1 `lib/audio-player.ts`

```typescript
import { setAudioState } from "../stores/audio.store";

class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private sdk: SpotifyPlayer | null = null;

  async play(payload: AudioPayload): Promise<void> {
    this.stop();
    setAudioState("loading");

    if (payload.audio_source === "deezer") {
      const audio = new Audio(`/api/v1/audio/${payload.audio_token}`);
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      audio.addEventListener("canplay", () => setAudioState("playing"));
      audio.addEventListener("ended", () => setAudioState("idle"));
      audio.addEventListener("error", () => setAudioState("error"));
      this.audio = audio;
      await audio.play();
    } else if (payload.audio_source === "spotify_sdk") {
      this.sdk = await loadSpotifySdk();
      await this.sdk.play({ uris: [payload.spotify_uri!] });
      setAudioState("playing");
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    if (this.sdk) {
      this.sdk.pause();
    }
    setAudioState("idle");
  }
}

export const audioPlayer = new AudioPlayer();
```

### 5.2 Lazy load do Spotify SDK

```typescript
let _spotify_sdk_promise: Promise<SpotifyPlayer> | null = null;

const loadSpotifySdk = (): Promise<SpotifyPlayer> => {
  if (!_spotify_sdk_promise) {
    _spotify_sdk_promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.onload = () => {
        window.onSpotifyWebPlaybackSDKReady = () => {
          // ... inicialização
          resolve(player);
        };
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return _spotify_sdk_promise;
};
```

---

## 6. Roteamento (Solid Router)

### 6.1 Estrutura

Solid Router file-based via `@solidjs/router`. Cada arquivo `routes/<path>.tsx` exporta default um componente.

### 6.2 Exemplo: `routes/room/[code].tsx`

```tsx
import { useParams } from "@solidjs/router";
import { createEffect, onCleanup, Show } from "solid-js";
import { room } from "../../stores/room.store";
import { wsClient } from "../../lib/ws-client";
import { getPlayerUuid, getNickname } from "../../lib/identity";

import { Lobby } from "../../components/lobby/Lobby";
import { Match } from "../../components/match/Match";
import { Reveal } from "../../components/reveal/Reveal";
import { Results } from "../../components/results/Results";

export default function RoomPage() {
  const params = useParams();
  const code = params.code!;

  createEffect(() => {
    wsClient.connect(code, getPlayerUuid(), getNickname());
  });

  onCleanup(() => wsClient.disconnect());

  return (
    <Show when={room} fallback={<div>Conectando à sala {code}…</div>}>
      <Show when={room?.state === "waiting"}>
        <Lobby />
      </Show>
      <Show when={room?.state === "in_match"}>
        <Match />
      </Show>
      <Show when={room?.state === "reveal"}>
        <Reveal />
      </Show>
      <Show when={room?.state === "finished"}>
        <Results />
      </Show>
    </Show>
  );
}
```

### 6.3 Lazy loading de rotas

Rotas grandes carregadas sob demanda:

```typescript
import { lazy } from "solid-js";
const PlaylistsPage = lazy(() => import("./routes/playlists"));
```

---

## 7. Persistência Local (`localStorage`)

### 7.1 `lib/identity.ts`

```typescript
const KEY_PLAYER_UUID = "merma:player_uuid";
const KEY_NICKNAME = "merma:nickname";

export const getPlayerUuid = (): string => {
  let uuid = localStorage.getItem(KEY_PLAYER_UUID);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(KEY_PLAYER_UUID, uuid);
  }
  return uuid;
};

export const getNickname = (): string => localStorage.getItem(KEY_NICKNAME) ?? "";
export const setNickname = (n: string) => localStorage.setItem(KEY_NICKNAME, n);
```

### 7.2 Solo personal bests (cache local)

Recorde pessoal vive em Postgres (autoridade), mas cache local em `localStorage` permite UX rápido:

```typescript
const KEY_SOLO_BESTS = "merma:solo_bests";

export const getCachedSoloBests = (): Record<string, PersonalBest> => {
  return JSON.parse(localStorage.getItem(KEY_SOLO_BESTS) ?? "{}");
};

export const updateCachedSoloBest = (playlist_id: string, best: PersonalBest) => {
  const cache = getCachedSoloBests();
  cache[playlist_id] = best;
  localStorage.setItem(KEY_SOLO_BESTS, JSON.stringify(cache));
};
```

Após cada `match_completed` solo, sincroniza com server e atualiza cache.

---

## 8. Estilização (Tailwind + Tokens)

### 8.1 Design tokens em TS

```typescript
// styles/tokens.ts
export const colors = {
  bg: {
    primary: "#0F0F11",
    secondary: "#1A1A20",
    elevated: "#23232B",
  },
  text: {
    primary: "#F5F5F7",
    secondary: "#A1A1AA",
    muted: "#71717A",
  },
  accent: {
    primary: "#FF5588",        // pink/red — main brand
    secondary: "#5599FF",      // blue — info
    success: "#22C55E",
    danger: "#EF4444",
    warning: "#F59E0B",
  },
} as const;

export const radii = { sm: "6px", md: "12px", lg: "20px", pill: "9999px" } as const;
export const spacing = { /* ... */ } as const;
```

### 8.2 `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";
import { colors, radii } from "./src/styles/tokens";

export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "bg-primary": colors.bg.primary,
        "bg-secondary": colors.bg.secondary,
        "text-primary": colors.text.primary,
        // ...
      },
      borderRadius: radii,
    },
  },
} satisfies Config;
```

### 8.3 Dark mode

App é **dark-mode-only no MVP** (decisão para reduzir fadiga visual em sessões longas e simplicidade). Light mode entra em roadmap se virar feedback.

---

## 9. Reconexão e Error Handling

### 9.1 Estados visuais durante reconexão

| Estado | UI |
|---|---|
| `connecting` | spinner pequeno no canto + mensagem "Conectando…" |
| `connected` | sem indicador |
| `reconnecting` | banner amarelo persistente no topo: "Tentando reconectar… (tentativa N)" |
| `disconnected` | modal full-screen: "Conexão perdida. Recarregar?" com botão de retry |

### 9.2 Toasts de erro

Erros recebidos via WS (`error` event) viram toasts:

```tsx
// components/ui/Toast.tsx — singleton + signal
import { createSignal } from "solid-js";

export const [toasts, setToasts] = createSignal<Toast[]>([]);

export const showToast = (message: string, level: "info" | "warn" | "error" = "info") => {
  const id = crypto.randomUUID();
  setToasts(t => [...t, { id, message, level }]);
  setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
};
```

Códigos de erro do server (`not_host`, `room_full`, `host_is_always_ready`, etc.) mapeados para mensagens em pt-BR.

### 9.3 Empty states

- **Sala inexistente** (`/room/XXX999` que não existe): "Essa sala não existe. Verifique o código."
- **Playlist sem ISRC suficiente**: aviso opcional no lobby ("Algumas músicas dessa playlist podem não estar disponíveis").
- **Sem WS conectado em rota que precisa**: redireciona para `/` automaticamente.

---

## 10. Estratégia de Testes

### 10.1 Unit (`bun test`)

- Stores: testam reação a eventos WS canônicos.
- Lib utils (debounce, identity, audio-player): testes diretos.
- Pure components (sem fetch/socket): render via `@solidjs/testing-library`.

### 10.2 Integration (happy-dom + Bun)

```typescript
import { render } from "@solidjs/testing-library";
import { Lobby } from "../components/lobby/Lobby";
import { setRoom } from "../stores/room.store";

test("Lobby renderiza jogadores", () => {
  setRoom({ players: [/* ... */], state: "waiting", /* ... */ });
  const { getByText } = render(() => <Lobby />);
  expect(getByText("Gabriel")).toBeDefined();
});
```

### 10.3 E2E (Playwright — pós-MVP)

Cenários cobertos no roadmap, não MVP:
- Criar sala + entrar + iniciar partida + responder + ver resultado.
- Reconexão (force WS close).
- OAuth flow (mock provider).

### 10.4 Performance

Métricas alvo (medir manualmente no MVP, automatizar pós-MVP):

| Métrica | Alvo |
|---|---|
| First Contentful Paint (3G fraco) | < 2s |
| Time to Interactive | < 3s |
| Bundle gzipped (main chunk) | < 30 KB |
| Memory após 30 min de partida | < 80 MB |

---

## Changelog

- **2026-05-13:** primeira versão consolidada. Substitui `archive/SPEC_FRONTEND_v2.0_phoenixjs.md`. Stack alinhada com ADR-0008 (Solid em vez de phoenix.js + Vanilla). Estrutura completa de pastas, stores/signals, WS client com reconexão exponencial, audio player com fallback Spotify SDK, roteamento Solid Router, design tokens em TS.
