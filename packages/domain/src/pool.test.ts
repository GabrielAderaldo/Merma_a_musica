import { describe, expect, test } from "bun:test";
import { Isrc } from "./brand.ts";
import { distributePool, multiplayerSongRange, songKey, soloSongRange, splitQuota } from "./pool.ts";
import { createRng, shuffle } from "./random.ts";
import { player, song, songsOf, unwrap } from "./testing.ts";

const [a, b, c, d] = [player(1), player(2), player(3), player(4)];
const countBy = (songs: readonly { contributed_by: string }[]) =>
  [...Map.groupBy(songs, (s) => s.contributed_by).values()].map((g) => g.length).toSorted((x, y) => y - x);

describe("R-302 e R-502 range de total_songs", () => {
  test.each([
    [4, 4, 20],
    [10, 10, 50],
    [20, 20, 100],
  ])("R-302 %p jogadores → %p a %p (com ou sem playlist)", (players, min, max) => {
    expect(multiplayerSongRange(players)).toEqual({ min, max });
  });
  test.each([
    [100, 5, 50],
    [30, 5, 30],
    [5, 5, 5],
    [4, 1, 4],
    [1, 1, 1],
  ])("R-502 solo com %p músicas tocáveis → %p a %p", (playable, min, max) => {
    expect(soloSongRange(playable)).toEqual({ min, max });
  });
});

describe("R-303 divisão entre quem tem playlist", () => {
  test("R-303 13 músicas para 3 jogadores com playlist → 5, 4, 4 (seed test-seed-1)", () => {
    const quota = splitQuota(13, [a, b, c], "test-seed-1");
    expect([...quota.values()].toSorted((x, y) => y - x)).toEqual([5, 4, 4]);
    const pool = unwrap(distributePool([songsOf(a, 20), songsOf(b, 20), songsOf(c, 20)], 13, false, "test-seed-1"));
    expect(pool.ordered).toHaveLength(13);
    expect(countBy(pool.ordered)).toEqual([5, 4, 4]);
  });
  test("R-303 a sobra cai em jogadores diferentes conforme a seed", () => {
    const winners = new Set(
      ["s1", "s2", "s3", "s4", "s5", "s6"].map((seed) =>
        [...splitQuota(13, [a, b, c], seed)].find(([, n]) => n === 5)?.[0],
      ),
    );
    expect(winners.size).toBeGreaterThan(1);
  });
  test("R-301 jogador sem músicas fica de fora da divisão", () => {
    const pool = unwrap(distributePool([songsOf(a, 10), { player_uuid: b, songs: [] }], 6, false, "x"));
    expect(countBy(pool.ordered)).toEqual([6]);
  });
  test("R-303 playlist curta: o que falta sai das outras", () => {
    const pool = unwrap(distributePool([songsOf(a, 2), songsOf(b, 20)], 10, false, "x"));
    expect(countBy(pool.ordered)).toEqual([8, 2]);
  });
  test("sem nenhuma playlist → no_playlists_imported", () => {
    expect(distributePool([], 5, false, "x")).toEqual({ ok: false, error: "no_playlists_imported" });
  });
  test("músicas insuficientes → not_enough_unique_songs", () => {
    expect(distributePool([songsOf(a, 3), songsOf(b, 3)], 7, false, "x")).toEqual({
      ok: false,
      error: "not_enough_unique_songs",
    });
  });
});

describe("R-304 repetição", () => {
  const isrc = unwrap(Isrc("BRUM71900001"));
  // A e B têm a mesma música (mesmo ISRC) e uma variação de caixa/acento (mesmo nome e artista normalizados).
  const shared = (owner: typeof a) => ({
    player_uuid: owner,
    songs: [song(owner, "Evidências", "Chitãozinho", isrc), song(owner, "Garota de Ipanema", "Tom Jobim")],
  });
  const variant = {
    player_uuid: b,
    songs: [song(b, "Evidencias", "Chitãozinho", isrc), song(b, "garota de ipanema", "TOM JOBIM")],
  };
  test("R-304 mesma chave por ISRC e, sem ISRC, por (nome, artista) normalizados", () => {
    expect(songKey(song(a, "x", "y", isrc))).toBe(isrc);
    expect(songKey(song(a, "Garota de Ipanema", "Tom Jobim"))).toBe(songKey(song(b, "garota de ipanema", "TOM JOBIM")));
  });
  test("R-304 allow_repeats = false: a mesma música não aparece duas vezes", () => {
    expect(distributePool([shared(a), variant], 4, false, "x")).toEqual({ ok: false, error: "not_enough_unique_songs" });
    const pool = unwrap(distributePool([shared(a), variant], 2, false, "x"));
    expect(new Set(pool.ordered.map(songKey)).size).toBe(2);
  });
  test("R-304 allow_repeats = true: repete se vier de playlists diferentes", () => {
    const pool = unwrap(distributePool([shared(a), variant], 4, true, "x"));
    expect(new Set(pool.ordered.map(songKey)).size).toBe(2);
  });
  test("R-304 allow_repeats = true não repete dentro da mesma playlist", () => {
    const twice = { player_uuid: a, songs: [song(a, "Uma", "X"), song(a, "uma", "x")] };
    expect(distributePool([twice], 2, true, "x")).toEqual({ ok: false, error: "not_enough_unique_songs" });
  });
});

describe("R-306 e R-307 ordem e reserva", () => {
  const playlists = [songsOf(a, 10), songsOf(b, 10), songsOf(c, 10), songsOf(d, 10)];
  test("mesma seed → mesmo pool; seed diferente → outra ordem (R-306)", () => {
    const one = unwrap(distributePool(playlists, 12, false, "seed-a"));
    expect(unwrap(distributePool(playlists, 12, false, "seed-a"))).toEqual(one);
    expect(unwrap(distributePool(playlists, 12, false, "seed-b")).ordered).not.toEqual(one.ordered);
  });
  test("R-306 as rodadas não saem agrupadas por dono", () => {
    const { ordered } = unwrap(distributePool(playlists, 12, false, "seed-a"));
    const owners = ordered.map((s) => s.contributed_by);
    expect(owners.slice(0, 3).every((o) => o === owners[0])).toBe(false);
  });
  test("R-307 a reserva é o resto do pool, sem nada que já está na partida", () => {
    const pool = unwrap(distributePool(playlists, 12, false, "seed-a"));
    expect(pool.reserve).toHaveLength(28);
    const picked = new Set(pool.ordered.map(songKey));
    expect(pool.reserve.some((s) => picked.has(songKey(s)))).toBe(false);
  });
});

describe("PRNG", () => {
  test("Mulberry32 é determinístico e fica em [0, 1)", () => {
    const r1 = createRng("x");
    const r2 = createRng("x");
    const values = Array.from({ length: 1000 }, () => r1());
    expect(values).toEqual(Array.from({ length: 1000 }, () => r2()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
  test("Fisher-Yates mantém os elementos e não muta a entrada", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, createRng("y"));
    expect(out.toSorted()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
