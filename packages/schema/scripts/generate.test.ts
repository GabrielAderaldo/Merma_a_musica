import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildArtifacts, GENERATED_DIR } from "./generate.ts";

const artifacts = buildArtifacts();

describe("ADR-0014.R1 — artefatos gerados, nunca escritos à mão", () => {
  test("generated/ tem exatamente os arquivos que o gerador produz", () => {
    expect(existsSync(GENERATED_DIR)).toBe(true);
    expect(readdirSync(GENERATED_DIR).sort()).toEqual(Object.keys(artifacts).sort());
  });

  test.each(Object.keys(artifacts))("%s está igual ao gerado (rode bun run schema:gen)", (name) => {
    expect(readFileSync(join(GENERATED_DIR, name), "utf8")).toBe(artifacts[name] ?? "");
  });
});
