import { describe, expect, test } from "bun:test";
import { InviteCode, PlayerUuid, RoomId, seconds } from "./brand.ts";
import { finishCountdown } from "./match.ts";
import {
  configureMatch,
  createRoom,
  derivePhase,
  findPlayer,
  joinRoom,
  leaveRoom,
  returnToLobby,
  selectPlaylist,
  setAfk,
  setConnectionStatus,
  setPlatform,
  setReady,
  songRange,
  startGame,
  terminateRoom,
  transferHost,
} from "./room.ts";
import { at, lobbyWith, matchId, player, playlistId, songsOf, T0, unwrap } from "./testing.ts";
import type { MatchConfiguration, Room } from "./types.ts";

const host = player(1);
const guest = player(2);
const join = (room: Room, n: number, now = at(T0 + n)) =>
  joinRoom(room, { player_uuid: player(n), nickname: `P${n}`, platform: null }, now);
const songs = (n: number, each = 50) => Array.from({ length: n }, (_, i) => songsOf(player(i + 1), each));
const start = (room: Room, by = host, seed = "s") =>
  startGame(room, by, { match_id: matchId, songs: songs(room.players.length), seed, now: T0 });
const config = (room: Room, change: Partial<MatchConfiguration>): MatchConfiguration => ({ ...room.config, ...change });

describe("branded types", () => {
  test("R-004 invite_code tem 6 caracteres [A-Z0-9]", () => {
    expect(InviteCode("ABC123").ok).toBe(true);
    expect(InviteCode("abc123")).toEqual({ ok: false, error: "invalid_invite_code" });
    expect(InviteCode("ABC12")).toEqual({ ok: false, error: "invalid_invite_code" });
  });
  test("player_uuid precisa ser UUID v4", () => {
    expect(PlayerUuid("nao-e-uuid")).toEqual({ ok: false, error: "invalid_player_uuid" });
    expect(RoomId("00000000-0000-4000-8000-000000000001").ok).toBe(true);
  });
});

describe("R-004 e R-005 entrar e sair", () => {
  test("R-004 quem entra numa sala vazia vira host, ready, e a sala vai para lobby", () => {
    const room = lobbyWith(1);
    expect(room.state).toBe("lobby");
    expect(room.host_uuid).toBe(host);
    expect(findPlayer(room, host)?.ready).toBe(true);
  });
  test("R-005 o 21º jogador recebe room_full", () => {
    const room = lobbyWith(20);
    expect(join(room, 21)).toEqual({ ok: false, error: "room_full" });
  });
  test("I-M-1 host está sempre em players: ao sair, o papel passa ao conectado há mais tempo (R-603)", () => {
    const room = unwrap(leaveRoom(lobbyWith(3), host, at(T0 + 100)));
    expect(room.host_uuid).toBe(guest);
    expect(findPlayer(room, guest)?.ready).toBe(true);
  });
  test("último a sair: lobby → empty; empty → terminated é absorvente", () => {
    const empty = unwrap(leaveRoom(lobbyWith(1), host, at(T0 + 100)));
    expect(empty).toMatchObject({ state: "empty", host_uuid: null, players: [] });
    const terminated = unwrap(terminateRoom(empty));
    expect(join(terminated, 1)).toEqual({ ok: false, error: "room_not_found" });
    expect(terminateRoom(lobbyWith(1))).toEqual({ ok: false, error: "illegal_state_transition" });
  });
  test("R-602 quem já está na sala e entra de novo está reconectando", () => {
    let room = unwrap(setConnectionStatus(lobbyWith(2), guest, "reconnecting", at(T0 + 50)));
    room = unwrap(join(room, 2, at(T0 + 60)));
    expect(room.players).toHaveLength(2);
    expect(findPlayer(room, guest)).toMatchObject({ connection_status: "connected", connected_since: T0 + 60 });
  });
  test("sair sem estar na sala → player_not_in_room", () => {
    expect(leaveRoom(lobbyWith(1), guest, T0)).toEqual({ ok: false, error: "player_not_in_room" });
  });
});

