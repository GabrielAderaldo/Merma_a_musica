import { describe, expect, test } from "bun:test";
import { join } from "node:path";

type McpServer = { type?: string; url?: string; command?: string };

const config = (await Bun.file(join(import.meta.dir, "..", ".mcp.json")).json()) as {
  mcpServers: Record<string, McpServer>;
};

describe(".mcp.json", () => {
  test("a chave do Penpot vem do ambiente, nunca literal (ADR-0018.R1)", () => {
    const url = config.mcpServers["penpot"]?.url ?? "";
    expect(url).toContain("userToken=${PENPOT_MCP_KEY}");
  });

  test("nenhum servidor carrega token literal na URL", () => {
    for (const [name, server] of Object.entries(config.mcpServers)) {
      const literal = /[?&](userToken|token|key|api_key)=(?!\$\{)/i.test(server.url ?? "");
      expect(literal, `${name}: ${server.url}`).toBe(false);
    }
  });
});
