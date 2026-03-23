// game_engine.gleam — Facade (única porta de entrada)
//
// O Orchestrator chama APENAS este módulo.
// Assinaturas DDD tipadas por estado:
//   WaitingMatch → ActiveMatch → FinishedMatch
//
// DDD: O Orchestrator chama APENAS este módulo.
// Os tipos retornados são do domínio — o Orchestrator adapta para infra.
//
// Assinaturas DDD:
//   new_match → WaitingMatch
//   set_player_ready → WaitingMatch
//   start_match → WaitingMatch → ActiveMatch (via MatchStarted)
//   submit_answer → ActiveMatch → ActiveMatch (via AnswerProcessed)
//   end_match → ActiveMatch → FinishedMatch (via MatchCompleted) ou TiebreakerNeeded

import game_engine/domain/errors.{
  type FinishError, type LobbyError, type RoundError,
}
import game_engine/domain/events.{type MatchEvent}
import game_engine/domain/types/config.{type MatchConfiguration}
import game_engine/domain/types/match_states.{
  type ActiveMatch, type WaitingMatch,
}
import game_engine/domain/types/media.{type SelectedSong}
import game_engine/domain/types/player.{type Player}
import game_engine/domain/types/tiebreaker.{type TiebreakerInfo}
import game_engine/domain/workflows/finish
import game_engine/domain/workflows/lobby
import game_engine/domain/workflows/round

/// Criar nova partida (→ WaitingMatch).
pub fn new_match(
  id: String,
  config: MatchConfiguration,
  players: List(Player),
  selected_songs: List(SelectedSong),
) -> Result(WaitingMatch, LobbyError) {
  lobby.new_match(id, config, players, selected_songs)
}

/// Marcar jogador como pronto.
pub fn set_player_ready(
  m: WaitingMatch,
  player_id: String,
) -> Result(WaitingMatch, LobbyError) {
  lobby.set_player_ready(m, player_id)
}

/// Desmarcar jogador de pronto.
pub fn set_player_unready(
  m: WaitingMatch,
  player_id: String,
) -> Result(WaitingMatch, LobbyError) {
  lobby.set_player_unready(m, player_id)
}

/// Iniciar partida (WaitingMatch → ActiveMatch via MatchStarted).
pub fn start_match(m: WaitingMatch) -> Result(MatchEvent, LobbyError) {
  lobby.start_match(m)
}

/// Avançar para próxima rodada.
pub fn start_round(m: ActiveMatch) -> Result(MatchEvent, RoundError) {
  round.start_round(m)
}

/// Registrar resposta de jogador.
pub fn submit_answer(
  m: ActiveMatch,
  player_id: String,
  answer_text: String,
  response_time: Float,
) -> Result(MatchEvent, RoundError) {
  round.submit_answer(m, player_id, answer_text, response_time)
}

/// Verificar se todos responderam na rodada atual.
pub fn all_answered(m: ActiveMatch) -> Bool {
  round.all_answered(m)
}

/// Encerrar rodada atual.
pub fn end_round(m: ActiveMatch) -> Result(MatchEvent, RoundError) {
  round.end_round(m)
}

/// Verificar se é a última rodada.
pub fn is_last_round(m: ActiveMatch) -> Bool {
  round.is_last_round(m)
}

/// Encerrar partida (→ MatchCompleted ou TiebreakerNeeded).
pub fn end_match(m: ActiveMatch) -> Result(MatchEvent, FinishError) {
  finish.end_match(m)
}

/// Resolver desempate após rodada extra de gol de ouro.
pub fn resolve_tiebreaker(
  tiebreaker: TiebreakerInfo,
  winner_id: String,
) -> MatchEvent {
  finish.resolve_tiebreaker(tiebreaker, winner_id)
}
