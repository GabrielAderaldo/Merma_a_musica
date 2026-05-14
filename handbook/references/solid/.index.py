#!/usr/bin/env python3
"""Generate INDEX.md at root and per-folder INDEX.md for solid docs/.

Each .md/.mdx file has YAML frontmatter with `title` and `description`.
"""
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent
DOCS = ROOT / "docs"

CATEGORY_DESCRIPTIONS = {
    "_root": "Páginas raiz (index, quick-start).",
    "concepts": "Conceitos fundamentais: signals, effects, stores, refs, JSX.",
    "concepts/components": "Componentes do Solid (props, children, lifecycle).",
    "concepts/control-flow": "<Show>, <For>, <Index>, <Switch>, <ErrorBoundary>.",
    "concepts/derived-values": "createMemo, derived signals.",
    "advanced-concepts": "Fine-grained reactivity por dentro.",
    "guides": "Guias: state management, routing, fetching, styling, testing, deploy.",
    "guides/deployment-options": "Deploy do Solid em provedores (Cloudflare, Netlify, Vercel...).",
    "guides/styling-components": "Tailwind, CSS Modules, Styled, etc.",
    "configuration": "TypeScript config, Vite/Bun bundler.",
    "reference": "API reference completa.",
    "reference/basic-reactivity": "createSignal, createMemo, createEffect, createComputed.",
    "reference/component-apis": "createContext, useContext, lazy, mergeProps, splitProps.",
    "reference/components": "<For>, <Show>, <Switch>, <Index>, <Dynamic>, <ErrorBoundary>, <Suspense>, <Portal>...",
    "reference/jsx-attributes": "ref, classList, style, on:, prop:, attr:, use:...",
    "reference/lifecycle": "onMount, onCleanup.",
    "reference/reactive-utilities": "batch, untrack, on, createDeferred, createRoot, getOwner...",
    "reference/rendering": "render, hydrate, renderToString, isServer.",
    "reference/secondary-primitives": "createSelector, createReaction, createUniqueId.",
    "reference/server-utilities": "isServer.",
    "reference/store-utilities": "createStore, produce, reconcile, unwrap.",
    "solid-router": "Solid Router — roteamento client/SSR/SSG.",
    "solid-router/concepts": "Conceitos do router.",
    "solid-router/getting-started": "Início rápido do router.",
    "solid-router/data-fetching": "Loaders, actions, cache, mutações.",
    "solid-router/data-fetching/how-to": "Patterns de fetching.",
    "solid-router/rendering-modes": "CSR, SSR, SSG.",
    "solid-router/advanced-concepts": "Patterns avançados.",
    "solid-router/guides": "Guias do router.",
    "solid-router/reference/components": "<Router>, <Route>, <A>, <Outlet>, <Navigate>...",
    "solid-router/reference/data-apis": "query, action, redirect, reload, revalidate, json...",
    "solid-router/reference/preload-functions": "preload no router.",
    "solid-router/reference/primitives": "useLocation, useNavigate, useParams, useSearchParams...",
    "solid-router/reference/response-helpers": "Helpers de resposta (json, redirect, etc.).",
    "solid-start": "SolidStart — meta-framework com SSR. **Não usamos no Mermã** — referência geral.",
    "solid-start/building-your-application": "Estrutura, rotas, layouts.",
    "solid-start/advanced": "API routes, sessions, middleware.",
    "solid-start/guides": "Deploy, autenticação.",
    "solid-start/reference/client": "API client.",
    "solid-start/reference/config": "Config.",
    "solid-start/reference/entrypoints": "Entry points.",
    "solid-start/reference/routing": "Routing reference.",
    "solid-start/reference/server": "Server utilities.",
    "solid-meta": "@solidjs/meta — <Title>, <Meta>, <Link> (head tags).",
    "solid-meta/getting-started": "Setup do solid-meta.",
    "solid-meta/reference/meta": "API de meta tags.",
    "v2": "Solid 2.0 (em alpha) — referência futura. **Não usamos no MVP**.",
    "v2/reference/basic-reactivity": "Signals na v2.",
}

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
TITLE_RE = re.compile(r"^title:\s*(.+?)\s*$", re.MULTILINE)
DESC_RE = re.compile(r"^description:\s*(?:>-?\s*\n((?:\s{2,}.+\n)+)|(.+))\s*$", re.MULTILINE)


def extract_meta(path: Path):
    text = path.read_text()
    m = FRONTMATTER_RE.match(text)
    title = path.stem
    description = ""
    if m:
        fm = m.group(1)
        tm = TITLE_RE.search(fm)
        if tm:
            title = tm.group(1).strip().strip('"').strip("'")
        dm = DESC_RE.search(fm)
        if dm:
            multi = dm.group(1)
            inline = dm.group(2)
            if multi:
                description = " ".join(line.strip() for line in multi.strip().splitlines())
            else:
                description = inline.strip().strip('"').strip("'")
    return title, description


def folder_key(p: Path) -> str:
    rel = p.relative_to(DOCS)
    parts = rel.parts
    return "/".join(parts[:-1]) if len(parts) > 1 else "_root"


all_files = sorted(DOCS.rglob("*.md"))
all_files = [p for p in all_files if p.name != "INDEX.md"]

