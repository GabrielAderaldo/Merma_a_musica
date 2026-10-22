---
name: design-pattern
description: Cria, muda ou remove um pattern de UI (atom, molecule, organism, template ou page) no Penpot pelo método Atomic Design — classificar, ler a linhagem, construir de baixo para cima com tokens, documentar a ficha e verificar. Use sempre que um pedido mexer num componente, numa tela ou no design system.
argument-hint: "<pattern e mudança, ex.: 'Button: variante danger' ou 'template do Lobby'>"
---
<!-- Skill: carregada só quando usada. https://code.claude.com/docs/pt/skills · Método: docs/design/atomic-design.md (ADR-0019) -->

# Pattern de UI (Atomic Design)

Pedido: $ARGUMENTS

Pré-requisito: MCP `penpot` conectado. Se der `No Penpot instance connected` ou "suspended", siga os problemas conhecidos de `docs/design/penpot.md`.

1. **Classifique** o pattern pelo teste de `docs/design/atomic-design.md` (§ Os níveis). Na dúvida, fica o nível mais baixo. Confira o nome: ele diz a estrutura, não o lugar (ADR-0019.R3).
2. **Leia antes de escrever** (ADR-0018.R3): o brief (§6 da tela, §7 do catálogo, §8 dos tokens) e o estado atual do Penpot. Se o pattern já existe, rode a linhagem (abaixo) e liste o que vai ser afetado.
3. **Se o pedido contradiz o brief, o GDD ou um ADR**, pare e pergunte ao mantenedor com `AskUserQuestion`: opções, tradeoffs e fontes. Pattern novo que é só uma variante de outro vira variante (§ Ciclo de vida).
4. **Descreva a mudança** ao mantenedor antes de escrever em lote: o que é criado, alterado ou movido, e em que página do Penpot.
5. **Construa de baixo para cima:** falta token → crie o token (nada de hex ou px solto). Falta um pattern de nível menor → crie esse primeiro, com esta mesma skill. Componha só para baixo (ADR-0019.R2).
6. **No Penpot:** o componente principal fica na página do nível (`Atoms`, `Molecules`, `Organisms`, `Templates` ou `Pages`). Variantes viram propriedades (`variant`, `size`, `state`). Ao lado dele, escreva a ficha: descrição, uso, estados e variantes, a11y e tokens.
7. **Page:** preencha com conteúdo real e cubra as variações de `atomic-design.md` (§ Pages) que se aplicam à tela.
8. **Verifique:** `export_shape` do resultado em 360px e em desktop, contraste AA e alvo ≥ 48px. Rode a linhagem de novo e confira cada tela que usa o pattern.
9. **Atualize o catálogo** do brief §7 se o pattern for novo, mudar de nível ou for para `deprecated`. Rode `bun run docs:check`.

## Linhagem (pelo MCP)

Guarda `storage.lineage` e devolve, para cada componente, de que ele é feito (`madeOf`) e onde é usado (`usedIn`):

```js
const owner = (s) => { let p = s.parent; while (p && !p.isMainComponent?.() && p.parent && p.parent.parent) p = p.parent; return p?.name ?? "(raiz)"; };
storage.lineage = (comp) => {
  const main = comp.mainInstance();
  const usedIn = penpotUtils.findShapes(s => s.id !== main?.id && !s.isMainComponent?.() && s.component?.()?.id === comp.id).map(owner);
  const madeOf = main ? penpotUtils.findShapes(s => s.id !== main.id && s.component?.() != null, main).map(s => s.component().name) : [];
  return { name: comp.name, path: comp.path, madeOf: [...new Set(madeOf)], usedIn: [...new Set(usedIn)] };
};
return penpot.library.local.components.map(storage.lineage);
```

Use também para auditar: pattern com `usedIn` vazio que não seja page é candidato a `deprecated`. Um `madeOf` com nível igual ou maior que o do pattern (exceto organism dentro de organism) viola o ADR-0019.R2.
