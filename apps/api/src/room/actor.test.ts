import { describe, expect, test } from "bun:test";
import { createRoom, InviteCode, RoomId, type PlayerUuid } from "@merma/domain";
import { CloseCode, type WsClientMessage } from "@merma/schema";
import { RoomActor, TIMING } from "./actor.ts";
import { actorDeps, FAKE_MP3, FakeSocket, PLAYLIST, player } from "./testing.ts";

const CONFIG = {
  time_per_round: 10,
  total_songs: 2,
  answer_type: "song",
  allow_repeats: false,
  scoring_rule: "simple",
  game_mode: "multiplayer",
} as const;

type Setup = ReturnType<typeof actorDeps>;
type Config = Extract<WsClientMessage, { type: "configure_match" }>["config"];

// Sala com `n` jogadores conectados (o 1º é o host), cada um com seu socket falso.
const room = async (n: number, setup: Setup = actorDeps()) => {
  const code = InviteCode("ABC123");
  const id = RoomId("00000000-0000-4000-8000-000000007000");
  if (!code.ok || !id.ok) expect.unreachable("fixture");
  const actor = new RoomActor(createRoom(id.value, code.value), setup.deps);
  const sockets = new Map<PlayerUuid, FakeSocket>();
  for (let i = 1; i <= n; i++) {
    const socket = new FakeSocket();
    sockets.set(player(i), socket);
    expect(await actor.join(player(i), `P${i}`, socket)).toBe(true);
  }
  const socket = (i: number) => sockets.get(player(i)) ?? expect.unreachable(`socket ${i}`);
  const send = (i: number, command: Parameters<RoomActor["receive"]>[1]) => actor.receive(player(i), command, socket(i));
  const advance = (ms: number) => setup.clock.advance(ms, () => actor.idle());
  return { actor, socket, send, advance, ...setup };
};

// Todos escolhem playlist, o host configura e inicia; para no grace period da 1ª rodada.
const started = async (n: number, config: Partial<Config> = {}, setup?: Setup) => {
  const r = await room(n, setup);
  for (let i = 1; i <= n; i++) await r.send(i, { type: "select_playlist", playlist_id: PLAYLIST });
  await r.send(1, { type: "configure_match", config: { ...CONFIG, ...config } });
  await r.send(1, { type: "start_game" });
  await r.advance(TIMING.countdownMs);
  return r;
};

// Do grace period até o timer correndo.
const timerRunning = async (n: number, config: Partial<Config> = {}, setup?: Setup) => {
  const r = await started(n, config, setup);
  await r.advance(TIMING.gracePeriodMs);
  return r;
};

const currentSong = (r: { actor: RoomActor }) => {
  const match = r.actor.state.match;
  const round = match?.rounds[match.current_round_index ?? -1];
  return round?.song.name ?? expect.unreachable("rodada atual");
};

// O token do round_starting do jogador e a rodada dele.
const audioOf = (r: { socket: (i: number) => FakeSocket; actor: RoomActor }, i: number) => {
  const audio = r.socket(i).last("round_starting")?.audio;
  const round = r.actor.playingRoundId;
  if (audio?.audio_source !== "deezer" || round === undefined) return expect.unreachable("round_starting com áudio da Deezer");
  return { round, token: audio.audio_token };
};

