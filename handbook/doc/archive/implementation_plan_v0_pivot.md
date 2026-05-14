# 🚀 Pivot Tecnológico: Vanilla TS 6.0 "By-the-book" & Zero node_modules

O objetivo é transformar "Mermã, a Música!" em uma referência de **Engenharia de Software de Alto Nível** usando **Vanilla TypeScript 6.0** e o runtime **Bun**.

## 🏗️ Filosofia de Engenharia (TS 6.0)

Seguiremos o rigor técnico exigido em grandes empresas (Stripe, Vercel), mas sem a complexidade de orquestradores externos:

1.  **Result Type Pattern**: Nada de `try/catch` genérico. Toda função de negócio retornará um tipo `Result<Success, Failure>`, forçando o tratamento de erros em tempo de compilação.
2.  **Branded Types**: Uso de `Unique Brand` para IDs e strings críticas (ex: `SongId`, `UserId`), garantindo segurança nominal.
3.  **Dependency Injection via Curry/Constructors**: Padrões simples de DI.
4.  **Immutability by Default**: Uso de tipos `readonly` e estruturas imutáveis.

## 🛠️ Stack Tecnológica & Lei Zero node_modules

> [!IMPORTANT]
> **Lei Zero node_modules**: Não manteremos a pasta `node_modules` no repositório nem localmente. O Bun resolverá todas as dependências on-the-fly usando seu algoritmo de **Auto-install** e cache global.

| Camada | Tecnologia Escolhida | Justificativa |
| :--- | :--- | :--- |
| **Runtime** | **Bun** | Suporte nativo a TS 6.0 e resolução de dependências sem `node_modules`. |
| **Backend Core** | **Vanilla TS 6.0** | Lógica pura, sem frameworks de orquestração. |
| **Web Server** | **Hono** | Interface ultra-leve para roteamento HTTP e WebSockets. |
| **Database** | **PostgreSQL + Drizzle** | Type-safety direto no SQL. |
| **Contratos** | **Zod** | Validação rígida e derivação de tipos. |

## 📦 Estrutura de Monorepo (Bun Workspaces)

- `apps/api`: Backend real-time (Hono + TS 6.0).
- `apps/web`: Frontend (Vanilla TS + Tailwind).
- `packages/domain`: O "Cérebro" (Padrões funcionais, Zero dependências externas).
- `packages/schema`: Contratos Zod compartilhados.

---

## 📈 Próximos Passos (Imediato)

1.  **Setup do Monorepo**: Configurar `package.json` raiz e workspaces (Concluído).
2.  **Rigor Técnico**: Aplicar `rm -rf node_modules` em todo o projeto e validar execução via `bun run` (Concluído).
3.  **Domain Refactoring**: Migrar a lógica de `Match` de Gleam para TS 6.0 usando `Result` e `Branded Types`.
