// domain/types/answer.gleam — Value Objects de Resposta

/// Resposta de um jogador a uma rodada.
pub type Answer {
  Answer(
    text: String,
    answer_time: Float,
    is_correct: Bool,
    is_near_miss: Bool,
    points: Int,
  )
}

/// Resultado detalhado da validação (retornado pelo validation service).
pub type AnswerResult {
  AnswerResult(is_correct: Bool, is_near_miss: Bool)
}
