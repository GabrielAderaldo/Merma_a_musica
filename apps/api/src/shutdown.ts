// Desligamento no SIGTERM (ADR-0017.R8): o podman manda SIGKILL 10 s depois do SIGTERM.
import { CloseCode } from "@merma/schema";
import type { Logger } from "./http/logger.ts";
import type { OpenSockets } from "./http/socket.ts";

// Tarefa que precisa terminar antes de sair. O RoomRegistry registra aqui a gravação do snapshot das salas.
export type ShutdownHook = Readonly<{ name: string; run: () => Promise<void> }>;

// Folga de 2 s sobre os 10 s do SIGKILL para fechar os sockets e parar o servidor.
export const SHUTDOWN_DEADLINE_MS = 8_000;

export type ShutdownDeps = {
  hooks: readonly ShutdownHook[];
  sockets: OpenSockets;
  server: { stop(closeActiveConnections?: boolean): Promise<void> };
  logger: Logger;
  exit: (code: number) => void;
  deadlineMs?: number;
};

export const shutdown = async (deps: ShutdownDeps): Promise<void> => {
  const deadlineMs = deps.deadlineMs ?? SHUTDOWN_DEADLINE_MS;
  deps.logger.info("shutdown_started", { hooks: deps.hooks.map((h) => h.name), sockets: deps.sockets.size });
  let timer: Timer | undefined;
  const deadline = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), deadlineMs);
  });
  const work = Promise.allSettled(deps.hooks.map((h) => h.run())).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") deps.logger.error("shutdown_hook_failed", { hook: deps.hooks[i]?.name, error: r.reason });
    });
    return results.every((r) => r.status === "fulfilled") ? ("done" as const) : ("failed" as const);
  });
  const outcome = await Promise.race([work, deadline]);
  clearTimeout(timer);
  // Só depois do snapshot: fechar antes faria as salas tratarem todo mundo como desconectado.
  deps.sockets.closeAll(CloseCode.server_shutdown, "server_shutdown");
  await deps.server.stop(true);
  deps.logger.info("shutdown_completed", { outcome });
  deps.exit(outcome === "done" ? 0 : 1);
};
