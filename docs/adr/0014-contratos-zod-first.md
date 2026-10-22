---
id: ADR-0014
title: Contratos Zod-first, com JSON Schema, OpenAPI e AsyncAPI gerados
status: accepted
date: 2026-10-21
scope: ["packages/schema/**", "apps/api/**", "apps/web/**"]
revisit_when: "Precisar de design-first com terceiros consumindo a API antes do código, ou o Zod perder a geração nativa de JSON Schema"
---

# ADR-0014 — Contratos Zod-first, com JSON Schema, OpenAPI e AsyncAPI gerados

## Contexto

Os contratos existiam em três lugares que já divergiam:
- os YAMLs AsyncAPI e OpenAPI escritos à mão, com 1.567 linhas;
- os tipos do engine;
- a regra "contratos Zod em `packages/schema`".

O próprio OpenAPI previa gerar os tipos do cliente a partir do YAML. YAML escrito à mão envelhece sem avisar.

## Decisão

- **`packages/schema` (Zod) é a única fonte** das mensagens WS, dos corpos REST e dos enums compartilhados.
- A partir dele se **geram e versionam** (decidido pelo mantenedor: "Zod primeiro, mas com um schema legível, nem que feito pelo próprio Zod"):
  - `packages/schema/generated/*.schema.json`, via `z.toJSONSchema()`, nativo do Zod;
  - `openapi.json` das rotas REST, via `@hono/zod-openapi` (do próprio honojs);
  - `asyncapi.json` dos eventos WS, montado por script a partir dos JSON Schemas.
- Um script `bun run schema:check` regenera tudo e falha se o resultado diferir do versionado.
- Até o pacote existir, a base para escrever os schemas é [`../specs/protocol.md`](../specs/protocol.md).

## Restrições

- **ADR-0014.R1** MUST NOT escrever à mão arquivo OpenAPI, AsyncAPI ou JSON Schema. — Check: pendente — `bun run schema:check` no CI
- **ADR-0014.R2** MUST validar com o schema Zod toda mensagem que entra no servidor e toda que chega ao cliente. — Check: pendente — teste de `WsGateway` e do `ws-client`
- **ADR-0014.R3** MUST NOT duplicar tipo de contrato fora de `packages/schema`: os outros pacotes usam `z.infer`. — Check: Review: mantenedor

## Consequências

- Um contrato só, executável (valida em runtime) e legível (JSON Schema/OpenAPI gerados para humanos e ferramentas).
- O artefato gerado entra no diff do PR, o que torna mudança de contrato visível na revisão.
- Gerar AsyncAPI exige um script nosso (sem gerador oficial Zod → AsyncAPI).

## Alternativas descartadas

- YAML-first com tipos gerados: dois YAMLs mantidos à mão, e AsyncAPI → Zod não tem gerador oficial.
- Só Zod, sem artefato legível: o contrato só se lê no código.

## Fontes

- Zod → JSON Schema: https://zod.dev/json-schema
- Hono + Zod OpenAPI: https://hono.dev/examples/zod-openapi
