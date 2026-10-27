import { describe, expect, test } from "bun:test";
import { CreateRoomResponse, RoomSummaryResponse } from "@merma/schema";
import { RoomRegistry } from "../room/registry.ts";
import { actorDeps } from "../room/testing.ts";
import { sessionCookie, testApp } from "../testing.ts";
import { CREATE_ROOM_LIMIT } from "./rooms.ts";

const app = (now = () => 1_000_000) => {
  const { deps } = actorDeps();
  const registry = new RoomRegistry({ ...deps, ids: { ...deps.ids, inviteCode: randomCode() } });
  const a = testApp({ registry, now });
  a.get("/whoami", (c) => c.json(c.get("session")));
  return { app: a, registry };
};

// Códigos distintos e válidos, para criar várias salas no mesmo registry.
const randomCode = () => {
  let n = 0;
  return () => `R${String(n++).padStart(5, "0")}`;
};

const cookieOf = async (a: ReturnType<typeof testApp>) => sessionCookie(await a.request("/health")) ?? "";

describe("POST /api/v1/rooms", () => {
  test("R-004: cria a sala com invite_code de 6 caracteres e o criador como host", async () => {
    const { app: a, registry } = app();
    const cookie = await cookieOf(a);
    const res = await a.request("/api/v1/rooms", { method: "POST", headers: { cookie } });
    expect(res.status).toBe(201);
    const body = CreateRoomResponse.parse(await res.json());
    expect(registry.get(body.invite_code)?.roomId).toBe(body.room_id);
    const me = (await (await a.request("/whoami", { headers: { cookie } })).json()) as { player_uuid: string };
    expect(body.host_player_uuid).toBe(me.player_uuid);
  });

  test("S-25: a 11ª sala na mesma hora recebe 429 com Retry-After; outra identidade não é afetada", async () => {
    let now = 1_000_000;
    const { app: a } = app(() => now);
    const cookie = await cookieOf(a);
    for (let i = 0; i < CREATE_ROOM_LIMIT.limit; i++) {
      expect((await a.request("/api/v1/rooms", { method: "POST", headers: { cookie } })).status).toBe(201);
    }
    now += 60_000;
    const limited = await a.request("/api/v1/rooms", { method: "POST", headers: { cookie } });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("3540");
    expect(await limited.json()).toEqual({ code: "rate_limited", message: expect.any(String) });
    const other = await cookieOf(a);
    expect((await a.request("/api/v1/rooms", { method: "POST", headers: { cookie: other } })).status).toBe(201);
    now += CREATE_ROOM_LIMIT.windowMs;
    expect((await a.request("/api/v1/rooms", { method: "POST", headers: { cookie } })).status).toBe(201);
  });
});

describe("GET /api/v1/rooms/{invite_code}", () => {
  test("200 com fase e lotação da sala", async () => {
    const { app: a, registry } = app();
    const actor = registry.create() ?? expect.unreachable("sala");
    const res = await a.request(`/api/v1/rooms/${actor.inviteCode}`);
    expect(res.status).toBe(200);
    expect(RoomSummaryResponse.parse(await res.json())).toEqual({
      invite_code: actor.inviteCode,
      phase: "lobby",
      player_count: 0,
      max_players: 20,
    });
  });

  test("404 para sala que não existe; 400 invalid_payload para código fora do formato", async () => {
    const { app: a } = app();
    expect((await a.request("/api/v1/rooms/ZZZ999")).status).toBe(404);
    const bad = await a.request("/api/v1/rooms/abc");
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ code: "invalid_payload", message: expect.any(String) });
  });
});
