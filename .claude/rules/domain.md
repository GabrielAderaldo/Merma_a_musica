---
paths:
  - "packages/domain/**"
---
<!-- Regra por caminho: carrega só ao abrir arquivos de packages/domain. https://code.claude.com/docs/pt/memory -->
# packages/domain — engine pura (ADR-0007, ADR-0015, ADR-0018)

- Sem `throw`: função que pode falhar retorna `Result<T, E>`. Até o "impossível" vira `err` (`InternalDomainError`).
- Sem `class`, estado global ou I/O. Funções puras sobre tipos `Readonly`, `readonly T[]` e `as const`.
- Sem `Date.now()`, `new Date()` ou `Math.random()`: receba `now: Timestamp` e `seed: string` por parâmetro.
- Sem `any`. `as X` só em smart constructor de branded type, com comentário.
- IDs e strings críticas são branded (`PlayerUuid`, `RoundId`, `InviteCode`, `Isrc`…).
- Importa só `@merma/schema`.
- Teste de regra cita o ID do GDD no nome: `test("R-202 speed_bonus: 5s de 30s → 850", …)`. Algoritmos com `test.each` sobre as tabelas de `docs/gdd.md`.
- O agregado é a `Room` (lobby + `Match` + `Round`), em `src/types.ts`. Cada função aplica uma transição das máquinas de estado da `docs/architecture.md`; fora delas, `err("illegal_state_transition")`. O rascunho antigo (`docs/specs/engine.md`) está no git.
- Tempo é `Duration`/`Timestamp` em ms; a conversão para os segundos do fio fica na `apps/api`.
- Nos testes, `src/testing.ts` tem as fixtures; `unwrap` e `defined` falham com `expect.unreachable`, porque o `throw` é proibido aqui também (`merma/domain-purity`, ADR-0015.R3).
