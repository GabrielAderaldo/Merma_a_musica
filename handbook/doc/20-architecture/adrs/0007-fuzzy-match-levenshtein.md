# ADR 0007: Fuzzy match in-house (Levenshtein)

- **Status:** accepted
- **Data:** 2026-05-13
- **Decisores:** core

## Contexto

O jogo valida respostas em texto livre tolerando erros de digitação ("Bheemian Rapsody" → match com "Bohemian Rhapsody"). A validação:

- Precisa rodar **no backend** (cliente nunca sabe se acertou até o `round_ended`).
- Deve ser **rápida** (chamada potencialmente N vezes por rodada — jogador atualiza resposta).
- Tem regras de **normalização** que precedem o match: minúsculas, sem acentos, sem artigos (`o, a, os, as, the, el, la`), sem conteúdo entre `()` e `[]`.
- Threshold definido pelo GDD: até **1–2 erros de digitação** são aceitos.

## Decisão

Implementar **Levenshtein Distance in-house** em `packages/domain/fuzzy/`, com pipeline:

```
input do jogador ─► normalize() ─► levenshtein(input_norm, target_norm) ─► distance ≤ threshold?
                                                                              │
target (song.name              ┘                                        ┌─────┴─────┐
       ou song.artist                                                   true (match) │
       ou ambos no modo BOTH)                                           false        │
```

**Threshold:** `distance ≤ max(1, floor(len(target_norm) * 0.15))` — ou seja, ~15% de erro, mínimo 1. Para "Bohemian Rhapsody" (17 chars), tolera até 2 erros. Para "Yes" (3 chars), tolera apenas 1.

**Função pública:**
```typescript
type FuzzyMatchResult = {
  matched: boolean;
  distance: number;
  normalized_input: string;
  normalized_target: string;
};

function fuzzyMatch(input: string, target: string): FuzzyMatchResult;
```

Zero dependências externas — função pura, ~50 linhas de TS.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Lib npm `fast-levenshtein` ou `js-levenshtein`** | Adiciona dependência para algoritmo de ~30 linhas. Política do projeto é "internal-first" para utilitários simples. |
| **Damerau-Levenshtein** (também conta transposição de chars adjacentes) | Marginalmente mais "humano" (ex: "rhapsdoy" → "rhapsody"), mas o ganho UX é pequeno e a implementação dobra de complexidade. Reconsiderar se players reclamarem. |
| **Jaro-Winkler** | Bom para nomes próprios curtos; pior para frases longas como títulos. Não é o melhor fit para nosso domínio (títulos de música variam muito de tamanho). |
| **Algoritmo de busca completa (BM25, embeddings)** | Overkill — não estamos fazendo search engine, estamos comparando string contra string conhecida. Custo computacional não justifica. |
| **Validação no frontend** | Inaceitável — abre canal trivial de cheat (rodar fuzzy match local, mudar threshold, confirmar acertos sem submeter). Validação **só** no backend. |

## Consequências

- **Positivas:**
  - Controle total da heurística — ajustar threshold, adicionar exceções (ex: ignorar "feat.") é mudança de uma função, sem upgrade de lib.
  - Zero dependência externa para uma operação core.
  - Testável em isolamento (`bun test packages/domain/fuzzy/`).
  - Performance ótima para nosso tamanho de input (títulos < 100 chars): O(m*n) com m, n pequenos é trivial.
- **Negativas / trade-offs:**
  - Manter um pequeno algoritmo nosso = responsabilidade nossa por bugs. Mitigação: cobertura de teste alta + casos de borda documentados (acentos, emojis em nomes, strings vazias).
  - Threshold fixo pode não satisfazer todo mundo — ajuste futuro pode exigir A/B test ou config por host.
- **Neutras:**
  - A normalização vive **junto** do match no mesmo módulo; mudar normalização sem mudar match é refatoração rápida.

## Notas

- Especificação detalhada do algoritmo, casos de teste e exemplos em [`30-specs/01-engine.md`](../../30-specs/01-engine.md) (a criar na F5).
- Decisão de **não fazer fuzzy match no autocomplete** (autocomplete usa busca substring direta no pool) — autocomplete é prefixo simples, fuzzy só faz sentido na validação final.