by_folder: dict[str, list[Path]] = defaultdict(list)
for p in all_files:
    by_folder[folder_key(p)].append(p)


def cell(s: str, limit: int = 140) -> str:
    s = (s or "").replace("\n", " ").replace("|", "\\|")
    if len(s) > limit:
        s = s[: limit - 1] + "…"
    return s


for folder, files in by_folder.items():
    target_dir = DOCS if folder == "_root" else DOCS / folder
    index_path = target_dir / "INDEX.md"
    title = "Solid Docs — Raiz" if folder == "_root" else f"Solid Docs — `{folder}`"
    desc = CATEGORY_DESCRIPTIONS.get(folder, "")
    lines = [f"# {title}", ""]
    if desc:
        lines += [desc, ""]
    lines += [f"**{len(files)}** página(s) nesta seção.", "", "| Arquivo | Título | Descrição |", "|---|---|---|"]
    for p in sorted(files):
        t, d = extract_meta(p)
        lines.append(f"| [`{p.name}`](./{p.name}) | {cell(t, 60)} | {cell(d)} |")
    lines.append("")
    index_path.write_text("\n".join(lines))
    print(f"wrote {index_path.relative_to(ROOT)}")

# Root INDEX.md
ordered = [
    "_root", "concepts", "concepts/components", "concepts/control-flow",
    "concepts/derived-values", "advanced-concepts",
    "guides", "guides/styling-components", "guides/deployment-options",
    "configuration",
    "reference", "reference/basic-reactivity", "reference/component-apis",
    "reference/components", "reference/jsx-attributes", "reference/lifecycle",
    "reference/reactive-utilities", "reference/rendering",
    "reference/secondary-primitives", "reference/server-utilities",
    "reference/store-utilities",
    "solid-router", "solid-router/getting-started", "solid-router/concepts",
    "solid-router/data-fetching", "solid-router/data-fetching/how-to",
    "solid-router/rendering-modes", "solid-router/advanced-concepts",
    "solid-router/guides", "solid-router/reference/components",
    "solid-router/reference/data-apis", "solid-router/reference/preload-functions",
    "solid-router/reference/primitives", "solid-router/reference/response-helpers",
    "solid-meta", "solid-meta/getting-started", "solid-meta/reference/meta",
    "solid-start", "solid-start/building-your-application",
    "solid-start/advanced", "solid-start/guides",
    "solid-start/reference/client", "solid-start/reference/config",
    "solid-start/reference/entrypoints", "solid-start/reference/routing",
    "solid-start/reference/server",
    "v2", "v2/reference/basic-reactivity",
]
root_lines = [
    "# Solid Docs — Índice Mestre",
    "",
    "Documentação completa do Solid (Solid core + Solid Router + Solid Meta + SolidStart), separada em arquivos `.md` por seção, espelhando a estrutura de `docs.solidjs.com`.",
    "",
    f"**Total:** {len(all_files)} páginas em {len(by_folder)} categorias.",
    "",
    "## Categorias",
    "",
    "| Categoria | Páginas | Descrição |",
    "|---|---:|---|",
]
seen = set()
for folder in ordered:
    if folder not in by_folder:
        continue
    seen.add(folder)
    files = by_folder[folder]
    desc = CATEGORY_DESCRIPTIONS.get(folder, "")
    rel = "." if folder == "_root" else folder
    target = "./docs/" if folder == "_root" else f"./docs/{folder}/"
    root_lines.append(f"| [`{rel}/`]({target}INDEX.md) | {len(files)} | {desc} |")
for folder, files in by_folder.items():
    if folder in seen:
        continue
    desc = CATEGORY_DESCRIPTIONS.get(folder, "")
    root_lines.append(f"| [`{folder}/`](./docs/{folder}/INDEX.md) | {len(files)} | {desc} |")

root_lines += [
    "",
    "## Como usar",
    "",
    "- **Navegação humana:** comece aqui, clique numa categoria → caia no `INDEX.md` da pasta → abra o arquivo `.md` específico.",
    "- **Busca:** `rg <termo> handbook/references/solid/docs` resolve mais rápido que qualquer outra coisa.",
    "- **Decisões do Mermã sobre Solid:** ver [`adrs/0008`](../../doc/20-architecture/adrs/0008-frontend-solidjs.md). Em curto: usaremos **Solid 1.x** + `@solidjs/router`. **Não** usamos SolidStart (sem SSR). **Não** usamos Solid 2.x (em alpha).",
    "",
    "## Origem",
    "",
    "Gerado a partir do repositório oficial `github.com/solidjs/solid-docs` (clone shallow), pasta `src/routes/**/*.mdx`. Os prefixos `(N)` de SolidStart route groups foram removidos dos caminhos para legibilidade humana. Para regenerar após atualizar:",
    "",
    "```bash",
    "cd /tmp && [ -d solid-docs ] && rm -r solid-docs; \\",
    "  git clone --depth 1 https://github.com/solidjs/solid-docs.git",
    "cd handbook/references/solid",
    "python3 .split.py   # regera docs/**/*.md a partir de /tmp/solid-docs",
    "python3 .index.py   # regera INDEX.md raiz + INDEX.md por pasta",
    "```",
    "",
]
(ROOT / "INDEX.md").write_text("\n".join(root_lines))
print("wrote INDEX.md (root)")
