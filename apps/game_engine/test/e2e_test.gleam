// ═══════════════════════════════════════════════════════════════
// e2e_test — Cenários completos ponta a ponta
// ═══════════════════════════════════════════════════════════════
// Cada teste roda uma partida inteira do lobby ao resultado.
// Valida que o aggregate inteiro transiciona corretamente.

import game_engine
import game_engine/domain/events.{
  AnswerProcessed, MatchCompleted, MatchStarted, RoundCompleted, RoundStarted,
}
import game_engine/domain/types/config.{MatchConfiguration, Simple, SongName}
import game_engine/domain/types/media.{SelectedSong}
import gleam/dict
import gleam/list
import gleeunit/should
import test_helpers.{
  make_config, make_player, make_players, make_selected, make_selected_songs,
  make_songs, setup_in_round, simple_config,
}

// ─── 2 players, 3 rounds, SpeedBonus ───

pub fn full_match_2_players_3_rounds_test() {
  let assert Ok(m) =
    game_engine.new_match(
      "e2e1",
      make_config(),
      make_players(),
      make_selected_songs(),
    )
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m3) = game_engine.set_player_ready(m2, "p2")
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m3)

  // R1: ambos acertam
  let assert Ok(RoundStarted(match: r1, ..)) = game_engine.start_round(started)
  let assert Ok(AnswerProcessed(match: r1a, ..)) =
    game_engine.submit_answer(r1, "p1", "Bohemian Rhapsody", 3.0)
  let assert Ok(AnswerProcessed(match: r1b, ..)) =
    game_engine.submit_answer(r1a, "p2", "Queen", 15.0)
  let assert Ok(RoundCompleted(match: after_r1, ..)) =
    game_engine.end_round(r1b)

  // R2: p1 acerta, p2 erra
  let assert Ok(RoundStarted(match: r2, ..)) = game_engine.start_round(after_r1)
  let assert Ok(AnswerProcessed(match: r2a, ..)) =
    game_engine.submit_answer(r2, "p1", "Evidencias", 5.0)
  let assert Ok(AnswerProcessed(match: r2b, ..)) =
    game_engine.submit_answer(r2a, "p2", "errado", 5.0)
  let assert Ok(RoundCompleted(match: after_r2, ..)) =
    game_engine.end_round(r2b)

  // R3: ambos erram
  let assert Ok(RoundStarted(match: r3, ..)) = game_engine.start_round(after_r2)
  let assert Ok(AnswerProcessed(match: r3a, ..)) =
    game_engine.submit_answer(r3, "p1", "errado", 5.0)
  let assert Ok(AnswerProcessed(match: r3b, ..)) =
    game_engine.submit_answer(r3a, "p2", "errado", 5.0)
  let assert Ok(RoundCompleted(match: after_r3, ..)) =
    game_engine.end_round(r3b)

  let assert Ok(MatchCompleted(
    match: _,
    final_scores: scores,
    ranking: ranking,
    highlights: hl,
  )) = game_engine.end_match(after_r3)
  // finished is FinishedMatch by type
  let assert Ok(p1s) = dict.get(scores, "p1")
  let assert Ok(p2s) = dict.get(scores, "p2")
  should.be_true(p1s > p2s)
  let assert Ok(first) = list.first(ranking)
  should.equal(first.player_id, "p1")
  should.equal(hl.best_streak.player_id, "p1")
  should.equal(hl.best_streak.streak, 2)
}

// ─── Solo player ───

pub fn solo_full_game_test() {
  let config =
    MatchConfiguration(
      ..make_config(),
      total_songs: 1,
      answer_type: SongName,
      scoring_rule: Simple,
    )
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "solo")]
  let players = [make_player("solo", "Gabriel")]
  let assert Ok(m) = game_engine.new_match("solo", config, players, selected)
  let assert Ok(m2) = game_engine.set_player_ready(m, "solo")
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m2)
  let assert Ok(RoundStarted(match: in_round, ..)) =
    game_engine.start_round(started)
  let assert Ok(AnswerProcessed(match: answered, is_correct: True, ..)) =
    game_engine.submit_answer(in_round, "solo", "Bohemian Rhapsody", 5.0)
  should.equal(game_engine.all_answered(answered), True)
  let assert Ok(RoundCompleted(match: after_round, ..)) =
    game_engine.end_round(answered)
  let assert Ok(MatchCompleted(match: _, ranking: ranking, ..)) =
    game_engine.end_match(after_round)
  // finished is FinishedMatch by type
  let assert Ok(first) = list.first(ranking)
  should.equal(first.correct_answers, 1)
}

pub fn solo_3_rounds_test() {
  let config = MatchConfiguration(..make_config(), scoring_rule: Simple)
  let selected =
    list.map(make_songs(), fn(s) {
      SelectedSong(song: s, contributed_by: "solo")
    })
  let players = [make_player("solo", "Gabriel")]
  let assert Ok(m) = game_engine.new_match("solo3", config, players, selected)
  let assert Ok(m2) = game_engine.set_player_ready(m, "solo")
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m2)

  let assert Ok(RoundStarted(match: r1, ..)) = game_engine.start_round(started)
  let assert Ok(AnswerProcessed(match: r1a, ..)) =
    game_engine.submit_answer(r1, "solo", "Bohemian Rhapsody", 5.0)
  let assert Ok(RoundCompleted(match: after_r1, ..)) =
    game_engine.end_round(r1a)

  let assert Ok(RoundStarted(match: r2, ..)) = game_engine.start_round(after_r1)
  let assert Ok(AnswerProcessed(match: r2a, ..)) =
    game_engine.submit_answer(r2, "solo", "errado", 5.0)
  let assert Ok(RoundCompleted(match: after_r2, ..)) =
    game_engine.end_round(r2a)

  let assert Ok(RoundStarted(match: r3, ..)) = game_engine.start_round(after_r2)
  let assert Ok(AnswerProcessed(match: r3a, ..)) =
    game_engine.submit_answer(r3, "solo", "Tom Jobim", 10.0)
  let assert Ok(RoundCompleted(match: after_r3, ..)) =
    game_engine.end_round(r3a)

  let assert Ok(MatchCompleted(ranking: ranking, highlights: hl, ..)) =
    game_engine.end_match(after_r3)
  let assert Ok(first) = list.first(ranking)
  should.equal(first.correct_answers, 2)
  should.equal(first.total_points, 2)
  should.equal(hl.best_streak.streak, 1)
}

// ─── 4 players ───

pub fn four_players_test() {
  let config = simple_config(1)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  let players = [
    make_player("p1", "A"),
    make_player("p2", "B"),
    make_player("p3", "C"),
    make_player("p4", "D"),
  ]
  let #(in_round, _) = setup_in_round(config, players, selected)

  let assert Ok(AnswerProcessed(match: a1, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(match: a2, ..)) =
    game_engine.submit_answer(a1, "p2", "errado", 10.0)
  let assert Ok(AnswerProcessed(match: a3, ..)) =
    game_engine.submit_answer(a2, "p3", "errado", 5.0)
  let assert Ok(AnswerProcessed(match: a4, ..)) =
    game_engine.submit_answer(a3, "p4", "errado", 5.0)
  should.equal(game_engine.all_answered(a4), True)

  let assert Ok(RoundCompleted(match: after_r1, ..)) = game_engine.end_round(a4)
  let assert Ok(MatchCompleted(ranking: ranking, ..)) =
    game_engine.end_match(after_r1)
  should.equal(list.length(ranking), 4)
  let assert Ok(first) = list.first(ranking)
  should.equal(first.player_id, "p1")
}
