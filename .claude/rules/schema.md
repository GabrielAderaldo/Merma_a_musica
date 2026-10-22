---
paths:
  - "packages/schema/**"
---
<!-- Regra por caminho. https://code.claude.com/docs/pt/memory -->
# packages/schema — contratos Zod (ADR-0014)

- É a **única** fonte dos contratos WS e REST. Os outros pacotes usam `z.infer`, sem redeclarar tipos.
- `generated/` (JSON Schema, `openapi.json`, `asyncapi.json`) é gerado: não edite à mão. Regenere com `bun run schema:check`.
- `snake_case` no fio; enums em minúsculo; toda mensagem WS tem `type` literal (união discriminada).
- Tempo no fio vai em segundos inteiros; a conversão para `Duration` (ms) acontece na borda do `apps/api`.
- Rascunho inicial: `docs/specs/protocol.md`. Apague-o quando os schemas estiverem escritos.
- Zod: consulte `zod.dev/llms.txt` (ADR-0011), principalmente `z.toJSONSchema`.