describe("lobby", () => {
  test("R-004/R-602: quem entra recebe room_state e os outros, player_joined", async () => {
    const r = await room(2);
    expect(r.socket(1).last("room_state")).toMatchObject({ phase: "lobby", host_player_uuid: player(1) });
    expect(r.socket(1).last("player_joined")?.player).toMatchObject({ player_uuid: player(2), is_host: false });
    expect(r.socket(2).of("player_joined")).toEqual([]);
  });

  test("R-005: o 21º recebe room_full e não entra", async () => {
    const r = await room(20);
    const socket = new FakeSocket();
    expect(await r.actor.join(player(21), "P21", socket)).toBe(false);
    expect(socket.last("error")?.code).toBe("room_full");
    expect(r.actor.state.players).toHaveLength(20);
  });

  test("R-007: só o host configura, e a mudança chega a todos com o range", async () => {
    const r = await room(2);
    await r.send(2, { type: "configure_match", config: CONFIG });
    expect(r.socket(2).last("error")?.code).toBe("not_host");
    await r.send(1, { type: "configure_match", config: CONFIG });
    expect(r.socket(2).last("config_updated")).toEqual({
      type: "config_updated",
      config: CONFIG,
      song_range: { min: 2, max: 10 },
    });
  });

  test("R-008: o host não marca unready; os outros avisam a sala", async () => {
    const r = await room(2);
    await r.send(1, { type: "player_unready" });
    expect(r.socket(1).last("error")?.code).toBe("host_is_always_ready");
    await r.send(2, { type: "player_ready" });
    expect(r.socket(1).last("player_ready_changed")).toEqual({ type: "player_ready_changed", player_uuid: player(2), ready: true });
  });

  test("R-006: escolher playlist manda o estado inteiro, com has_playlist e a origem da playlist (R-010)", async () => {
    const r = await room(2);
    expect(r.socket(2).last("room_state")?.players.find((p) => p.player_uuid === player(2))?.platform).toBeNull();
    await r.send(2, { type: "select_playlist", playlist_id: PLAYLIST });
    const chosen = r.socket(1).last("room_state")?.players.find((p) => p.player_uuid === player(2));
    expect(chosen).toMatchObject({ has_playlist: true, platform: "deezer" });
  });

  test("playlist sem músicas volta no_playlists_imported", async () => {
    const setup = actorDeps();
    setup.songs.count = 0;
    const r = await room(1, setup);
    await r.send(1, { type: "select_playlist", playlist_id: PLAYLIST });
    expect(r.socket(1).last("error")?.code).toBe("no_playlists_imported");
  });

  test("R-104/S-22: autocomplete por substring no pool de quem está na sala, até 10", async () => {
    const r = await room(2);
    await r.send(1, { type: "select_playlist", playlist_id: PLAYLIST });
    await r.send(2, { type: "autocomplete_search", query: "musica 01 1" });
    expect(r.socket(2).last("autocomplete_results")?.results.map((s) => s.text)).toEqual([
      "Musica 01 1",
      ...Array.from({ length: 9 }, (_, i) => `Musica 01 1${i}`),
    ]);
    await r.send(2, { type: "autocomplete_search", query: "artista 01" });
    expect(r.socket(2).last("autocomplete_results")?.results).toEqual([{ text: "Artista 01", kind: "artist" }]);
  });

  test("player_leave avisa a sala, fecha com 1000 e passa o host adiante", async () => {
    const r = await room(2);
    await r.send(1, { type: "player_leave" });
    expect(r.socket(1).closedWith).toBe(CloseCode.normal);
    expect(r.socket(2).last("player_left")).toEqual({ type: "player_left", player_uuid: player(1), reason: "voluntary" });
    expect(r.socket(2).last("host_changed")?.new_host_uuid).toBe(player(2));
  });
});

