#!/usr/bin/env python3
"""Generate INDEX.md at root and per-folder INDEX.md for docs/."""
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent
DOCS = ROOT / "docs"

CATEGORY_DESCRIPTIONS = {
    "_root": "Páginas raiz (welcome, installation, quickstart, typescript).",
    "bundler": "Bundler nativo do Bun: bytecode, CSS, HMR, plugins, executáveis single-file.",
    "guides": "Guias práticos (cookbook) — receitas curtas para tarefas comuns.",
    "guides/binary": "Conversões entre ArrayBuffer, Blob, Buffer, Uint8Array, DataView, string.",
    "guides/deployment": "Deploy de apps Bun (AWS Lambda, DigitalOcean, Render, Railway, Vercel, Cloud Run).",
    "guides/ecosystem": "Integrações com frameworks (Next, Astro, Nuxt, Hono, Elysia, Prisma, Drizzle, Sentry…).",
    "guides/html-rewriter": "Manipulação de HTML via HTMLRewriter.",
    "guides/http": "Servidor HTTP, fetch, SSE, streaming, TLS, FormData, cluster.",
    "guides/install": "bun install — dependências, monorepo, registries customizados, CI.",
    "guides/process": "Spawn, IPC, stdin/stdout, signals, argv.",
    "guides/read-file": "Leitura de arquivos em vários formatos.",
    "guides/runtime": "Runtime: envs, define, codesign, debugger, importação de JSON/TOML/YAML/HTML.",
    "guides/streams": "Conversão de ReadableStream / Node Readable para tipos diversos.",
    "guides/test": "bun test — coverage, snapshot, mock, watch, glob concurrency, happy-dom.",
    "guides/util": "Utilitários (uuid, base64, hash, deep-equal, gzip, sleep, upgrade…).",
    "guides/websocket": "Servidor WebSocket — pubsub, compressão, contexto por socket.",
    "guides/write-file": "Escrita de arquivos, append, FileSink, stdout.",
    "pm": "Package manager: workspaces, catalogs, isolated installs, virtual store, lockfile.",
    "pm/cli": "Comandos CLI do pm (add, install, remove, update, audit, link, publish, why…).",
    "project": "Projeto Bun (contributing, license, roadmap, benchmarking, building Windows).",
    "runtime": "APIs do runtime: Bun.serve, SQL, SQLite, Redis, S3, FFI, Workers, Shell, Cron, Cookies, CSRF…",
    "runtime/http": "Bun.serve em detalhes: server, routing, websockets, TLS, cookies, error handling, metrics.",
    "runtime/networking": "DNS, fetch, TCP, UDP.",
    "runtime/templating": "bun init, bun create.",
    "test": "Test runner: discovery, lifecycle, mocks, snapshots, reporters, DOM, dates.",
}


def extract_meta(path: Path):
    """Return (title, description) from a section .md file."""
    lines = path.read_text().splitlines()
    title = path.stem
    description = ""
    for i, line in enumerate(lines):
        if line.startswith("# ") and not title.startswith(line[2:]):
            title = line[2:].strip()
            break
        if line.startswith("# "):
            title = line[2:].strip()
            break
    if lines and lines[0].startswith("# "):
        title = lines[0][2:].strip()
    for i in range(1, min(len(lines), 8)):
        line = lines[i].strip()
        if not line:
            continue
        if line.startswith("Source:"):
            continue
        description = line
        break
    return title, description


def folder_key(p: Path) -> str:
    rel = p.relative_to(DOCS)
    parts = rel.parts
    if len(parts) == 1:
        return "_root"
    return "/".join(parts[:-1])


all_files = sorted(DOCS.rglob("*.md"))
all_files = [p for p in all_files if p.name != "INDEX.md"]

by_folder: dict[str, list[Path]] = defaultdict(list)
for p in all_files:
    by_folder[folder_key(p)].append(p)

for folder, files in by_folder.items():
    target_dir = DOCS if folder == "_root" else DOCS / folder
    index_path = target_dir / "INDEX.md"
    title = "Bun Docs — Raiz" if folder == "_root" else f"Bun Docs — `{folder}`"
    desc = CATEGORY_DESCRIPTIONS.get(folder, "")
    lines = [f"# {title}", ""]
    if desc:
        lines += [desc, ""]
    lines += [f"**{len(files)}** página(s) nesta seção.", "", "| Arquivo | Título | Descrição |", "|---|---|---|"]
    for p in sorted(files):
        t, d = extract_meta(p)
        rel = p.name
        d_short = (d[:120] + "…") if len(d) > 120 else d
        d_short = d_short.replace("|", "\\|")
        t_safe = t.replace("|", "\\|")
        lines.append(f"| [`{rel}`](./{rel}) | {t_safe} | {d_short} |")
    lines.append("")
    index_path.write_text("\n".join(lines))
    print(f"wrote {index_path.relative_to(ROOT)}")

root_lines = [
    "# Bun Docs — Índice Mestre",
    "",
    "Documentação completa do Bun separada em arquivos .md por seção, espelhando a estrutura de URL de `bun.com/docs/`.",
    "",
    f"**Total:** {len(all_files)} páginas em {len(by_folder)} categorias.",
    "",
    "## Categorias",
    "",
    "| Categoria | Páginas | Descrição |",
    "|---|---:|---|",
]

ordered_folders = ["_root", "runtime", "runtime/http", "runtime/networking", "runtime/templating",
                   "bundler", "pm", "pm/cli", "test", "guides", "guides/http", "guides/websocket",
                   "guides/install", "guides/test", "guides/runtime", "guides/process", "guides/streams",
                   "guides/binary", "guides/read-file", "guides/write-file", "guides/util",
                   "guides/ecosystem", "guides/deployment", "guides/html-rewriter", "project"]
seen = set()
for folder in ordered_folders:
    if folder not in by_folder:
        continue
    seen.add(folder)
    files = by_folder[folder]
    desc = CATEGORY_DESCRIPTIONS.get(folder, "")
    rel = "." if folder == "_root" else folder
    root_lines.append(f"| [`{rel}/`](./docs/{'' if folder == '_root' else folder + '/'}INDEX.md) | {len(files)} | {desc} |")
for folder, files in by_folder.items():
    if folder in seen:
        continue
    desc = CATEGORY_DESCRIPTIONS.get(folder, "")
    root_lines.append(f"| [`{folder}/`](./docs/{folder}/INDEX.md) | {len(files)} | {desc} |")

root_lines += [
    "",
    "## Como usar",
    "",
    "- **Navegação humana:** comece por este `INDEX.md`, clique numa categoria → caia no `INDEX.md` da pasta → abra o arquivo .md específico.",
    "- **Busca:** `rg <termo> handbook/references/bun/docs` resolve mais rápido que `Ctrl+F` no `llms-full.md` original.",
    "- **Ingestão por LLM:** use o `llms-full.md` (2.0 MB) para passar tudo de uma vez, ou cite arquivos individuais quando o contexto for caro.",
    "",
    "## Origem",
    "",
    "Gerado automaticamente a partir de `llms-full.md` (baixado de `https://bun.com/llms-full.txt`). Para regenerar após atualizar o `llms-full.md`:",
    "",
    "```bash",
    "cd handbook/references/bun",
    "python3 .split.py   # regera docs/**/*.md",
    "python3 .index.py   # regera INDEX.md (raiz + pastas)",
    "```",
    "",
]
(ROOT / "INDEX.md").write_text("\n".join(root_lines))
print(f"wrote INDEX.md (root)")
