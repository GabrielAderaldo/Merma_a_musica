// Corpos das rotas REST (ADR-0014). Entram aqui junto com a rota da apps/api, que gera o openapi.json.
import { z } from "zod";
import { AnswerType, ErrorCode, InviteCode, MatchId, MAX_PLAYERS, Phase, Platform, PlayerUuid, PlaylistId, RoomId } from "./common.ts";

export const HealthResponse = z.object({
  status: z.enum(["ok", "unavailable"]), // unavailable vem com 503

  uptime_seconds: z.number().int().nonnegative(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;

// Todo erro REST. 429 vem com Retry-After.
export const ErrorResponse = z.object({ code: ErrorCode, message: z.string().meta({ description: "pt-BR" }) });

// POST /api/v1/rooms (R-004): o criador é o host. 429 depois de 10 salas por hora (S-25).
export const CreateRoomResponse = z.object({
  room_id: RoomId,
  invite_code: InviteCode,
  host_player_uuid: PlayerUuid,
});

// GET /api/v1/rooms/{invite_code}: o que a tela "Entrar em sala" mostra antes de abrir o WS.
export const RoomSummaryResponse = z.object({
  invite_code: InviteCode,
  phase: Phase,
  player_count: z.int().nonnegative().max(MAX_PLAYERS),
  max_players: z.literal(MAX_PLAYERS),
});

// --- Solo (R-504 a R-506) ----------------------------------------------------------------------------------
// Durações em segundos, com fração; datas em ISO 8601 UTC.
const Count = z.int().nonnegative();
const Seconds = z.number().nonnegative();

// R-504: o recorde de uma combinação (answer_type, time_per_round) da playlist, com os números da partida que o fez.
export const PersonalBest = z.object({
  answer_type: AnswerType,
  time_per_round: z.int().min(10).max(60),
  avg_points_per_song: z.number().min(0).max(1000),
  max_streak: Count,
  avg_response_time: Seconds.nullable(),
  known_songs: Count,
  match_id: MatchId,
  achieved_at: z.iso.datetime(),
});

// R-505: tudo o que o jogador fez numa playlist. Um recorde por combinação: a UI mostra o da config atual (R-507).
export const PlaylistProgress = z.object({
  playlist_id: PlaylistId,
  max_streak: Count,
  avg_response_time: Seconds.nullable(),
  known_songs: Count.meta({ description: "Músicas distintas já acertadas; o total vem da playlist" }),
  last_played_at: z.iso.datetime(),
  personal_bests: z.array(PersonalBest).min(1),
});

// R-506
export const GlobalSoloStats = z.object({
  max_streak: Count,
  fastest_correct_answer: Seconds.nullable(),
  solo_matches_completed: Count,
  known_songs: Count,
});

// GET /api/v1/solo/personal-bests. Jogador sem partida solo recebe zeros e by_playlist vazio.
export const PersonalBestsResponse = z.object({
  global_stats: GlobalSoloStats,
  by_playlist: z.array(PlaylistProgress),
});

// --- Playlists (R-002, R-010, ADR-0024) ------------------------------------------------------------------
// Limite de músicas por importação: a lista colada e o YouTube custam uma busca na Deezer por música.
export const MAX_IMPORTED_SONGS = 500;

// POST /api/v1/playlists/import. O Spotify exige a conta conectada; link e lista, não.
export const ImportPlaylistRequest = z.discriminatedUnion("source", [
  z.strictObject({
    source: z.literal("link"),
    url: z.url().max(500).meta({ description: "Playlist pública da Deezer ou do YouTube/YouTube Music" }),
  }),
  z.strictObject({
    source: z.literal("text"),
    name: z.string().trim().min(1).max(100),
    text: z.string().max(50_000).meta({ description: `Uma música por linha, no máximo ${MAX_IMPORTED_SONGS}` }),
  }),
  z.strictObject({ source: z.literal("spotify"), external_id: z.string().regex(/^[A-Za-z0-9]{1,64}$/) }),
]);
export type ImportPlaylistRequest = z.infer<typeof ImportPlaylistRequest>;

export const ImportJobId = z.uuid();
export const ImportAcceptedResponse = z.object({ job_id: ImportJobId });

// GET /api/v1/playlists/imports/{job_id}, por polling (sem evento WS). `not_found` lista o que a Deezer não achou.
export const ImportJobResponse = z.object({
  job_id: ImportJobId,
  status: z.enum(["queued", "in_progress", "completed", "failed"]),
  progress: z.object({ done: z.int().nonnegative(), total: z.int().nonnegative() }),
  playlist_id: PlaylistId.nullable(),
  not_found: z.array(z.string()).max(MAX_IMPORTED_SONGS),
  error_code: ErrorCode.nullable(),
});

export const ImportedPlaylist = z.object({
  playlist_id: PlaylistId,
  name: z.string(),
  platform: Platform,
  external_id: z.string().nullable().meta({ description: "null na lista colada" }),
  track_count: z.int().nonnegative(),
  cover_url: z.url().nullable(),
  imported_at: z.iso.datetime(),
});
export const PlaylistsResponse = z.object({ playlists: z.array(ImportedPlaylist) });

// GET /api/v1/playlists/available/spotify: o que a conta conectada pode importar.
export const AvailablePlaylistsResponse = z.object({
  playlists: z.array(
    z.object({ external_id: z.string(), name: z.string(), track_count: z.int().nonnegative(), cover_url: z.url().nullable() }),
  ),
});

// GET /auth/me (docs/privacy.md, direito de acesso). Só o Spotify tem login (R-002).
export const MeResponse = z.object({
  player_uuid: PlayerUuid,
  is_authenticated: z.boolean(),
  connected_accounts: z.array(z.object({ platform: z.literal("spotify"), connected_at: z.iso.datetime() })),
});
