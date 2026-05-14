# Bun — Docs Snapshot

**Fonte:** `https://bun.com/llms.txt` (índice) + `https://bun.com/llms-full.txt` (doc completa)
**Capturado em:** 2026-05-13
**Versão:** Bun 1.x (current)

## Arquivos

| Arquivo / Pasta | Conteúdo | Tamanho |
|---|---|---|
| `INDEX.md` | **Índice mestre** — entrada principal para consulta humana e por LLM. Lista categorias com contagem e descrição. | ~3 KB |
| `llms.txt` | Índice oficial do Bun (formato llmstxt.org) com links absolutos para a versão online. | 33 KB |
| `llms-full.md` | Doc COMPLETA em arquivo único (baixada de `llms-full.txt`). Boa para ingestão por LLM de uma vez ou busca via `Ctrl+F`. | 2.0 MB |
| `docs/**/*.md` | **315 páginas** separadas por seção, espelhando a estrutura de URL `bun.com/docs/<path>`. Cada subpasta tem seu próprio `INDEX.md`. | 2.7 MB |
| `.split.py` | Script que regera `docs/**/*.md` a partir de `llms-full.md`. | — |
| `.index.py` | Script que regera `INDEX.md` (raiz + por pasta) a partir de `docs/`. | — |

## Estrutura

```
handbook/references/bun/
├── README.md            ← você está aqui
├── INDEX.md             ← índice mestre (entrada principal)
├── llms.txt             ← índice oficial (links absolutos)
├── llms-full.md         ← doc completa (arquivo único)
├── .split.py            ← regerar split
├── .index.py            ← regerar indexes
└── docs/                ← 315 arquivos .md
    ├── INDEX.md         ← páginas raiz (welcome, installation, quickstart…)
    ├── bundler/         (13)
    ├── pm/              (13) + cli/ (12)
    ├── runtime/         (49) + http/ (7) + networking/ (4) + templating/ (2)
    ├── test/            (12)
    ├── guides/          (1) + 12 subpastas (binary, http, install, runtime, test…)
    └── project/         (6)
```

## Por que está aqui

Suporte ao novo **Plano de Implementação (Vanilla TS 6.0)** — Bun é o runtime escolhido por sua performance bruta, suporte nativo a TypeScript 6.0 e ferramentas integradas (test, build, package manager).

Essencial para consulta de APIs nativas como `Bun.serve`, `Bun.websocket`, `Bun.password`, SQL/SQLite/Redis/S3 embutidos, e o novo suporte a **TypeScript 6.0/7.0**.

## Como consultar

| Caso | Caminho recomendado |
|---|---|
| Sei o tópico, quero ir direto | Abrir `INDEX.md` → categoria → arquivo |
| Quero buscar um símbolo/API | `rg "Bun\.serve" handbook/references/bun/docs` |
| Quero passar tudo para um LLM | `llms-full.md` (2.0 MB, único arquivo) |
| Quero linkar URL canônica | `llms.txt` tem o link absoluto de cada página |

## Como atualizar

```bash
cd handbook/references/bun
curl -fsSL https://bun.com/llms.txt      -o llms.txt
curl -fsSL https://bun.com/llms-full.txt -o llms-full.md
python3 .split.py    # regera docs/**/*.md (315 arquivos)
python3 .index.py    # regera INDEX.md raiz + INDEX.md por pasta
```

Commit: `docs(handbook): refresh Bun docs snapshot (YYYY-MM-DD)`.

## Diferença de formato vs Zod

Igual ao Zod, o Bun publica toda a doc em um arquivo `llms-full.txt` único (~2 MB). Aqui fomos um passo além e quebramos o blob em arquivos por seção + indexes navegáveis, porque a doc do Bun é grande o suficiente para justificar navegação humana por árvore (≈315 páginas vs ≈40 do Zod). Os três formatos coexistem — escolha conforme o caso de uso.
