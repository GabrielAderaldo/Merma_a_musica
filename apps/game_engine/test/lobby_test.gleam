// ═══════════════════════════════════════════════════════════════
// lobby_test — Workflow: lobby (WaitingMatch → ActiveMatch)
// ═══════════════════════════════════════════════════════════════
// Testa new_match, set_player_ready/unready, start_match.
// Foco: transições do aggregate root no estado Waiting.

import game_engine
import game_engine/domain/errors.{
  NotAllPlayersReady, NotEnoughPlayers, NotEnoughSongs,
}
import game_engine/domain/events.{MatchStarted}
import game_engine/domain/types/config.{MatchConfiguration}
import game_engine/domain/types/player.{Connected, Ready}
import gleam/list
import gleeunit/should
import test_helpers.{make_config, make_players, make_selected_songs}

// ─── new_match ───

pub fn creates_valid_match_test() {
  let result =
    game_engine.new_match(
      "m1",
      make_config(),
      make_players(),
      make_selected_songs(),
    )
  should.be_ok(result)
  let assert Ok(m) = result
  should.equal(m.id, "m1")
  // m is WaitingMatch by type — no .state field needed
  should.equal(list.length(m.players), 2)
  should.equal(list.length(m.rounds), 3)
  // WaitingMatch has no current_round_index (only ActiveMatch does)
}

pub fn fails_with_no_players_test() {
  let result =
    game_engine.new_match("m1", make_config(), [], make_selected_songs())
  let assert Error(NotEnoughPlayers) = result
}

pub fn fails_with_not_enough_songs_test() {
  let config = MatchConfiguration(..make_config(), total_songs: 10)
  let result =
    game_engine.new_match("m1", config, make_players(), make_selected_songs())
  let assert Error(NotEnoughSongs) = result
}

pub fn players_start_connected_with_zero_score_test() {
  let assert Ok(m) =
    game_engine.new_match(
      "m1",
      make_config(),
      make_players(),
      make_selected_songs(),
    )
  list.each(m.players, fn(p) {
    should.equal(p.state, Connected)
    should.equal(p.score, 0)
  })
}

pub fn rounds_have_contributed_by_test() {
  let assert Ok(m) =
    game_engine.new_match(
      "m1",
      make_config(),
      make_players(),
      make_selected_songs(),
    )
  let assert Ok(first_round) = list.first(m.rounds)
  should.equal(first_round.contributed_by, "p1")
}

// ─── set_player_ready / unready ───

pub fn set_ready_works_test() {
  let assert Ok(m) =
    game_engine.new_match(
      "m1",
      make_config(),
      make_players(),
      make_selected_songs(),
    )
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(p1) = list.find(m2.players, fn(p) { p.id == "p1" })
  should.equal(p1.state, Ready)
}

pub fn set_unready_works_test() {
  let assert Ok(m) =
    game_engine.new_match(
      "m1",
      make_config(),
      make_players(),
      make_selected_songs(),
    )
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m3) = game_engine.set_player_unready(m2, "p1")
  let assert Ok(p1) = list.find(m3.players, fn(p) { p.id == "p1" })
  should.equal(p1.state, Connected)
}

pub fn set_ready_fails_for_unknown_player_test() {
  let assert Ok(m) =
    game_engine.new_match(
      "m1",
      make_config(),
      make_players(),
      make_selected_songs(),
    )
  should.be_error(game_engine.set_player_ready(m, "unknown"))
}

// ─── start_match ───

pub fn start_works_when_all_ready_test() {
  let assert Ok(m) =
    game_engine.new_match(
      "m1",
      make_config(),
      make_players(),
      make_selected_songs(),
    )
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m3) = game_engine.set_player_ready(m2, "p2")
  let assert Ok(MatchStarted(match: _)) = game_engine.start_match(m3)
  // started is ActiveMatch by type — no .state field needed
}

pub fn start_fails_when_not_all_ready_test() {
  let assert Ok(m) =
    game_engine.new_match(
      "m1",
      make_config(),
      make_players(),
      make_selected_songs(),
    )
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Error(NotAllPlayersReady) = game_engine.start_match(m2)
}