describe("conexão", () => {
  test("R-605/S-03: a mesma identidade numa 2ª conexão fecha a anterior com 4001", async () => {
    const r = await room(1);
    const second = new FakeSocket();
    await r.actor.join(player(1), "P1", second);
    expect(r.socket(1).closedWith).toBe(CloseCode.duplicate_identity);
    // O close da conexão antiga não derruba o jogador.
    await r.actor.disconnect(player(1), r.socket(1));
    expect(r.actor.state.players[0]?.connection_status).toBe("connected");
    // E mensagens dela são ignoradas.
    await r.send(1, { type: "player_afk_changed", afk: true });
    expect(r.actor.state.players[0]?.afk).toBe(false);
  });

  test("R-602: caiu, fica reconectando; sem voltar em 2 min sai com timeout", async () => {
    const r = await room(2);
    await r.actor.disconnect(player(2), r.socket(2));
    expect(r.actor.state.players[1]?.connection_status).toBe("reconnecting");
    await r.advance(TIMING.reconnectWindowMs);
    expect(r.socket(1).last("player_left")).toEqual({ type: "player_left", player_uuid: player(2), reason: "timeout" });
    expect(r.actor.state.players).toHaveLength(1);
  });

  test("R-602: voltar dentro da janela mantém o jogador e cancela o timeout", async () => {
    const r = await room(2);
    await r.actor.disconnect(player(2), r.socket(2));
    await r.advance(TIMING.reconnectWindowMs - 1);
    await r.actor.join(player(2), "P2", new FakeSocket());
    await r.advance(TIMING.reconnectWindowMs);
    expect(r.actor.state.players.map((p) => p.connection_status)).toEqual(["connected", "connected"]);
  });

  test("R-603: host fora por 60s passa o papel; quem volta antes continua host", async () => {
    const r = await room(3);
    await r.actor.disconnect(player(1), r.socket(1));
    await r.advance(TIMING.hostTimeoutMs - 1);
    await r.actor.join(player(1), "P1", new FakeSocket());
    await r.advance(TIMING.hostTimeoutMs);
    expect(r.actor.state.host_uuid).toBe(player(1));

    const again = new FakeSocket();
    await r.actor.join(player(1), "P1", again);
    await r.actor.disconnect(player(1), again);
    await r.advance(TIMING.hostTimeoutMs);
    expect(r.actor.state.host_uuid).toBe(player(2));
    expect(r.socket(3).last("host_changed")).toEqual({
      type: "host_changed",
      new_host_uuid: player(2),
      new_host_nickname: "P2",
      reason: "previous_host_disconnected",
    });
  });

  test("sala vazia por 10 min termina e avisa o registry", async () => {
    const setup = actorDeps();
    const code = InviteCode("ABC123");
    const id = RoomId("00000000-0000-4000-8000-000000007000");
    if (!code.ok || !id.ok) expect.unreachable("fixture");
    const terminated: string[] = [];
    const actor = new RoomActor(createRoom(id.value, code.value), setup.deps, (c) => terminated.push(c));
    await setup.clock.advance(TIMING.emptyRoomMs, () => actor.idle());
    expect(actor.state.state).toBe("terminated");
    expect(terminated).toEqual(["ABC123"]);
  });
});

