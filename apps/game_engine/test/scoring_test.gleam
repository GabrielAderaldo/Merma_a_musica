// ═══════════════════════════════════════════════════════════════
// scoring_test — Domain Service: cálculo de pontuação
// ═══════════════════════════════════════════════════════════════
// Testa calculate_points ISOLADO. Função pura, sem match.

import game_engine/domain/services/scoring
import game_engine/domain/types/config.{
  type MatchConfiguration, Both, MatchConfiguration, Simple, SpeedBonus,
}
import gleeunit/should

fn simple_config() -> MatchConfiguration {
  MatchConfiguration(
    time_per_round: 30,
    total_songs: 3,
    answer_type: Both,
    allow_repeats: False,
    scoring_rule: Simple,
  )
}

fn speed_config() -> MatchConfiguration {
  MatchConfiguration(
    time_per_round: 30,
    total_songs: 3,
    answer_type: Both,
    allow_repeats: False,
    scoring_rule: SpeedBonus,
  )
}

// ─── Simple scoring ───

pub fn simple_correct_gives_one_point_test() {
  should.equal(scoring.calculate_points(True, 5.0, simple_config()), 1)
}

pub fn simple_wrong_gives_zero_test() {
  should.equal(scoring.calculate_points(False, 5.0, simple_config()), 0)
}

// ─── Speed bonus scoring ───

pub fn speed_bonus_instant_answer_gives_max_test() {
  should.equal(scoring.calculate_points(True, 0.0, speed_config()), 1000)
}

pub fn speed_bonus_half_time_gives_middle_test() {
  should.equal(scoring.calculate_points(True, 15.0, speed_config()), 550)
}

pub fn speed_bonus_at_limit_gives_minimum_test() {
  should.equal(scoring.calculate_points(True, 30.0, speed_config()), 100)
}

pub fn speed_bonus_wrong_gives_zero_test() {
  should.equal(scoring.calculate_points(False, 0.0, speed_config()), 0)
}
