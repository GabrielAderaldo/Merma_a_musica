import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const HOOK = join(import.meta.dir, "guard-bash.ts");

const run = (command: string): number =>
  Bun.spawnSync(["bun", HOOK], { stdin: Buffer.from(JSON.stringify({ tool_input: { command } })) }).exitCode;

describe("guard-bash (ADR-0018.R1)", () => {
  test.each([
    "npm install",
    "npx tsc",
    "pnpm add zod",
    "pnpx vite",
    "yarn",
    "cd apps && npm test",
    "sudo npm i -g x",
    "FOO=1 npx tsc",
    "env CI=1 pnpm install",
    "echo x | yarn",
    "echo $(npm bin)",
    "(pnpm run dev)",
    "echo ok\nnpm i left-pad",
    "bash -c \"npm i left-pad\"",
    "sh -lc 'yarn add x'",
    "eval \"pnpm add x\"",
    "command npm i",
    "exec npx tsc",
    "time npm test",
    "nohup yarn dev",
    "xargs -0 npm i < list",
    "/usr/bin/npm i",
    "~/.local/bin/pnpm i",
    "echo `npm bin`",
  ])("bloqueia %p", (command) => {
    expect(run(command)).toBe(2);
  });

  test.each([
    "bun install",
    "bunx oxlint",
    'grep "pnpm" README.md',
    "rg 'npm install' docs",
    "rg npm docs",
    "cat npm-debug.log",
    "git commit -m 'remove yarn'",
    "bash -c \"bun install\"",
    "ls node_modules/.bin/npm-run-all",
    "bun run lint && echo yarn-free",
    "git log --grep npm",
  ])("deixa passar %p", (command) => {
    expect(run(command)).toBe(0);
  });
});