describe("partida", () => {
  test("R-101: game_starting → round_starting com audio_token por jogador → timer_started", async () => {
    const r = await started(2);
    expect(r.socket(2).last("game_starting")).toEqual({ type: "game_starting", countdown_seconds: 3 });
    const [a, b] = [r.socket(1).last("round_starting"), r.socket(2).last("round_starting")];
    expect(a).toMatchObject({ round_index: 0, total_rounds: 2, grace_period_seconds: 3, audio: { audio_source: "deezer" } });
    expect(a?.audio).not.toEqual(b?.audio); // um token por jogador
    expect(r.socket(1).of("timer_started")).toEqual([]);
    await r.advance(TIMING.gracePeriodMs);
    expect(r.socket(2).last("timer_started")).toEqual({ type: "timer_started", duration_seconds: 10, server_now: r.clock.now() });
  });

  test("R-107: resposta no grace period é recusada", async () => {
    const r = await started(1);
    await r.send(1, { type: "submit_answer", answer_text: "x" });
    expect(r.socket(1).last("error")?.code).toBe("round_not_accepting_answers");
  });

  test("S-20: response_time sai do relógio do servidor, contado do timer_started", async () => {
    const r = await timerRunning(1);
    await r.advance(4_000);
    await r.send(1, { type: "submit_answer", answer_text: "x" });
    const match = r.actor.state.match;
    const answers = match?.rounds[match.current_round_index ?? -1]?.answers;
    expect(answers?.map((a): number => a.response_time)).toEqual([4_000]);
  });

  test("S-21: answer_confirmed só para quem respondeu, sem dizer se acertou", async () => {
    const r = await timerRunning(2);
    await r.send(1, { type: "submit_answer", answer_text: currentSong(r) });
    expect(r.socket(1).last("answer_confirmed")).toEqual({ type: "answer_confirmed" });
    expect(r.socket(2).of("answer_confirmed")).toEqual([]);
  });

  test("R-130: o timer acaba, round_ended revela respostas e placar; R-120 só com maioria", async () => {
    const r = await timerRunning(2);
    const name = currentSong(r);
    await r.advance(2_000);
    await r.send(1, { type: "submit_answer", answer_text: name });
    await r.advance(TIMING.gracePeriodMs + 10_000);
    const ended = r.socket(2).of("round_ended")[0];
    expect(ended).toMatchObject({ round_index: 0, end_reason: "timer_expired", song: { name, contributed_by: expect.any(String) } });
    expect(ended?.answers).toEqual([
      { player_uuid: player(1), nickname: "P1", answer_text: name, is_correct: true, is_near_miss: false, points_earned: 1, response_time: 2 },
      { player_uuid: player(2), nickname: "P2", answer_text: null, is_correct: false, is_near_miss: false, points_earned: 0, response_time: null },
    ]);
    expect(ended?.scores).toEqual({ [player(1)]: 1, [player(2)]: 0 });
  });

  test("R-120: todos responderam e a maioria pulou → round_ended majority_skip", async () => {
    const r = await timerRunning(3);
    for (const i of [1, 2, 3]) await r.send(i, { type: "submit_answer", answer_text: "nada" });
    await r.send(1, { type: "vote_skip" });
    expect(r.socket(3).last("player_voted_skip")).toEqual({ type: "player_voted_skip", player_uuid: player(1), skip_votes: 1, votes_needed: 2 });
    expect(r.socket(3).of("round_ended")).toEqual([]);
    await r.send(2, { type: "vote_skip" });
    expect(r.socket(3).last("round_ended")?.end_reason).toBe("majority_skip");
  });

  test("R-703: a última rodada vira game_ended e, 5s depois, a sala volta ao lobby", async () => {
    const r = await timerRunning(1);
    // A partida acaba depois da revelação da última rodada (R-101).
    await r.advance(10_000 + TIMING.revealMs + TIMING.gracePeriodMs + 10_000 + TIMING.revealMs);
    expect(r.socket(1).of("round_ended")).toHaveLength(2);
    const ended = r.socket(1).last("game_ended");
    expect(ended).toMatchObject({ ranking: [{ position: 1, player_uuid: player(1) }], return_to_lobby_in_seconds: 5 });
    expect(r.actor.state.state).toBe("finished");
    await r.advance(TIMING.resultsMs);
    expect(r.actor.state.state).toBe("lobby");
    expect(r.socket(1).last("room_state")?.phase).toBe("lobby");
  });

  test("R-307: música sem áudio é trocada pela reserva antes de round_starting", async () => {
    // O sorteio é determinístico (seed fixa): a 1ª música de uma partida igual é a que vai ficar sem áudio.
    const name = currentSong(await started(1));
    const again = actorDeps();
    again.audio.unplayable.add(name);
    const r = await started(1, {}, again);
    expect(currentSong(r)).not.toBe(name);
    expect(r.socket(1).of("round_starting")).toHaveLength(1);
    expect(r.lines).toContainEqual(expect.objectContaining({ event: "audio_unavailable" }));
  });

  test("R-602: quem volta com o timer correndo recebe o áudio de novo no room_state", async () => {
    const r = await timerRunning(2);
    await r.actor.disconnect(player(2), r.socket(2));
    const back = new FakeSocket();
    await r.actor.join(player(2), "P2", back);
    expect(back.last("room_state")).toMatchObject({ phase: "playing", current_round_index: 0, total_rounds: 2, audio: { audio_source: "deezer" } });
  });

  test("S-14: o token vale até o fim previsto da rodada (grace period + time_per_round)", async () => {
    const r = await started(1);
    // O round_starting saiu agora: o timer começa daqui a 3s e dura 10s.
    expect(r.audio.expiries).toEqual([r.clock.now() + TIMING.gracePeriodMs + 10_000]);
  });

  test("S-12: o MP3 sai uma vez por token; depois, token_already_used", async () => {
    const r = await started(1);
    const { round, token } = audioOf(r, 1);
    expect(await r.actor.takeAudio(player(1), round, token)).toEqual({ ok: true, value: FAKE_MP3 });
    expect(await r.actor.takeAudio(player(1), round, token)).toEqual({ ok: false, error: "token_already_used" });
  });

  test("S-12: reconectar emite um token novo e invalida o anterior, até 3 por rodada", async () => {
    const r = await timerRunning(2);
    const first = audioOf(r, 2);
    const tokens = [first.token];
    let current = r.socket(2);
    for (let i = 0; i < 3; i++) {
      await r.actor.disconnect(player(2), current);
      current = new FakeSocket();
      await r.actor.join(player(2), "P2", current);
      const audio = current.last("room_state")?.audio;
      tokens.push(audio?.audio_source === "deezer" ? audio.audio_token : "");
    }
    // round_starting + 2 reconexões = 3 emissões; a 3ª reconexão volta sem áudio.
    expect(tokens.filter((t) => t !== "")).toHaveLength(3);
    expect(tokens[3]).toBe("");
    expect(await r.actor.takeAudio(player(2), first.round, first.token)).toEqual({ ok: false, error: "token_already_used" });
    expect(await r.actor.takeAudio(player(2), first.round, tokens[2] ?? "")).toEqual({ ok: true, value: FAKE_MP3 });
  });

  test("S-14: depois de round_ended o áudio acabou (round_expired)", async () => {
    const r = await timerRunning(1);
    const { round, token } = audioOf(r, 1);
    await r.advance(10_000);
    expect(r.socket(1).of("round_ended")).toHaveLength(1);
    expect(r.actor.playingRoundId).toBeUndefined();
    expect(await r.actor.takeAudio(player(1), round, token)).toEqual({ ok: false, error: "round_expired" });
  });

  test("todos saem no meio da partida: ela termina com o placar que tiver e é persistida", async () => {
    const r = await timerRunning(1);
    await r.send(1, { type: "player_leave" });
    await r.actor.idle();
    expect(r.actor.state.state).toBe("finished");
    expect(r.matches.saved).toHaveLength(1);
  });
});

