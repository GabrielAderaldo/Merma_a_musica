// ═══════════════════════════════════════════════════════════════
// tiebreaker_test — Workflow: desempate (gol de ouro)
// ═══════════════════════════════════════════════════════════════
// Testa detecção de empate, pools A/B, resolve_tiebreaker,
// e cenários edge (ninguém acerta, 3+ players).

import game_engine
import game_engine/domain/events.{
  AnswerProcessed, MatchCompleted, MatchStarted, RoundCompleted, RoundStarted,
  TiebreakerNeeded,
}
import game_engine/domain/types/config.{MatchConfiguration, Simple}
import game_engine/domain/types/media.{SelectedSong}
import gleam/list
import gleeunit/should
import test_helpers.{
  make_config, make_player, make_players, make_selected, make_song,
  player_with_songs, setup_in_round, simple_config,
}

// ─── Helper: setup empate básico (ambos acertam 1 round, Simple) ───

fn setup_tied_match() {
  let config = simple_config(1)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(match: m3, ..)) =
    game_engine.submit_answer(m2, "p2", "Queen", 5.0)
  let assert Ok(RoundCompleted(match: after_round, ..)) =
    game_engine.end_round(m3)
  after_round
}

// ─── Detecção de empate ───

pub fn triggered_when_scores_tied_test() {
  let after_round = setup_tied_match()
  let assert Ok(TiebreakerNeeded(tiebreaker)) =
    game_engine.end_match(after_round)
  should.equal(list.length(tiebreaker.tied_player_ids), 2)
  should.equal(tiebreaker.tied_score, 1)
  should.be_true(list.contains(tiebreaker.tied_player_ids, "p1"))
  should.be_true(list.contains(tiebreaker.tied_player_ids, "p2"))
}

pub fn not_triggered_when_scores_different_test() {
  let #(in_round, _) =
    setup_in_round(simple_config(1), make_players(), [
      make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    ])
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(match: m3, ..)) =
    game_engine.submit_answer(m2, "p2", "errado", 5.0)
  let assert Ok(RoundCompleted(match: after_round, ..)) =
    game_engine.end_round(m3)
  let assert Ok(MatchCompleted(..)) = game_engine.end_match(after_round)
}

pub fn triggered_with_2_rounds_all_correct_test() {
  let config = simple_config(2)
  let selected = [
    make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    make_selected("2", "Evidências", "Chitãozinho e Xororó", "p2"),
  ]
  let assert Ok(m) =
    game_engine.new_match("tie", config, make_players(), selected)
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m3) = game_engine.set_player_ready(m2, "p2")
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m3)

  let assert Ok(RoundStarted(match: r1, ..)) = game_engine.start_round(started)
  let assert Ok(AnswerProcessed(match: r1a, ..)) =
    game_engine.submit_answer(r1, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(match: r1b, ..)) =
    game_engine.submit_answer(r1a, "p2", "Queen", 5.0)
  let assert Ok(RoundCompleted(match: after_r1, ..)) =
    game_engine.end_round(r1b)

  let assert Ok(RoundStarted(match: r2, ..)) = game_engine.start_round(after_r1)
  let assert Ok(AnswerProcessed(match: r2a, ..)) =
    game_engine.submit_answer(r2, "p1", "Evidencias", 5.0)
  let assert Ok(AnswerProcessed(match: r2b, ..)) =
    game_engine.submit_answer(r2a, "p2", "Chitãozinho e Xororó", 5.0)
  let assert Ok(RoundCompleted(match: after_r2, ..)) =
    game_engine.end_round(r2b)

  let assert Ok(TiebreakerNeeded(tiebreaker)) = game_engine.end_match(after_r2)
  should.equal(tiebreaker.tied_score, 2)
}

// ─── Pool A: songs both missed ───

pub fn pool_a_has_songs_both_missed_test() {
  let config = simple_config(2)
  let selected = [
    make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    make_selected("2", "Evidências", "Chitãozinho e Xororó", "p2"),
  ]
  let assert Ok(m) =
    game_engine.new_match("tie2", config, make_players(), selected)
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m3) = game_engine.set_player_ready(m2, "p2")
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m3)

  // R1: ambos acertam
  let assert Ok(RoundStarted(match: r1, ..)) = game_engine.start_round(started)
  let assert Ok(AnswerProcessed(match: r1a, ..)) =
    game_engine.submit_answer(r1, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(match: r1b, ..)) =
    game_engine.submit_answer(r1a, "p2", "Queen", 5.0)
  let assert Ok(RoundCompleted(match: after_r1, ..)) =
    game_engine.end_round(r1b)

  // R2: ambos ERRAM
  let assert Ok(RoundStarted(match: r2, ..)) = game_engine.start_round(after_r1)
  let assert Ok(AnswerProcessed(match: r2a, ..)) =
    game_engine.submit_answer(r2, "p1", "errado", 5.0)
  let assert Ok(AnswerProcessed(match: r2b, ..)) =
    game_engine.submit_answer(r2a, "p2", "errado", 5.0)
  let assert Ok(RoundCompleted(match: after_r2, ..)) =
    game_engine.end_round(r2b)

  let assert Ok(TiebreakerNeeded(tiebreaker)) = game_engine.end_match(after_r2)
  should.equal(list.length(tiebreaker.songs_both_missed), 1)
  let assert Ok(missed_song) = list.first(tiebreaker.songs_both_missed)
  should.equal(missed_song.name, "Evidências")
}

