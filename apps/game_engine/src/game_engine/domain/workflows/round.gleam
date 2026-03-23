// domain/workflows/round.gleam — Workflow: Rodadas (ActiveMatch → ActiveMatch)

import game_engine/domain/errors.{
  type RoundError, NoMoreRounds, RoundPlayerNotFound,
}
import game_engine/domain/events.{
  type MatchEvent, AnswerProcessed, RoundCompleted, RoundStarted,
}
import game_engine/domain/services/scoring
import game_engine/domain/services/validation
import game_engine/domain/types/answer.{Answer}
import game_engine/domain/types/match_states.{type ActiveMatch, ActiveMatch}
import game_engine/domain/types/player.{type Player, Answered, Player, Ready}
import game_engine/domain/types/round.{
  type ActiveRound, type EndedRound, ActiveRound, EndedRound,
}
import gleam/dict
import gleam/list
import gleam/option.{None, Some}
import gleam/result

/// Iniciar próxima rodada.
pub fn start_round(match: ActiveMatch) -> Result(MatchEvent, RoundError) {
  case get_active_round(match) {
    None -> Error(NoMoreRounds)
    Some(round) -> {
      let players = list.map(match.players, fn(p) { Player(..p, state: Ready) })
      Ok(RoundStarted(ActiveMatch(..match, players:), round))
    }
  }
}

/// Submeter resposta — pipeline.
pub fn submit_answer(
  match: ActiveMatch,
  player_id: String,
  answer_text: String,
  response_time: Float,
) -> Result(MatchEvent, RoundError) {
  get_active_round(match)
  |> option_to_result(NoMoreRounds)
  |> result.try(fn(round) { validate_player(match, player_id, round) })
  |> result.try(fn(ctx) { process_answer(ctx, answer_text, response_time) })
}

/// Todos responderam?
pub fn all_answered(match: ActiveMatch) -> Bool {
  case get_active_round(match) {
    None -> False
    Some(round) -> dict.size(round.answers) >= list.length(match.players)
  }
}

/// Encerrar rodada: ActiveRound → EndedRound.
pub fn end_round(match: ActiveMatch) -> Result(MatchEvent, RoundError) {
  case get_active_round(match) {
    None -> Error(NoMoreRounds)
    Some(round) -> {
      let ended =
        EndedRound(round.index, round.song, round.answers, round.contributed_by)
      let new_ended = list.append(match.ended_rounds, [ended])
      let updated_players = accumulate_scores(match.players, ended)
      let scores = build_scores(updated_players)
      let updated =
        ActiveMatch(
          ..match,
          ended_rounds: new_ended,
          players: updated_players,
          current_round_index: match.current_round_index + 1,
        )
      Ok(RoundCompleted(updated, ended, scores))
    }
  }
}

/// É a última rodada?
pub fn is_last_round(match: ActiveMatch) -> Bool {
  match.current_round_index >= list.length(match.active_rounds) - 1
}

// ─── Internals ───

type AnswerCtx {
  AnswerCtx(match: ActiveMatch, round: ActiveRound, player_id: String)
}

fn get_active_round(match: ActiveMatch) -> option.Option(ActiveRound) {
  list_at(match.active_rounds, match.current_round_index)
}

fn option_to_result(opt: option.Option(a), err: e) -> Result(a, e) {
  case opt {
    Some(v) -> Ok(v)
    None -> Error(err)
  }
}

fn validate_player(
  match: ActiveMatch,
  pid: String,
  round: ActiveRound,
) -> Result(AnswerCtx, RoundError) {
  case list.find(match.players, fn(p) { p.id == pid }) {
    Error(_) -> Error(RoundPlayerNotFound(pid))
    Ok(_) -> Ok(AnswerCtx(match, round, pid))
  }
}

fn process_answer(
  ctx: AnswerCtx,
  text: String,
  time: Float,
) -> Result(MatchEvent, RoundError) {
  let res =
    validation.check_answer_detailed(
      text,
      ctx.round.song,
      ctx.match.config.answer_type,
    )
  let pts = scoring.calculate_points(res.is_correct, time, ctx.match.config)
  let answer =
    Answer(
      text:,
      answer_time: time,
      is_correct: res.is_correct,
      is_near_miss: res.is_near_miss,
      points: pts,
    )

  let updated_round =
    ActiveRound(
      ..ctx.round,
      answers: dict.insert(ctx.round.answers, ctx.player_id, answer),
    )
  let updated_rounds =
    update_at(
      ctx.match.active_rounds,
      ctx.match.current_round_index,
      updated_round,
    )
  let updated_players =
    list.map(ctx.match.players, fn(p) {
      case p.id == ctx.player_id {
        True -> Player(..p, state: Answered)
        False -> p
      }
    })

  Ok(AnswerProcessed(
    ActiveMatch(
      ..ctx.match,
      active_rounds: updated_rounds,
      players: updated_players,
    ),
    ctx.player_id,
    res.is_correct,
    pts,
  ))
}

fn accumulate_scores(players: List(Player), round: EndedRound) -> List(Player) {
  list.map(players, fn(p) {
    case dict.get(round.answers, p.id) {
      Ok(a) -> Player(..p, score: p.score + a.points)
      Error(_) -> p
    }
  })
}

fn build_scores(players: List(Player)) -> dict.Dict(String, Int) {
  list.fold(players, dict.new(), fn(acc, p) { dict.insert(acc, p.id, p.score) })
}

fn update_at(
  items: List(ActiveRound),
  index: Int,
  new: ActiveRound,
) -> List(ActiveRound) {
  list.index_map(items, fn(item, i) {
    case i == index {
      True -> new
      False -> item
    }
  })
}

fn list_at(items: List(a), index: Int) -> option.Option(a) {
  case index < 0 {
    True -> None
    False -> list_at_loop(items, index, 0)
  }
}

fn list_at_loop(items: List(a), target: Int, current: Int) -> option.Option(a) {
  case items {
    [] -> None
    [first, ..rest] ->
      case current == target {
        True -> Some(first)
        False -> list_at_loop(rest, target, current + 1)
      }
  }
}