describe("ADR-0002.R1 — toda mutação da sala passa pela fila do RoomActor", () => {
  test("20 submit_answer simultâneos: cada resposta registrada uma vez e um answer_confirmed por jogador", async () => {
    const r = await timerRunning(20);
    await Promise.all(Array.from({ length: 20 }, (_, i) => r.send(i + 1, { type: "submit_answer", answer_text: `r${i + 1}` })));
    const round = r.actor.state.match?.rounds[0];
    expect(round?.answers.map((a) => a.answer_text).toSorted()).toEqual(Array.from({ length: 20 }, (_, i) => `r${i + 1}`).toSorted());
    for (let i = 1; i <= 20; i++) expect(r.socket(i).of("answer_confirmed")).toHaveLength(1);
  });

  test("um comando que espera I/O segura os seguintes: nada se intercala", async () => {
    const setup = actorDeps();
    let release = () => {};
    setup.songs.delay = new Promise<void>((resolve) => (release = resolve));
    const r = await room(2, setup);
    const select = r.send(1, { type: "select_playlist", playlist_id: PLAYLIST });
    const start = r.send(1, { type: "start_game" });
    await Bun.sleep(1);
    expect(r.actor.state.state).toBe("lobby"); // o start_game ainda espera o select_playlist
    release();
    await Promise.all([select, start]);
    // O start_game só rodou depois de a playlist entrar: a partida começou com ela.
    expect(r.actor.state.state).toBe("in_match");
  });
});

