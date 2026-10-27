import { describe, expect, test } from "bun:test";
import { Duration, type MatchConfiguration, MatchId, PlayerUuid, PlaylistId, type Result, RoomId, Timestamp } from "@merma/domain";
import { MeExportResponse } from "@merma/schema";
import { type AccountStore, MemoryAccountStore, MemoryPlaylistStore } from "../playlist/store.ts";
import { MemoryProgressionStore } from "../progression/store.ts";
import { anonymizedPlayer, MemoryMatchRepository } from "../room/match-store.ts";
import { ORIGIN, sessionCookie, testApp, testPlaylists } from "../testing.ts";

const unwrap = <T, E>(r: Result<T, E>): T => (r.ok ? r.value : expect.unreachable(`err(${String(r.error)})`));

const setup = () => {
  const store = new MemoryPlaylistStore();
  const accounts = new MemoryAccountStore();
  const progression = new MemoryProgressionStore();
  const matches = new MemoryMatchRepository();
  const app = testApp({ playlists: { ...testPlaylists({ store }), accounts }, progression, matches });
  app.get("/whoami", (c) => c.json(c.get("session")));
  const login = async () => {
    const cookie = sessionCookie(await app.request("/auth/me")) ?? "";
    const { player_uuid } = (await (await app.request("/whoami", { headers: { cookie } })).json()) as { player_uuid: string };
    return { cookie, player: unwrap(PlayerUuid(player_uuid)) };
  };
  // Um pouco de tudo o que fica guardado: conta, playlist, recorde solo e partida.
  const seed = async (player: PlayerUuid) => {
    unwrap(await accounts.save(player, { platform: "spotify", external_user_id: "spotify-user", refresh_token_encrypted: "CIFRADO", connected_at: 1_000 }));
    const song = { deezer_id: "1", isrc: "BRUM71500001", name: "Asa Branca", artist: "Luiz Gonzaga", album: null, cover_url: null };
    const playlist = unwrap(await store.save({ player_uuid: player, platform: "deezer", external_id: "42", name: "Forró", cover_url: null, songs: [song], imported_at: 2_000 }, () => crypto.randomUUID()));
    const playlist_id = unwrap(PlaylistId(playlist.playlist_id));
    unwrap(
      await progression.recordSolo({
        player_uuid: player,
        playlist_id,
        answer_type: "both",
        time_per_round: unwrap(Duration(30_000)),
        match_id: unwrap(MatchId(crypto.randomUUID())),
        ended_at: unwrap(Timestamp(3_000)),
        stats: { avg_points_per_song: 800, max_streak: 1, avg_response_time: 2_000 },
        fastest_correct: 2_000,
        response_times: [unwrap(Duration(2_000))],
        correct_song_keys: ["BRUM71500001"],
      }),
    );
    const match_id = unwrap(MatchId(crypto.randomUUID()));
    const config: MatchConfiguration = { time_per_round: unwrap(Duration(30_000)), total_songs: 1, answer_type: "both", allow_repeats: false, scoring_rule: "simple", game_mode: "solo" };
    unwrap(
      await matches.saveCompleted({
        match_id,
        room_id: unwrap(RoomId(crypto.randomUUID())),
        config,
        started_at: unwrap(Timestamp(1_000)),
        ended_at: unwrap(Timestamp(3_000)),
        scores: [{ player_uuid: player, total_points: 800 }],
        rounds: [{ index: 0, isrc: "BRUM71500001", answers: [{ player_uuid: player, is_correct: true, is_near_miss: false, points: 800, response_time: unwrap(Duration(2_000)) }] }],
      }),
    );
    return { playlist_id, match_id };
  };
  return { app, login, seed, store, accounts, progression, matches };
};

