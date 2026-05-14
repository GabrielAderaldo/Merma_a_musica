# Bun Docs — Índice Mestre

Documentação completa do Bun separada em arquivos .md por seção, espelhando a estrutura de URL de `bun.com/docs/`.

**Total:** 315 páginas em 25 categorias.

## Categorias

| Categoria | Páginas | Descrição |
|---|---:|---|
| [`./`](./docs/INDEX.md) | 6 | Páginas raiz (welcome, installation, quickstart, typescript). |
| [`runtime/`](./docs/runtime/INDEX.md) | 49 | APIs do runtime: Bun.serve, SQL, SQLite, Redis, S3, FFI, Workers, Shell, Cron, Cookies, CSRF… |
| [`runtime/http/`](./docs/runtime/http/INDEX.md) | 7 | Bun.serve em detalhes: server, routing, websockets, TLS, cookies, error handling, metrics. |
| [`runtime/networking/`](./docs/runtime/networking/INDEX.md) | 4 | DNS, fetch, TCP, UDP. |
| [`runtime/templating/`](./docs/runtime/templating/INDEX.md) | 2 | bun init, bun create. |
| [`bundler/`](./docs/bundler/INDEX.md) | 13 | Bundler nativo do Bun: bytecode, CSS, HMR, plugins, executáveis single-file. |
| [`pm/`](./docs/pm/INDEX.md) | 13 | Package manager: workspaces, catalogs, isolated installs, virtual store, lockfile. |
| [`pm/cli/`](./docs/pm/cli/INDEX.md) | 12 | Comandos CLI do pm (add, install, remove, update, audit, link, publish, why…). |
| [`test/`](./docs/test/INDEX.md) | 12 | Test runner: discovery, lifecycle, mocks, snapshots, reporters, DOM, dates. |
| [`guides/`](./docs/guides/INDEX.md) | 1 | Guias práticos (cookbook) — receitas curtas para tarefas comuns. |
| [`guides/http/`](./docs/guides/http/INDEX.md) | 13 | Servidor HTTP, fetch, SSE, streaming, TLS, FormData, cluster. |
| [`guides/websocket/`](./docs/guides/websocket/INDEX.md) | 4 | Servidor WebSocket — pubsub, compressão, contexto por socket. |
| [`guides/install/`](./docs/guides/install/INDEX.md) | 17 | bun install — dependências, monorepo, registries customizados, CI. |
| [`guides/test/`](./docs/guides/test/INDEX.md) | 19 | bun test — coverage, snapshot, mock, watch, glob concurrency, happy-dom. |
| [`guides/runtime/`](./docs/guides/runtime/INDEX.md) | 20 | Runtime: envs, define, codesign, debugger, importação de JSON/TOML/YAML/HTML. |
| [`guides/process/`](./docs/guides/process/INDEX.md) | 9 | Spawn, IPC, stdin/stdout, signals, argv. |
| [`guides/streams/`](./docs/guides/streams/INDEX.md) | 12 | Conversão de ReadableStream / Node Readable para tipos diversos. |
| [`guides/binary/`](./docs/guides/binary/INDEX.md) | 22 | Conversões entre ArrayBuffer, Blob, Buffer, Uint8Array, DataView, string. |
| [`guides/read-file/`](./docs/guides/read-file/INDEX.md) | 9 | Leitura de arquivos em vários formatos. |
| [`guides/write-file/`](./docs/guides/write-file/INDEX.md) | 10 | Escrita de arquivos, append, FileSink, stdout. |
| [`guides/util/`](./docs/guides/util/INDEX.md) | 19 | Utilitários (uuid, base64, hash, deep-equal, gzip, sleep, upgrade…). |
| [`guides/ecosystem/`](./docs/guides/ecosystem/INDEX.md) | 28 | Integrações com frameworks (Next, Astro, Nuxt, Hono, Elysia, Prisma, Drizzle, Sentry…). |
| [`guides/deployment/`](./docs/guides/deployment/INDEX.md) | 6 | Deploy de apps Bun (AWS Lambda, DigitalOcean, Render, Railway, Vercel, Cloud Run). |
| [`guides/html-rewriter/`](./docs/guides/html-rewriter/INDEX.md) | 2 | Manipulação de HTML via HTMLRewriter. |
| [`project/`](./docs/project/INDEX.md) | 6 | Projeto Bun (contributing, license, roadmap, benchmarking, building Windows). |

## Como usar

- **Navegação humana:** comece por este `INDEX.md`, clique numa categoria → caia no `INDEX.md` da pasta → abra o arquivo .md específico.
- **Busca:** `rg <termo> handbook/references/bun/docs` resolve mais rápido que `Ctrl+F` no `llms-full.md` original.
- **Ingestão por LLM:** use o `llms-full.md` (2.0 MB) para passar tudo de uma vez, ou cite arquivos individuais quando o contexto for caro.

## Origem

Gerado automaticamente a partir de `llms-full.md` (baixado de `https://bun.com/llms-full.txt`). Para regenerar após atualizar o `llms-full.md`:

```bash
cd handbook/references/bun
python3 .split.py   # regera docs/**/*.md
python3 .index.py   # regera INDEX.md (raiz + pastas)
```
