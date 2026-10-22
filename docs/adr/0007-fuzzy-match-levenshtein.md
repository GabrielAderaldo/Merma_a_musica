---
id: ADR-0007
title: Fuzzy match com Levenshtein próprio, só no servidor
status: accepted
date: 2026-05-13
revised: 2026-10-21
scope: ["packages/domain/**"]
revisit_when: "Jogadores reclamarem de rejeição injusta (ex.: letras trocadas, que pediriam Damerau-Levenshtein)"
---

# ADR-0007 — Fuzzy match com Levenshtein próprio, só no servidor

## Contexto

As respostas são texto livre e devem tolerar erro de digitação. A validação precisa rodar no servidor (o cliente não pode saber se acertou) e ser barata: o jogador troca de resposta várias vezes.

## Decisão

Levenshtein implementado no próprio `packages/domain`, sem dependência, aplicado depois da normalização. As regras exatas (normalização, limite, `near_miss`, `both`) estão no GDD, R-111 a R-114. O autocomplete **não** usa fuzzy: é substring sobre o pool (R-104).

## Restrições

- **ADR-0007.R1** MUST NOT rodar fuzzy match nem expor o limite no cliente. — Check: `.oxlintrc.json` (`apps/web` não importa `@merma/domain`) + teste de schema (S-21)
- **ADR-0007.R2** MUST cobrir as tabelas de casos do GDD (R-111 a R-114) com `test.each` que cita o ID da regra. — Check: pendente — `bun test packages/domain`

## Consequências

- A heurística é nossa: ajustar o limite ou ignorar "feat." é mudar uma função. Os bugs também são nossos, daí a tabela de casos obrigatória.
- Um limite fixo não agrada todo mundo. Torná-lo configurável pelo host fica para depois do MVP.

## Alternativas descartadas

- `fast-levenshtein`/`js-levenshtein`: dependência para ~30 linhas.
- Damerau-Levenshtein: ganho pequeno, o dobro de complexidade.
- Jaro-Winkler: bom para nome curto, pior para título longo.
- BM25/embeddings: exagero para comparar string com string.
- Validar no cliente: canal de trapaça trivial.