describe("ADR-0006.R1 — o Postgres só recebe a partida em completed, uma vez", () => {
  test("nenhuma escrita durante a partida; uma em completed, sem answer_text", async () => {
    const setup = actorDeps();
    const r = await timerRunning(2, {}, setup);
    setup.matches.stateAtCall = () => `${r.actor.state.state}/${r.actor.state.match?.state}`;
    await r.send(1, { type: "submit_answer", answer_text: "Asa Branca" });
    await r.advance(10_000 + TIMING.revealMs + TIMING.gracePeriodMs);
    expect(setup.matches.calls).toEqual([]);
    await r.advance(10_000 + TIMING.revealMs);
    expect(setup.matches.calls).toEqual(["finished/completed"]);
    expect(JSON.stringify(setup.matches.saved)).not.toContain("Asa Branca");
    expect(JSON.stringify(setup.matches.saved)).not.toContain("answer_text");
    expect(r.actor.state.match?.state).toBe("persisted");
  });
});

describe("R-704 — no solo, o game_ended compara com o recorde (Progression)", () => {
  // Partida solo de 2 rodadas; acerta as rodadas marcadas em `hits`.
  const soloMatch = async (setup: Setup, hits: readonly [boolean, boolean]) => {
    setup.songs.count = 2;
    const r = await timerRunning(1, { game_mode: "solo", scoring_rule: "speed_bonus", total_songs: 2 }, setup);
    setup.solo.stateAtCall = () => `${r.actor.state.state}/${r.actor.state.match?.state}`;
    const answer = (hit: boolean) => r.send(1, { type: "submit_answer", answer_text: hit ? currentSong(r) : "zzzz zzzz" });
    await answer(hits[0]);
    await r.advance(10_000 + TIMING.revealMs + TIMING.gracePeriodMs);
    await answer(hits[1]);
    await r.advance(10_000 + TIMING.revealMs);
    return r;
  };

  test("1ª partida: sem recorde anterior, vira o recorde; a 2ª, pior, compara com ela", async () => {
    const setup = actorDeps();
    const first = await soloMatch(setup, [true, true]);
    const comparison = first.socket(1).last("game_ended")?.solo_comparison;
    expect(comparison?.previous_best).toBeNull();
    expect(comparison?.is_new_personal_best).toBe(true);
    expect(comparison?.current.known_songs).toBe(2);
    expect(comparison?.current.max_streak).toBe(2);

    await first.advance(TIMING.resultsMs);
    expect(first.actor.state.state).toBe("lobby");
    await first.send(1, { type: "start_game" });
    await first.advance(TIMING.countdownMs + TIMING.gracePeriodMs);
    await first.send(1, { type: "submit_answer", answer_text: "zzzz zzzz" });
    await first.advance(10_000 + TIMING.revealMs + TIMING.gracePeriodMs);
    await first.advance(10_000 + TIMING.revealMs);
    const second = first.socket(1).last("game_ended")?.solo_comparison;
    expect(second?.is_new_personal_best).toBe(false);
    expect(second?.previous_best).toEqual(comparison?.current ?? null);
    expect(second?.current.avg_points_per_song).toBe(0);
    // Músicas conhecidas acumulam entre partidas (R-505): as 2 da 1ª continuam contando.
    expect(second?.current.known_songs).toBe(2);
  });

  test("ADR-0006.R1: a Progression é chamada uma vez, só em completed", async () => {
    const setup = actorDeps();
    await soloMatch(setup, [true, false]);
    expect(setup.solo.calls).toEqual(["finished/completed"]);
  });

  test("Progression fora do ar: game_ended sai sem solo_comparison, e o erro vai para o log", async () => {
    const setup = actorDeps();
    setup.solo.fail = true;
    const r = await soloMatch(setup, [true, true]);
    const ended = r.socket(1).last("game_ended");
    expect(ended).toBeDefined();
    expect(ended).not.toHaveProperty("solo_comparison");
    expect(setup.lines.some((l) => l["event"] === "solo_record_failed")).toBe(true);
  });

  test("multiplayer não chama a Progression nem manda solo_comparison", async () => {
    const setup = actorDeps();
    const r = await timerRunning(2, { total_songs: 2 }, setup);
    await r.advance(2 * (10_000 + TIMING.revealMs + TIMING.gracePeriodMs));
    expect(r.socket(1).last("game_ended")).not.toHaveProperty("solo_comparison");
    expect(setup.solo.calls).toEqual([]);
  });
});

