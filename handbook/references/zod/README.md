# Zod 4 — Docs Snapshot

**Fonte:** `https://zod.dev/llms.txt` (índice) + `https://zod.dev/llms-full.txt` (doc completa)
**Capturado em:** 2026-05-12
**Versão:** Zod 4 (current)

## Arquivos

| Arquivo | Conteúdo | Tamanho |
|---|---|---|
| `llms.txt` | Índice navegável (formato llmstxt.org) com links para seções da doc por anchor (`?id=...`). | 22 KB |
| `llms-full.md` | Documentação COMPLETA do Zod 4 em arquivo único Markdown. Cobre: defining schemas, parsing, refinements, transforms, error handling, async, recipes. | 259 KB |

## Por que está aqui

Suporte ao **ADR-024 (Web App Stack)** — Zod é a library de validação escolhida em conjunto com `react-hook-form` para Forms no Web App.

Também é input recomendado para validação client-side **antes** do envio ao BFF (validação de UX, não autoridade — a autoridade é o BFF conforme R2). E para validação de payloads em codegen OpenAPI (`@hey-api/openapi-ts` integra com Zod opcional).

## Como atualizar

```bash
cd handbook/references/zod
curl -fsSL https://zod.dev/llms.txt -o llms.txt
curl -fsSL https://zod.dev/llms-full.txt -o llms-full.md
```

Commit: `docs(handbook): refresh Zod docs snapshot (zod@X.Y.Z, YYYY-MM-DD)`.

## Diferença de formato vs React

Diferente do React (que tem 177 arquivos `.md` individuais), Zod publica **toda** a doc em um arquivo `llms-full.txt` único. Vantagem: pode ser ingerido por LLM de uma vez. Desvantagem: navegação humana fica menos prática (`Ctrl+F` em vez de árvore de arquivos).
