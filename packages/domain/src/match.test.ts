import { describe, expect, test } from "bun:test";
import { seconds, type PlayerUuid, type Timestamp } from "./brand.ts";
import {
  currentRound,
  endMatch,
  endRound,
  finishCountdown,
  hasNextRound,
  markAudioResolved,
  markPersisted,
  replaceUnplayableSong,
  shouldEndRound,
  skipVotesNeeded,
  startGracePeriod,
  startRound,
  startTimer,
  submitAnswer,
  voteSkip,
} from "./match.ts";
import { configureMatch, derivePhase, leaveRoom, startGame } from "./room.ts";
import { at, defined, lobbyWith, matchId, player, roundId, songsOf, T0, unwrap } from "./testing.ts";
import type { Match, MatchConfiguration, Room } from "./types.ts";

const [p1, p2, p3, p4] = [player(1), player(2), player(3), player(4)];

const begin = (n: number, change: Partial<MatchConfiguration> = {}, songsEach = 20): Room => {
  let room = lobbyWith(n, songsEach);
  room = unwrap(configureMatch(room, p1, { ...room.config, total_songs: n * 2, ...change }));
  const songs = Array.from({ length: n }, (_, i) => songsOf(player(i + 1), songsEach));
  room = unwrap(startGame(room, p1, { match_id: matchId, songs, seed: "match", now: T0 }));
  return unwrap(finishCountdown(room));
};
const match = (room: Room): Match => defined(room.match, "partida");
const round = (room: Room) => defined(currentRound(match(room)), "rodada");
// Rodada `n` com o timer correndo a partir de `startAt`.
const running = (room: Room, n: number, startAt: Timestamp = T0): Room => {
  let r = unwrap(startRound(room, roundId(n)));
  r = unwrap(markAudioResolved(r));
  r = unwrap(startGracePeriod(r));
  return unwrap(startTimer(r, startAt));
};
const answer = (room: Room, who: PlayerUuid, afterMs: number, text = round(room).song.name) =>
  unwrap(submitAnswer(room, who, text, at(T0 + afterMs)));

describe("R-101 sequência da rodada", () => {
  test("countdown → in_progress; resolving → streaming → grace_period → timer_running → reveal", () => {
    let room = begin(2);
    expect(match(room).state).toBe("in_progress");
    room = unwrap(startRound(room, roundId(1)));
    expect(round(room).state).toBe("resolving");
    expect(round(room).timer_started_at).toBeNull(); // I-R-1
    expect(startTimer(room, T0)).toEqual({ ok: false, error: "illegal_state_transition" });
    room = unwrap(markAudioResolved(room));
    room = unwrap(startGracePeriod(room));
    expect(round(room).timer_started_at).toBeNull(); // I-R-1
    room = unwrap(startTimer(room, T0));
    expect(round(room)).toMatchObject({ state: "timer_running", timer_started_at: T0 });
    room = unwrap(endRound(room, "timer_expired"));
    expect(round(room).state).toBe("reveal");
    expect(derivePhase(room)).toBe("reveal");
  });
  test("I-M-3 current_round_index é null fora de in_progress", () => {
    let room = lobbyWith(2);
    room = unwrap(startGame(room, p1, { match_id: matchId, songs: [songsOf(p1, 20)], seed: "s", now: T0 }));
    expect(match(room)).toMatchObject({ state: "countdown", current_round_index: null });
  });
  test("I-M-2 scores tem uma entrada por jogador", () => {
    expect(Object.keys(match(begin(3)).scores).toSorted()).toEqual([p1, p2, p3].toSorted());
  });
  test("nova rodada só depois da revelação da anterior", () => {
    const room = running(begin(2), 1);
    expect(startRound(room, roundId(2))).toEqual({ ok: false, error: "illegal_state_transition" });
  });
});

