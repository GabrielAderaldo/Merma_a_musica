// ═══════════════════════════════════════════════════════════════
// round_test — Workflow: round (ActiveMatch ↔ rounds)
// ═══════════════════════════════════════════════════════════════
// Testa start_round, submit_answer, end_round, all_answered.
// Foco: ciclo de vida de rounds dentro do aggregate.

import game_engine
import game_engine/domain/events.{
  AnswerProcessed, MatchStarted, RoundCompleted, RoundStarted,
}
import game_engine/domain/types/config.{
  ArtistName, Both, MatchConfiguration, SongName,
}
import gleam/dict
import gleeunit/should
import test_helpers.{
  config_with_answer_type, make_config, make_players, make_selected,
  make_selected_songs, setup_in_round, setup_simple_1_round,
}

// ─── start_round ───

pub fn returns_first_round_test() {
  let assert Ok(m) =
    game_engine.new_match(
      "m1",
      make_config(),
      make_players(),
      make_selected_songs(),
    )
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m3) = game_engine.set_player_ready(m2, "p2")
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m3)
  let assert Ok(RoundStarted(match: _, round: round)) =
    game_engine.start_round(started)
  should.equal(round.index, 0)
  should.equal(round.contributed_by, "p1")
}

// ─── submit_answer ───

pub fn correct_answer_gives_points_test() {
  let #(in_round, _) =
    setup_in_round(make_config(), make_players(), make_selected_songs())
  let assert Ok(AnswerProcessed(
    player_id: "p1",
    is_correct: True,
    points_earned: pts,
    ..,
  )) = game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 5.0)
  should.be_true(pts > 0)
}

pub fn wrong_answer_gives_zero_test() {
  let #(in_round, _) =
    setup_in_round(make_config(), make_players(), make_selected_songs())
  let assert Ok(AnswerProcessed(is_correct: False, points_earned: 0, ..)) =
    game_engine.submit_answer(in_round, "p1", "musica aleatoria", 5.0)
}

pub fn resubmit_uses_last_answer_test() {
  let #(in_round, _) = setup_simple_1_round()
  let assert Ok(AnswerProcessed(match: m2, is_correct: False, ..)) =
    game_engine.submit_answer(in_round, "p1", "errado", 3.0)
  let assert Ok(AnswerProcessed(is_correct: True, points_earned: pts, ..)) =
    game_engine.submit_answer(m2, "p1", "Bohemian Rhapsody", 10.0)
  should.be_true(pts > 0)
}

// ─── all_answered ───

pub fn all_answered_false_when_partial_test() {
  let #(in_round, _) =
    setup_in_round(make_config(), make_players(), make_selected_songs())
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "test", 5.0)
  should.equal(game_engine.all_answered(m2), False)
}

pub fn all_answered_true_when_complete_test() {
  let #(in_round, _) =
    setup_in_round(make_config(), make_players(), make_selected_songs())
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "test", 5.0)
  let assert Ok(AnswerProcessed(match: m3, ..)) =
    game_engine.submit_answer(m2, "p2", "test", 8.0)
  should.equal(game_engine.all_answered(m3), True)
}

// ─── end_round ───

pub fn accumulates_scores_test() {
  let #(in_round, _) =
    setup_in_round(make_config(), make_players(), make_selected_songs())
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(match: m3, ..)) =
    game_engine.submit_answer(m2, "p2", "errado", 5.0)
  let assert Ok(RoundCompleted(match: after_round, scores: scores, ..)) =
    game_engine.end_round(m3)
  let assert Ok(p1_score) = dict.get(scores, "p1")
  should.be_true(p1_score > 0)
  let assert Ok(p2_score) = dict.get(scores, "p2")
  should.equal(p2_score, 0)
  should.equal(after_round.current_round_index, 1)
}

pub fn player_no_answer_gets_zero_test() {
  let #(in_round, _) = setup_simple_1_round()
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(RoundCompleted(scores: scores, ..)) = game_engine.end_round(m2)
  let assert Ok(p2s) = dict.get(scores, "p2")
  should.equal(p2s, 0)
}

// ─── Answer type modes ───

pub fn song_name_mode_rejects_artist_test() {
  let config = config_with_answer_type(SongName)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(is_correct: False, ..)) =
    game_engine.submit_answer(in_round, "p1", "Queen", 5.0)
}

pub fn artist_mode_rejects_song_name_test() {
  let config = config_with_answer_type(ArtistName)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(is_correct: False, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(is_correct: True, ..)) =
    game_engine.submit_answer(in_round, "p2", "Queen", 5.0)
}

pub fn both_mode_accepts_either_test() {
  let config = config_with_answer_type(Both)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(is_correct: True, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(is_correct: True, ..)) =
    game_engine.submit_answer(in_round, "p2", "Queen", 5.0)
}

// ─── Fuzzy matching e2e (via submit_answer) ───

pub fn accents_ignored_test() {
  let config = config_with_answer_type(SongName)
  let selected = [
    make_selected("1", "Evidências", "Chitãozinho e Xororó", "p1"),
  ]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(is_correct: True, ..)) =
    game_engine.submit_answer(in_round, "p1", "Evidencias", 5.0)
}

pub fn parentheses_ignored_test() {
  let config = config_with_answer_type(SongName)
  let selected = [
    make_selected("1", "Bohemian Rhapsody (Remastered)", "Queen", "p1"),
  ]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(is_correct: True, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 5.0)
}

pub fn articles_ignored_test() {
  let config = config_with_answer_type(ArtistName)
  let selected = [make_selected("1", "Blinding Lights", "The Weeknd", "p1")]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(is_correct: True, ..)) =
    game_engine.submit_answer(in_round, "p1", "Weeknd", 5.0)
}

pub fn typo_tolerated_test() {
  let config = config_with_answer_type(SongName)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(is_correct: True, ..)) =
    game_engine.submit_answer(in_round, "p1", "boemian rapsody", 5.0)
}

pub fn very_different_answer_rejected_test() {
  let config = config_with_answer_type(SongName)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(is_correct: False, ..)) =
    game_engine.submit_answer(
      in_round,
      "p1",
      "musica completamente diferente",
      5.0,
    )
}

// ─── is_last_round ───

pub fn is_last_round_test() {
  let config = MatchConfiguration(..make_config(), total_songs: 1)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  should.equal(game_engine.is_last_round(in_round), True)
}
