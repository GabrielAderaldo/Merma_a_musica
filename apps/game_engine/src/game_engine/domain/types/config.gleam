// domain/types/config.gleam — Value Objects de Configuração
//
// MatchConfiguration com smart constructor.

pub type AnswerType {
  SongName
  ArtistName
  Both
}

pub type ScoringRule {
  Simple
  SpeedBonus
}

pub type ConfigError {
  InvalidTimePerRound(value: Int)
  InvalidTotalSongs(value: Int)
}

pub type MatchConfiguration {
  MatchConfiguration(
    time_per_round: Int,
    total_songs: Int,
    answer_type: AnswerType,
    allow_repeats: Bool,
    scoring_rule: ScoringRule,
  )
}

/// Smart constructor — se retornou Ok, a config é válida.
pub fn new_config(
  time_per_round: Int,
  total_songs: Int,
  answer_type: AnswerType,
  allow_repeats: Bool,
  scoring_rule: ScoringRule,
) -> Result(MatchConfiguration, ConfigError) {
  case time_per_round >= 10 && time_per_round <= 60 {
    False -> Error(InvalidTimePerRound(time_per_round))
    True ->
      case total_songs >= 1 {
        False -> Error(InvalidTotalSongs(total_songs))
        True ->
          Ok(MatchConfiguration(
            time_per_round:,
            total_songs:,
            answer_type:,
            allow_repeats:,
            scoring_rule:,
          ))
      }
  }
}
