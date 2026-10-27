// As salas vivas deste processo, por invite_code. Cada uma tem um único RoomActor (ADR-0002).
import { createRoom, InviteCode, type Room } from "@merma/domain";
import { RoomActor, type ActorDeps } from "./actor.ts";

// docs/architecture.md: depois de terminated, o mesmo invite_code fica bloqueado por 30 min.
export const INVITE_CODE_BLOCK_MS = 30 * 60_000;
const MAX_CODE_ATTEMPTS = 20;

export class RoomRegistry {
  readonly #deps: ActorDeps;
  readonly #rooms = new Map<string, RoomActor>();
  readonly #blocked = new Map<string, number>();

  constructor(deps: ActorDeps) {
    this.#deps = deps;
  }

  get size(): number {
    return this.#rooms.size;
  }

  get(invite_code: string): RoomActor | undefined {
    return this.#rooms.get(invite_code);
  }

  // R-004. null só se 20 códigos seguidos colidirem: com 36^6 códigos, é sinal de bug no gerador.
  create(): RoomActor | null {
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      const code = InviteCode(this.#deps.ids.inviteCode());
      if (!code.ok || this.#rooms.has(code.value) || this.#isBlocked(code.value)) continue;
      return this.#add(createRoom(this.#deps.ids.roomId(), code.value));
    }
    return null;
  }

  // RecoveryService: recria o actor de um snapshot e retoma o fluxo.
  async restore(room: Room): Promise<RoomActor> {
    const actor = this.#add(room);
    await actor.resume();
    return actor;
  }

  // Desligamento (ADR-0017.R8): o snapshot de todas as salas em in_match, antes de fechar os sockets.
  async snapshotAll(): Promise<void> {
    await Promise.all([...this.#rooms.values()].map((actor) => actor.snapshot()));
  }

  #add(room: Room): RoomActor {
    const actor = new RoomActor(room, this.#deps, (code) => {
      this.#rooms.delete(code);
      this.#blocked.set(code, this.#deps.clock.now() + INVITE_CODE_BLOCK_MS);
    });
    this.#rooms.set(room.invite_code, actor);
    return actor;
  }

  #isBlocked(code: string): boolean {
    const until = this.#blocked.get(code);
    if (until === undefined) return false;
    if (until > this.#deps.clock.now()) return true;
    this.#blocked.delete(code);
    return false;
  }
}
