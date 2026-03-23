// domain/types/round.gleam — Entity: Rodada (ciclo de vida)
//
// ActiveRound → EndedRound (transição irreversível).

import game_engine/domain/types/answer.{type Answer}
import game_engine/domain/types/media.{type Song}
import gleam/dict.{type Dict}

/// Rodada ativa — aceitando respostas.
pub type ActiveRound {
  ActiveRound(
    index: Int,
    song: Song,
    answers: Dict(String, Answer),
    contributed_by: String,
  )
}

/// Rodada encerrada — imutável.
pub type EndedRound {
  EndedRound(
    index: Int,
    song: Song,
    answers: Dict(String, Answer),
    contributed_by: String,
  )
}
