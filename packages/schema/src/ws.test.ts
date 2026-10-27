import { describe, expect, test } from "bun:test";
import { clientMessages, serverMessages, WsClientMessage, WsServerMessage } from "./ws.ts";

const UUID = "0b7c6f6e-3f1a-4c2e-9d4b-5a6e7f8091a2";
const UUID2 = "1c8d7a7f-4a2b-4d3f-8e5c-6b7f80912ab3";
const config = {
  time_per_round: 30,
  total_songs: 10,
  answer_type: "both",
  allow_repeats: false,
  scoring_rule: "speed_bonus",
  game_mode: "multiplayer",
};
const player = {
  player_uuid: UUID,
  nickname: "Camila",
  is_host: true,
  ready: true,
  afk: false,
  connection_status: "connected",
  has_playlist: true,
  platform: "spotify",
};

// Um exemplo válido por mensagem: se uma mensagem nova entrar sem exemplo, o teste de cobertura falha.
const validClient: Record<string, Record<string, unknown>> = {
  join_room: { nickname: "Camila" },
  player_ready: {},
  player_unready: {},
  player_afk_changed: { afk: true },
  configure_match: { config },
  select_playlist: { playlist_id: UUID2 },
  start_game: {},
  submit_answer: { answer_text: "Evidências" },
  vote_skip: {},
  autocomplete_search: { query: "ev" },
  player_leave: {},
  ping: {},
};
const validServer: Record<string, Record<string, unknown>> = {
  room_state: {
    room_id: UUID2,
    invite_code: "ABC123",
    phase: "lobby",
    host_player_uuid: UUID,
    config,
    players: [player],
    song_range: { min: 1, max: 40 },
  },
  player_joined: { player },
  player_left: { player_uuid: UUID, reason: "timeout" },
  player_ready_changed: { player_uuid: UUID, ready: false },
  player_afk_changed: { player_uuid: UUID, afk: true },
  config_updated: { config, song_range: { min: 1, max: 40 } },
  host_changed: { new_host_uuid: UUID2, new_host_nickname: "Bruno", reason: "previous_host_disconnected" },
  game_starting: { countdown_seconds: 3 },
  round_starting: {
    round_index: 0,
    total_rounds: 10,
    audio: { audio_source: "deezer", audio_token: "tok" },
    grace_period_seconds: 3,
  },
  timer_started: { duration_seconds: 30, server_now: 1_793_000_000_000 },
  answer_confirmed: {},
  player_voted_skip: { player_uuid: UUID, skip_votes: 1, votes_needed: 2 },
  round_ended: {
    round_index: 0,
    end_reason: "timer_expired",
    song: {
      isrc: "BRUM71500001",
      name: "Evidências",
      artist: "Chitãozinho & Xororó",
      album: null,
      cover_url: "https://example.com/c.jpg",
      contributed_by: "Camila",
      source_platform: "spotify",
    },
    answers: [
      {
        player_uuid: UUID,
        nickname: "Camila",
        answer_text: null,
        is_correct: false,
        is_near_miss: false,
        points_earned: 0,
        response_time: null,
      },
    ],
    scores: { [UUID]: 850 },
    next_round_in_seconds: 3,
  },
  game_ended: {
    match_id: UUID2,
    final_scores: { [UUID]: 850 },
    ranking: [
      { position: 1, player_uuid: UUID, nickname: "Camila", total_points: 850, correct_answers: 1, max_streak: 1, avg_response_time: 5 },
    ],
    highlights: { best_streak: null, fastest_answer: null, most_correct: null, near_miss_champion: null },
    return_to_lobby_in_seconds: 5,
  },
  autocomplete_results: { query: "ev", results: [{ text: "Evidências", kind: "song" }] },
  pong: {},
  error: { code: "room_full", message: "A sala está cheia." },
};

