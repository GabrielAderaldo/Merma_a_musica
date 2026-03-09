import game_engine/types.{
  type EngineError, type Match, type MatchConfiguration, type Player,
  type Song, Finished, InProgress, InvalidState, NotAllPlayersReady,
  NotEnoughPlayers, NotEnoughSongs, SongsDivisibilityError, WaitingForPlayers,
}
import gleam/list
import gleam/result

/// Valida os pré-requisitos para criar uma partida.
/// Chain of Responsibility: pipeline de validações encadeadas com `use`.
pub fn validate_new_match(
  config: MatchConfiguration,
  players: List(Player),
  songs: List(Song),
) -> Result(Nil, EngineError) {
  use _ <- result.try(validate_min_players(players))
  use _ <- result.try(validate_enough_songs(songs, config.total_songs))
  use _ <- result.try(validate_songs_divisibility(
    config.total_songs,
    list.length(players),
  ))
  Ok(Nil)
}

/// Valida que a partida pode iniciar (todos prontos).
pub fn validate_can_start(match: Match) -> Result(Nil, EngineError) {
  use _ <- result.try(require_state(match, WaitingForPlayers))
  use _ <- result.try(validate_all_ready(match))
  Ok(Nil)
}

/// Guard: exige que a partida esteja em determinado estado.
pub fn require_state(
  match: Match,
  expected: types.MatchState,
) -> Result(Nil, EngineError) {
  case match.state == expected {
    True -> Ok(Nil)
    False ->
      Error(InvalidState(
        "Expected " <> state_to_string(expected) <> ", got " <> state_to_string(match.state),
      ))
  }
}

/// Guard: exige que a partida esteja InProgress.
pub fn require_in_progress(match: Match) -> Result(Nil, EngineError) {
  require_state(match, InProgress)
}

// --- Validações individuais ---

fn validate_min_players(players: List(Player)) -> Result(Nil, EngineError) {
  case list.length(players) >= 2 {
    True -> Ok(Nil)
    False -> Error(NotEnoughPlayers)
  }
}

fn validate_enough_songs(
  songs: List(Song),
  total_needed: Int,
) -> Result(Nil, EngineError) {
  case list.length(songs) >= total_needed {
    True -> Ok(Nil)
    False -> Error(NotEnoughSongs)
  }
}

fn validate_songs_divisibility(
  total_songs: Int,
  total_players: Int,
) -> Result(Nil, EngineError) {
  case total_songs % total_players == 0 {
    True -> Ok(Nil)
    False -> Error(SongsDivisibilityError(total_songs, total_players))
  }
}

fn validate_all_ready(match: Match) -> Result(Nil, EngineError) {
  let all_ready =
    list.all(match.players, fn(p) { p.state == types.Ready })
  case all_ready {
    True -> Ok(Nil)
    False -> Error(NotAllPlayersReady)
  }
}

pub fn state_to_string(state: types.MatchState) -> String {
  case state {
    WaitingForPlayers -> "WaitingForPlayers"
    InProgress -> "InProgress"
    Finished -> "Finished"
  }
}
