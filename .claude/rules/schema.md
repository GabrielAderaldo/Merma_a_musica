---
paths:
  - "packages/schema/**"
---
<!-- Regra por caminho. https://code.claude.com/docs/pt/memory -->
# packages/schema — contratos Zod (ADR-0014)

- É a **única** fonte dos contratos WS e REST. Os outros pacotes usam `z.infer`, sem redeclarar tipos.
- `generated/` (JSON Schema e `asyncapi.json`) é gerado: não edite à mão. Mudou um schema, rode `bun run schema:gen`; o `scripts/generate.test.ts` falha se o versionado divergir.
- `snake_case` no fio; enums em minúsculo; toda mensagem WS tem `type` literal (união discriminada).
- Mensagem do cliente é `strictObject` (campo a mais = `invalid_payload`) e nunca carrega `player_uuid`. Mensagem do servidor é `z.object`.
- Mensagem nova precisa de exemplo válido em `src/ws.test.ts`; o teste de cobertura falha sem ele. AsyncAPI 3.0 só documenta payload draft-07, por isso o gerador usa `target: "draft-07"` nele.
- Tempo no fio vai em segundos inteiros; a conversão para `Duration` (ms) acontece na borda do `apps/api`. `response_time` e médias são segundos com fração.
- REST ainda é `docs/specs/rest.md`: os corpos entram aqui junto com as rotas da `apps/api`, e o `openapi.json` nasce lá com `@hono/zod-openapi` (ADR-0014).
- Zod: consulte `zod.dev/llms.txt` (ADR-0020), principalmente `z.toJSONSchema`.
