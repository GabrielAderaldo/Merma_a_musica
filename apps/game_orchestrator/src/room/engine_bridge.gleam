// room/engine_bridge.gleam — Ponte Orchestrator ↔ Game Engine
//
// ÚNICO módulo que faz @external para o game_engine (outro package Gleam no mesmo BEAM).
// Encapsula TODAS as chamadas ao Engine + conversão de tipos.
//
// LIMITES ARQUITETURAIS:
// - coordinator.gleam chama ESTE módulo, nunca o Engine diretamente
// - Conversão Room→Engine é feita no Elixir (engine_bridge_ffi.ex)
// - Os tipos de resultado são definidos aqui para o Gleam consumir

import gleam/dynamic.{type Dynamic}
import room/state.{type PlayerInRoom, type RoomConfig}

// ═══════════════════════════════════════════════════════════════
// TIPOS DE RESULTADO — Usados pelo coordinator
// ═══════════════════════════════════════════════════════════════

/// Resultado de iniciar o jogo (new_match → set_ready → start_match → start_round)
pub type StartGameResult {
  StartGameResult(
    /// ActiveMatch como Dynamic (opaco, armazenar no room.match_state)
    match_state: Dynamic,
    /// Índice da rodada atual (0-based)
    round_index: Int,
    /// Total de rodadas na partida
    total_rounds: Int,
    /// URL do preview de áudio da rodada atual
    preview_url: String,
    /// ID do jogador que contribuiu a música
    contributed_by: String,
    /// Nome da música (para revelação no round_ended)
    song_name: String,
    /// Nome do artista
    artist_name: String,
  )
}

/// Resultado de submit_answer
pub type SubmitResult {
  SubmitOk(
    match_state: Dynamic,
    player_id: String,
    is_correct: Bool,
    points_earned: Int,
    all_answered: Bool,
  )
  SubmitError(message: String)
}

/// Resultado de end_round
pub type EndRoundResult {
  EndRoundOk(
    match_state: Dynamic,
    /// EndedRound como Dynamic
    ended_round: Dynamic,
    /// Dict(String, Int) como Dynamic
    scores: Dynamic,
    /// Se há mais rodadas após esta
    has_more_rounds: Bool,
  )
  EndRoundError(message: String)
}

/// Resultado de start_round (próxima rodada)
pub type NextRoundResult {
  NextRoundOk(
    match_state: Dynamic,
    round_index: Int,
    total_rounds: Int,
    preview_url: String,
    contributed_by: String,
    song_name: String,
    artist_name: String,
  )
  NextRoundError(message: String)
}

/// Resultado de end_match
pub type EndMatchResult {
  MatchCompleted(
    match_state: Dynamic,
    final_scores: Dynamic,
    ranking: Dynamic,
    highlights: Dynamic,
  )
  TiebreakerNeeded(
    tiebreaker_info: Dynamic,
    tied_player_ids: List(String),
    tied_score: Int,
  )
  EndMatchError(message: String)
}

/// Resultado de resolve_tiebreaker
pub type TiebreakerResult {
  TiebreakerResolved(
    match_state: Dynamic,
    final_scores: Dynamic,
    ranking: Dynamic,
    highlights: Dynamic,
  )
}

/// Dados extraídos de EndedRound para broadcast
pub type EndedRoundData {
  EndedRoundData(
    index: Int,
    song_name: String,
    artist_name: String,
    album_title: String,
    cover_url: String,
    contributed_by: String,
    /// Lista de (player_id, answer_text, response_time, is_correct, points)
    answers: List(#(String, String, Float, Bool, Int)),
  )
}

/// Dados extraídos de Ranking para broadcast
pub type RankingData {
  RankingData(
    position: Int,
    player_id: String,
    nickname: String,
    total_points: Int,
    correct_answers: Int,
    avg_response_time: Float,
  )
}

/// Dados extraídos de Highlights para broadcast
pub type HighlightsData {
  HighlightsData(
    streak: #(String, String, Int),
    fastest: #(String, String, Float, String),
    most_correct: #(String, String, Int),
  )
}

// ═══════════════════════════════════════════════════════════════
// FFI — Utilitários
// ═══════════════════════════════════════════════════════════════

/// Embaralhar lista (para randomizar músicas)
@external(erlang, "engine_bridge_ffi", "shuffle_list")
pub fn shuffle_list(items: List(a)) -> List(a)

/// Gerar UUID v4
@external(erlang, "engine_bridge_ffi", "generate_uuid")
pub fn generate_uuid() -> String

// ═══════════════════════════════════════════════════════════════
// FFI — Operações do Engine
// ═══════════════════════════════════════════════════════════════

/// Iniciar jogo completo (new_match → ready → start → first round)
@external(erlang, "engine_bridge_ffi", "start_game")
pub fn start_game(
  room_id: String,
  room_config: RoomConfig,
  players: List(PlayerInRoom),
) -> Result(StartGameResult, String)

/// Submeter resposta ao Engine
@external(erlang, "engine_bridge_ffi", "submit_answer")
pub fn submit_answer(
  match_state: Dynamic,
  player_id: String,
  answer_text: String,
  response_time: Float,
) -> SubmitResult

/// Encerrar rodada atual
@external(erlang, "engine_bridge_ffi", "end_round")
pub fn end_round(match_state: Dynamic) -> EndRoundResult

/// Iniciar próxima rodada
@external(erlang, "engine_bridge_ffi", "next_round")
pub fn next_round(match_state: Dynamic) -> NextRoundResult

/// Encerrar partida (→ MatchCompleted ou TiebreakerNeeded)
@external(erlang, "engine_bridge_ffi", "end_match")
pub fn end_match(match_state: Dynamic) -> EndMatchResult

/// Resolver desempate
@external(erlang, "engine_bridge_ffi", "resolve_tiebreaker")
pub fn resolve_tiebreaker(
  tiebreaker_info: Dynamic,
  winner_id: String,
) -> TiebreakerResult

// ═══════════════════════════════════════════════════════════════
// FFI — Extração de dados (Engine types → dados simples)
// ═══════════════════════════════════════════════════════════════

/// Extrair dados de um EndedRound para broadcast
@external(erlang, "engine_bridge_ffi", "extract_ended_round")
pub fn extract_ended_round(
  ended_round: Dynamic,
) -> #(Int, String, String, String, String, String, List(#(String, String, Float, Bool, Int)))

/// Extrair dados de ranking
@external(erlang, "engine_bridge_ffi", "extract_ranking")
pub fn extract_ranking(
  ranking: Dynamic,
) -> List(#(Int, String, String, Int, Int, Float))

/// Extrair dados de highlights
@external(erlang, "engine_bridge_ffi", "extract_highlights")
pub fn extract_highlights(
  highlights: Dynamic,
) -> #(#(String, String, Int), #(String, String, Float, String), #(String, String, Int))
