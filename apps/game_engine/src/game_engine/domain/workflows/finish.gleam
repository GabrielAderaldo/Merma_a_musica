// domain/workflows/finish.gleam — Workflow: ActiveMatch → FinishedMatch

import game_engine/domain/errors.{type FinishError}
import game_engine/domain/events.{
  type MatchEvent, MatchCompleted, TiebreakerNeeded,
}
import game_engine/domain/services/highlights
import game_engine/domain/types/match_states.{
  type ActiveMatch, type FinishedMatch, FinishedMatch,
}
import game_engine/domain/types/media.{type Song}
import game_engine/domain/types/player.{type Player}
import game_engine/domain/types/results.{type RankingEntry, RankingEntry}
import game_engine/domain/types/round.{type EndedRound}
import game_engine/domain/types/tiebreaker.{type TiebreakerInfo, TiebreakerInfo}
import gleam/dict
import gleam/int
import gleam/list
import gleam/order

/// Encerrar partida. Detecta empate → TiebreakerNeeded ou MatchCompleted.
pub fn end_match(match: ActiveMatch) -> Result(MatchEvent, FinishError) {
  let scores = build_scores(match.players)
  let ranking = highlights.build_ranking(match.players, match.ended_rounds)
  let hl = highlights.build(match.players, match.ended_rounds)

  let top = find_top_score(match.players)
  let tied = list.filter(match.players, fn(p) { p.score == top })

  case list.length(tied) > 1 {
    False -> {
      let finished =
        FinishedMatch(
          match.id,
          match.config,
          match.players,
          match.ended_rounds,
          match.songs,
        )
      Ok(MatchCompleted(finished, scores, ranking, hl))
    }
    True -> {
      let tied_ids = list.map(tied, fn(p) { p.id })
      let missed = find_songs_all_missed(tied_ids, match.ended_rounds)
      let played_ids = list.map(match.songs, fn(s) { s.id })
      let non_tied =
        list.filter(match.players, fn(p) { !list.contains(tied_ids, p.id) })
      let from_others = collect_unplayed(non_tied, played_ids)
      let partial =
        list.filter(ranking, fn(r) { !list.contains(tied_ids, r.player_id) })
      Ok(
        TiebreakerNeeded(TiebreakerInfo(
          match,
          tied_ids,
          top,
          missed,
          from_others,
          partial,
          hl,
        )),
      )
    }
  }
}

/// Resolver desempate após rodada extra.
pub fn resolve_tiebreaker(
  tiebreaker: TiebreakerInfo,
  winner_id: String,
) -> MatchEvent {
  let match = tiebreaker.match
  let tied =
    list.filter(match.players, fn(p) {
      list.contains(tiebreaker.tied_player_ids, p.id)
    })
  let above = list.length(tiebreaker.partial_ranking)
  let sorted = sort_tied(tied, winner_id, match.ended_rounds)

  let tied_ranking =
    list.index_map(sorted, fn(p, i) {
      let stats = highlights.player_stats(p.id, match.ended_rounds)
      RankingEntry(
        above + i + 1,
        p.id,
        p.name,
        p.score,
        stats.correct,
        stats.avg_time,
      )
    })

  let full_ranking = list.append(tiebreaker.partial_ranking, tied_ranking)
  let scores = build_scores(match.players)
  let finished =
    FinishedMatch(
      match.id,
      match.config,
      match.players,
      match.ended_rounds,
      match.songs,
    )
  MatchCompleted(finished, scores, full_ranking, tiebreaker.highlights)
}

// ─── Internals ───

fn build_scores(players: List(Player)) -> dict.Dict(String, Int) {
  list.fold(players, dict.new(), fn(acc, p) { dict.insert(acc, p.id, p.score) })
}

fn find_top_score(players: List(Player)) -> Int {
  list.fold(players, 0, fn(max, p) {
    case p.score > max {
      True -> p.score
      False -> max
    }
  })
}

fn find_songs_all_missed(
  ids: List(String),
  rounds: List(EndedRound),
) -> List(Song) {
  list.filter_map(rounds, fn(round) {
    let all_missed =
      list.all(ids, fn(pid) {
        case dict.get(round.answers, pid) {
          Error(_) -> True
          Ok(a) -> !a.is_correct
        }
      })
    case all_missed {
      True -> Ok(round.song)
      False -> Error(Nil)
    }
  })
}

fn collect_unplayed(
  players: List(Player),
  played_ids: List(String),
) -> List(Song) {
  list.flat_map(players, fn(p) {
    list.filter(p.playlist.tracks, fn(s) { !list.contains(played_ids, s.id) })
  })
}

fn sort_tied(
  tied: List(Player),
  winner_id: String,
  rounds: List(EndedRound),
) -> List(Player) {
  list.sort(tied, fn(a, b) {
    case a.id == winner_id, b.id == winner_id {
      True, False -> order.Lt
      False, True -> order.Gt
      _, _ ->
        int.compare(
          highlights.calculate_streak(b.id, rounds),
          highlights.calculate_streak(a.id, rounds),
        )
    }
  })
}
