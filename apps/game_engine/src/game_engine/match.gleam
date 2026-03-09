import game_engine/player
import game_engine/round
import game_engine/types.{
  type EngineError, type Match, type MatchConfiguration, type MatchEvent,
  type Player, AnswerProcessed, Finished, InProgress, InvalidState, Match,
  MatchCompleted, MatchStarted, NoMoreRounds, RoundCompleted, RoundStarted,
  WaitingForPlayers,
}
import game_engine/validation
import gleam/list
import gleam/result

/// Cria uma nova partida no estado WaitingForPlayers.
/// Usa Chain of Responsibility para validações encadeadas.
pub fn new(
  id: String,
  config: MatchConfiguration,
  players: List(Player),
  songs: List(types.Song),
) -> Result(Match, EngineError) {
  use _ <- result.try(validation.validate_new_match(config, players, songs))
  Ok(Match(
    id: id,
    state: WaitingForPlayers,
    config: config,
    players: players,
    rounds: [],
    current_round_index: 0,
    songs: songs,
  ))
}

/// Marca um jogador como pronto.
pub fn set_player_ready(
  match: Match,
  player_id: String,
) -> Result(Match, EngineError) {
  use _ <- result.try(validation.require_state(match, WaitingForPlayers))
  use _ <- result.try(player.find(match.players, player_id))
  Ok(Match(..match, players: player.set_ready(match.players, player_id)))
}

/// Inicia a partida se todos os jogadores estiverem prontos.
pub fn start(match: Match) -> Result(MatchEvent, EngineError) {
  use _ <- result.try(validation.validate_can_start(match))
  Ok(MatchStarted(match: Match(..match, state: InProgress)))
}

/// Inicia a próxima rodada da partida.
pub fn start_round(match: Match) -> Result(MatchEvent, EngineError) {
  use _ <- result.try(validation.require_in_progress(match))
  use song <- result.try(get_song_at(match, match.current_round_index))

  let new_round = round.new(match.current_round_index, song)
  let updated_match =
    Match(
      ..match,
      rounds: list.append(match.rounds, [new_round]),
      players: player.reset_states(match.players),
    )
  Ok(RoundStarted(match: updated_match, round: new_round))
}

/// Processa a resposta de um jogador na rodada atual.
pub fn submit_answer(
  match: Match,
  player_id: String,
  answer_text: String,
  answer_time: Float,
) -> Result(MatchEvent, EngineError) {
  use _ <- result.try(validation.require_in_progress(match))
  use _ <- result.try(player.find(match.players, player_id))
  use current_round <- result.try(get_current_round(match))
  use #(updated_round, player_answer) <- result.try(round.submit_answer(
    current_round,
    player_id,
    answer_text,
    answer_time,
    match.config,
  ))

  let updated_match =
    Match(
      ..match,
      rounds: replace_round(match.rounds, match.current_round_index, updated_round),
      players: player.set_answered(
        match.players,
        player_id,
        player_answer.points,
      ),
    )

  Ok(AnswerProcessed(
    match: updated_match,
    player_id: player_id,
    is_correct: player_answer.is_correct,
    points_earned: player_answer.points,
  ))
}

/// Encerra a rodada atual (por timeout ou quando todos responderam).
pub fn end_round(match: Match) -> Result(MatchEvent, EngineError) {
  use _ <- result.try(validation.require_in_progress(match))
  use current_round <- result.try(get_current_round(match))

  let ended_round = round.end(current_round)
  let updated_match =
    Match(
      ..match,
      rounds: replace_round(match.rounds, match.current_round_index, ended_round),
      current_round_index: match.current_round_index + 1,
    )

  Ok(RoundCompleted(
    match: updated_match,
    round: ended_round,
    scores: player.scores(match.players),
  ))
}

/// Encerra a partida inteira.
pub fn end_match(match: Match) -> Result(MatchEvent, EngineError) {
  use _ <- result.try(validation.require_in_progress(match))
  Ok(MatchCompleted(
    match: Match(..match, state: Finished),
    final_scores: player.scores(match.players),
    winner_id: player.winner_id(match.players),
  ))
}

/// Verifica se todos os jogadores responderam na rodada atual.
pub fn all_answered_current_round(match: Match) -> Bool {
  case get_current_round(match) {
    Error(_) -> False
    Ok(current_round) ->
      round.all_answered(current_round, list.length(match.players))
  }
}

/// Verifica se é a última rodada.
pub fn is_last_round(match: Match) -> Bool {
  match.current_round_index + 1 >= match.config.total_songs
}

// --- Helpers internos ---

fn get_current_round(match: Match) -> Result(types.Round, EngineError) {
  match.rounds
  |> list.drop(match.current_round_index)
  |> list.first
  |> result.replace_error(InvalidState("No active round"))
}

fn get_song_at(match: Match, index: Int) -> Result(types.Song, EngineError) {
  case index >= match.config.total_songs {
    True -> Error(NoMoreRounds)
    False ->
      match.songs
      |> list.drop(index)
      |> list.first
      |> result.replace_error(NoMoreRounds)
  }
}

fn replace_round(
  rounds: List(types.Round),
  index: Int,
  new_round: types.Round,
) -> List(types.Round) {
  list.index_map(rounds, fn(r, i) {
    case i == index {
      True -> new_round
      False -> r
    }
  })
}
