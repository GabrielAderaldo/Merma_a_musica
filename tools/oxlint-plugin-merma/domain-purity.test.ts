// ADR-0015.R3: packages/domain sem throw, class, relógio nem Math.random. O .oxlintrc.json liga a regra só lá.
// Roda o binário do oxlint: o RuleTester de "oxlint/plugins-dev" só aceita Node ≥ 22 ou Deno, não o Bun.
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../..");
const dir = mkdtempSync(join(tmpdir(), "merma-purity-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

writeFileSync(
  join(dir, ".oxlintrc.json"),
  JSON.stringify({
    jsPlugins: [join(import.meta.dir, "index.mjs")],
    rules: { "merma/domain-purity": "error" },
  }),
);

const INVALID = [
  ["throw new Error('x');", "throw"],
  ["export class Room {}", "class"],
  ["export const Room = class {};", "class"],
  ["export const now = Date.now();", "relógio"],
  ["export const now = new Date();", "relógio"],
  ["export const x = Math.random();", "Math.random"],
] as const;
const VALID = [
  "export const f = (now: number) => now + 1;",
  "export const r = { ok: false, error: 'x' } as const;",
  "export const m = new Map(); export const n = Math.floor(1.5);",
];

// Um arquivo por caso e uma só execução do oxlint; as mensagens voltam agrupadas por arquivo.
const cases = [...INVALID.map(([code]) => code), ...VALID];
const fileOf = new Map(cases.map((code, i) => [code, join(dir, `case-${i}.ts`)]));
for (const [code, file] of fileOf) writeFileSync(file, code);
const run = Bun.spawnSync(["bunx", "oxlint", "-c", join(dir, ".oxlintrc.json"), "--format=json", dir], { cwd: ROOT });
const { diagnostics } = JSON.parse(run.stdout.toString()) as { diagnostics: { message: string; filename: string }[] };
const lint = (code: string): string[] =>
  diagnostics.filter((d) => fileOf.get(code)?.endsWith(d.filename)).map((d) => d.message);

describe("ADR-0015.R3 merma/domain-purity", () => {
  test.each(INVALID)("acusa %p", (code, hint) => {
    const messages = lint(code);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain(hint);
    expect(messages[0]).toContain("ADR-0015.R3");
  });

  test.each(VALID.map((code) => [code]))("aceita %p", (code) => {
    expect(lint(code)).toEqual([]);
  });

  test("o .oxlintrc.json da raiz liga a regra em packages/domain", async () => {
    const config = await Bun.file(join(ROOT, ".oxlintrc.json")).json();
    expect(config.jsPlugins).toContain("./tools/oxlint-plugin-merma/index.mjs");
    expect(config.overrides).toContainEqual({ files: ["packages/domain/**"], rules: { "merma/domain-purity": "error" } });
  });
});
