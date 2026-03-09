import game_engine/types.{type MatchConfiguration, type ScoringRule, Simple, SpeedBonus}
import gleam/float
import gleam/int

/// Calcula os pontos ganhos por uma resposta correta.
pub fn calculate_points(
  config: MatchConfiguration,
  answer_time: Float,
  is_correct: Bool,
) -> Int {
  case is_correct {
    False -> 0
    True -> apply_scoring_rule(config.scoring_rule, config.time_per_round, answer_time)
  }
}

fn apply_scoring_rule(
  rule: ScoringRule,
  time_per_round: Int,
  answer_time: Float,
) -> Int {
  case rule {
    Simple -> 100
    SpeedBonus -> {
      let max_time = int.to_float(time_per_round)
      let time_ratio = { max_time -. answer_time } /. max_time
      let bonus = float.round(time_ratio *. 100.0)
      // Base 100 + bonus de até 100 por velocidade
      100 + int.max(0, bonus)
    }
  }
}
