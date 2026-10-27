// O WebSocket do servidor visto pelo resto da apps/api. Ninguém fala com o WSContext do Hono direto.
import type { CloseCode } from "@merma/schema";
import type { WSContext } from "hono/ws";

// ADR-0018.R6: no Bun, close() sem código manda 1005. Aqui o código é obrigatório e só pode ser um do contrato.
export type ServerSocket = Readonly<{
  send(data: string): void;
  close(code: CloseCode, reason: string): void;
}>;

export const serverSocket = (ws: WSContext): ServerSocket => ({
  send: (data) => ws.send(data),
  close: (code, reason) => ws.close(code, reason),
});

// Conexões abertas, para o desligamento fechá-las com código depois de gravar o snapshot (ADR-0017.R8).
export class OpenSockets {
  readonly #sockets = new Set<ServerSocket>();

  add(socket: ServerSocket): void {
    this.#sockets.add(socket);
  }

  delete(socket: ServerSocket): void {
    this.#sockets.delete(socket);
  }

  get size(): number {
    return this.#sockets.size;
  }

  closeAll(code: CloseCode, reason: string): void {
    for (const socket of this.#sockets) socket.close(code, reason);
    this.#sockets.clear();
  }
}
