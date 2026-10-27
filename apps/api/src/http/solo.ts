// Rotas REST dos recordes do solo (R-504 a R-506), lidas da Progression. Tempos em segundos, datas em ISO 8601.
import { createRoute, z } from "@hono/zod-openapi";
import { ErrorResponse, PersonalBestsResponse, PlaylistId, PlaylistProgress } from "@merma/schema";
import type { PersonalBestRecord, PlaylistProgressRecord, ProgressionStore, SoloProgress } from "../progression/solo.ts";
import type { OpenApiApp } from "./app.ts";

const json = <S extends z.ZodType>(schema: S, description: string) => ({
  description,
  content: { "application/json": { schema } },
});
const unavailable = json(ErrorResponse, "Postgres fora do ar");

const personalBestsRoute = createRoute({
  method: "get",
  path: "/api/v1/solo/personal-bests",
  responses: {
    200: json(PersonalBestsResponse, "Estatísticas globais (R-506) e o progresso por playlist (R-504, R-505)"),
    503: unavailable,
  },
});

const playlistRoute = createRoute({
  method: "get",
  path: "/api/v1/solo/personal-bests/{playlist_id}",
  request: { params: z.object({ playlist_id: PlaylistId }) },
  responses: {
    200: json(PlaylistProgress, "Recordes e progresso na playlist"),
    400: json(ErrorResponse, "playlist_id fora do formato"),
    404: json(ErrorResponse, "Nenhuma partida solo nessa playlist ainda"),
    503: unavailable,
  },
});

const seconds = (ms: number | null) => (ms === null ? null : ms / 1000);
const iso = (ms: number) => new Date(ms).toISOString();

const toWireBest = (b: PersonalBestRecord): z.infer<typeof PlaylistProgress>["personal_bests"][number] => ({
  answer_type: b.answer_type,
  time_per_round: Math.round(b.time_per_round / 1000),
  avg_points_per_song: b.avg_points_per_song,
  max_streak: b.max_streak,
  avg_response_time: seconds(b.avg_response_time),
  known_songs: b.known_songs,
  match_id: b.match_id,
  achieved_at: iso(b.achieved_at),
});

const toWirePlaylist = (p: PlaylistProgressRecord): z.infer<typeof PlaylistProgress> => ({
  playlist_id: p.playlist_id,
  max_streak: p.max_streak,
  avg_response_time: seconds(p.avg_response_time),
  known_songs: p.known_songs,
  last_played_at: iso(p.last_played_at),
  personal_bests: p.personal_bests.map(toWireBest),
});

// Também o bloco solo do GET /me/export.
export const toWireSolo = (progress: SoloProgress): z.infer<typeof PersonalBestsResponse> => ({
  global_stats: {
    max_streak: progress.global_stats.max_streak,
    fastest_correct_answer: seconds(progress.global_stats.fastest_correct),
    solo_matches_completed: progress.global_stats.solo_matches_completed,
    known_songs: progress.global_stats.known_songs,
  },
  by_playlist: progress.by_playlist.map(toWirePlaylist),
});

const STORE_DOWN = { code: "internal_error" as const, message: "Tente de novo." };

export const soloRoutes = (app: OpenApiApp, deps: { progression: ProgressionStore }) =>
  app
    .openapi(personalBestsRoute, async (c) => {
      const progress = await deps.progression.progress(c.get("session").player_uuid);
      if (!progress.ok) return c.json(STORE_DOWN, 503);
      return c.json(toWireSolo(progress.value), 200);
    })
    .openapi(playlistRoute, async (c) => {
      const progress = await deps.progression.playlistProgress(c.get("session").player_uuid, c.req.valid("param").playlist_id);
      if (!progress.ok) return c.json(STORE_DOWN, 503);
      if (progress.value === null) {
        return c.json({ code: "personal_best_not_found" as const, message: "Nenhuma partida solo nessa playlist ainda." }, 404);
      }
      return c.json(toWirePlaylist(progress.value), 200);
    });
