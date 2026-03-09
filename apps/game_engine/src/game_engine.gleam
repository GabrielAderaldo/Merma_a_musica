//// Mermã, a Música! — Game Engine
//// Motor de regras puro para o jogo de quiz musical.
//// Expõe a API pública para o Game Orchestrator (Elixir).

import game_engine/match
import game_engine/types.{
  type EngineError, type Match, type MatchConfiguration, type MatchEvent,
  type Player, type Song,
}

/// Cria uma nova partida.
pub fn new_match(
  id: String,
  config: MatchConfiguration,
  players: List(Player),
  songs: List(Song),
) -> Result(Match, EngineError) {
  match.new(id, config, players, songs)
}

/// Marca um jogador como pronto.
pub fn set_player_ready(
  game: Match,
  player_id: String,
) -> Result(Match, EngineError) {
  match.set_player_ready(game, player_id)
}

/// Inicia a partida.
pub fn start_match(game: Match) -> Result(MatchEvent, EngineError) {
  match.start(game)
}

/// Inicia a próxima rodada.
pub fn start_round(game: Match) -> Result(MatchEvent, EngineError) {
  match.start_round(game)
}

/// Processa a resposta de um jogador.
pub fn submit_answer(
  game: Match,
  player_id: String,
  answer_text: String,
  answer_time: Float,
) -> Result(MatchEvent, EngineError) {
  match.submit_answer(game, player_id, answer_text, answer_time)
}

/// Encerra a rodada atual.
pub fn end_round(game: Match) -> Result(MatchEvent, EngineError) {
  match.end_round(game)
}

/// Encerra a partida.
pub fn end_match(game: Match) -> Result(MatchEvent, EngineError) {
  match.end_match(game)
}

/// Verifica se todos responderam na rodada atual.
pub fn all_answered(game: Match) -> Bool {
  match.all_answered_current_round(game)
}

/// Verifica se é a última rodada.
pub fn is_last_round(game: Match) -> Bool {
  match.is_last_round(game)
}