describe("R-006 a R-009 lobby", () => {
  test("I-H-1 R-008 host não marca ready nem unready", () => {
    const room = lobbyWith(2);
    expect(setReady(room, host, false)).toEqual({ ok: false, error: "host_is_always_ready" });
    expect(setReady(room, host, true)).toEqual({ ok: false, error: "host_is_always_ready" });
    expect(findPlayer(unwrap(setReady(room, guest, true)), guest)?.ready).toBe(true);
  });
  test("R-601 AFK é por jogador, inclusive o host, e sai com qualquer interação", () => {
    let room = unwrap(setAfk(lobbyWith(2), guest, true));
    room = unwrap(setAfk(room, host, true));
    expect(findPlayer(room, host)?.afk).toBe(true);
    room = unwrap(setReady(room, guest, true));
    expect(findPlayer(room, guest)?.afk).toBe(false);
  });
  test("R-006 plataforma conectada aparece por jogador", () => {
    expect(findPlayer(unwrap(setPlatform(lobbyWith(2), guest, "spotify")), guest)?.platform).toBe("spotify");
    expect(setPlatform(lobbyWith(1), guest, "spotify")).toEqual({ ok: false, error: "player_not_in_room" });
  });
  test("I-H-2 start_game de quem não é host → not_host", () => {
    expect(start(lobbyWith(2), guest)).toEqual({ ok: false, error: "not_host" });
  });
  test("R-007 só o host configura", () => {
    const room = lobbyWith(2);
    expect(configureMatch(room, guest, room.config)).toEqual({ ok: false, error: "not_host" });
  });
  test("R-009 host inicia com jogadores unready", () => {
    const room = unwrap(start(lobbyWith(3)));
    expect(room.state).toBe("in_match");
    expect(room.match?.participants).toHaveLength(3);
  });
  test("start_game fora do lobby → illegal_state_transition", () => {
    expect(start(unwrap(start(lobbyWith(2))))).toEqual({ ok: false, error: "illegal_state_transition" });
  });
  test("R-301 sem playlist de quem está presente → no_playlists_imported", () => {
    const room = lobbyWith(2);
    const outsiders = [songsOf(player(9), 50)];
    expect(startGame(room, host, { match_id: matchId, songs: outsiders, seed: "s", now: T0 })).toEqual({
      ok: false,
      error: "no_playlists_imported",
    });
  });
});