describe("GET /api/v1/me/export (LGPD, direito de acesso)", () => {
  test("traz conta, playlists com músicas, solo e partidas do jogador da sessão, sem o refresh token", async () => {
    const s = setup();
    const me = await s.login();
    const other = await s.login();
    const { playlist_id, match_id } = await s.seed(me.player);
    await s.seed(other.player);
    const res = await s.app.request("/api/v1/me/export", { headers: { cookie: me.cookie } });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store, private");
    expect(res.headers.get("content-disposition")).toStartWith("attachment;");
    const raw = await res.text();
    expect(raw).not.toContain("CIFRADO");
    expect(raw).not.toContain(other.player);
    const body = MeExportResponse.parse(JSON.parse(raw));
    expect(body.player_uuid).toBe(me.player);
    expect(body.connected_accounts).toEqual([{ platform: "spotify", external_user_id: "spotify-user", connected_at: "1970-01-01T00:00:01.000Z" }]);
    expect(body.playlists.map((p) => [p.playlist_id, p.songs.map((x) => x.name)])).toEqual([[playlist_id, ["Asa Branca"]]]);
    expect(body.solo.global_stats.solo_matches_completed).toBe(1);
    expect(body.solo.known_songs).toEqual([{ playlist_id, song_keys: ["BRUM71500001"] }]);
    expect(body.matches).toMatchObject([{ match_id, total_points: 800, config: { time_per_round: 30 }, rounds: [{ round_index: 0, response_time: 2 }] }]);
  });

  test("jogador sem nada guardado recebe listas vazias", async () => {
    const s = setup();
    const me = await s.login();
    const body = MeExportResponse.parse(await (await s.app.request("/api/v1/me/export", { headers: { cookie: me.cookie } })).json());
    expect([body.connected_accounts, body.playlists, body.matches, body.solo.by_playlist]).toEqual([[], [], [], []]);
  });
});

describe("DELETE /api/v1/me (LGPD, exclusão)", () => {
  test("S-04: sem o Origin da allowlist é 403 e nada some", async () => {
    const s = setup();
    const me = await s.login();
    await s.seed(me.player);
    const res = await s.app.request("/api/v1/me", { method: "DELETE", headers: { cookie: me.cookie } });
    expect(res.status).toBe(403);
    expect(unwrap(await s.store.list(me.player))).toHaveLength(1);
  });

  test("apaga conta, playlists e Progression, anonimiza o histórico e devolve uma sessão com player_uuid novo", async () => {
    const s = setup();
    const me = await s.login();
    const other = await s.login();
    await s.seed(me.player);
    await s.seed(other.player);
    const res = await s.app.request("/api/v1/me", { method: "DELETE", headers: { cookie: me.cookie, origin: ORIGIN } });
    expect(res.status).toBe(204);

    expect(unwrap(await s.accounts.list(me.player))).toEqual([]);
    expect(unwrap(await s.store.list(me.player))).toEqual([]);
    expect(unwrap(await s.progression.progress(me.player)).by_playlist).toEqual([]);
    expect(unwrap(await s.progression.knownSongs(me.player))).toEqual([]);
    expect(unwrap(await s.matches.history(me.player))).toEqual([]);
    expect(unwrap(await s.matches.history(anonymizedPlayer(me.player))).map((m) => m.total_points)).toEqual([800]);
    // O outro jogador não perde nada.
    expect(unwrap(await s.store.list(other.player))).toHaveLength(1);
    expect(unwrap(await s.matches.history(other.player))).toHaveLength(1);

    const fresh = sessionCookie(res) ?? expect.unreachable("Set-Cookie");
    const who = (await (await s.app.request("/whoami", { headers: { cookie: fresh } })).json()) as { player_uuid: string };
    expect(who.player_uuid).not.toBe(me.player);
    expect(res.headers.getSetCookie()).toHaveLength(1);
  });

  test("repetir o pedido é seguro", async () => {
    const s = setup();
    const me = await s.login();
    await s.seed(me.player);
    const del = () => s.app.request("/api/v1/me", { method: "DELETE", headers: { cookie: me.cookie, origin: ORIGIN } });
    expect((await del()).status).toBe(204);
    expect((await del()).status).toBe(204);
  });

  test("Postgres fora do ar: 503, e o pedido pode ser repetido", async () => {
    const s = setup();
    const me = await s.login();
    const down = { ok: false as const, error: "store_unavailable" as const };
    const accounts: AccountStore = { ...new MemoryAccountStore(), delete: async () => down };
    const app = testApp({ playlists: { ...testPlaylists(), accounts } });
    const res = await app.request("/api/v1/me", { method: "DELETE", headers: { cookie: me.cookie, origin: ORIGIN } });
    expect(res.status).toBe(503);
    expect(sessionCookie(res)).toBeUndefined();
  });
});
