// Mensagens do WebSocket /ws/room/{invite_code}. União discriminada por `type` em cada direção.
// Identidade só pelo cookie: nenhuma mensagem do cliente carrega player_uuid (ADR-0013), e as do cliente são
// strictObject, então campo a mais é payload inválido (S-24).
import { z } from "zod";
import {
  AutocompleteResult,
  ErrorCode,
  Highlights,
  InviteCode,
  MatchConfiguration,
  MatchId,
  MAX_PLAYERS,
  Nickname,
  Phase,
  Platform,
  Player,
  PlayerUuid,
  PlaylistId,
  RankingEntry,
  RevealedSong,
  RoomId,
  RoundAnswer,
  RoundAudio,
  Scores,
  SoloComparison,
  SongRange,
} from "./common.ts";

const client = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.strictObject({ type: z.literal(type), ...shape });
const server = <T extends string, S extends z.ZodRawShape>(type: T, shape: S) =>
  z.object({ type: z.literal(type), ...shape });

// --- Cliente → servidor -------------------------------------------------------------------------

export const clientMessages = [
  // 1ª mensagem depois de abrir o socket: entra na sala (ou volta a ela, R-602) com o nickname (R-003).
  // Antes dela, só ping é aceito. O nickname não vai na URL para não cair no access log do Caddy (ADR-0010.R1).
  client("join_room", { nickname: Nickname }),
  client("player_ready", {}),
  client("player_unready", {}),
  client("player_afk_changed", { afk: z.boolean() }), // R-601
  client("configure_match", { config: MatchConfiguration }), // só host (R-007)
  client("select_playlist", { playlist_id: PlaylistId, platform: Platform }),
  client("start_game", {}), // só host (R-009)
  client("submit_answer", { answer_text: z.string().min(1).max(200) }), // vale a última (R-105)
  client("vote_skip", {}), // só depois de responder (R-120)
  client("autocomplete_search", { query: z.string().min(2).max(100) }), // R-104
  client("player_leave", {}),
  client("ping", {}), // a cada 30s
] as const;

export const WsClientMessage = z.discriminatedUnion("type", clientMessages);
export type WsClientMessage = z.infer<typeof WsClientMessage>;

// --- Servidor → cliente -------------------------------------------------------------------------

export const serverMessages = [
  server("room_state", {
    room_id: RoomId,
    invite_code: InviteCode,
    phase: Phase,
    host_player_uuid: PlayerUuid,
    config: MatchConfiguration,
    players: z.array(Player).min(1).max(MAX_PLAYERS),
    song_range: SongRange,
    current_round_index: z.int().nonnegative().optional(),
    total_rounds: z.int().min(1).optional(),
    // Token reemitido ao reconectar no meio da rodada (ADR-0004).
    audio: RoundAudio.optional(),
  }),
  server("player_joined", { player: Player }),
  server("player_left", { player_uuid: PlayerUuid, reason: z.enum(["voluntary", "timeout"]) }),
  server("player_ready_changed", { player_uuid: PlayerUuid, ready: z.boolean() }),
  server("player_afk_changed", { player_uuid: PlayerUuid, afk: z.boolean() }),
  server("config_updated", { config: MatchConfiguration, song_range: SongRange }),
  server("host_changed", {
    new_host_uuid: PlayerUuid,
    new_host_nickname: Nickname,
    reason: z.literal("previous_host_disconnected"),
  }),
  server("game_starting", { countdown_seconds: z.literal(3) }),
  server("round_starting", {
    round_index: z.int().nonnegative(),
    total_rounds: z.int().min(1),
    audio: RoundAudio,
    grace_period_seconds: z.literal(3), // R-101
  }),
  server("timer_started", {
    duration_seconds: z.int().min(10).max(60),
    server_now: z.int().nonnegative().meta({ description: "Unix ms" }),
  }),
  // Nunca diz se acertou (S-21).
  server("answer_confirmed", {}),
  server("player_voted_skip", { player_uuid: PlayerUuid, skip_votes: z.int().min(1), votes_needed: z.int().min(1) }),
  server("round_ended", {
    round_index: z.int().nonnegative(),
    end_reason: z.enum(["timer_expired", "majority_skip"]),
    song: RevealedSong,
    answers: z.array(RoundAnswer).max(MAX_PLAYERS),
    scores: Scores,
    next_round_in_seconds: z.literal(3), // R-130
  }),
  server("game_ended", {
    match_id: MatchId,
    final_scores: Scores,
    ranking: z.array(RankingEntry).min(1).max(MAX_PLAYERS),
    highlights: Highlights,
    solo_comparison: SoloComparison.optional(), // R-704
    return_to_lobby_in_seconds: z.literal(5), // R-703
  }),
  server("autocomplete_results", { query: z.string(), results: z.array(AutocompleteResult).max(10) }), // R-104
  server("pong", {}),
  server("error", { code: ErrorCode, message: z.string().meta({ description: "pt-BR" }) }),
] as const;

export const WsServerMessage = z.discriminatedUnion("type", serverMessages);
export type WsServerMessage = z.infer<typeof WsServerMessage>;
