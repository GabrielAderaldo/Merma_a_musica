# Architecture Decision Records (ADRs)

Um ADR documenta **uma decisão arquitetural** — o contexto que levou a ela, a decisão tomada, alternativas consideradas e suas consequências. ADRs ajudam a entender **por que** o projeto está estruturado de determinada forma, especialmente para quem chega depois.

> Esta pasta usa o formato curto popularizado por [Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions). Cada arquivo cobre **uma única decisão** — se está documentando duas, são dois ADRs.

## Índice

| # | Status | Decisão | Data |
|---:|---|---|---|
| [0001](0001-runtime-bun-and-ts-6.md) | accepted | Runtime: Bun + TypeScript 6.0 strict | 2026-05-13 |
| [0002](0002-server-hono.md) | accepted | Server HTTP/WS: Hono | 2026-05-13 |
| [0003](0003-no-framework-frontend.md) | superseded by 0008 | Frontend sem framework (Vanilla TS + MVVM) | 2026-05-13 |
| [0004](0004-audio-deezer-as-engine.md) | accepted | Áudio universal via Deezer (ISRC-first) | 2026-05-13 |
| [0005](0005-monorepo-bun-workspaces.md) | accepted | Monorepo com Bun Workspaces | 2026-05-13 |
| [0006](0006-postgres-drizzle.md) | accepted | Banco: PostgreSQL + Drizzle | 2026-05-13 |
| [0007](0007-fuzzy-match-levenshtein.md) | accepted | Fuzzy match in-house (Levenshtein) | 2026-05-13 |
| [0008](0008-frontend-solidjs.md) | accepted | Frontend reativo com SolidJS (supersedes 0003) | 2026-05-13 |
| [0009](0009-redis-snapshot.md) | accepted | Snapshot de partida ativa em Redis | 2026-05-13 |
| [0010](0010-observability-minimal.md) | accepted | Observabilidade minimalista (stdout JSON + Sentry + /metrics) | 2026-05-13 |

## Status possíveis

- **proposed** — em discussão, não implementar ainda.
- **accepted** — decisão aceita, deve refletir no código.
- **superseded by ADR-XXXX** — substituída por outra; manter para histórico.
- **deprecated** — descontinuada sem substituto.

## Regras

1. **Um ADR = uma decisão.** Não use para checklists ou notas soltas.
2. **ADR aceito é imutável.** Para mudar uma decisão, escreva um novo ADR que `supersede`s o anterior — não edite o antigo.
3. **Numeração sequencial de 4 dígitos.** Próximo é `0008`. Não pular números mesmo após `superseded`.
4. **Nome do arquivo:** `NNNN-kebab-case-do-assunto.md`. Não renomear depois de aceito.
5. **Mantenha curto.** ADR não é um whitepaper. 1–2 páginas no máximo. Se precisar de muito mais, é provavelmente porque está misturando decisões.

## Template

Use [`_template.md`](_template.md) para criar um novo ADR. Resumo do conteúdo:

```markdown
# ADR NNNN: Título imperativo (ex: "Usar X em vez de Y")

- **Status:** accepted | proposed | superseded by ADR-XXXX | deprecated
- **Data:** YYYY-MM-DD
- **Decisores:** quem participou da decisão

## Contexto

Descrição do problema/pressão que está forçando a decisão. Faz nesse parágrafo a "force" — o que está em jogo, o que precisamos otimizar, qual o trade-off central.

## Decisão

A escolha em uma frase clara. Detalhes técnicos relevantes em seguida.

## Alternativas consideradas

Lista das outras opções avaliadas, com **um motivo claro por que cada uma foi rejeitada**.

## Consequências

- **Positivas:** o que ganhamos com essa escolha.
- **Negativas / trade-offs:** o que abrimos mão. Riscos.
- **Neutras:** mudanças operacionais que não são nem bom nem ruim, só são.

## Notas

Links para discussões, benchmarks, prototipos. Mudanças no status (ex: "superseded em 2027-XX por ADR-00XX").
```

## Como usar

- Antes de tomar uma decisão arquitetural não-trivial, **abra um ADR como `proposed`**. Vale como "RFC" interno.
- Depois de discutir e decidir, mude o status para `accepted` e commite. Não fica como `proposed` indefinidamente.
- Se for adicionar pacote novo, mudar protocolo entre serviços, mudar contrato persistente, mudar provedor externo, definir estratégia de segurança ou anti-cheat — **tem que ter ADR**.
- Decisões pequenas (formato de log, nome de variável, biblioteca utilitária trivial) não precisam de ADR.
