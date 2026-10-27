// Checks do bloco do Mermã no Caddy do host (ADR-0017): headers de transporte (S-30, S-31) e o que vai para a API.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const caddy = readFileSync(join(import.meta.dir, "caddy", "merma.caddy"), "utf8");
const security = readFileSync(join(import.meta.dir, "..", "docs", "security.md"), "utf8");
const config = caddy
  .split("\n")
  .filter((l) => !l.trim().startsWith("#"))
  .join("\n");
const header = (name: string): string | undefined => new RegExp(`^\\s*${name} "([^"]*)"$`, "m").exec(caddy)?.[1];

describe("deploy/caddy/merma.caddy", () => {
  test("S-30 só TLS 1.3, com o HSTS do security.md", () => {
    expect(caddy).toMatch(/tls \{\s*protocols tls1\.3\s*\}/);
    const hsts = /S-30\*\*.*HSTS `([^`]+)`/.exec(security)?.[1];
    expect(hsts).toBeDefined();
    expect(header("Strict-Transport-Security")).toBe(hsts);
  });

  test("S-31 a CSP e os headers são os do security.md", () => {
    const line = security.split("\n").find((l) => l.includes("**S-31**")) ?? "";
    const csp = /CSP: `([^`]+)`/.exec(line)?.[1]?.replace("<domínio>", "__MERMA_DOMAIN__");
    expect(csp).toBeDefined();
    expect(header("Content-Security-Policy")).toBe(csp);
    for (const [, name, value] of line.matchAll(/`([A-Za-z-]+): ([^`]+)`/g)) expect(header(name ?? ""), name).toBe(value);
  });

  test("ADR-0017.R10 o proxy leva só as rotas públicas da API; /metrics fica no loopback", () => {
    expect(/@api path (.+)$/m.exec(caddy)?.[1]?.split(" ")).toEqual(["/api/*", "/auth/*", "/ws/room/*", "/health"]);
    expect(config).not.toContain("/metrics");
    expect(caddy).toContain("reverse_proxy 127.0.0.1:3000");
  });
});
