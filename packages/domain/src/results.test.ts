import { describe, expect, test } from "bun:test";
import type { PlayerUuid } from "./brand.ts";
import { currentRound, endMatch, endRound, finishCountdown, markAudioResolved, replaceUnplayableSong, startGracePeriod, startRound, startTimer, submitAnswer } from "./match.ts";
import {
  compareWithPersonalBest,
  computeHighlights,
  matchResult,
  rank,
  soloStats,
  type PlayerStats,
  type SoloStats,
} from "./results.ts";
import { configureMatch, startGame } from "./room.ts";
import { at, defined, lobbyWith, matchId, player, roundId, songsOf, T0, unwrap } from "./testing.ts";
import type { Match, Room } from "./types.ts";

const [p1, p2, p3, p4] = [player(1), player(2), player(3), player(4)];

// Cada rodada: o que cada jogador faz. "ok" acerta, "near" erra por pouco, "miss" erra longe, null não responde.
// "unplayable": música sem áudio e sem reserva, a rodada é pulada (R-307).
const matchOf = (room: Room): Match => defined(room.match, "partida");
type Play = Readonly<Record<string, readonly ["ok" | "near" | "miss", number] | null>> | "unplayable";

// `songsEach` = rounds.length deixa a reserva vazia.
const play = (n: number, rounds: readonly Play[], mode: "multiplayer" | "solo" = "multiplayer", songsEach = 20): Room => {
  let room = lobbyWith(n);
  room = unwrap(configureMatch(room, p1, { ...room.config, total_songs: rounds.length, game_mode: mode }));
  const songs = Array.from({ length: n }, (_, i) => songsOf(player(i + 1), songsEach));
  room = unwrap(finishCountdown(unwrap(startGame(room, p1, { match_id: matchId, songs, seed: "results", now: T0 }))));
  rounds.forEach((plays, i) => {
    room = unwrap(startRound(room, roundId(i)));
    if (plays === "unplayable") {
      room = unwrap(replaceUnplayableSong(room));
      return;
    }
    room = unwrap(markAudioResolved(room));
    room = unwrap(startGracePeriod(room));
    room = unwrap(startTimer(room, T0));
    const song = currentRound(matchOf(room))?.song;
    for (const who of room.players.map((p) => p.player_uuid)) {
      const action = plays[who];
      if (action === undefined || action === null || song === undefined) continue;
      const [kind, afterMs] = action;
      // Distância 3: na trave com limite 1 ou 2 (nomes de 13 ou 14 caracteres, R-113).
      const text = kind === "ok" ? song.name : kind === "near" ? `${song.name}zzz` : "nada a ver";
      room = unwrap(submitAnswer(room, who, text, at(T0 + afterMs)));
    }
    room = unwrap(endRound(room, "timer_expired"));
  });
  return unwrap(endMatch(room, at(T0 + 1)));
};

describe("R-701 e R-204 ranking", () => {
  const stats = (id: PlayerUuid, total_points: number, max_streak: number): PlayerStats => ({
    player_uuid: id,
    nickname: id.slice(-1),
    total_points,
    correct_answers: 0,
    near_misses: 0,
    max_streak,
    avg_response_time: null,
    fastest_correct: null,
  });
  test("R-204 desempate pela maior streak; empate persistente divide a posição", () => {
    const ranking = rank([stats(p1, 100, 1), stats(p2, 300, 0), stats(p3, 100, 3), stats(p4, 100, 1)]);
    expect(ranking.map((r) => [r.player_uuid, r.position])).toEqual([
      [p2, 1],
      [p3, 2],
      [p1, 3],
      [p4, 3],
    ]);
  });
  test("R-701 vencedores empatados dividem a 1ª posição, e a seguinte pula (1, 1, 3)", () => {
    const ranking = rank([stats(p1, 500, 2), stats(p2, 500, 2), stats(p3, 10, 0)]);
    expect(ranking.map((r) => r.position)).toEqual([1, 1, 3]);
  });
});