describe("R-105 a R-108 respostas", () => {
  test("R-107 resposta fora de timer_running → round_not_accepting_answers", () => {
    let room = unwrap(startRound(begin(2), roundId(1)));
    room = unwrap(markAudioResolved(room));
    room = unwrap(startGracePeriod(room));
    expect(submitAnswer(room, p1, "x", T0)).toEqual({ ok: false, error: "round_not_accepting_answers" });
    room = unwrap(endRound(unwrap(startTimer(room, T0)), "timer_expired"));
    expect(submitAnswer(room, p1, "x", T0)).toEqual({ ok: false, error: "round_not_accepting_answers" });
  });
  test("I-R-2 R-105 vale a última resposta, com o tempo dela", () => {
    let room = running(begin(2), 1);
    room = answer(room, p1, 1_000, "errada");
    room = answer(room, p1, 5_000);
    expect(round(room).answers).toHaveLength(1);
    expect(round(room).answers[0]).toMatchObject({ response_time: 5_000 });
    room = unwrap(endRound(room, "timer_expired"));
    expect(round(room).answers[0]).toMatchObject({ is_correct: true, points_earned: 850 });
  });
  test("I-R-4 is_correct e points_earned ficam zerados até a revelação", () => {
    const room = answer(running(begin(2), 1), p1, 1_000);
    expect(round(room).answers[0]).toMatchObject({ is_correct: false, is_near_miss: false, points_earned: 0 });
  });
  test("R-108 resposta vazia depois de trim é 'não respondeu' e apaga a anterior", () => {
    let room = answer(running(begin(2), 1), p1, 1_000);
    room = answer(room, p1, 2_000, "   ");
    expect(round(room).answers).toHaveLength(0);
  });
  test("R-202 response_time é limitado a time_per_round", () => {
    const room = answer(running(begin(2), 1), p1, 99_000);
    expect(round(room).answers[0]?.response_time).toBe(seconds(30));
  });
  test("quem não está na partida → player_not_in_match", () => {
    expect(submitAnswer(running(begin(2), 1), p4, "x", T0)).toEqual({ ok: false, error: "player_not_in_match" });
  });
  test("R-601 responder tira o AFK", () => {
    let room = running(begin(2), 1);
    room = { ...room, players: room.players.map((p) => ({ ...p, afk: true })) };
    room = answer(room, p2, 1_000);
    expect(room.players.find((p) => p.player_uuid === p2)?.afk).toBe(false);
  });
});

describe("R-120 pular rodada", () => {
  test("R-120 maioria = floor(N/2) + 1", () => {
    expect(skipVotesNeeded(begin(1))).toBe(1);
    expect(skipVotesNeeded(begin(4))).toBe(3);
    expect(skipVotesNeeded(begin(5))).toBe(3);
  });
  test("R-120 só vota quem respondeu, uma vez (I-R-3)", () => {
    let room = running(begin(3), 1);
    expect(voteSkip(room, p1)).toEqual({ ok: false, error: "player_not_answered_yet" });
    room = answer(room, p1, 1_000);
    room = unwrap(voteSkip(room, p1));
    expect(voteSkip(room, p1)).toEqual({ ok: false, error: "player_already_voted" });
  });
  test("R-120 termina só com todos respondidos e maioria votando", () => {
    let room = running(begin(3), 1);
    for (const p of [p1, p2]) room = unwrap(voteSkip(answer(room, p, 1_000), p));
    expect(shouldEndRound(room, at(T0 + 2_000))).toBeNull(); // p3 não respondeu
    room = answer(room, p3, 3_000, "qualquer");
    expect(shouldEndRound(room, at(T0 + 3_000))).toBe("majority_skip");
  });
  test("R-120 quem saiu da sala não conta para todos nem para a maioria", () => {
    let room = running(begin(3), 1);
    room = unwrap(voteSkip(answer(room, p1, 1_000), p1));
    room = answer(room, p2, 1_000);
    expect(shouldEndRound(room, at(T0 + 1_000))).toBeNull();
    room = unwrap(leaveRoom(room, p3, at(T0 + 1_500)));
    expect(shouldEndRound(room, at(T0 + 1_500))).toBeNull(); // 1 de 2 votos necessários
    room = unwrap(voteSkip(room, p2));
    expect(shouldEndRound(room, at(T0 + 1_600))).toBe("majority_skip");
  });
  test("R-108 apagar a resposta retira o voto (I-R-3)", () => {
    let room = unwrap(voteSkip(answer(running(begin(2), 1), p1, 1_000), p1));
    room = answer(room, p1, 2_000, "");
    expect(round(room).skip_votes).toEqual([]);
  });
  test("R-503 solo não tem pular", () => {
    const room = answer(running(begin(1, { game_mode: "solo", total_songs: 5 }), 1), p1, 1_000);
    expect(voteSkip(room, p1)).toEqual({ ok: false, error: "round_not_accepting_skip" });
    expect(shouldEndRound(room, at(T0 + 1_000))).toBeNull();
  });
  test("votar fora de timer_running → round_not_accepting_skip", () => {
    expect(voteSkip(begin(2), p1)).toEqual({ ok: false, error: "round_not_accepting_skip" });
  });
  test("R-102 timer expirado pelo relógio do servidor", () => {
    const room = running(begin(2), 1);
    expect(shouldEndRound(room, at(T0 + 29_999))).toBeNull();
    expect(shouldEndRound(room, at(T0 + 30_000))).toBe("timer_expired");
  });
});