// ─── Pool B: songs from non-tied players ───

pub fn pool_b_has_unplayed_songs_from_others_test() {
  let config = simple_config(1)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  let p3_songs = [
    make_song("extra1", "Song Extra 1", "Extra Artist"),
    make_song("extra2", "Song Extra 2", "Extra Artist"),
  ]
  let players = [
    make_player("p1", "Gabriel"),
    make_player("p2", "Maria"),
    player_with_songs("p3", "João", p3_songs),
  ]
  let assert Ok(m) = game_engine.new_match("tie3", config, players, selected)
  let assert Ok(m2) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m3) = game_engine.set_player_ready(m2, "p2")
  let assert Ok(m4) = game_engine.set_player_ready(m3, "p3")
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m4)

  // p1 e p2 acertam, p3 erra → p1 e p2 empatam
  let assert Ok(RoundStarted(match: r1, ..)) = game_engine.start_round(started)
  let assert Ok(AnswerProcessed(match: a1, ..)) =
    game_engine.submit_answer(r1, "p1", "Bohemian Rhapsody", 5.0)
  let assert Ok(AnswerProcessed(match: a2, ..)) =
    game_engine.submit_answer(a1, "p2", "Queen", 5.0)
  let assert Ok(AnswerProcessed(match: a3, ..)) =
    game_engine.submit_answer(a2, "p3", "errado", 5.0)
  let assert Ok(RoundCompleted(match: after_r1, ..)) = game_engine.end_round(a3)

  let assert Ok(TiebreakerNeeded(tiebreaker)) = game_engine.end_match(after_r1)
  should.equal(list.length(tiebreaker.songs_both_missed), 0)
  should.equal(list.length(tiebreaker.songs_from_others), 2)
  should.equal(list.length(tiebreaker.tied_player_ids), 2)
  should.be_true(!list.contains(tiebreaker.tied_player_ids, "p3"))
  should.equal(list.length(tiebreaker.partial_ranking), 1)
  let assert Ok(p3_rank) = list.first(tiebreaker.partial_ranking)
  should.equal(p3_rank.player_id, "p3")
}

// ─── Nobody answers correctly ───

pub fn nobody_correct_triggers_tiebreaker_test() {
  let #(in_round, _) =
    setup_in_round(simple_config(1), make_players(), [
      make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    ])
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "errado", 5.0)
  let assert Ok(AnswerProcessed(match: m3, ..)) =
    game_engine.submit_answer(m2, "p2", "tambem errado", 5.0)
  let assert Ok(RoundCompleted(match: after_round, ..)) =
    game_engine.end_round(m3)
  let assert Ok(TiebreakerNeeded(tiebreaker)) =
    game_engine.end_match(after_round)
  should.equal(tiebreaker.tied_score, 0)
  should.equal(list.length(tiebreaker.songs_both_missed), 1)
  should.equal(tiebreaker.highlights.best_streak.streak, 0)
}

// ─── resolve_tiebreaker ───

pub fn resolve_produces_final_ranking_test() {
  let after_round = setup_tied_match()
  let assert Ok(TiebreakerNeeded(tiebreaker)) =
    game_engine.end_match(after_round)

  // Orchestrator decide que p2 ganhou o gol de ouro
  let assert MatchCompleted(match: finished, ranking: ranking, ..) =
    game_engine.resolve_tiebreaker(tiebreaker, "p2")
  // finished is FinishedMatch by type
  should.equal(list.length(ranking), 2)
  let assert Ok(first) = list.first(ranking)
  should.equal(first.player_id, "p2")
  should.equal(first.position, 1)
  let assert Ok(second) = list.last(ranking)
  should.equal(second.player_id, "p1")
  should.equal(second.position, 2)
}

// ─── Near miss em tiebreaker ───

pub fn near_miss_highlight_in_tiebreaker_test() {
  let #(in_round, _) =
    setup_in_round(simple_config(1), make_players(), [
      make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    ])
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "Bohemian Razzoxx", 5.0)
  let assert Ok(AnswerProcessed(match: m3, ..)) =
    game_engine.submit_answer(m2, "p2", "xyz", 5.0)
  let assert Ok(RoundCompleted(match: after_round, ..)) =
    game_engine.end_round(m3)
  let assert Ok(TiebreakerNeeded(tiebreaker)) =
    game_engine.end_match(after_round)
  should.equal(tiebreaker.highlights.near_miss.player_id, "p1")
  should.equal(tiebreaker.highlights.near_miss.count, 1)
}
