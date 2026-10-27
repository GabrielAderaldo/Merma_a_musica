// Adapters do ProgressionStore: Postgres (produção, ADR-0006) e memória (testes, e dev sem POSTGRES_URL).
import { compareWithPersonalBest, err, ok, type Result, type SoloStats } from "@merma/domain";
import type { AnswerType } from "@merma/schema";
import { and, countDistinct, eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { Database } from "../db/client.ts";
import { soloKnownSongs, soloPersonalBests, soloPlayerStats, soloPlaylistStats } from "../db/schema.ts";
import type {
  GlobalSoloRecord,
  PersonalBestRecord,
  PlaylistProgressRecord,
  ProgressionStore,
  SoloEntry,
  StoreError,
} from "./solo.ts";

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
const minOrNull = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.min(a, b));
const bestKey = (player: string, playlist: string, answer_type: AnswerType, time_per_round: number) =>
  `${player}/${playlist}/${answer_type}/${time_per_round}`;
const pairKey = (player: string, playlist: string) => `${player}/${playlist}`;

const EMPTY_GLOBAL: GlobalSoloRecord = { max_streak: 0, fastest_correct: null, solo_matches_completed: 0, known_songs: 0 };

type PlaylistStats = { max_streak: number; response_time_total: number; answers: number; last_played_at: number };

export class MemoryProgressionStore implements ProgressionStore {
  readonly #bests = new Map<string, { player_uuid: string; playlist_id: string; best: PersonalBestRecord }>();
  readonly #playlists = new Map<string, PlaylistStats & { player_uuid: string; playlist_id: string }>();
  readonly #known = new Map<string, Set<string>>();
  readonly #players = new Map<string, Omit<GlobalSoloRecord, "known_songs">>();