describe("R-201 a R-203 pontuação na revelação", () => {
  test("R-202 e R-203 pontos, placar acumulado e streak", () => {
    let room = begin(2);
    room = answer(running(room, 1), p1, 0);
    room = answer(room, p2, 1_000, "errada");
    room = unwrap(endRound(room, "timer_expired"));
    expect(match(room).scores).toEqual({ [p1]: 1000, [p2]: 0 });
    room = answer(running(room, 2), p1, 15_000);
    room = answer(room, p2, 0);
    room = unwrap(endRound(room, "timer_expired"));
    expect(match(room).scores).toEqual({ [p1]: 1550, [p2]: 1000 });
    expect(match(room).participants.map((p) => [p.current_streak, p.best_streak])).toEqual([
      [2, 2],
      [1, 1],
    ]);
    room = unwrap(endRound(running(room, 3), "timer_expired"));
    expect(match(room).participants.map((p) => [p.current_streak, p.best_streak])).toEqual([
      [0, 2],
      [0, 1],
    ]); // R-203: sem resposta zera
  });
  test("R-201 simple: 1 ponto por acerto", () => {
    let room = begin(2, { scoring_rule: "simple" });
    room = unwrap(endRound(answer(running(room, 1), p1, 20_000), "timer_expired"));
    expect(match(room).scores[p1]).toBe(1);
  });
  test("R-305 o dono responde à própria música normalmente", () => {
    let room = running(begin(2), 1);
    const owner = round(room).song.contributed_by;
    room = unwrap(endRound(answer(room, owner, 0), "timer_expired"));
    expect(match(room).scores[owner]).toBe(1000);
  });
});

describe("R-307 música sem áudio", () => {
  test("R-307 troca pela próxima da reserva, sem mudar total_rounds", () => {
    let room = unwrap(startRound(begin(2), roundId(1)));
    const before = round(room).song;
    const reserve = match(room).pool.reserve;
    room = unwrap(replaceUnplayableSong(room));
    expect(round(room).song).toEqual(reserve[0] ?? before);
    expect(round(room).song).not.toEqual(before);
    expect(match(room).pool.reserve).toHaveLength(reserve.length - 1);
    expect(match(room).total_rounds).toBe(4);
  });
  test("R-307 sem reserva, a rodada é pulada e total_rounds diminui em 1", () => {
    // 2 jogadores com 2 músicas cada e 4 rodadas: reserva vazia.
    let room = begin(2, {}, 2);
    expect(match(room).pool.reserve).toHaveLength(0);
    room = unwrap(endRound(running(room, 1), "timer_expired"));
    room = unwrap(startRound(room, roundId(2)));
    room = unwrap(replaceUnplayableSong(room));
    expect(match(room)).toMatchObject({ total_rounds: 3, current_round_index: 0 });
    expect(match(room).rounds).toHaveLength(1);
    room = unwrap(startRound(room, roundId(3)));
    expect(round(room).index).toBe(1);
  });
  test("R-307 só em resolving", () => {
    expect(replaceUnplayableSong(running(begin(2), 1))).toEqual({ ok: false, error: "illegal_state_transition" });
  });
});

describe("fim da partida", () => {
  test("última rodada revelada → completed → persisted; Room finished", () => {
    let room = begin(1, { total_songs: 2 });
    for (const n of [1, 2]) room = unwrap(endRound(running(room, n), "timer_expired"));
    expect(hasNextRound(match(room))).toBe(false);
    expect(startRound(room, roundId(3))).toEqual({ ok: false, error: "illegal_state_transition" });
    room = unwrap(endMatch(room, at(T0 + 99)));
    expect(room.state).toBe("finished");
    expect(match(room)).toMatchObject({ state: "completed", current_round_index: null, ended_at: T0 + 99 });
    expect(derivePhase(room)).toBe("results");
    expect(match(unwrap(markPersisted(room))).state).toBe("persisted");
  });
  test("endMatch com rodadas faltando → illegal_state_transition", () => {
    expect(endMatch(begin(2), T0)).toEqual({ ok: false, error: "illegal_state_transition" });
  });
  test("markPersisted fora de completed → illegal_state_transition", () => {
    expect(markPersisted(begin(2))).toEqual({ ok: false, error: "illegal_state_transition" });
  });
  test("R-602 quem cai continua na partida e pode responder ao voltar", () => {
    let room = running(begin(2), 1);
    room = { ...room, players: room.players.map((p) => (p.player_uuid === p2 ? { ...p, connection_status: "reconnecting" } : p)) };
    room = answer(room, p2, 1_000);
    expect(round(room).answers).toHaveLength(1);
  });
});