describe("R-702 destaques", () => {
  test("R-702 fixture de 4 jogadores e 8 rodadas", () => {
    const rounds: readonly Play[] = [
      { [p1]: ["ok", 2_000], [p2]: ["ok", 5_000], [p3]: ["near", 3_000], [p4]: null },
      { [p1]: ["ok", 4_000], [p2]: ["miss", 1_000], [p3]: ["near", 2_000], [p4]: ["ok", 9_000] },
      { [p1]: ["ok", 6_000], [p2]: ["ok", 1_500], [p3]: ["ok", 20_000], [p4]: ["near", 5_000] },
      { [p1]: ["miss", 3_000], [p2]: ["ok", 2_500], [p3]: ["near", 4_000], [p4]: null },
      { [p1]: ["ok", 1_000], [p2]: ["ok", 3_000], [p3]: null, [p4]: ["ok", 700] },
      { [p1]: ["ok", 8_000], [p2]: ["ok", 4_000], [p3]: ["ok", 10_000], [p4]: ["miss", 2_000] },
      { [p1]: null, [p2]: ["ok", 6_000], [p3]: ["near", 1_000], [p4]: ["ok", 12_000] },
      { [p1]: ["ok", 2_000], [p2]: ["near", 2_000], [p3]: ["ok", 25_000], [p4]: ["ok", 3_000] },
    ];
    const result = matchResult(matchOf(play(4, rounds)));
    expect(result.highlights).toEqual({
      best_streak: { player_uuid: p2, nickname: "P2", value: 5 },
      fastest_answer: { player_uuid: p4, nickname: "P4", value: 700 },
      most_correct: { player_uuid: p2, nickname: "P2", value: 6 },
      near_miss_champion: { player_uuid: p3, nickname: "P3", value: 4 },
    });
    expect(result).toMatchSnapshot();
  });
  test("R-702 sem ninguém qualificado, o destaque é null", () => {
    const result = matchResult(matchOf(play(2, [{ [p1]: ["miss", 1_000], [p2]: null }, { [p1]: null, [p2]: ["miss", 1_000] }])));
    expect(result.highlights).toEqual({ best_streak: null, fastest_answer: null, most_correct: null, near_miss_champion: null });
  });
  test("R-702 empate num destaque fica com quem está melhor no ranking", () => {
    const ranking = rank([
      { player_uuid: p1, nickname: "P1", total_points: 10, correct_answers: 2, near_misses: 0, max_streak: 2, avg_response_time: 1, fastest_correct: 1 },
      { player_uuid: p2, nickname: "P2", total_points: 20, correct_answers: 2, near_misses: 0, max_streak: 2, avg_response_time: 1, fastest_correct: 1 },
    ]);
    expect(computeHighlights(ranking).most_correct?.player_uuid).toBe(p2);
  });
});

describe("R-504 e R-704 recorde do solo", () => {
  const solo = (avg: number): SoloStats => ({ avg_points_per_song: avg, max_streak: 1, avg_response_time: 1_000, known_songs: 3 });
  test("R-504 média por música = pontos ÷ rodadas jogadas", () => {
    const room = play(1, [{ [p1]: ["ok", 0] }, { [p1]: ["miss", 0] }, { [p1]: ["ok", 15_000] }, { [p1]: null }, { [p1]: ["ok", 30_000] }], "solo");
    const stats = soloStats(matchOf(room), 7);
    expect(stats).toEqual({ avg_points_per_song: (1000 + 550 + 100) / 5, max_streak: 1, avg_response_time: 11_250, known_songs: 7 });
  });
  test("R-504 R-307 rodada pulada por falta de áudio não entra na média", () => {
    const rounds: readonly Play[] = [{ [p1]: ["ok", 0] }, "unplayable", { [p1]: ["ok", 15_000] }, "unplayable", { [p1]: ["miss", 0] }];
    const room = play(1, rounds, "solo", rounds.length);
    expect(matchOf(room).total_rounds).toBe(3);
    expect(soloStats(matchOf(room), 0)?.avg_points_per_song).toBe((1000 + 550) / 3);
  });
  test("R-504 com todas as rodadas puladas, não há média nem recorde", () => {
    const rounds: readonly Play[] = ["unplayable", "unplayable", "unplayable", "unplayable", "unplayable"];
    expect(soloStats(matchOf(play(1, rounds, "solo", rounds.length)), 0)).toBeNull();
  });
  test("R-504 bate o recorde quem supera a média anterior", () => {
    expect(compareWithPersonalBest(solo(501), solo(500)).is_new_personal_best).toBe(true);
    expect(compareWithPersonalBest(solo(500), solo(500)).is_new_personal_best).toBe(false);
  });
  test("R-507 sem recorde anterior, a partida vira o recorde e previous_best é null", () => {
    expect(compareWithPersonalBest(solo(10), null)).toEqual({ current: solo(10), previous_best: null, is_new_personal_best: true });
  });
});
