// RecoveryService (docs/architecture.md#recuperação): ao subir, antes de aceitar conexões, recria cada sala órfã do
// snapshot, com todos os jogadores reconectando.
import type { Logger } from "../http/logger.ts";
import type { Clock, SnapshotStore } from "./ports.ts";
import type { RoomRegistry } from "./registry.ts";

// Snapshot mais velho que a janela de reconexão (R-602): ninguém mais pode voltar, a sala expirou.
export const SNAPSHOT_MAX_AGE_MS = 120_000;

export type RecoveryReport = Readonly<{ restored: number; expired: number }>;

export const recoverRooms = async (deps: {
  store: SnapshotStore;
  registry: RoomRegistry;
  clock: Clock;
  logger: Logger;
}): Promise<RecoveryReport> => {
  const snapshots = await deps.store.list();
  if (!snapshots.ok) {
    deps.logger.error("recovery_failed", { error: snapshots.error });
    return { restored: 0, expired: 0 };
  }
  let restored = 0;
  let expired = 0;
  for (const snapshot of snapshots.value) {
    const code = snapshot.room.invite_code;
    if (deps.clock.now() - snapshot.saved_at > SNAPSHOT_MAX_AGE_MS || deps.registry.get(code) !== undefined) {
      expired++;
      await deps.store.delete(code);
      continue;
    }
    const start = performance.now();
    await deps.registry.restore(snapshot.room);
    restored++;
    deps.logger.info("room_recovered", { invite_code: code, duration_ms: Math.round(performance.now() - start) });
  }
  return { restored, expired };
};
