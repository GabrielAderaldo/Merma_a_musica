// ═══════════════════════════════════════════════════════════════
// error_states_test — Transições inválidas do aggregate
// ═══════════════════════════════════════════════════════════════
// NOTA DDD: Muitos erros de estado são agora IMPOSSÍVEIS pelo compilador:
// - start_match(ActiveMatch) → não compila (aceita WaitingMatch)
// - set_player_ready(ActiveMatch) → não compila
// - end_match(FinishedMatch) → não compila (aceita ActiveMatch)
//
// Os testes restantes cobrem erros DENTRO de um estado válido.

import game_engine
import game_engine/domain/errors.{NoMoreRounds, RoundPlayerNotFound}
import game_engine/domain/events.{AnswerProcessed, RoundCompleted, RoundStarted}
import game_engine/domain/types/config.{MatchConfiguration}
import test_helpers.{make_config, make_players, make_selected, setup_in_round}

// ─── answer para player desconhecido ───

pub fn answer_unknown_player_test() {
  let #(in_round, _) =
    setup_in_round(
      MatchConfiguration(..make_config(), total_songs: 1),
      make_players(),
      [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")],
    )
  let assert Error(RoundPlayerNotFound("ghost")) =
    game_engine.submit_answer(in_round, "ghost", "test", 5.0)
}

// ─── answer após acabar as rounds ───

pub fn answer_after_all_rounds_ended_test() {
  let config = MatchConfiguration(..make_config(), total_songs: 2)
  let selected = [
    make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    make_selected("2", "Evidências", "Chitãozinho", "p2"),
  ]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "test", 5.0)
  let assert Ok(RoundCompleted(match: after_round, ..)) =
    game_engine.end_round(m2)
  let assert Ok(RoundStarted(match: r2, ..)) =
    game_engine.start_round(after_round)
  let assert Ok(AnswerProcessed(match: r2a, ..)) =
    game_engine.submit_answer(r2, "p1", "test", 5.0)
  let assert Ok(RoundCompleted(match: after_r2, ..)) =
    game_engine.end_round(r2a)
  let assert Error(NoMoreRounds) =
    game_engine.submit_answer(after_r2, "p2", "test", 5.0)
}

// ─── start_round sem mais rounds ───

pub fn start_round_no_more_rounds_test() {
  let config = MatchConfiguration(..make_config(), total_songs: 1)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  let #(in_round, _) = setup_in_round(config, make_players(), selected)
  let assert Ok(AnswerProcessed(match: m2, ..)) =
    game_engine.submit_answer(in_round, "p1", "test", 5.0)
  let assert Ok(RoundCompleted(match: after_round, ..)) =
    game_engine.end_round(m2)
  let assert Error(NoMoreRounds) = game_engine.start_round(after_round)
}
