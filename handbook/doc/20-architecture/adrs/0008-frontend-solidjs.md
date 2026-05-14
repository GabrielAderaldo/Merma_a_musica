# ADR 0008: Frontend reativo com SolidJS (supersedes ADR-0003)

- **Status:** accepted
- **Data:** 2026-05-13
- **Supersedes:** [ADR-0003](0003-no-framework-frontend.md)
- **Decisores:** core

## Contexto

O [ADR-0003](0003-no-framework-frontend.md) escolheu **Vanilla TS sem framework** e admitia que íamos criar um `observable.ts` in-house para resolver reatividade WS-driven. Em revisitação ao decidir entre as três opções viáveis para o nosso problema:

- **Vanilla TS puro** (como em 0003): zero framework, manipulação manual de DOM, observer in-house.
- **Vanilla TS + Web Components** (Custom Elements + Shadow DOM): standard web, mas resolve encapsulamento, não reatividade.
- **SolidJS**: signals (fine-grained reactivity), JSX compilado AOT, sem Virtual DOM, runtime ~7KB.

O Mermã tem características que pesam para reatividade fina:
- Fortemente **WebSocket-driven** — eventos push de timer, answers, scores, presence, autocomplete, voto-skip, host migration.
- **Estado complexo em real-time** — múltiplos jogadores, múltiplos estados simultâneos no lobby/partida.
- 5–7 telas (lobby, partida, revelação, resultados, login opcional, modo solo) — JSX é claramente mais legível que `createElement/appendChild` manual nessa escala.
- **Mobile-first** — bundle pequeno é requisito, não nice-to-have.

## Decisão

Adotar **SolidJS 1.x** como camada reativa do frontend `apps/web`.

### Configuração

- **Versão:** Solid 1.x estável. **Não usar Solid 2.x** ainda (em alpha; sem benefício para o MVP).
- **JSX:** habilitado via `tsconfig.json` (`"jsx": "preserve"`) + `babel-preset-solid` plugado no `bun build`.
- **Roteamento:** `@solidjs/router` (file-system routing simples; sem necessidade de SolidStart).
- **Sem SSR:** o jogo é fortemente client-side e WS-driven; SolidStart adicionaria complexidade sem ganho real.
- **Estilização:** Tailwind continua (decisão da stack inalterada).

### Modelo de estado

- **Signals** (`createSignal`, `createMemo`, `createEffect`) substituem o "observer in-house" planejado em 0003.
- **Stores** (`createStore`) para estado mais complexo (estado da `Room`, lista de jogadores).
- **Repositories** (camada de I/O) permanecem como em 0003: REST via `fetch`, WebSocket via API nativa do browser. Repositories **emitem signals**; views fazem `subscribe` lendo o signal.

### Estrutura proposta

```
apps/web/src/
├── main.tsx                   ← entry point com render()
├── App.tsx                    ← router shell
├── routes/                    ← components-route do Solid Router
│   ├── index.tsx              ← tela inicial
│   ├── room/[code].tsx        ← lobby + partida + revelação
│   └── solo.tsx               ← modo solo
├── components/                ← Solid components reutilizáveis
│   ├── PlayerBadge.tsx
│   ├── Timer.tsx
│   ├── AnswerInput.tsx
│   └── ...
├── stores/                    ← createStore + helpers de I/O
│   ├── room.store.ts
│   ├── audio.store.ts
│   └── playlists.store.ts
├── lib/
│   ├── ws-client.ts           ← WebSocket nativo emitindo para signals
│   ├── api-client.ts          ← fetch para REST
│   └── audio-player.ts        ← controla `<audio>` HTML5
└── styles/
    └── tailwind.css
```

### Quando usar Custom Elements

