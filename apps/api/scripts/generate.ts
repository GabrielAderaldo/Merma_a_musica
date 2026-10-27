// Gera o openapi.json das rotas REST a partir do app Hono (ADR-0014). `bun run openapi:gen` grava em generated/;
// o generate.test.ts falha se o versionado estiver diferente do que este script produz.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pkg from "../package.json" with { type: "json" };
import { testApp } from "../src/testing.ts";

export const GENERATED_DIR = join(import.meta.dir, "..", "generated");

export const buildOpenApi = (): string => {
  const document = testApp().getOpenAPI31Document({
    openapi: "3.1.0",
    info: {
      title: "Mermã, a Música! — REST",
      version: pkg.version,
      description: "Gerado da apps/api por scripts/generate.ts; não edite.",
    },
  });
  return `${JSON.stringify(document, null, 2)}\n`;
};

if (import.meta.main) {
  mkdirSync(GENERATED_DIR, { recursive: true });
  writeFileSync(join(GENERATED_DIR, "openapi.json"), buildOpenApi());
}