describe("ADR-0009.R2 — snapshot só com a sala em in_match", () => {
  test("lobby não grava; in_match grava a cada 5s; depois de persistir, o snapshot some", async () => {
    const setup = actorDeps();
    const r = await room(1, setup);
    await r.advance(60_000);
    expect(setup.snapshots.saves).toBe(0);

    await r.send(1, { type: "select_playlist", playlist_id: PLAYLIST });
    await r.send(1, { type: "configure_match", config: { ...CONFIG, total_songs: 1 } });
    await r.send(1, { type: "start_game" });
    await r.advance(TIMING.snapshotEveryMs);
    expect(setup.snapshots.saves).toBe(1);
    expect(setup.snapshots.get("ABC123")?.room.state).toBe("in_match");

    await r.advance(TIMING.countdownMs + TIMING.gracePeriodMs + 10_000);
    expect(r.actor.state.state).toBe("finished");
    const saves = setup.snapshots.saves;
    expect(setup.snapshots.get("ABC123")).toBeUndefined();
    await r.advance(60_000);
    expect(setup.snapshots.saves).toBe(saves);
  });

  test("o snapshot do desligamento também não grava fora de in_match", async () => {
    const setup = actorDeps();
    const r = await room(1, setup);
    await r.actor.snapshot();
    expect(setup.snapshots.saves).toBe(0);
  });
});

describe("ADR-0010 — eventos do funil e métricas do actor", () => {
  const events = (lines: Record<string, unknown>[]) => lines.map((l) => l["event"]);

  test("partida inteira: match_started, round_completed por rodada, match_completed; round_duration e S-26", async () => {
    const setup = actorDeps();
    setup.songs.count = 2;
    const r = await timerRunning(1, { game_mode: "solo", total_songs: 2 }, setup);
    // Acerta as duas na hora: 100% e média abaixo de 1s (S-26).
    await r.send(1, { type: "submit_answer", answer_text: currentSong(r) });
    await r.advance(10_000 + TIMING.revealMs + TIMING.gracePeriodMs);
    await r.send(1, { type: "submit_answer", answer_text: currentSong(r) });
    await r.advance(10_000 + TIMING.revealMs);
    const seen = events(setup.lines);
    expect(seen.filter((e) => e === "round_completed")).toHaveLength(2);
    for (const e of ["match_started", "match_completed", "solo_personal_best_broken"]) expect(seen).toContain(e);
    expect(seen).not.toContain("match_abandoned");
    expect(setup.metrics.roundDuration.count).toBe(2);
    expect(setup.metrics.suspiciousPatterns.value()).toBe(1);
  });

  test("todos saem no meio: match_abandoned, sem match_completed", async () => {
    const setup = actorDeps();
    const r = await timerRunning(1, {}, setup);
    await r.send(1, { type: "player_leave" });
    await r.advance(TIMING.resultsMs);
    expect(events(setup.lines)).toContain("match_abandoned");
    expect(events(setup.lines)).not.toContain("match_completed");
  });

  test("player_reconnected ao voltar; player_timeout depois de 2 min fora (R-602)", async () => {
    const setup = actorDeps();
    const r = await room(2, setup);
    await r.actor.disconnect(player(2), r.socket(2));
    await r.actor.join(player(2), "P2", new FakeSocket());
    expect(events(setup.lines)).toContain("player_reconnected");
    await r.actor.disconnect(player(1), r.socket(1));
    await r.advance(TIMING.reconnectWindowMs);
    expect(setup.lines).toContainEqual(expect.objectContaining({ event: "player_timeout", player_uuid: player(1) }));
  });

  test("snapshot gravado conta redis_snapshot_total{result=ok}", async () => {
    const setup = actorDeps();
    const r = await timerRunning(1, {}, setup);
    await r.actor.snapshot();
    expect(setup.metrics.redisSnapshots.value({ result: "ok" })).toBeGreaterThan(0);
  });
});
