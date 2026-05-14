# Solid — Docs Snapshot

**Fonte:** [`github.com/solidjs/solid-docs`](https://github.com/solidjs/solid-docs) (`main`)
**Capturado em:** 2026-05-13
**Versão coberta:** Solid 1.x (estável). Inclui também Solid Router, Solid Meta, SolidStart e referências preliminares de Solid 2.0 (alpha).

## Arquivos

| Arquivo / Pasta | Conteúdo | Tamanho |
|---|---|---|
| `INDEX.md` | **Índice mestre** — entrada principal. Lista categorias com contagem e descrição. | ~5 KB |
| `docs/**/*.md` | **221 páginas** separadas por seção, espelhando `docs.solidjs.com`. Cada subpasta tem seu próprio `INDEX.md`. | ~1.4 MB |
| `.split.py` | Script que regera `docs/**/*.md` a partir de `/tmp/solid-docs`. | — |
| `.index.py` | Script que regera os `INDEX.md` (raiz + pastas). | — |

## Por que está aqui

Suporte ao [**ADR-0008** (Frontend reativo com SolidJS)](../../doc/20-architecture/adrs/0008-frontend-solidjs.md) — SolidJS supersede a decisão original de Vanilla TS puro (ADR-0003) para o frontend `apps/web` do Mermã.

> ⚠️ A doc oficial `docs.solidjs.com` está atrás de Cloudflare e bloqueia `WebFetch`/`curl`. Este snapshot offline cobre o gap.

## Decisões do Mermã sobre Solid

- **Solid 1.x estável.** Não usar 2.x (alpha) no MVP.
- **`@solidjs/router`** para routing (file-system simples).
- **Sem SolidStart.** O jogo é client-side puro, sem necessidade de SSR.
- **Signals + Stores** como modelo de estado; sem libs adicionais de state management.
- **`solid-element`** disponível se um dia precisarmos exportar componentes como Custom Elements (não decidir agora).

Veja o ADR para fundamentação completa.

## Como consultar

| Caso | Caminho |
|---|---|
| Sei o tópico, quero ir direto | Abrir `INDEX.md` → categoria → arquivo |
| Quero buscar uma API | `rg "createSignal" handbook/references/solid/docs` |
| Quero ler tudo de uma área (ex: reactivity) | `cat docs/concepts/*.md docs/reference/basic-reactivity/*.md` |

## Como atualizar

```bash
cd /tmp && [ -d solid-docs ] && rm -r solid-docs; \
  git clone --depth 1 https://github.com/solidjs/solid-docs.git
cd handbook/references/solid
python3 .split.py    # regera docs/**/*.md
python3 .index.py    # regera INDEX.md raiz + por pasta
```

Commit: `docs(handbook): refresh Solid docs snapshot (YYYY-MM-DD)`.

## Diferença vs Bun/Zod

- **Sem `llms-full.md` unificado** — Solid não publica esse formato. Quem quiser ingerir tudo de uma vez pode `cat docs/**/*.md` (já que o split mantém uma estrutura clara).
- **Estrutura espelha SolidStart routes** — Solid-docs é ele mesmo um app Solid usando file-system routing; herdamos a hierarquia (sem os prefixos `(N)` do roteador).
- **Cobertura maior que parece** — 221 arquivos cobrem 4 produtos: Solid core, Solid Router, Solid Meta e SolidStart.
