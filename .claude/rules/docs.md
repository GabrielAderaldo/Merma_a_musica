---
paths:
  - "docs/**"
  - "CLAUDE.md"
  - ".claude/**"
---
<!-- Regra por caminho. Por que este formato: docs/adr/0012-documentacao-executavel-para-agentes.md -->
# Editando docs e harness (ADR-0022)

- Só escreva o que um agente **não** consegue descobrir lendo o código ou a config. Nada de mapa de pastas, tutorial ou cópia de doc de lib.
- Fato que muda (versão, limite, URL de API) leva data (`aferido em AAAA-MM-DD`) ou um `Check:` que o verifique.
- GDD: regra nova recebe o próximo `R-NNN` livre da seção. ID nunca se reaproveita; regra removida vira `R-NNN (removida em AAAA-MM-DD)`.
- ADR `accepted`: o corpo é imutável. Para mudar, crie um ADR novo com `/new-adr`. Você nunca marca `accepted` sem decisão explícita do mantenedor.
- Ao escrever o verificador de uma restrição, cite o ID (`ADR-NNNN.Rn`) no nome do teste, num comentário ou na `message` do lint. O ADR não muda: o `docs:check` acha a citação. Restrição sem verificador: `Check: pendente (<caminho onde ele nasce>) — …`.
- Spec em `docs/specs/` tem prazo (`until:`). Quando o pacote nascer, migre para tipos e testes e apague.
- Achou uma contradição: pergunte ao mantenedor com as opções, os tradeoffs e as fontes. Não resolva sozinho.
- Rode `bun run docs:check` depois de editar.
- Mecanismos do harness: rules → https://code.claude.com/docs/pt/memory · skills → https://code.claude.com/docs/pt/skills · hooks → https://code.claude.com/docs/pt/hooks-guide
