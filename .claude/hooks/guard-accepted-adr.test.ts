import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOOK = join(import.meta.dir, "guard-accepted-adr.ts");
const TMP = mkdtempSync(join(tmpdir(), "guard-adr-"));
mkdirSync(join(TMP, "docs/adr"), { recursive: true });
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

const adr = (status: string): string =>
  `---\nid: ADR-0099\ntitle: Teste\nstatus: ${status}\ndate: 2026-10-21\n---\n\n# ADR-0099 — Teste\n\nDecisão original.\n`;

let seq = 0;
const fixture = (status: string): string => {
  const path = join(TMP, `docs/adr/${String(++seq).padStart(4, "0")}-teste.md`);
  writeFileSync(path, adr(status));
  return path;
};

const run = (tool_input: Record<string, unknown>): number =>
  Bun.spawnSync(["bun", HOOK], { stdin: Buffer.from(JSON.stringify({ tool_input })) }).exitCode;

describe("guard-accepted-adr (ADR-0022.R2)", () => {
  test("bloqueia Edit no corpo de ADR accepted", () => {
    const file_path = fixture("accepted");
    expect(run({ file_path, old_string: "Decisão original.", new_string: "Outra decisão." })).toBe(2);
  });

  test("bloqueia MultiEdit no corpo de ADR accepted", () => {
    const file_path = fixture("accepted");
    expect(run({ file_path, edits: [{ old_string: "original", new_string: "nova" }] })).toBe(2);
  });

  test("bloqueia Write que muda campo imutável do frontmatter", () => {
    const file_path = fixture("accepted");
    expect(run({ file_path, content: adr("accepted").replace("title: Teste", "title: Outro") })).toBe(2);
  });

  test("deixa marcar supersede (status + superseded_by)", () => {
    const file_path = fixture("accepted");
    const content = adr("accepted").replace("status: accepted", "status: superseded\nsuperseded_by: ADR-0100");
    expect(run({ file_path, content })).toBe(0);
  });

  test("bloqueia Edit no corpo de ADR superseded", () => {
    const file_path = fixture("superseded");
    expect(run({ file_path, old_string: "Decisão original.", new_string: "Outra decisão." })).toBe(2);
  });

  test("deixa editar ADR proposed", () => {
    const file_path = fixture("proposed");
    expect(run({ file_path, old_string: "Decisão original.", new_string: "Outra decisão." })).toBe(0);
  });

  test("ignora arquivo fora de docs/adr", () => {
    const file_path = join(TMP, "README.md");
    writeFileSync(file_path, adr("accepted"));
    expect(run({ file_path, old_string: "original", new_string: "nova" })).toBe(0);
  });

  test("ignora ADR novo (arquivo ainda não existe)", () => {
    expect(run({ file_path: join(TMP, "docs/adr/0500-novo.md"), content: adr("accepted") })).toBe(0);
  });
});
