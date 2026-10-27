import { describe, expect, test } from "bun:test";
import type { Match } from "@merma/domain";
import { suspiciousPlayers } from "./suspicious.ts";

const A = "player-a";
const B = "player-b";

// Só o que a detecção lê: participantes e, por rodada, as respostas.
const match = (rounds: { player: string; correct: boolean; ms: number }[][]): Match =>
  ({
    participants: [{ player_uuid: A }, { player_uuid: B }],
    rounds: rounds.map((answers) => ({
      answers: answers.map((a) => ({ player_uuid: a.player, is_correct: a.correct, response_time: a.ms })),
    })),
  }) as unknown as Match;

describe("S-26 — 100% de acerto e média abaixo de 1s", () => {
  test("todas certas e média < 1s é suspeito; média de 1s não é", () => {
    const m = match([
      [{ player: A, correct: true, ms: 400 }, { player: B, correct: true, ms: 900 }],
      [{ player: A, correct: true, ms: 1_200 }, { player: B, correct: true, ms: 1_100 }],
    ]);
    expect(suspiciousPlayers(m).map(String)).toEqual([A]);
  });

  test("uma errada, ou uma rodada sem resposta, tira do padrão", () => {
    const m = match([
      [{ player: A, correct: true, ms: 100 }, { player: B, correct: true, ms: 100 }],
      [{ player: A, correct: false, ms: 100 }],
    ]);
    expect(suspiciousPlayers(m)).toEqual([]);
  });

  test("partida sem rodada não conta", () => {
    expect(suspiciousPlayers(match([]))).toEqual([]);
  });
});
