---
until: apps/web/package.json
---

# Spec pré-código — `apps/web`

> **Rascunho com prazo de validade.** Quando `apps/web/package.json` existir, isto vira código, e o arquivo
> é apagado. A decisão está em [ADR-0008](../adr/0008-frontend-solidjs-com-vite.md). Telas e identidade
> visual estão em [`../design/brief.md`](../design/brief.md).

## Base

- Solid 1.x, `@solidjs/router`, sem SolidStart e sem SSR.
- Build e dev com **Vite + `vite-plugin-solid`**, rodando com `bunx --bun vite` (com checagem de tipos antes: `bun --check vite build`). O `bun build` pela CLI não aplica plugins. Desde a 1.4.3 o Bun respeita `jsxImportSource: "solid-js"` com o runtime automático, mas a compilação reativa fina do Solid continua sendo a do `vite-plugin-solid`.
- `tsconfig.json` do `apps/web` estende o raiz e acrescenta `"jsx": "preserve"`, `"jsxImportSource": "solid-js"` e `"types": ["bun"]` + o que mais usar (o TS 7 só carrega o que está listado em `types`). Declare `*.css` num `.d.ts` (o TS 7 checa imports de efeito colateral).
- Tailwind v4 no modelo CSS-first (`@import "tailwindcss"` + `@theme` no CSS), sem `tailwind.config.ts`. Confira a configuração atual no `llms.txt` do Tailwind/Solid antes de criar.
- Só dark mode no MVP.
- Tipos e validação do protocolo vêm de `packages/schema`. Nada de `packages/domain`.

## Estado

- `createStore` para a sala (`room_state` substitui tudo; os outros eventos aplicam deltas). Signals para valores simples (contagem do timer, consulta do autocomplete). `createMemo` para derivados (`isHost`, `votesNeeded`).
- A tela sai de `phase` ([`architecture.md`](../architecture.md#phase-derivada-o-que-o-cliente-usa-para-escolher-a-tela)), nunca de comparações com estados internos.
- Todo evento WS que chega passa pelo parser Zod antes de tocar no store.

## WebSocket

- URL `/ws/room/{invite_code}`. A identidade vai **só no cookie**: nada de `player_uuid` na query ([ADR-0013](../adr/0013-identidade-por-sessao-anonima.md)).
- Heartbeat `ping` a cada 30s.
- Reconexão com backoff de 1s → 2s → 5s → 10s → 30s, jitter de ±10%. Não reconecta depois de close 4001 (outra aba) nem 4029 (rate limit).
- UI de conexão: `connecting` → spinner discreto; `reconnecting` → faixa amarela com o número da tentativa; `disconnected` → modal com "Recarregar".

## Áudio

- `round_starting` com `deezer`: `fetch` de `/api/v1/audio/{token}` (o cookie vai junto), cria um blob, `URL.createObjectURL` e toca num `<audio>`. O blob é a **única** fonte da rodada: a revelação recomeça a partir dele (R-131). `revokeObjectURL` no fim da revelação.
- Reconectou no meio da rodada: usa o token novo que vem no `room_state`.
- `spotify_sdk`: carrega `https://sdk.scdn.co/spotify-player.js` sob demanda.

## Local storage

Só conveniência: o último `nickname` e um cache dos recordes solo para a tela abrir rápido (o servidor continua sendo a autoridade). **Nunca** identidade.

## Erros e estados vazios

- `error.code` do servidor → toast em pt-BR (4s).
- Sala inexistente: "Essa sala não existe. Verifique o código."
- Rota que exige WS sem conexão: volta para `/`.

## Testes

Stores com eventos canônicos (`bun test`); componentes puros com `@solidjs/testing-library` + happy-dom. E2E com Playwright fica para depois do MVP. Depuração manual com Claude in Chrome (console, rede, DOM).
