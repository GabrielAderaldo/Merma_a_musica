// domain/events.gleam — Domain Events (só eventos)

import game_engine/domain/types/match_states.{
  type ActiveMatch, type FinishedMatch,
}
import game_engine/domain/types/results.{type Highlights, type RankingEntry}
import game_engine/domain/types/round.{type ActiveRound, type EndedRound}
import game_engine/domain/types/tiebreaker.{type TiebreakerInfo}
import gleam/dict.{type Dict}

pub type MatchEvent {
  MatchStarted(match: ActiveMatch)
  RoundStarted(match: ActiveMatch, round: ActiveRound)
  AnswerProcessed(
    match: ActiveMatch,
    player_id: String,
    is_correct: Bool,
    points_earned: Int,
  )
  RoundCompleted(
    match: ActiveMatch,
    round: EndedRound,
    scores: Dict(String, Int),
  )
  MatchCompleted(
    match: FinishedMatch,
    final_scores: Dict(String, Int),
    ranking: List(RankingEntry),
    highlights: Highlights,
  )
  TiebreakerNeeded(tiebreaker: TiebreakerInfo)
}
