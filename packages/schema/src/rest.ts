// Corpos das rotas REST (ADR-0014). Entram aqui junto com a rota da apps/api, que gera o openapi.json.
import { z } from "zod";
import { AnswerType, ErrorCode, InviteCode, MatchId, MAX_PLAYERS, Phase, PlayerUuid, PlaylistId, RoomId } from "./common.ts";

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
