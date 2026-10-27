import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FLAG = "--disallow-code-generation-from-strings=strict";
const ROOT = join(import.meta.dir, "../../..");
const json = (path: string) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

describe("S-27 — a apps/api roda com geração de código a partir de strings desligada", () => {
  test("o start da apps/api e o Quadlet de produção passam a flag", async () => {
    expect(json("apps/api/package.json").scripts.start).toStartWith(`bun ${FLAG} `);
    expect(await Bun.file(join(ROOT, "deploy/quadlet/merma-api.container")).text()).toContain(`Exec=${FLAG} `);
  });

  test("bun run test roda a suíte da apps/api também sob a flag", () => {
    const { scripts } = json("package.json");
    expect(scripts.test).toEndWith("&& bun run test:strict");
    expect(scripts["test:strict"]).toBe(`bun ${FLAG} test --check ./apps/api ./packages`);
  });

  test("sob a flag, eval e new Function lançam, e o Zod 4 valida sem JIT", async () => {
    const proc = Bun.spawn([process.execPath, FLAG, join(import.meta.dir, "strict.probe.ts")], { stdout: "pipe", stderr: "pipe" });
    const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    expect(code).toBe(0);
    expect(JSON.parse(out)).toEqual({ eval: true, function: true, zod: true });
  });
});
