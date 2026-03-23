// ═══════════════════════════════════════════════════════════════
// finish_test — Workflow: end_match (ActiveMatch → FinishedMatch)
// ═══════════════════════════════════════════════════════════════
// Testa end_match, ranking, highlights, final_scores.
// Foco: transição final do aggregate + VOs de resultado.

import game_engine
import game_engine/domain/events.{
  AnswerProcessed, MatchCompleted, MatchStarted, RoundCompleted, RoundStarted,
}
import game_engine/domain/types/config.{MatchConfiguration, Simple}
import game_engine/domain/types/media.{SelectedSong}
import gleam/dict
import gleam/list
import gleeunit/should
import test_helpers.{
  make_config, make_player, make_players, make_selected, make_songs,
  setup_in_round, setup_simple_1_round, simple_config,
}

// ─── Helper: joga uma partida completa de 2 rounds ───

fn play_full_match() {
  let config = MatchConfiguration(..make_config(), total_songs: 2)
  let selected = [
    make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    make_selected("2", "Evidências", "Chitãozinho e Xororó", "p2"),
  ]
  let assert Ok(m) =
    game_engine.new_match("m1", config, make_players(), selected)
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m3) = game_engine.set_player_ready(m2, "p2")
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m3)

  // R1: p1 acerta rápido, p2 erra
  let assert Ok(RoundStarted(match: r1, ..)) = game_engine.start_round(started)
  let assert Ok(AnswerProcessed(match: r1a, ..)) =
    game_engine.submit_answer(r1, "p1", "Bohemian Rhapsody", 2.0)
  let assert Ok(AnswerProcessed(match: r1b, ..)) =
    game_engine.submit_answer(r1a, "p2", "errado", 10.0)
  let assert Ok(RoundCompleted(match: after_r1, ..)) =
    game_engine.end_round(r1b)

  // R2: p1 acerta, p2 acerta devagar
  let assert Ok(RoundStarted(match: r2, ..)) = game_engine.start_round(after_r1)
  let assert Ok(AnswerProcessed(match: r2a, ..)) =
    game_engine.submit_answer(r2, "p1", "Evidencias", 3.0)
  let assert Ok(AnswerProcessed(match: r2b, ..)) =
    game_engine.submit_answer(r2a, "p2", "Chitãozinho e Xororó", 25.0)
  let assert Ok(RoundCompleted(match: after_r2, ..)) =
    game_engine.end_round(r2b)

  let assert Ok(MatchCompleted(
    match: finished,
    final_scores: scores,
    ranking: ranking,
    highlights: hl,
  )) = game_engine.end_match(after_r2)
  #(finished, scores, ranking, hl)
}

// ─── end_match: ranking ───

pub fn produces_ranking_test() {
  let #(in_round, _) = setup_simple_1_round()
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(match: m3, ..)) =
    game_engine.submit_answer(m2, "p2", "errado", 5.0)
  let assert Ok(RoundCompleted(match: after_round, ..)) =
    game_engine.end_round(m3)
  let assert Ok(MatchCompleted(match: _, ranking: ranking, ..)) =
    game_engine.end_match(after_round)
  // finished is FinishedMatch by type
  should.equal(list.length(ranking), 2)
  let assert Ok(first) = list.first(ranking)
  should.equal(first.player_id, "p1")
}

pub fn ranking_has_correct_answers_and_avg_time_test() {
  let #(_, _, ranking, _) = play_full_match()
  let assert Ok(first) = list.first(ranking)
  should.equal(first.player_id, "p1")
  should.equal(first.correct_answers, 2)
  should.equal(first.avg_response_time, 2.5)
  let assert Ok(second) = list.last(ranking)
  should.equal(second.player_id, "p2")
  should.equal(second.correct_answers, 1)
  should.equal(second.avg_response_time, 25.0)
}

// ─── end_match: final scores ───

pub fn final_scores_ordered_correctly_test() {
  let #(_, scores, _, _) = play_full_match()
  // finished is FinishedMatch by type
  let assert Ok(p1s) = dict.get(scores, "p1")
  let assert Ok(p2s) = dict.get(scores, "p2")
  should.be_true(p1s > p2s)
  should.be_true(p2s > 0)
}

pub fn simple_scoring_final_scores_test() {
  let config = simple_config(2)
  let selected = [
    make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    make_selected("2", "Evidências", "Chitãozinho e Xororó", "p2"),
  ]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(match: r1a, points_earned: 1, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 1.0)
  let assert Ok(AnswerProcessed(match: r1b, points_earned: 1, ..)) =
    game_engine.submit_answer(r1a, "p2", "Queen", 20.0)
  let assert Ok(RoundCompleted(match: after_r1, ..)) =
    game_engine.end_round(r1b)
  let assert Ok(RoundStarted(match: r2, ..)) = game_engine.start_round(after_r1)
  let assert Ok(AnswerProcessed(match: r2a, points_earned: 1, ..)) =
    game_engine.submit_answer(r2, "p1", "Evidencias", 5.0)
  let assert Ok(AnswerProcessed(match: r2b, points_earned: 0, ..)) =
    game_engine.submit_answer(r2a, "p2", "errado", 5.0)
  let assert Ok(RoundCompleted(match: after_r2, ..)) =
    game_engine.end_round(r2b)
  let assert Ok(MatchCompleted(final_scores: scores, ..)) =
    game_engine.end_match(after_r2)
  let assert Ok(p1s) = dict.get(scores, "p1")
  let assert Ok(p2s) = dict.get(scores, "p2")
  should.equal(p1s, 2)
  should.equal(p2s, 1)
}

