import { describe, expect, test } from "bun:test";
import { Duration, MatchId, PlayerUuid, PlaylistId, Timestamp } from "@merma/domain";
import { ErrorResponse, PersonalBestsResponse, PlaylistProgress } from "@merma/schema";
import type { ProgressionStore } from "../progression/solo.ts";
import { MemoryProgressionStore } from "../progression/store.ts";
import { sessionCookie, testApp } from "../testing.ts";

const PLAYLIST = "00000000-0000-4000-8000-000000005000";

const app = (progression: ProgressionStore = new MemoryProgressionStore()) => {
  const a = testApp({ progression });
  a.get("/whoami", (c) => c.json(c.get("session")));
  return a;
};

// Sessão nova e o player_uuid dela, que é a única identidade que as rotas aceitam (ADR-0013).
const login = async (a: ReturnType<typeof app>) => {
  const cookie = sessionCookie(await a.request("/health")) ?? "";
  const me = (await (await a.request("/whoami", { headers: { cookie } })).json()) as { player_uuid: string };
  return { cookie, player: me.player_uuid };
};

const record = async (store: ProgressionStore, player: string) => {
  const [p, playlist, match, ended, rt, tpr] = [
    PlayerUuid(player),
    PlaylistId(PLAYLIST),
    MatchId("00000000-0000-4000-8000-000000009000"),
    Timestamp(Date.UTC(2026, 9, 26, 12)),
    Duration(4_500),
    Duration(20_000),
  ];
  if (!p.ok || !playlist.ok || !match.ok || !ended.ok || !rt.ok || !tpr.ok) expect.unreachable("fixture");
  await store.recordSolo({
    player_uuid: p.value,
    playlist_id: playlist.value,
    answer_type: "song",
    time_per_round: tpr.value,
    match_id: match.value,
    ended_at: ended.value,
    stats: { avg_points_per_song: 812.5, max_streak: 4, avg_response_time: 4_500 },
    fastest_correct: 2_250,
    response_times: [rt.value],
    correct_song_keys: ["BRUM71500001"],
  });
};

describe("GET /api/v1/solo/personal-bests", () => {
  test("R-506: jogador sem partida solo recebe zeros e nenhuma playlist", async () => {
    const a = app();
    const { cookie } = await login(a);
    const res = await a.request("/api/v1/solo/personal-bests", { headers: { cookie } });
    expect(res.status).toBe(200);
    expect(PersonalBestsResponse.parse(await res.json())).toEqual({
      global_stats: { max_streak: 0, fastest_correct_answer: null, solo_matches_completed: 0, known_songs: 0 },
      by_playlist: [],
    });
  });

  test("R-504 a R-506: tempos em segundos, time_per_round em segundos inteiros e datas em ISO 8601", async () => {
    const store = new MemoryProgressionStore();
    const a = app(store);
    const { cookie, player } = await login(a);
    await record(store, player);
    const body = PersonalBestsResponse.parse(await (await a.request("/api/v1/solo/personal-bests", { headers: { cookie } })).json());
    expect(body.global_stats).toEqual({ max_streak: 4, fastest_correct_answer: 2.25, solo_matches_completed: 1, known_songs: 1 });
    expect(body.by_playlist).toEqual([
      {
        playlist_id: PLAYLIST,
        max_streak: 4,
        avg_response_time: 4.5,
        known_songs: 1,
        last_played_at: "2026-10-26T12:00:00.000Z",
        personal_bests: [
          {
            answer_type: "song",
            time_per_round: 20,
            avg_points_per_song: 812.5,
            max_streak: 4,
            avg_response_time: 4.5,
            known_songs: 1,
            match_id: "00000000-0000-4000-8000-000000009000",
            achieved_at: "2026-10-26T12:00:00.000Z",
          },
        ],
      },
    ]);
  });

  test("ADR-0013: cada sessão só vê os próprios recordes", async () => {
    const store = new MemoryProgressionStore();
    const a = app(store);
    const owner = await login(a);
    await record(store, owner.player);
    const other = await login(a);
    const body = PersonalBestsResponse.parse(
      await (await a.request(`/api/v1/solo/personal-bests?player_uuid=${owner.player}`, { headers: { cookie: other.cookie } })).json(),
    );
    expect(body.by_playlist).toEqual([]);
  });

  test("Postgres fora do ar: 503", async () => {
    const down: ProgressionStore = {
      recordSolo: async () => ({ ok: false, error: "store_unavailable" }),
      progress: async () => ({ ok: false, error: "store_unavailable" }),
      playlistProgress: async () => ({ ok: false, error: "store_unavailable" }),
      knownSongs: async () => ({ ok: false, error: "store_unavailable" }),
      deleteAll: async () => ({ ok: false, error: "store_unavailable" }),
    };
    const a = app(down);
    const { cookie } = await login(a);
    for (const path of ["/api/v1/solo/personal-bests", `/api/v1/solo/personal-bests/${PLAYLIST}`]) {
      const res = await a.request(path, { headers: { cookie } });
      expect(res.status).toBe(503);
      expect(ErrorResponse.parse(await res.json()).code).toBe("internal_error");
    }
  });
});

describe("GET /api/v1/solo/personal-bests/{playlist_id}", () => {
  test("devolve o progresso da playlist", async () => {
    const store = new MemoryProgressionStore();
    const a = app(store);
    const { cookie, player } = await login(a);
    await record(store, player);
    const res = await a.request(`/api/v1/solo/personal-bests/${PLAYLIST}`, { headers: { cookie } });
    expect(res.status).toBe(200);
    expect(PlaylistProgress.parse(await res.json()).personal_bests).toHaveLength(1);
  });

  test("1ª partida na playlist: 404 personal_best_not_found", async () => {
    const a = app();
    const { cookie } = await login(a);
    const res = await a.request(`/api/v1/solo/personal-bests/${PLAYLIST}`, { headers: { cookie } });
    expect(res.status).toBe(404);
    expect(ErrorResponse.parse(await res.json()).code).toBe("personal_best_not_found");
  });

  test("playlist_id fora do formato: 400 invalid_payload", async () => {
    const a = app();
    const { cookie } = await login(a);
    const res = await a.request("/api/v1/solo/personal-bests/nao-e-uuid", { headers: { cookie } });
    expect(res.status).toBe(400);
    expect(ErrorResponse.parse(await res.json()).code).toBe("invalid_payload");
  });
});
