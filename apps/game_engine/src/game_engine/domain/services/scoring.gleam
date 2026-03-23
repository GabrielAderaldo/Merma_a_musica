// domain/services/scoring.gleam — Domain Service: Pontuação

import game_engine/domain/types/config.{
  type MatchConfiguration, Simple, SpeedBonus,
}
import gleam/float
import gleam/int

/// Calcular pontos de uma resposta.
pub fn calculate_points(
  is_correct: Bool,
  response_time: Float,
  config: MatchConfiguration,
) -> Int {
  case is_correct {
    False -> 0
    True ->
      case config.scoring_rule {
        Simple -> 1
        SpeedBonus -> {
          let ratio = response_time /. int.to_float(config.time_per_round)
          float.truncate(float.max(100.0, 1000.0 -. ratio *. 900.0))
        }
      }
  }
}