// ─── Highlights ───

pub fn best_streak_test() {
  let #(_, _, _, hl) = play_full_match()
  should.equal(hl.best_streak.player_id, "p1")
  should.equal(hl.best_streak.streak, 2)
}

pub fn fastest_answer_test() {
  let #(_, _, _, hl) = play_full_match()
  should.equal(hl.fastest_answer.player_id, "p1")
  should.equal(hl.fastest_answer.time, 2.0)
}

pub fn most_correct_test() {
  let #(_, _, _, hl) = play_full_match()
  should.equal(hl.most_correct.player_id, "p1")
  should.equal(hl.most_correct.count, 2)
}

pub fn streak_breaks_on_wrong_answer_test() {
  let config = MatchConfiguration(..make_config(), scoring_rule: Simple)
  let selected =
    list.map(make_songs(), fn(s) { SelectedSong(song: s, contributed_by: "p1") })
  let players = [make_player("p1", "Gabriel")]
  let assert Ok(m) = game_engine.new_match("streak", config, players, selected)
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m2)

  // R1: acerta → R2: erra → R3: acerta = streak max 1
  let assert Ok(RoundStarted(match: r1, ..)) = game_engine.start_round(started)
  let assert Ok(AnswerProcessed(match: r1a, ..)) =
    game_engine.submit_answer(r1, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(RoundCompleted(match: after_r1, ..)) =
    game_engine.end_round(r1a)
  let assert Ok(RoundStarted(match: r2, ..)) = game_engine.start_round(after_r1)
  let assert Ok(AnswerProcessed(match: r2a, ..)) =
    game_engine.submit_answer(r2, "p1", "errado", 5.0)
  let assert Ok(RoundCompleted(match: after_r2, ..)) =
    game_engine.end_round(r2a)
  let assert Ok(RoundStarted(match: r3, ..)) = game_engine.start_round(after_r2)
  let assert Ok(AnswerProcessed(match: r3a, ..)) =
    game_engine.submit_answer(r3, "p1", "Tom Jobim", 5.0)
  let assert Ok(RoundCompleted(match: after_r3, ..)) =
    game_engine.end_round(r3a)

  let assert Ok(MatchCompleted(highlights: hl, ..)) =
    game_engine.end_match(after_r3)
  should.equal(hl.best_streak.streak, 1)
}

pub fn fastest_ignores_wrong_answers_test() {
  let #(in_round, _) = setup_simple_1_round()
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "errado", 1.0)
  let assert Ok(AnswerProcessed(match: m3, ..)) =
    game_engine.submit_answer(m2, "p2", "Queen", 20.0)
  let assert Ok(RoundCompleted(match: after_round, ..)) =
    game_engine.end_round(m3)
  let assert Ok(MatchCompleted(highlights: hl, ..)) =
    game_engine.end_match(after_round)
  should.equal(hl.fastest_answer.player_id, "p2")
  should.equal(hl.fastest_answer.time, 20.0)
}

// ─── Near miss highlights (integração) ───

pub fn near_miss_highlight_in_full_match_test() {
  let config = simple_config(2)
  let selected = [
    make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    make_selected("2", "Evidências", "Chitãozinho e Xororó", "p2"),
  ]
  let assert Ok(m) =
    game_engine.new_match("nm", config, make_players(), selected)
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m3) = game_engine.set_player_ready(m2, "p2")
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m3)

  // R1: p1 acerta, p2 near miss
  let assert Ok(RoundStarted(match: r1, ..)) = game_engine.start_round(started)
  let assert Ok(AnswerProcessed(match: r1a, ..)) =
    game_engine.submit_answer(r1, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(match: r1b, ..)) =
    game_engine.submit_answer(r1a, "p2", "Bohemian Razzoxx", 5.0)
  let assert Ok(RoundCompleted(match: after_r1, ..)) =
    game_engine.end_round(r1b)

  // R2: p1 acerta, p2 near miss de novo
  let assert Ok(RoundStarted(match: r2, ..)) = game_engine.start_round(after_r1)
  let assert Ok(AnswerProcessed(match: r2a, ..)) =
    game_engine.submit_answer(r2, "p1", "Evidencias", 5.0)
  let assert Ok(AnswerProcessed(match: r2b, ..)) =
    game_engine.submit_answer(r2a, "p2", "Evydenxxas", 5.0)
  let assert Ok(RoundCompleted(match: after_r2, ..)) =
    game_engine.end_round(r2b)

  let assert Ok(MatchCompleted(highlights: hl, ..)) =
    game_engine.end_match(after_r2)
  should.equal(hl.near_miss.player_id, "p2")
  should.equal(hl.near_miss.count, 2)
}
