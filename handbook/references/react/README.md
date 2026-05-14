# React Docs Snapshot (oficial, via `llms.txt`)

**Fonte:** `https://react.dev/llms.txt` (mantido pelo time React/Meta; PR #8267 de Dan Abramov, merged 2026-01-28).
**Versão capturada:** doc viva — reflete React 19+ com Compiler, RSC directives, novos hooks (`useActionState`, `useOptimistic`), `<Activity>`, `<ViewTransition>`, `cache`, `cacheSignal`, `use`, etc.
**Data do snapshot:** 2026-05-12
**Arquivos:** 177 `.md` + 1 `llms.txt` (índice)
**Tamanho:** ~3.2 MB

## Por que existe

Suporte ao **ADR-024 (Web App Stack — Vite + React 19 + TS 6)**. Tem três usos:

1. **Onboarding offline.** Devs novos lêem direto do repo sem precisar de internet.
2. **Contexto para LLM/AI assistants.** Carregar este snapshot dá ao modelo a versão exata do React que estamos usando, sem confiar em conhecimento de treino possivelmente desatualizado.
3. **Garantia de versão.** Quando React lançar 19.3, 20.x, etc, este snapshot fica congelado — mudanças quebrantes ficam visíveis em diff.

## Estrutura (espelha `react.dev`)

```
react/
├── README.md                          (este arquivo)
├── llms.txt                           (índice navegável original)
├── learn.md                           (raiz do Learn)
├── learn/                             (46 tutoriais)
│   ├── tutorial-tic-tac-toe.md
│   ├── thinking-in-react.md
│   ├── installation.md
│   ├── creating-a-react-app.md
│   ├── typescript.md
│   ├── your-first-component.md
│   ├── ... (Describing/Adding Interactivity/Managing State/Escape Hatches)
│   └── react-compiler/                (4 tutoriais do compiler)
└── reference/                         (APIs)
    ├── react.md                       (raiz da API React)
    ├── react/                         (48 arquivos)
    │   ├── hooks.md
    │   ├── useState.md
    │   ├── useEffect.md
    │   ├── useActionState.md          ← React 19
    │   ├── useOptimistic.md           ← React 19
    │   ├── Activity.md                ← React 19
    │   ├── ViewTransition.md          ← React 19
    │   ├── ... (todos os hooks, components, APIs, legacy)
    ├── react-dom.md
    ├── react-dom/                     (13 + subpastas)
    │   ├── hooks/                     (useFormStatus)
    │   ├── components/                (form, input, link, meta, script, ...)
    │   ├── client/                    (createRoot, hydrateRoot)
    │   ├── server/                    (renderTo*, resume*)
    │   └── static/                    (prerender*)
    ├── react-compiler/                (8 + directives)
    │   ├── configuration.md
    │   ├── compilationMode.md
    │   └── directives/                (use memo, use no memo)
    ├── eslint-plugin-react-hooks/
    │   └── lints/                     (17 lints)
    ├── rsc/                           (5 — Server Components, Server Functions, use client/server)
    ├── rules/                         (3 — purity, components-and-hooks-must-be-pure, rules-of-hooks)
    └── dev-tools/                     (react-performance-tracks)
```

## Como atualizar

Quando React lançar nova versão (e quisermos refletir aqui), rode o script abaixo a partir da raiz do monorepo:

```bash
# Re-pull all React docs from llms.txt (preserves structure)
cd handbook/references/react
curl -fsSL https://react.dev/llms.txt -o llms.txt
grep -oE 'https://react\.dev/[^)]+\.md' llms.txt | sort -u > /tmp/react-urls.txt
cat /tmp/react-urls.txt | xargs -I {} -P 8 bash -c '
  url="$1"
  path="${url#https://react.dev/}"
  dir=$(dirname "$path")
  [ "$dir" != "." ] && mkdir -p "$dir"
  curl -fsSL --retry 2 --max-time 20 "$url" -o "$path" || echo "FAILED: $url" >&2
' _ {}

# Verify
find . -name "*.md" -not -name "llms.txt" | wc -l
# Expected ~177 (may grow if React adds new pages)
```

Após o pull, commit `docs(handbook): refresh React docs snapshot (react@X.Y.Z, YYYY-MM-DD)` registrando a versão e a data.

## Consumir do snapshot

### Por humanos

Abrir qualquer `.md` direto no editor — é Markdown puro, com exemplos de código, headings preservados, links internos relativos.

### Por LLM/AI agents

Duas estratégias:

**(a) índice → fetch específico:**

```
1. Modelo lê handbook/references/react/llms.txt
2. Identifica a página relevante (ex: "useState")
3. Lê handbook/references/react/reference/react/useState.md
```

**(b) bundle completo:**

```bash
# Concatena tudo num único arquivo (~3.2 MB)
cd handbook/references/react
{
  echo "# React 19 — Full Documentation Bundle"
  echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  find . -name "*.md" -not -name "README.md" -not -name "llms.txt" \
    | sort | while read f; do
      echo "---"
      echo "# Source: $f"
      echo "---"
      cat "$f"
      echo
    done
} > /tmp/react-full-bundle.md
wc -l /tmp/react-full-bundle.md
```

Usar como contexto único pra LLM (Claude, Gemini, etc).

## O que NÃO está aqui

- Ecossistema React (TanStack, React Router, Hook Form, Radix, etc) — esses serão pulled em pastas separadas conforme cada um entrar no escopo da Phase 6+.
- Vite, Bun, TypeScript — idem.
- Imagens, GIFs, vídeos do site original — só Markdown puro.
- Source maps das demos interativas — não fazem sentido em snapshot offline.

## Licença

A documentação do React é **MIT** ([github.com/reactjs/react.dev](https://github.com/reactjs/react.dev)). Snapshot mantido para uso interno do projeto ACDG conforme termos da licença.
