import game_engine/answer
import game_engine/scoring
import game_engine/types.{
  type Answer, type EngineError, type MatchConfiguration, type Round, type Song,
  Answer, PlayerAlreadyAnswered, Round, RoundAlreadyEnded, RoundEnded,
  RoundInProgress,
}
import gleam/dict

/// Cria uma nova rodada com a música sorteada.
pub fn new(index: Int, song: Song) -> Round {
  Round(index: index, song: song, answers: dict.new(), state: RoundInProgress)
}

/// Registra a resposta de um jogador na rodada.
pub fn submit_answer(
  round: Round,
  player_id: String,
  answer_text: String,
  answer_time: Float,
  config: MatchConfiguration,
) -> Result(#(Round, Answer), EngineError) {
  case round.state {
    RoundEnded -> Error(RoundAlreadyEnded)
    RoundInProgress -> {
      case dict.get(round.answers, player_id) {
        Ok(_) -> Error(PlayerAlreadyAnswered(player_id))
        Error(_) -> {
          let is_correct =
            answer.validate(answer_text, round.song, config.answer_type)
          let points = scoring.calculate_points(config, answer_time, is_correct)
          let player_answer =
            Answer(
              text: answer_text,
              answer_time: answer_time,
              is_correct: is_correct,
              points: points,
            )
          let updated_round =
            Round(
              ..round,
              answers: dict.insert(round.answers, player_id, player_answer),
            )
          Ok(#(updated_round, player_answer))
        }
      }
    }
  }
}

/// Encerra uma rodada.
pub fn end(round: Round) -> Round {
  Round(..round, state: RoundEnded)
}

/// Verifica se todos os jogadores já responderam.
pub fn all_answered(round: Round, total_players: Int) -> Bool {
  dict.size(round.answers) >= total_players
}
