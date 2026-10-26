import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOOK = join(import.meta.dir, "session-env.ts");
const TMP = mkdtempSync(join(tmpdir(), "session-env-"));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

let seq = 0;
const project = (packageManager: string, withModules: boolean): string => {
  const dir = join(TMP, String(++seq));
  mkdirSync(withModules ? join(dir, "node_modules") : dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ packageManager }));
  return dir;
};

const run = (dir: string): { code: number; out: string } => {
  const r = Bun.spawnSync(["bun", HOOK], { stdin: Buffer.from("{}"), env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  return { code: r.exitCode, out: r.stdout.toString() };
};

describe("session-env (ADR-0018.R4)", () => {
  test("silencioso com o Bun fixado e node_modules", () => {
    expect(run(project(`bun@${Bun.version}`, true))).toEqual({ code: 0, out: "" });
  });

  test("avisa quando o Bun local é mais antigo que o fixado", () => {
    const { code, out } = run(project("bun@99.0.0", true));
    expect(code).toBe(0);
    expect(out).toContain("mais antigo que o fixado (99.0.0)");
  });

  test("avisa quando o Bun local é mais novo que o fixado", () => {
    expect(run(project("bun@1.0.0", true)).out).toContain("o projeto fixa 1.0.0");
  });

  test("avisa quando falta o node_modules", () => {
    expect(run(project(`bun@${Bun.version}`, false)).out).toContain("Falta o node_modules");
  });
});
