import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildOpenApi, GENERATED_DIR } from "./generate.ts";

describe("ADR-0014.R1 — openapi.json gerado, nunca escrito à mão", () => {
  test("generated/openapi.json está igual ao gerado (rode bun run openapi:gen)", () => {
    expect(readFileSync(join(GENERATED_DIR, "openapi.json"), "utf8")).toBe(buildOpenApi());
  });
});
