// Confere versões fixadas, lint e o que o projeto carrega no Claude Code contra as restrições dos ADRs.
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const text = (file: string): string => readFileSync(join(ROOT, file), "utf8");

type Pkg = {
  packageManager: string;
  engines: Record<string, string>;
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
  workspaces?: string[];
};
type Restricted = [string, { patterns: { group?: string[]; regex?: string; message: string }[] }];
type Oxlint = {
  rules: Record<string, unknown>;
  overrides: { files: string[]; rules: { "no-restricted-imports"?: Restricted } }[];
};

const pkg: Pkg = JSON.parse(text("package.json"));
const pinned = /^bun@(\d+\.\d+\.\d+)$/.exec(pkg.packageManager)?.[1] ?? "";

describe("ADR-0018 — Bun e TypeScript fixados", () => {
  test("ADR-0018.R4 packageManager fixa um Bun ≥ 1.4.4", () => {
    expect(pinned).not.toBe("");
    expect(Bun.semver.order(pinned, "1.4.4")).toBeGreaterThanOrEqual(0);
  });

  test("ADR-0018.R4 engines.bun e @types/bun seguem o packageManager", () => {
    expect(pkg.engines["bun"]).toBe(`>=${pinned}`);
    expect(pkg.devDependencies["@types/bun"]).toBe(pinned);
  });

  test("ADR-0018.R4 ADR-0017.R3 toda imagem oven/bun do deploy/ usa o Bun fixado", () => {
    const files = [...new Bun.Glob("deploy/**/*").scanSync({ cwd: ROOT, dot: true })];
    const tags = files.flatMap((f) => [...text(f).matchAll(/oven\/bun:(\d+\.\d+\.\d+)/g)].map((m) => `${f}: ${m[1]}`));
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.filter((t) => !t.endsWith(`: ${pinned}`))).toEqual([]);
  });

  test("ADR-0017.R3 o CI instala o Bun do packageManager, sem versão própria", () => {
    const ci = text(".github/workflows/ci.yml");
    expect(ci).toContain("oven-sh/setup-bun");
    expect(ci).not.toMatch(/^\s*bun-version:/m);
  });

  // Com outro Bun local, o TS embutido pode ser outro; o hook SessionStart avisa da diferença.
  test.skipIf(Bun.version !== pinned)("ADR-0018.R5 devDep typescript é o TS do bun check", () => {
    expect(pkg.devDependencies["typescript"]).toBe(process.versions["typescript"]);
  });

  test("ADR-0018.R2 typecheck é o bun check e o tsconfig raiz é estrito", () => {
    expect(pkg.scripts["typecheck"]).toBe("bun check");
    const { compilerOptions } = JSON.parse(text("tsconfig.json"));
    for (const flag of [
      "strict",
      "noUncheckedIndexedAccess",
      "noImplicitOverride",
      "noPropertyAccessFromIndexSignature",
      "exactOptionalPropertyTypes",
      "useUnknownInCatchVariables",
      "noFallthroughCasesInSwitch",
    ]) {
      expect(compilerOptions[flag], flag).toBe(true);
    }
  });
});

describe("ADR-0015 — oxlint", () => {
  const lint: Oxlint = JSON.parse(text(".oxlintrc.json"));
  // Só os overrides de fronteira; o de packages/domain liga o plugin merma (ADR-0015.R3).
  const patterns = (files?: string) =>
    lint.overrides
      .filter((o) => files === undefined || o.files.includes(files))
      .flatMap((o) => o.rules["no-restricted-imports"]?.[1].patterns ?? []);
  const groups = (files: string): string[] => patterns(files).flatMap((p) => p.group ?? []);

  test("ADR-0018.R3 any é erro", () => {
    expect(lint.rules["typescript/no-explicit-any"]).toBe("error");
  });

  test("ADR-0005.R1 ADR-0007.R1 ADR-0008.R2 ADR-0008.R3 apps/web não importa a engine, React nem SolidStart", () => {
    expect(groups("apps/web/**")).toEqual(expect.arrayContaining(["@merma/domain", "react", "@solidjs/start"]));
  });

  test("ADR-0005.R2 packages/* não importa apps/*", () => {
    expect(groups("packages/**")).toEqual(expect.arrayContaining(["@merma/api", "@merma/web"]));
  });

  test("ADR-0023.R1 Playlist Integration não importa o Orchestrator nem a engine", () => {
    expect(groups("apps/api/src/playlist/**")).toEqual(expect.arrayContaining(["@merma/domain"]));
    const room = patterns("apps/api/src/playlist/**").flatMap((p) => (p.regex ? [new RegExp(p.regex)] : []));
    const blocked = (spec: string) => room.some((r) => r.test(spec));
    expect(["../room", "../room/actor", "../../room/index.ts"].filter((s) => !blocked(s))).toEqual([]);
    expect(["./roomy", "../playlist/import", "./audio/resolver"].filter(blocked)).toEqual([]);
  });

  test("ADR-0015.R2 toda message de no-restricted-imports cita uma restrição de ADR", () => {
    const messages = patterns().map((p) => p.message);
    expect(messages.filter((m) => !/ADR-\d{4}\.R\d+/.test(m))).toEqual([]);
  });
});

test("ADR-0005.R3 com apps/ ou packages/ criados, o package.json raiz declara os workspaces", () => {
  if (!existsSync(join(ROOT, "apps")) && !existsSync(join(ROOT, "packages"))) return;
  expect(pkg.workspaces).toEqual(expect.arrayContaining(["apps/*", "packages/*"]));
});

describe("ADR-0020.R2 — só fontes oficiais e os MCPs do mantenedor", () => {
  const OFFICIAL_MCP = ["bun-docs"];
  const MAINTAINER_MCP = ["acdg-skills", "security", "reverse-proxy"];
  const OFFICIAL_PLUGINS = ["hono@hono", "redis-development@claude-plugins-official"];
  const settings = JSON.parse(text(".claude/settings.json"));

  test(".mcp.json e enabledMcpjsonServers só têm servidores permitidos", () => {
    const allowed = [...OFFICIAL_MCP, ...MAINTAINER_MCP];
    const servers = [...Object.keys(JSON.parse(text(".mcp.json")).mcpServers), ...settings.enabledMcpjsonServers];
    expect(servers.filter((s: string) => !allowed.includes(s))).toEqual([]);
  });

  test("plugins ligados no projeto são todos oficiais (desligar é sempre permitido)", () => {
    const on = Object.entries(settings.enabledPlugins ?? {}).filter(([, enabled]) => enabled === true).map(([id]) => id);
    expect(on.filter((id) => !OFFICIAL_PLUGINS.includes(id))).toEqual([]);
  });
});
