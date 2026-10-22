---
paths:
  - "docs/design/**"
---
<!-- Regra por caminho. https://code.claude.com/docs/pt/memory -->
# docs/design — Atomic Design no Penpot (ADR-0018, ADR-0019)

- Método: `docs/design/atomic-design.md`. Operação do Penpot: `docs/design/penpot.md`. Para criar ou mudar pattern, use a skill `/design-pattern`.
- Níveis: atoms → molecules → organisms → templates → pages, com os tokens por baixo. Composição só para baixo. Na dúvida, fica o nível mais baixo.
- O catálogo do brief §7 se organiza por nível. Pattern novo, que mudou de nível ou foi para `deprecated` atualiza o catálogo.
- "page" é o nível do método. A aba do arquivo é "página do Penpot". Não misture os dois.
- A linhagem não se escreve em doc: calcula-se pelo MCP.
