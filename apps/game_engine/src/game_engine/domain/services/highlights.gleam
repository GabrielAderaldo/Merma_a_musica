// domain/services/highlights.gleam — Domain Service: Destaques e Ranking

import game_engine/domain/types/answer.{type Answer}
import game_engine/domain/types/player.{type Player}
import game_engine/domain/types/results.{
  type HighlightFastest, type HighlightMostCorrect, type HighlightNearMiss,
  type HighlightStreak, type Highlights, type RankingEntry, HighlightFastest,
  HighlightMostCorrect, HighlightNearMiss, HighlightStreak, Highlights,
  RankingEntry,
}
import game_engine/domain/types/round.{type EndedRound}
import gleam/dict
import gleam/int
import gleam/list

pub type PlayerStats {
  PlayerStats(correct: Int, avg_time: Float)
}

pub fn build(players: List(Player), rounds: List(EndedRound)) -> Highlights {
  Highlights(
    best_streak: find_best_streak(players, rounds),
    fastest_answer: find_fastest_answer(players, rounds),
    most_correct: find_most_correct(players, rounds),
    near_miss: find_most_near_misses(players, rounds),
  )
}

pub fn build_ranking(
  players: List(Player),
  rounds: List(EndedRound),
) -> List(RankingEntry) {
  players
  |> list.sort(fn(a, b) { int.compare(b.score, a.score) })
  |> list.index_map(fn(p, index) {
    let stats = player_stats(p.id, rounds)
    RankingEntry(
      index + 1,
      p.id,
      p.name,
      p.score,
      stats.correct,
      stats.avg_time,
    )
  })
}

pub fn player_stats(player_id: String, rounds: List(EndedRound)) -> PlayerStats {
  let #(correct, total_time, count) =
    list.fold(rounds, #(0, 0.0, 0), fn(acc, round) {
      let #(c, t, n) = acc
      case dict.get(round.answers, player_id) {
        Ok(a) ->
          case a.is_correct {
            True -> #(c + 1, t +. a.answer_time, n + 1)
            False -> acc
          }
        Error(_) -> acc
      }
    })
  let avg = case count {
    0 -> 0.0
    _ -> total_time /. int.to_float(count)
  }
  PlayerStats(correct:, avg_time: avg)
}

pub fn calculate_streak(player_id: String, rounds: List(EndedRound)) -> Int {
  let #(max_s, _) =
    list.fold(rounds, #(0, 0), fn(acc, round) {
      let #(best, cur) = acc
      case dict.get(round.answers, player_id) {
        Ok(a) ->
          case a.is_correct {
            True -> {
              let new = cur + 1
              #(int.max(best, new), new)
            }
            False -> #(best, 0)
          }
        Error(_) -> #(best, 0)
      }
    })
  max_s
}

fn find_best_streak(
  players: List(Player),
  rounds: List(EndedRound),
) -> HighlightStreak {
  list.fold(players, HighlightStreak("", "", 0), fn(best, p) {
    let s = calculate_streak(p.id, rounds)
    case s > best.streak {
      True -> HighlightStreak(p.id, p.name, s)
      False -> best
    }
  })
}

fn find_fastest_answer(
  players: List(Player),
  rounds: List(EndedRound),
) -> HighlightFastest {
  list.fold(rounds, HighlightFastest("", "", 0.0, ""), fn(best, round) {
    list.fold(players, best, fn(cur, p) {
      case dict.get(round.answers, p.id) {
        Ok(a) ->
          case a.is_correct {
            True -> {
              let faster = cur.player_id == "" || a.answer_time <. cur.time
              case faster {
                True ->
                  HighlightFastest(p.id, p.name, a.answer_time, round.song.name)
                False -> cur
              }
            }
            False -> cur
          }
        Error(_) -> cur
      }
    })
  })
}

fn find_most_correct(
  players: List(Player),
  rounds: List(EndedRound),
) -> HighlightMostCorrect {
  list.fold(players, HighlightMostCorrect("", "", 0), fn(best, p) {
    let c = count_field(p.id, rounds, fn(a) { a.is_correct })
    case c > best.count {
      True -> HighlightMostCorrect(p.id, p.name, c)
      False -> best
    }
  })
}

fn find_most_near_misses(
  players: List(Player),
  rounds: List(EndedRound),
) -> HighlightNearMiss {
  list.fold(players, HighlightNearMiss("", "", 0), fn(best, p) {
    let c = count_field(p.id, rounds, fn(a) { a.is_near_miss })
    case c > best.count {
      True -> HighlightNearMiss(p.id, p.name, c)
      False -> best
    }
  })
}

fn count_field(
  player_id: String,
  rounds: List(EndedRound),
  check: fn(Answer) -> Bool,
) -> Int {
  list.fold(rounds, 0, fn(count, round) {
    case dict.get(round.answers, player_id) {
      Ok(a) ->
        case check(a) {
          True -> count + 1
          False -> count
        }
      Error(_) -> count
    }
  })
}
