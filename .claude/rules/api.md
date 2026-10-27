---
paths:
  - "apps/api/**"
---
<!-- Regra por caminho. https://code.claude.com/docs/pt/memory -->
# apps/api — Hono + RoomActor (ADR-0002, ADR-0004, ADR-0009, ADR-0013)

- `throw` só na camada de adapter (fetch externo, driver), convertido em `Result` antes de subir. `class` é permitida (`RoomActor`, services).
- Toda mutação de sala passa pela fila do `RoomActor` dela. Nada de estado de sala fora dele.
- O `player_uuid` vem **só** da sessão (`c.get("session")`). Ignore qualquer `player_uuid` em query, header ou body.
- Valide toda entrada com o schema de `packages/schema` antes do handler. Payload inválido no WS → `error: invalid_payload`; 3 inválidos → close 1003.
- Proxy de áudio (`src/http/audio.ts`): a ordem das checagens é contrato (`Range` → 416 **antes** de consumir o token), e os testes de `audio.test.ts` a fixam. O MP3 sai de bytes em memória, nunca de `Bun.file`.
- Postgres só recebe a partida ao chegar em `completed`, sem `answer_text`. O snapshot no Redis é só para sala em `in_match`.
- O `RoomActor` e o resolver de áudio falam com o Redis só por portas (`SnapshotStore`, `IsrcCache`), com o `Bun.redis` num adapter. Trocar o Redis pelo Postgres foi adiado, não descartado ([ADR-0021](../../docs/adr/0021-snapshot-e-cache-no-postgres-sem-redis.md)).
- Logger: nunca `answer_text`, token, cookie ou `nickname`. Labels de métrica só com enums fechados.
- Hono: plugin `hono@hono` e `bunx @hono/cli request` para testar rota sem subir o servidor.
- Ameaças e mitigações (S-NN): `docs/security.md`. Cada teste de segurança cita o ID.
