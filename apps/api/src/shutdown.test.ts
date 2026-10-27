import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { OpenSockets, type ServerSocket } from "./http/socket.ts";
import { type ShutdownDeps, shutdown } from "./shutdown.ts";
import { AUDIO_SECRET, captureLogs, SECRET } from "./testing.ts";

// Registra a ordem do que o desligamento faz, com sockets e servidor falsos.
const harness = (hooks: ShutdownDeps["hooks"], deadlineMs?: number) => {
  const steps: string[] = [];
  const sockets = new OpenSockets();
  const socket: ServerSocket = { send: () => {}, close: (code) => steps.push(`close ${code}`) };
  sockets.add(socket);
  const exit: number[] = [];
  const { logger, lines } = captureLogs();
  const deps: ShutdownDeps = {
    hooks,
    sockets,
    server: { stop: async (closeActive) => void steps.push(`stop ${closeActive}`) },
    logger,
    exit: (code) => exit.push(code),
    ...(deadlineMs === undefined ? {} : { deadlineMs }),
  };
  return { deps, steps, exit, lines };
};

describe("ADR-0017.R8 — SIGTERM grava o snapshot das salas e sai antes do SIGKILL", () => {
  test("espera os hooks (snapshot) antes de fechar os sockets com 1001 e parar o servidor", async () => {
    const steps: string[] = [];
    const h = harness([
      {
        name: "room_snapshot",
        run: async () => {
          await Bun.sleep(5);
          steps.push("snapshot");
        },
      },
    ]);
    await shutdown(h.deps);
    expect([...steps, ...h.steps]).toEqual(["snapshot", "close 1001", "stop true"]);
    expect(h.exit).toEqual([0]);
  });

  test("hook que passa do prazo não segura o processo: fecha, para e sai com 1", async () => {
    const h = harness([{ name: "travado", run: () => new Promise(() => {}) }], 20);
    await shutdown(h.deps);
    expect(h.steps).toEqual(["close 1001", "stop true"]);
    expect(h.exit).toEqual([1]);
  });

  test("hook que falha é logado e o processo sai com 1", async () => {
    const h = harness([{ name: "quebrado", run: () => Promise.reject(new Error("redis fora")) }]);
    await shutdown(h.deps);
    expect(h.exit).toEqual([1]);
    expect(h.lines).toContainEqual(expect.objectContaining({ event: "shutdown_hook_failed", hook: "quebrado" }));
  });

  test("o processo de verdade, com a flag de produção, sai com 0 em menos de 10 s depois do SIGTERM", async () => {
    const proc = Bun.spawn(
      [process.execPath, "--disallow-code-generation-from-strings=strict", join(import.meta.dir, "index.ts")],
      {
        env: { ...process.env, PORT: "0", SESSION_SECRET: SECRET, AUDIO_HMAC_SECRET: AUDIO_SECRET, PUBLIC_BASE_URL: "https://merma.test", LOG_LEVEL: "info" },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let output = "";
    while (!output.includes('"server_started"')) {
      const { value, done } = await reader.read();
      if (done) break;
      output += decoder.decode(value);
    }
    const started = output.split("\n").find((line) => line.includes('"server_started"')) ?? "{}";
    const port = (JSON.parse(started) as { port?: number }).port;
    expect((await fetch(`http://127.0.0.1:${port}/health`)).status).toBe(200);

    const start = performance.now();
    proc.kill("SIGTERM");
    const code = await proc.exited;
    expect(code).toBe(0);
    expect(performance.now() - start).toBeLessThan(10_000);
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) output += decoder.decode(chunk.value);
    expect(output).toContain('"shutdown_completed"');
  });
});