Não usaremos Web Components como API principal. Mas a **interop fica aberta**: se um dia precisarmos exportar uma peça da UI para ser embeddable fora do app (widget em site de streamer, p.ex.), `solid-element` converte um component Solid em Custom Element nativo numa linha. Não decidir agora.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Vanilla TS puro (ADR-0003)** | Ia exigir escrever Observer in-house (~30 linhas) e manipulação manual de DOM em 5-7 telas. Signal do Solid resolve isso de graça; bundle final acaba **menor** (sem o code do observer + DOM manual verbose). |
| **Vanilla TS + Web Components (Lit ou puro)** | Web Components resolvem **encapsulamento**, não **reatividade**. Lit é boa, mas se vamos pagar uma lib mesmo, Solid é melhor fit para o problema (reatividade fina sob WS). Se um dia precisarmos exportar componentes embeddable, `solid-element` cobre. |
| **React + Vite** | Bundle ~6× maior (Solid ~7KB runtime vs React ~45KB). VDOM + regras de hooks pesam para o que estamos fazendo. Ecossistema gigante é overkill. |
| **Svelte 5** | Excelente alternativa (signals via runes, bundle pequeno). Empate técnico com Solid para o nosso caso. Solid ganhou por: (a) signals como API explícita (mais alinhado com o estilo functional do nosso domínio `Result<T, E>`); (b) JSX (familiar para quem viu React). Decisão admite que é uma escolha de gosto — Svelte teria sido tão boa quanto. |
| **Preact** | "React menor", mas mantém VDOM. Solid evita VDOM completamente. |
| **SolidStart (Solid + SSR/file-based routing)** | Overkill — o jogo é fortemente client-side, sem SEO crítico, sem dados pré-renderizáveis. Adicionar SSR é complexidade que não compensa. |

## Consequências

- **Positivas:**
  - **Bundle competitivo:** Solid 7KB runtime + app + Tailwind purgado tende a ficar **menor** que Vanilla + observer in-house, porque o código do app fica mais conciso em JSX.
  - **Signals = padrão observer maduro.** Não vamos manter código de observable; usamos uma API documentada e testada por milhares de apps.
  - **WS → signal → DOM** é trivial: `socket.onMessage(e => setState(e))` atualiza só o DOM dependente.
  - **Performance ~indistinguível de vanilla** (Solid AOT-compila JSX em chamadas diretas `insert(parent, child)`, sem reconciliação).
  - **JSX legível** para 5-7 telas com estrutura visual real.
  - **Interop com Web Components** via `solid-element` se precisar exportar peças para fora.
- **Negativas / trade-offs:**
  - **Comunidade menor que React.** 35k stars vs centenas de milhares — Stack Overflow é mais raso. Mitigação: a API do Solid é pequena, dá pra ler a doc inteira numa tarde. Snapshot offline em `handbook/references/solid/` reduz dependência de busca online.
  - **Doc oficial atrás de Cloudflare** — bloqueia bots/curl. Workaround: snapshot extraído do repo `solidjs/solid-docs` no GitHub, mantido offline.
  - **Sintaxe de signals exige atenção:** `count()` para ler (chamada de função) e `setCount(n)` para escrever. Quem vem de React costuma esquecer os parênteses. Mitigação: ESLint plugin `eslint-plugin-solid` pega esses casos.
  - **Bus factor levemente maior** que Vanilla, mas a curva é genuinamente baixa — ~1 dia de leitura cobre o essencial.
- **Neutras:**
  - Hot reload via `bun --hot` precisa de configuração específica para Solid (HMR oficial via plugin). Documentar no spec do frontend.
  - `tsconfig.json` precisa de `"jsx": "preserve"` e `"jsxImportSource": "solid-js"`. Já compatível com a config strict atual.

## Notas

- **Documentação offline:** snapshot a baixar para `handbook/references/solid/` (tarefa de seguida).
- **ADR-0003 fica como superseded** — mantido na pasta como histórico; não editar conteúdo, apenas status.
- **`@merma/web` no Bun Workspaces** ([ADR-0005](0005-monorepo-bun-workspaces.md)): adicionar Solid e dependências como deps de runtime; `babel-preset-solid` como devDep.
- **Spec detalhado** em [`30-specs/03-frontend.md`](../../30-specs/03-frontend.md) (a criar na F5) — vai cobrir: estrutura de stores, padrão de comunicação WS↔signal, organização de rotas, padrão de componentização.
- **Re-avaliação programada:** se em algum momento Solid mostrar dor real (DX, performance, manutenção), reavaliar — saída para outro framework não é traumática porque a lógica de domínio vive em `@merma/domain`, não no client.
