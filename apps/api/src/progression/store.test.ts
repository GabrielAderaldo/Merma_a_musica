import { afterAll, describe, expect, test } from "bun:test";
import { Duration, MatchId, PlayerUuid, PlaylistId, type Result, Timestamp } from "@merma/domain";
import { eq } from "drizzle-orm";
import { connect, migrateDatabase } from "../db/client.ts";
import { soloKnownSongs, soloPersonalBests, soloPlayerStats, soloPlaylistStats } from "../db/schema.ts";
import type { ProgressionStore, SoloEntry } from "./solo.ts";
import { MemoryProgressionStore, postgresProgressionStore } from "./store.ts";

const unwrap = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) expect.unreachable(`esperava ok, veio err(${String(r.error)})`);
  return r.value;
};

type Change = Partial<Omit<SoloEntry, "stats">> & { avg?: number; streak?: number };

// Uma partida solo já resumida. Cada teste usa um jogador novo, para rodar no mesmo Postgres sem se misturar.
const fixtures = () => {
  const player = unwrap(PlayerUuid(crypto.randomUUID()));
  const playlist = unwrap(PlaylistId(crypto.randomUUID()));
  let n = 0;
  const entry = (change: Change = {}): SoloEntry => {
    const { avg = 500, streak = 2, ...rest } = change;
    n++;
    return {
      player_uuid: player,
      playlist_id: playlist,
      answer_type: "both",
      time_per_round: unwrap(Duration(30_000)),
      match_id: unwrap(MatchId(crypto.randomUUID())),
      ended_at: unwrap(Timestamp(1_000_000 * n)),
      stats: { avg_points_per_song: avg, max_streak: streak, avg_response_time: 4_000 },
      fastest_correct: 3_000,
      response_times: [unwrap(Duration(3_000)), unwrap(Duration(5_000))],
      correct_song_keys: ["BRUM71500001", "asa branca\u001fluiz gonzaga"],
      ...rest,
    };
  };
  return { player, playlist, entry };
};

// O mesmo contrato para os dois adapters.
const contract = (make: () => ProgressionStore) => {
  test("R-504: a 1ª partida vira o recorde; uma pior compara com ela e não o troca; uma melhor troca", async () => {
    const store = make();
    const { player, playlist, entry } = fixtures();
    const first = unwrap(await store.recordSolo(entry({ avg: 500 })));
    expect(first).toEqual({
      current: { avg_points_per_song: 500, max_streak: 2, avg_response_time: 4_000, known_songs: 2 },
      previous_best: null,
      is_new_personal_best: true,
    });

    const worse = unwrap(await store.recordSolo(entry({ avg: 400, correct_song_keys: ["XXAAA2600001"] })));
    expect(worse.is_new_personal_best).toBe(false);
    expect(worse.previous_best).toEqual(first.current);
    expect(worse.current.known_songs).toBe(3);

    // Empatar não bate o recorde: tem de superar (R-504).
    expect(unwrap(await store.recordSolo(entry({ avg: 500 }))).is_new_personal_best).toBe(false);

    const better = unwrap(await store.recordSolo(entry({ avg: 750, correct_song_keys: [] })));
    expect(better.is_new_personal_best).toBe(true);
    const progress = unwrap(await store.playlistProgress(player, playlist));
    expect(progress?.personal_bests).toHaveLength(1);
    expect(progress?.personal_bests[0]).toMatchObject({ avg_points_per_song: 750, known_songs: 3, time_per_round: 30_000 });
  });

  test("R-504: o recorde é por (answer_type, time_per_round)", async () => {
    const store = make();
    const { player, playlist, entry } = fixtures();
    await store.recordSolo(entry({ avg: 900 }));
    const other = unwrap(await store.recordSolo(entry({ avg: 100, answer_type: "song" })));
    expect(other).toMatchObject({ previous_best: null, is_new_personal_best: true });
    const bests = unwrap(await store.playlistProgress(player, playlist))?.personal_bests ?? [];
    expect(bests.map((b) => b.answer_type).toSorted()).toEqual(["both", "song"]);
  });

  test("R-505 e R-506: streak máximo, tempo médio, músicas conhecidas, partidas e acerto mais rápido", async () => {
    const store = make();
    const { player, playlist, entry } = fixtures();
    const otherPlaylist = unwrap(PlaylistId(crypto.randomUUID()));
    await store.recordSolo(entry({ streak: 5, response_times: [unwrap(Duration(2_000))] }));
    await store.recordSolo(entry({ streak: 1, fastest_correct: null, response_times: [unwrap(Duration(8_000))] }));
    await store.recordSolo(entry({ playlist_id: otherPlaylist, streak: 3, fastest_correct: 1_500, correct_song_keys: ["BRUM71500001", "OUTRA"] }));

    const progress = unwrap(await store.progress(player));
    expect(progress.global_stats).toEqual({ max_streak: 5, fastest_correct: 1_500, solo_matches_completed: 3, known_songs: 3 });
    const first = progress.by_playlist.find((p) => p.playlist_id === playlist);
    expect(first).toMatchObject({ max_streak: 5, avg_response_time: 5_000, known_songs: 2, last_played_at: 2_000_000 });
    expect(progress.by_playlist).toHaveLength(2);
  });

  test("jogador sem partida solo: zeros, nenhuma playlist e null por playlist", async () => {
    const store = make();
    const { player, playlist } = fixtures();
    expect(unwrap(await store.progress(player))).toEqual({
      global_stats: { max_streak: 0, fastest_correct: null, solo_matches_completed: 0, known_songs: 0 },
      by_playlist: [],
    });
    expect(unwrap(await store.playlistProgress(player, playlist))).toBeNull();
  });
};

describe("MemoryProgressionStore", () => contract(() => new MemoryProgressionStore()));

test("Postgres fora do ar vira store_unavailable, sem exceção", async () => {
  const store = postgresProgressionStore(connect("postgres://merma:x@127.0.0.1:1/merma"));
  expect(await store.recordSolo(fixtures().entry())).toEqual({ ok: false, error: "store_unavailable" });
  expect(await store.progress(fixtures().player)).toEqual({ ok: false, error: "store_unavailable" });
});

// Contra o Postgres de verdade quando POSTGRES_URL existe: no CI (service postgres) e em dev com `infra up postgres`.
const url = process.env["POSTGRES_URL"];
describe.skipIf(url === undefined || url === "")("postgresProgressionStore (Postgres de verdade)", () => {
  const db = connect(url ?? "");
  const players = new Set<string>();
  const store = postgresProgressionStore(db);
  // Guarda os jogadores usados, para apagar as linhas no fim.
  const tracked: ProgressionStore = {
    recordSolo: (entry) => {
      players.add(entry.player_uuid);
      return store.recordSolo(entry);
    },
    progress: store.progress,
    playlistProgress: store.playlistProgress,
  };

  test("migra", async () => {
    expect(await migrateDatabase(db)).toEqual({ ok: true, value: undefined });
  });
  contract(() => tracked);

  afterAll(async () => {
    for (const p of players) {
      for (const table of [soloKnownSongs, soloPersonalBests, soloPlaylistStats]) await db.delete(table).where(eq(table.player_uuid, p));
      await db.delete(soloPlayerStats).where(eq(soloPlayerStats.player_uuid, p));
    }
    await db.$client.close();
  });
});
