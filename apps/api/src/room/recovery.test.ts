import { describe, expect, test } from "bun:test";
import { TIMING } from "./actor.ts";
import { recoverRooms, SNAPSHOT_MAX_AGE_MS } from "./recovery.ts";
import { RoomRegistry } from "./registry.ts";
import { actorDeps, FakeClock, FakeSocket, PLAYLIST, player } from "./testing.ts";

// Uma partida de 2 jogadores com 10 dos 30s do timer já corridos, e o snapshot que ela gravou.
const snapshotOfRunningMatch = async () => {
  const setup = actorDeps();
  const registry = new RoomRegistry(setup.deps);
  const actor = registry.create() ?? expect.unreachable("sala");
  const sockets = [new FakeSocket(), new FakeSocket()];
  for (const [i, socket] of sockets.entries()) {
    await actor.join(player(i + 1), `P${i + 1}`, socket);
    await actor.receive(player(i + 1), { type: "select_playlist", playlist_id: PLAYLIST, platform: "deezer" }, socket);
  }
  await actor.receive(player(1), { type: "start_game" }, sockets[0] ?? expect.unreachable("socket"));
  await setup.clock.advance(TIMING.countdownMs + TIMING.gracePeriodMs + 10_000, () => actor.idle());
  await actor.receive(player(2), { type: "submit_answer", answer_text: "algo" }, sockets[1] ?? expect.unreachable("socket"));
  await actor.snapshot();
  return { setup, actor };
};

// O processo novo: outro registry e outro relógio (os timers do processo antigo morreram com ele), mesmo Redis.
const newProcess = (setup: ReturnType<typeof actorDeps>, laterMs = 0) => {
  const fresh = actorDeps({ snapshots: setup.snapshots, clock: new FakeClock(setup.clock.now() + laterMs) });
  return { fresh, registry: new RoomRegistry(fresh.deps) };
};

describe("ADR-0009.R4 — recuperação: snapshot → RoomActor aceitando WS em menos de 200ms", () => {
  test("a sala volta com todos reconectando, as respostas preservadas, e aceita o jogador de volta", async () => {
    const { setup, actor } = await snapshotOfRunningMatch();
    const { fresh, registry } = newProcess(setup);

    const start = performance.now();
    const report = await recoverRooms({ store: fresh.snapshots, registry, clock: fresh.clock, logger: fresh.deps.logger });
    const restored = registry.get(actor.inviteCode) ?? expect.unreachable("sala recuperada");
    const back = new FakeSocket();
    expect(await restored.join(player(2), "P2", back)).toBe(true);
    expect(performance.now() - start).toBeLessThan(200);

    expect(report).toEqual({ restored: 1, expired: 0 });
    expect(restored.state.players.map((p) => p.connection_status)).toEqual(["reconnecting", "connected"]);
    expect(restored.state.match?.rounds[0]?.answers.map((a) => a.player_uuid)).toEqual([player(2)]);
    // R-602: com o timer correndo, quem volta recebe o áudio de novo.
    expect(back.last("room_state")).toMatchObject({ phase: "playing", audio: { audio_source: "deezer" } });
  });

  test("o timer da rodada retoma pelo tempo que faltava, não do zero", async () => {
    const { setup, actor } = await snapshotOfRunningMatch();
    const { fresh, registry } = newProcess(setup);
    await recoverRooms({ store: fresh.snapshots, registry, clock: fresh.clock, logger: fresh.deps.logger });
    const restored = registry.get(actor.inviteCode) ?? expect.unreachable("sala recuperada");
    const back = new FakeSocket();
    await restored.join(player(1), "P1", back);
    await fresh.clock.advance(20_000 - 1, () => restored.idle());
    expect(back.of("round_ended")).toEqual([]);
    await fresh.clock.advance(1, () => restored.idle());
    expect(back.last("round_ended")?.round_index).toBe(0);
  });

  test("snapshot com mais de 2 min é sala expirada: apagado, não recuperado", async () => {
    const { setup, actor } = await snapshotOfRunningMatch();
    const { fresh, registry } = newProcess(setup, SNAPSHOT_MAX_AGE_MS + 1);
    const report = await recoverRooms({ store: fresh.snapshots, registry, clock: fresh.clock, logger: fresh.deps.logger });
    expect(report).toEqual({ restored: 0, expired: 1 });
    expect(registry.get(actor.inviteCode)).toBeUndefined();
    expect(setup.snapshots.get(actor.inviteCode)).toBeUndefined();
  });
});
