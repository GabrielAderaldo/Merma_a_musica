// Gera os artefatos legíveis a partir dos schemas Zod (ADR-0014): JSON Schema das duas direções do WS e o
// AsyncAPI 3.0 do canal da sala. `bun run schema:gen` grava em generated/; o teste generated.test.ts falha se
// o versionado estiver diferente do que este script produz.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import pkg from "../package.json" with { type: "json" };
import { CloseCode, clientMessages, serverMessages, WsClientMessage, WsServerMessage } from "../src/index.ts";

export const GENERATED_DIR = join(import.meta.dir, "..", "generated");

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

// O AsyncAPI 3.0 documenta payload em JSON Schema draft-07 (Schema Object); o $schema de cada um sobra.
const draft07 = (schema: z.ZodType): Record<string, unknown> => {
  const { $schema: _, ...rest } = z.toJSONSchema(schema, { target: "draft-07" });
  return rest;
};

const asyncapi = (): Record<string, unknown> => {
  const messages: Record<string, unknown> = {};
  const channelMessages: Record<string, unknown> = {};
  const refs = { client: [] as unknown[], server: [] as unknown[] };
  for (const [side, list] of [
    ["client", clientMessages],
    ["server", serverMessages],
  ] as const) {
    for (const schema of list) {
      const type = schema.shape.type.value;
      const key = `${side}_${type}`;
      messages[key] = { name: type, contentType: "application/json", payload: draft07(schema) };
      channelMessages[key] = { $ref: `#/components/messages/${key}` };
      refs[side].push({ $ref: `#/channels/room/messages/${key}` });
    }
  }
  const closeCodes = Object.entries(CloseCode)
    .map(([name, code]) => `${code} ${name}`)
    .join(" · ");
  return {
    asyncapi: "3.0.0",
    info: {
      title: "Mermã, a Música! — WebSocket da sala",
      version: pkg.version,
      description: `Gerado de packages/schema por scripts/generate.ts; não edite. Close codes: ${closeCodes}.`,
    },
    channels: {
      room: {
        address: "/ws/room/{invite_code}",
        parameters: { invite_code: { description: "6 caracteres [A-Z0-9] (R-004). Identidade só pelo cookie __Host-session." } },
        messages: channelMessages,
      },
    },
    operations: {
      receiveFromClient: { action: "receive", channel: { $ref: "#/channels/room" }, messages: refs.client },
      sendToClient: { action: "send", channel: { $ref: "#/channels/room" }, messages: refs.server },
    },
    components: { messages },
  };
};

export const buildArtifacts = (): Record<string, string> => ({
  "ws-client-message.schema.json": json(z.toJSONSchema(WsClientMessage)),
  "ws-server-message.schema.json": json(z.toJSONSchema(WsServerMessage)),
  "asyncapi.json": json(asyncapi()),
});

if (import.meta.main) {
  mkdirSync(GENERATED_DIR, { recursive: true });
  for (const [name, content] of Object.entries(buildArtifacts())) writeFileSync(join(GENERATED_DIR, name), content);
  console.log(`schema:gen — ${Object.keys(buildArtifacts()).length} arquivos em packages/schema/generated/`);
}