describe("R-401 configuração", () => {
  test("R-401 defaults: 30s, both, sem repetição, speed_bonus, multiplayer, total = máximo (R-302)", () => {
    expect(lobbyWith(4).config).toEqual({
      time_per_round: seconds(30),
      total_songs: 20,
      answer_type: "both",
      allow_repeats: false,
      scoring_rule: "speed_bonus",
      game_mode: "multiplayer",
    });
  });
  test("R-302 sem configuração do host, total acompanha o máximo quando alguém entra", () => {
    const room = unwrap(join(lobbyWith(2), 3));
    expect(room.config.total_songs).toBe(15);
  });
  test("R-302 total configurado é mantido, e ajustado ao range se ele encolher", () => {
    let room = lobbyWith(4);
    room = unwrap(configureMatch(room, host, config(room, { total_songs: 18 })));
    room = unwrap(join(room, 5));
    expect(room.config.total_songs).toBe(18);
    room = unwrap(leaveRoom(unwrap(leaveRoom(room, player(5), T0)), player(4), T0));
    expect(room.config.total_songs).toBe(15);
  });
  test.each([[9_999], [60_001]])("I-C-1 time_per_round %pms → time_per_round_out_of_range", (ms) => {
    const room = lobbyWith(2);
    const input = { ...room.config, time_per_round: seconds(ms / 1000) };
    expect(configureMatch(room, host, input)).toEqual({ ok: false, error: "time_per_round_out_of_range" });
  });
  test.each([[1], [11]])("I-C-2 R-302 total_songs %p fora de 2 a 10 → erro", (total) => {
    const room = lobbyWith(2);
    expect(configureMatch(room, host, config(room, { total_songs: total }))).toEqual({
      ok: false,
      error: "total_songs_out_of_range",
    });
  });
  test("I-C-3 R-503 solo exige 1 jogador e força speed_bonus em silêncio", () => {
    const two = lobbyWith(2);
    const solo = { game_mode: "solo", scoring_rule: "simple", total_songs: 10 } as const;
    expect(configureMatch(two, host, config(two, solo))).toEqual({ ok: false, error: "solo_requires_single_player" });
    const one = lobbyWith(1);
    expect(unwrap(configureMatch(one, host, config(one, solo))).config.scoring_rule).toBe("speed_bonus");
  });
  test("I-C-2 R-502 solo: range pela playlist escolhida", () => {
    let room = lobbyWith(1, 30);
    room = unwrap(configureMatch(room, host, config(room, { game_mode: "solo", total_songs: 30 })));
    expect(songRange(room)).toEqual({ min: 5, max: 30 });
    expect(configureMatch(room, host, config(room, { total_songs: 31 })).ok).toBe(false);
    room = unwrap(selectPlaylist(room, host, { playlist_id: playlistId(2), platform: "deezer", playable_songs: 3 }));
    expect(room.config.total_songs).toBe(3);
  });
  test("R-501 solo com mais de um jogador na hora de iniciar → solo_requires_single_player", () => {
    let room = lobbyWith(1);
    room = unwrap(configureMatch(room, host, config(room, { game_mode: "solo", total_songs: 10 })));
    room = unwrap(join(room, 2));
    expect(start(room)).toEqual({ ok: false, error: "solo_requires_single_player" });
  });
});

describe("R-603 troca de host", () => {
  test("R-603 passa ao conectado há mais tempo; desconectados não contam", () => {
    let room = unwrap(setConnectionStatus(lobbyWith(4), host, "reconnecting", at(T0 + 10)));
    // P2 caiu e voltou: agora está conectado há menos tempo que P3.
    room = unwrap(setConnectionStatus(room, guest, "reconnecting", at(T0 + 20)));
    room = unwrap(setConnectionStatus(room, guest, "connected", at(T0 + 30)));
    expect(unwrap(transferHost(room)).host_uuid).toBe(player(3));
  });
  test("R-603 se o host voltou, continua host", () => {
    expect(transferHost(lobbyWith(2))).toEqual({ ok: false, error: "host_still_connected" });
  });
  test("R-603 sem ninguém conectado → no_eligible_host", () => {
    let room = unwrap(setConnectionStatus(lobbyWith(2), host, "reconnecting", T0));
    room = unwrap(setConnectionStatus(room, guest, "reconnecting", T0));
    expect(transferHost(room)).toEqual({ ok: false, error: "no_eligible_host" });
  });
});

describe("phase derivada e ciclo da sala", () => {
  test("lobby → countdown → playing; todos saem → results; volta ao lobby/empty (R-703)", () => {
    let room = lobbyWith(2);
    expect(derivePhase(room)).toBe("lobby");
    room = unwrap(start(room));
    expect(derivePhase(room)).toBe("countdown");
    room = unwrap(finishCountdown(room));
    expect(derivePhase(room)).toBe("playing");
    room = unwrap(leaveRoom(unwrap(leaveRoom(room, guest, T0)), host, at(T0 + 5)));
    expect(room).toMatchObject({ state: "finished", match: { state: "completed", ended_at: T0 + 5 } });
    expect(derivePhase(room)).toBe("results");
    expect(unwrap(returnToLobby(room))).toMatchObject({ state: "empty", match: null });
    expect(returnToLobby(lobbyWith(1))).toEqual({ ok: false, error: "illegal_state_transition" });
  });
  test("createRoom começa empty, sem host", () => {
    const room = createRoom(unwrap(RoomId("00000000-0000-4000-8000-000000000001")), unwrap(InviteCode("ZZZ999")));
    expect(room).toMatchObject({ state: "empty", host_uuid: null, players: [] });
  });
});