  recordSolo = async (entry: SoloEntry) => {
    const pair = pairKey(entry.player_uuid, entry.playlist_id);
    const known = this.#known.get(pair) ?? new Set<string>();
    for (const key of entry.correct_song_keys) known.add(key);
    this.#known.set(pair, known);

    const key = bestKey(entry.player_uuid, entry.playlist_id, entry.answer_type, entry.time_per_round);
    const previous = this.#bests.get(key);
    const outcome = compareWithPersonalBest({ ...entry.stats, known_songs: known.size }, previous === undefined ? null : statsOf(previous.best));
    if (outcome.is_new_personal_best) {
      this.#bests.set(key, {
        player_uuid: entry.player_uuid,
        playlist_id: entry.playlist_id,
        best: {
          ...outcome.current,
          answer_type: entry.answer_type,
          time_per_round: entry.time_per_round,
          match_id: entry.match_id,
          achieved_at: entry.ended_at,
        },
      });
    }

    const stats = this.#playlists.get(pair);
    this.#playlists.set(pair, {
      player_uuid: entry.player_uuid,
      playlist_id: entry.playlist_id,
      max_streak: Math.max(stats?.max_streak ?? 0, entry.stats.max_streak),
      response_time_total: (stats?.response_time_total ?? 0) + sum(entry.response_times),
      answers: (stats?.answers ?? 0) + entry.response_times.length,
      last_played_at: entry.ended_at,
    });

    const player = this.#players.get(entry.player_uuid);
    this.#players.set(entry.player_uuid, {
      max_streak: Math.max(player?.max_streak ?? 0, entry.stats.max_streak),
      fastest_correct: minOrNull(player?.fastest_correct ?? null, entry.fastest_correct),
      solo_matches_completed: (player?.solo_matches_completed ?? 0) + 1,
    });
    return ok(outcome);
  };

  progress = async (player: string) => {
    const known = new Set<string>();
    for (const [pair, keys] of this.#known) if (pair.startsWith(`${player}/`)) for (const k of keys) known.add(k);
    const by_playlist = [...this.#playlists.values()]
      .filter((p) => p.player_uuid === player)
      .map((p) => this.#playlistRecord(p));
    const stats = this.#players.get(player);
    return ok({ global_stats: stats === undefined ? EMPTY_GLOBAL : { ...stats, known_songs: known.size }, by_playlist });
  };

  playlistProgress = async (player: string, playlist_id: string) => {
    const stats = this.#playlists.get(pairKey(player, playlist_id));
    return ok(stats === undefined ? null : this.#playlistRecord(stats));
  };

  knownSongs = async (player: string) =>
    ok(
      [...this.#known]
        .filter(([pair]) => pair.startsWith(`${player}/`))
        .map(([pair, keys]) => ({ playlist_id: pair.slice(player.length + 1), song_keys: [...keys].toSorted() })),
    );

  deleteAll = async (player: string) => {
    const mine = (key: string) => key.startsWith(`${player}/`);
    for (const map of [this.#bests, this.#playlists, this.#known]) for (const key of map.keys()) if (mine(key)) map.delete(key);
    this.#players.delete(player);
    return ok(undefined);
  };

  #playlistRecord(p: PlaylistStats & { player_uuid: string; playlist_id: string }): PlaylistProgressRecord {
    return {
      playlist_id: p.playlist_id,
      max_streak: p.max_streak,
      avg_response_time: p.answers === 0 ? null : p.response_time_total / p.answers,
      known_songs: this.#known.get(pairKey(p.player_uuid, p.playlist_id))?.size ?? 0,
      last_played_at: p.last_played_at,
      personal_bests: [...this.#bests.values()]
        .filter((b) => b.player_uuid === p.player_uuid && b.playlist_id === p.playlist_id)
        .map((b) => b.best),
    };
  }
}

const statsOf = (b: SoloStats): SoloStats => ({
  avg_points_per_song: b.avg_points_per_song,
  max_streak: b.max_streak,
  avg_response_time: b.avg_response_time,
  known_songs: b.known_songs,
});

// O driver lança em falha de rede ou de constraint; aqui vira Result (regra da apps/api).
const attempt = async <T>(run: () => Promise<T>): Promise<Result<T, StoreError>> => {
  try {
    return ok(await run());
  } catch {
    return err("store_unavailable");
  }
};

type BestRow = typeof soloPersonalBests.$inferSelect;
const bestRecord = (row: BestRow): PersonalBestRecord => ({
  avg_points_per_song: row.avg_points_per_song,
  max_streak: row.max_streak,
  avg_response_time: row.avg_response_time_ms,
  known_songs: row.known_songs,
  answer_type: row.answer_type,
  time_per_round: row.time_per_round_ms,
  match_id: row.match_id,
  achieved_at: row.achieved_at.getTime(),
});

export const postgresProgressionStore = (db: Database): ProgressionStore => {
  const playlistRecords = async (player: string, playlist_id?: string): Promise<PlaylistProgressRecord[]> => {
    const forPlayer = (t: { player_uuid: PgColumn; playlist_id: PgColumn }) =>
      playlist_id === undefined ? eq(t.player_uuid, player) : and(eq(t.player_uuid, player), eq(t.playlist_id, playlist_id));
    const stats = await db.select().from(soloPlaylistStats).where(forPlayer(soloPlaylistStats));
    if (stats.length === 0) return [];
    const bests = await db.select().from(soloPersonalBests).where(forPlayer(soloPersonalBests));
    const known = await db
      .select({ playlist_id: soloKnownSongs.playlist_id, count: countDistinct(soloKnownSongs.song_key) })
      .from(soloKnownSongs)
      .where(forPlayer(soloKnownSongs))
      .groupBy(soloKnownSongs.playlist_id);
    return stats.map((s) => ({
      playlist_id: s.playlist_id,
      max_streak: s.max_streak,
      avg_response_time: s.answers === 0 ? null : s.response_time_total_ms / s.answers,
      known_songs: known.find((k) => k.playlist_id === s.playlist_id)?.count ?? 0,
      last_played_at: s.last_played_at.getTime(),
      personal_bests: bests.filter((b) => b.playlist_id === s.playlist_id).map(bestRecord),
    }));
  };

  return {
    recordSolo: (entry) =>
      attempt(() =>
        db.transaction(async (tx) => {
          const { player_uuid, playlist_id } = entry;
          if (entry.correct_song_keys.length > 0) {
            await tx
              .insert(soloKnownSongs)
              .values(entry.correct_song_keys.map((song_key) => ({ player_uuid, playlist_id, song_key })))
              .onConflictDoNothing();
          }
          const [known] = await tx
            .select({ count: countDistinct(soloKnownSongs.song_key) })
            .from(soloKnownSongs)
            .where(and(eq(soloKnownSongs.player_uuid, player_uuid), eq(soloKnownSongs.playlist_id, playlist_id)));
          const [previous] = await tx
            .select()
            .from(soloPersonalBests)
            .where(
              and(
                eq(soloPersonalBests.player_uuid, player_uuid),
                eq(soloPersonalBests.playlist_id, playlist_id),
                eq(soloPersonalBests.answer_type, entry.answer_type),
                eq(soloPersonalBests.time_per_round_ms, entry.time_per_round),
              ),
            )
            .for("update");
          const outcome = compareWithPersonalBest(
            { ...entry.stats, known_songs: known?.count ?? 0 },
            previous === undefined ? null : statsOf(bestRecord(previous)),
          );

          if (outcome.is_new_personal_best) {
            const best = {
              avg_points_per_song: outcome.current.avg_points_per_song,
              max_streak: outcome.current.max_streak,
              avg_response_time_ms: outcome.current.avg_response_time,
              known_songs: outcome.current.known_songs,
              match_id: entry.match_id,
              achieved_at: new Date(entry.ended_at),
            };
            await tx
              .insert(soloPersonalBests)
              .values({ player_uuid, playlist_id, answer_type: entry.answer_type, time_per_round_ms: entry.time_per_round, ...best })
              .onConflictDoUpdate({
                target: [soloPersonalBests.player_uuid, soloPersonalBests.playlist_id, soloPersonalBests.answer_type, soloPersonalBests.time_per_round_ms],
                set: best,
              });
          }

          await tx
            .insert(soloPlaylistStats)
            .values({
              player_uuid,
              playlist_id,
              max_streak: entry.stats.max_streak,
              response_time_total_ms: sum(entry.response_times),
              answers: entry.response_times.length,
              last_played_at: new Date(entry.ended_at),
            })
            .onConflictDoUpdate({
              target: [soloPlaylistStats.player_uuid, soloPlaylistStats.playlist_id],
              set: {
                max_streak: sql`greatest(${soloPlaylistStats.max_streak}, excluded.max_streak)`,
                response_time_total_ms: sql`${soloPlaylistStats.response_time_total_ms} + excluded.response_time_total_ms`,
                answers: sql`${soloPlaylistStats.answers} + excluded.answers`,
                last_played_at: sql`excluded.last_played_at`,
              },
            });

          // least() ignora NULL: um jogador sem acerto não apaga o tempo mais rápido anterior.
          await tx
            .insert(soloPlayerStats)
            .values({ player_uuid, max_streak: entry.stats.max_streak, fastest_correct_ms: entry.fastest_correct, solo_matches_completed: 1 })
            .onConflictDoUpdate({
              target: soloPlayerStats.player_uuid,
              set: {
                max_streak: sql`greatest(${soloPlayerStats.max_streak}, excluded.max_streak)`,
                fastest_correct_ms: sql`least(${soloPlayerStats.fastest_correct_ms}, excluded.fastest_correct_ms)`,
                solo_matches_completed: sql`${soloPlayerStats.solo_matches_completed} + 1`,
              },
            });
          return outcome;
        }),
      ),

    progress: (player) =>
      attempt(async () => {
        const [stats] = await db.select().from(soloPlayerStats).where(eq(soloPlayerStats.player_uuid, player));
        const [known] = await db
          .select({ count: countDistinct(soloKnownSongs.song_key) })
          .from(soloKnownSongs)
          .where(eq(soloKnownSongs.player_uuid, player));
        const global_stats: GlobalSoloRecord =
          stats === undefined
            ? EMPTY_GLOBAL
            : {
                max_streak: stats.max_streak,
                fastest_correct: stats.fastest_correct_ms,
                solo_matches_completed: stats.solo_matches_completed,
                known_songs: known?.count ?? 0,
              };
        return { global_stats, by_playlist: await playlistRecords(player) };
      }),

    playlistProgress: (player, playlist_id) => attempt(async () => (await playlistRecords(player, playlist_id))[0] ?? null),

    knownSongs: (player) =>
      attempt(async () => {
        const rows = await db
          .select({ playlist_id: soloKnownSongs.playlist_id, song_key: soloKnownSongs.song_key })
          .from(soloKnownSongs)
          .where(eq(soloKnownSongs.player_uuid, player));
        const by = new Map<string, string[]>();
        for (const r of rows) by.set(r.playlist_id, [...(by.get(r.playlist_id) ?? []), r.song_key]);
        // Ordem por code point, como na memória: o ORDER BY do Postgres segue a collation.
        return [...by].map(([playlist_id, song_keys]) => ({ playlist_id, song_keys: song_keys.toSorted() }));
      }),

    // As quatro tabelas da Progression numa transação: exclusão pela metade não fica.
    deleteAll: (player) =>
      attempt(() =>
        db.transaction(async (tx) => {
          await tx.delete(soloPersonalBests).where(eq(soloPersonalBests.player_uuid, player));
          await tx.delete(soloPlaylistStats).where(eq(soloPlaylistStats.player_uuid, player));
          await tx.delete(soloKnownSongs).where(eq(soloKnownSongs.player_uuid, player));
          await tx.delete(soloPlayerStats).where(eq(soloPlayerStats.player_uuid, player));
        }),
      ),
  };
};
