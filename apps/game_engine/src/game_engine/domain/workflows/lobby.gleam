// domain/workflows/lobby.gleam — Workflow: WaitingMatch → ActiveMatch

import game_engine/domain/errors.{
  type LobbyError, LobbyPlayerNotFound, NotAllPlayersReady, NotEnoughPlayers,
  NotEnoughSongs,
}
import game_engine/domain/events.{type MatchEvent, MatchStarted}
import game_engine/domain/types/config.{type MatchConfiguration}
import game_engine/domain/types/match_states.{
  type ActiveMatch, type WaitingMatch, ActiveMatch, WaitingMatch,
}
import game_engine/domain/types/media.{type SelectedSong}
import game_engine/domain/types/player.{
  type Player, type PlayerState, Connected, Player, Ready,
}
import game_engine/domain/types/round.{ActiveRound}
import gleam/dict
import gleam/list

/// Criar nova partida.
pub fn new_match(
  id: String,
  config: MatchConfiguration,
  players: List(Player),
  selected_songs: List(SelectedSong),
) -> Result(WaitingMatch, LobbyError) {
  case list.length(players) {
    0 -> Error(NotEnoughPlayers)
    _ ->
      case config.total_songs > list.length(selected_songs) {
        True -> Error(NotEnoughSongs)
        False -> {
          let taken = list.take(selected_songs, config.total_songs)
          let rounds =
            list.index_map(taken, fn(s, i) {
              ActiveRound(
                index: i,
                song: s.song,
                answers: dict.new(),
                contributed_by: s.contributed_by,
              )
            })
          let songs = list.map(taken, fn(s) { s.song })
          let init_players =
            list.map(players, fn(p) { Player(..p, state: Connected, score: 0) })
          Ok(WaitingMatch(id:, config:, players: init_players, rounds:, songs:))
        }
      }
  }
}

/// Marcar jogador como pronto.
pub fn set_player_ready(
  match: WaitingMatch,
  player_id: String,
) -> Result(WaitingMatch, LobbyError) {
  set_player_state(match, player_id, Ready)
}

/// Desmarcar jogador de pronto.
pub fn set_player_unready(
  match: WaitingMatch,
  player_id: String,
) -> Result(WaitingMatch, LobbyError) {
  set_player_state(match, player_id, Connected)
}

/// Iniciar partida: WaitingMatch → ActiveMatch.
pub fn start_match(match: WaitingMatch) -> Result(MatchEvent, LobbyError) {
  let all_ready = list.all(match.players, fn(p) { p.state == Ready })
  case all_ready {
    False -> Error(NotAllPlayersReady)
    True ->
      Ok(
        MatchStarted(ActiveMatch(
          id: match.id,
          config: match.config,
          players: match.players,
          active_rounds: match.rounds,
          ended_rounds: [],
          current_round_index: 0,
          songs: match.songs,
        )),
      )
  }
}

fn set_player_state(
  match: WaitingMatch,
  player_id: String,
  state: PlayerState,
) -> Result(WaitingMatch, LobbyError) {
  case list.find(match.players, fn(p) { p.id == player_id }) {
    Error(_) -> Error(LobbyPlayerNotFound(player_id))
    Ok(_) -> {
      let updated =
        list.map(match.players, fn(p) {
          case p.id == player_id {
            True -> Player(..p, state:)
            False -> p
          }
        })
      Ok(WaitingMatch(..match, players: updated))
    }
  }
}