describe("WS cliente → servidor", () => {
  test("toda mensagem tem exemplo válido", () => {
    expect(Object.keys(validClient).sort()).toEqual(clientMessages.map((m) => m.shape.type.value).sort());
  });

  test.each(Object.entries(validClient))("%s válido", (type, fields) => {
    expect(WsClientMessage.safeParse({ type, ...fields }).success).toBe(true);
  });

  test.each(Object.keys(validClient))("S-24 %s com campo a mais é inválido (inclusive player_uuid, ADR-0013)", (type) => {
    expect(WsClientMessage.safeParse({ type, ...validClient[type], player_uuid: UUID }).success).toBe(false);
  });

  test.each(["response_time", "submitted_at", "client_now"])("S-20 submit_answer com timestamp do cliente (%s) é inválido", (field) => {
    expect(WsClientMessage.safeParse({ type: "submit_answer", answer_text: "x", [field]: 1_000 }).success).toBe(false);
  });

  test("type desconhecido é inválido", () => {
    expect(WsClientMessage.safeParse({ type: "kick_player" }).success).toBe(false);
  });

  test.each([9, 61, 30.5])("R-401 time_per_round %p fora de 10–60 inteiro é inválido", (time_per_round) => {
    expect(WsClientMessage.safeParse({ type: "configure_match", config: { ...config, time_per_round } }).success).toBe(false);
  });

  test("R-110 answer_type só aceita song, artist e both", () => {
    expect(WsClientMessage.safeParse({ type: "configure_match", config: { ...config, answer_type: "album" } }).success).toBe(false);
  });

  test("R-104 autocomplete exige ao menos 2 caracteres", () => {
    expect(WsClientMessage.safeParse({ type: "autocomplete_search", query: "e" }).success).toBe(false);
  });

  test("R-003 join_room exige nickname de 1 a 32 caracteres", () => {
    for (const nickname of ["", "x".repeat(33)]) {
      expect(WsClientMessage.safeParse({ type: "join_room", nickname }).success).toBe(false);
    }
    expect(WsClientMessage.safeParse({ type: "join_room" }).success).toBe(false);
  });

  test("submit_answer vazio é inválido", () => {
    expect(WsClientMessage.safeParse({ type: "submit_answer", answer_text: "" }).success).toBe(false);
  });
});

describe("WS servidor → cliente", () => {
  test("toda mensagem tem exemplo válido", () => {
    expect(Object.keys(validServer).sort()).toEqual(serverMessages.map((m) => m.shape.type.value).sort());
  });

  test.each(Object.entries(validServer))("%s válido", (type, fields) => {
    const parsed = WsServerMessage.safeParse({ type, ...fields });
    expect(parsed.error).toBeUndefined();
  });

  test("S-21 answer_confirmed não carrega acerto", () => {
    const parsed = WsServerMessage.parse({ type: "answer_confirmed", is_correct: true });
    expect(parsed).toEqual({ type: "answer_confirmed" });
  });

  test("R-004 invite_code tem 6 caracteres [A-Z0-9]", () => {
    for (const invite_code of ["abc123", "ABC12", "ABC1234", "ABC-12"]) {
      expect(WsServerMessage.safeParse({ ...validServer["room_state"], type: "room_state", invite_code }).success).toBe(false);
    }
  });

  test("R-005 room_state com 21 jogadores é inválido", () => {
    const players = Array.from({ length: 21 }, () => player);
    expect(WsServerMessage.safeParse({ ...validServer["room_state"], type: "room_state", players }).success).toBe(false);
  });

  test("R-104 autocomplete devolve no máximo 10 sugestões", () => {
    const results = Array.from({ length: 11 }, () => ({ text: "x", kind: "song" }));
    expect(WsServerMessage.safeParse({ type: "autocomplete_results", query: "ev", results }).success).toBe(false);
  });

  test("R-801 áudio do Spotify exige spotify_uri, e o do Deezer exige audio_token", () => {
    const round = { ...validServer["round_starting"], type: "round_starting" };
    expect(WsServerMessage.safeParse({ ...round, audio: { audio_source: "spotify_sdk", spotify_uri: "spotify:track:1" } }).success).toBe(true);
    expect(WsServerMessage.safeParse({ ...round, audio: { audio_source: "spotify_sdk", audio_token: "tok" } }).success).toBe(false);
    expect(WsServerMessage.safeParse({ ...round, audio: { audio_source: "deezer" } }).success).toBe(false);
  });

  test("player_uuid do cookie é UUID v4 (ADR-0013)", () => {
    const v7 = "01890a5d-ac96-774b-bcce-b302099a8057";
    expect(WsServerMessage.safeParse({ type: "player_ready_changed", player_uuid: v7, ready: true }).success).toBe(false);
  });
});
