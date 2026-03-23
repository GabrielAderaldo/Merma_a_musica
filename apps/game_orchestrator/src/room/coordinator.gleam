// room/coordinator.gleam — Bridge Sala ↔ Game Engine
//
// ÚNICO módulo que conhece AMBOS os domínios (sala + engine).
// Traduz estado da sala → chama Engine via engine_bridge → traduz resultado → efeitos.
//
// Usa engine_bridge para toda interação com o Engine (outro package Gleam no mesmo BEAM).
// O Engine é puro — o Coordinator adiciona os side effects (timers, broadcasts).

import audio/token
import gleam/dict.{type Dict}
import gleam/dynamic
import gleam/list
import gleam/option
import room/effects.{
  type Effect,
  AnswerConfirmedPayload, Broadcast,
  CountdownEvent, GameEndedPayload,
  RoundEndedPayload, RoundStartingPayload,
  ScheduleTimer, TextPayload, TiebreakerStartingPayload,
}
import room/engine_bridge
import room/state.{
  type RoomState, InMatch, PlayerInRoom, RoomState, ShowingResults, Waiting,
}

/// Resultado do coordinator que inclui novo RoomState + efeitos.
pub type CoordinatorResult {
  CoordinatorOk(room: RoomState, effects: List(Effect))
  CoordinatorError(room: RoomState, code: String, message: String)
}

// ═══════════════════════════════════════════════════════════════
// START GAME — Coletar playlists, selecionar músicas, iniciar Engine
// ═══════════════════════════════════════════════════════════════

/// Chamado pelo Process.ex quando o timer "start_engine" dispara (3s após game_starting).
/// Coleta playlists dos jogadores → chama Engine → retorna efeitos de round_starting.
pub fn start_game(room: RoomState) -> CoordinatorResult {
  let players_with_playlist =
    list.filter(room.players, fn(p) { option.is_some(p.playlist) })

  case list.is_empty(players_with_playlist) {
    True ->
      CoordinatorError(
        room,
        "not_enough_songs",
        "Nenhum jogador tem playlist importada.",
      )
    False -> {
      case
        engine_bridge.start_game(room.id, room.config, players_with_playlist)
      {
        Ok(result) -> {
          // Gerar audio token para a primeira rodada
          let audio_token = token.generate_token(result.preview_url)

          // Atualizar room com match_state
          let new_room =
            RoomState(
              ..room,
              phase: InMatch,
              match_state: option.Some(result.match_state),
            )

          CoordinatorOk(new_room, [
            Broadcast(
              "round_starting",
              RoundStartingPayload(
                round_index: result.round_index,
                total_rounds: result.total_rounds,
                audio_token: audio_token,
                grace_period_seconds: 3,
              ),
            ),
            ScheduleTimer(3000, "grace_period_end"),
          ])
        }
        Error(msg) -> CoordinatorError(room, "engine_error", msg)
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// ROUND LIFECYCLE — Grace period → Timer → End round
// ═══════════════════════════════════════════════════════════════

/// Grace period acabou → timer oficial começa.
pub fn grace_period_ended(room: RoomState) -> CoordinatorResult {
  let duration = room.config.time_per_round
  CoordinatorOk(room, [
    Broadcast("timer_started", CountdownEvent(duration)),
    ScheduleTimer(duration * 1000, "round_timer_end"),
  ])
}

/// Timer da rodada acabou → encerrar rodada via Engine.
pub fn round_timer_ended(room: RoomState) -> CoordinatorResult {
  case room.match_state {
    option.None ->
      CoordinatorError(room, "no_match", "Nenhuma partida em andamento.")
    option.Some(match_state) -> {
      case engine_bridge.end_round(match_state) {
        engine_bridge.EndRoundOk(
          new_match,
          ended_round,
          scores,
          has_more_rounds,
        ) -> {
          // Extrair dados da rodada para broadcast
          let round_data = engine_bridge.extract_ended_round(ended_round)

          // Converter scores Dynamic para Dict
          let scores_dict = unsafe_coerce_scores(scores)

          let new_room =
            RoomState(..room, match_state: option.Some(new_match))

          let round_ended_effect =
            Broadcast(
              "round_ended",
              RoundEndedPayload(
                round_index: round_data.0,
                song_name: round_data.1,
                artist_name: round_data.2,
                album_title: round_data.3,
                cover_url: round_data.4,
                contributed_by: round_data.5,
                answers: round_data.6,
                scores: scores_dict,
                next_round_in_seconds: 3,
              ),
            )

          case has_more_rounds {
            True ->
              CoordinatorOk(new_room, [
                round_ended_effect,
                ScheduleTimer(3000, "next_round"),
              ])
            False ->
              CoordinatorOk(new_room, [
                round_ended_effect,
                ScheduleTimer(3000, "match_ended"),
              ])
          }
        }
        engine_bridge.EndRoundError(msg) ->
          CoordinatorError(room, "engine_error", msg)
      }
    }
  }
}

/// Pausa entre rodadas acabou → iniciar próxima rodada via Engine.
pub fn next_round(room: RoomState) -> CoordinatorResult {
  case room.match_state {
    option.None ->
      CoordinatorError(room, "no_match", "Nenhuma partida em andamento.")
    option.Some(match_state) -> {
      case engine_bridge.next_round(match_state) {
        engine_bridge.NextRoundOk(
          new_match,
          round_index,
          total_rounds,
          preview_url,
          _contributed_by,
          _song_name,
          _artist_name,
        ) -> {
          let audio_token = token.generate_token(preview_url)
          let new_room =
            RoomState(..room, match_state: option.Some(new_match))

          CoordinatorOk(new_room, [
            Broadcast(
              "round_starting",
              RoundStartingPayload(
                round_index: round_index,
                total_rounds: total_rounds,
                audio_token: audio_token,
                grace_period_seconds: 3,
              ),
            ),
            ScheduleTimer(3000, "grace_period_end"),
          ])
        }
        engine_bridge.NextRoundError(msg) ->
          CoordinatorError(room, "engine_error", msg)
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SUBMIT ANSWER — Encaminhar ao Engine
// ═══════════════════════════════════════════════════════════════

/// Jogador envia resposta → Engine processa → broadcast resultado.
/// Se todos responderam, encerra rodada antecipadamente.
pub fn submit_answer(
  room: RoomState,
  player_id: String,
  answer_text: String,
  response_time: Float,
) -> CoordinatorResult {
  case room.match_state {
    option.None ->
      CoordinatorError(room, "no_match", "Nenhuma partida em andamento.")
    option.Some(match_state) -> {
      case
        engine_bridge.submit_answer(
          match_state,
          player_id,
          answer_text,
          response_time,
        )
      {
        engine_bridge.SubmitOk(
          new_match,
          pid,
          _is_correct,
          _points,
          all_answered,
        ) -> {
          let new_room =
            RoomState(..room, match_state: option.Some(new_match))

          // Broadcast confirmação (sem revelar se está correto — anti-cheat)
          let effects = [
            Broadcast("answer_confirmed", AnswerConfirmedPayload(pid)),
          ]

          case all_answered {
            True -> {
              // Todos responderam → encerrar rodada imediatamente
              // Disparar round_timer_ended que faz o end_round
              end_round_early(new_room, effects)
            }
            False -> CoordinatorOk(new_room, effects)
          }
        }
        engine_bridge.SubmitError(msg) ->
          CoordinatorError(room, "engine_error", msg)
      }
    }
  }
}

/// Encerrar rodada antecipadamente (todos responderam).
/// Chama end_round diretamente em vez de esperar o timer.
fn end_round_early(
  room: RoomState,
  prior_effects: List(Effect),
) -> CoordinatorResult {
  case room.match_state {
    option.None -> CoordinatorOk(room, prior_effects)
    option.Some(match_state) -> {
      case engine_bridge.end_round(match_state) {
        engine_bridge.EndRoundOk(
          new_match,
          ended_round,
          scores,
          has_more_rounds,
        ) -> {
          let round_data = engine_bridge.extract_ended_round(ended_round)
          let scores_dict = unsafe_coerce_scores(scores)
          let new_room =
            RoomState(..room, match_state: option.Some(new_match))

          let round_ended_effect =
            Broadcast(
              "round_ended",
              RoundEndedPayload(
                round_index: round_data.0,
                song_name: round_data.1,
                artist_name: round_data.2,
                album_title: round_data.3,
                cover_url: round_data.4,
                contributed_by: round_data.5,
                answers: round_data.6,
                scores: scores_dict,
                next_round_in_seconds: 3,
              ),
            )

          let next_timer = case has_more_rounds {
            True -> ScheduleTimer(3000, "next_round")
            False -> ScheduleTimer(3000, "match_ended")
          }

          CoordinatorOk(
            new_room,
            list.append(prior_effects, [round_ended_effect, next_timer]),
          )
        }
        engine_bridge.EndRoundError(_) ->
          // Se end_round falhar após all_answered, retornar apenas os efeitos anteriores
          CoordinatorOk(room, prior_effects)
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// END MATCH — Finalizar e voltar ao lobby
// ═══════════════════════════════════════════════════════════════

/// Partida acabou → chamar Engine end_match → mostrar resultados.
pub fn match_ended(room: RoomState) -> CoordinatorResult {
  case room.match_state {
    option.None -> {
      // Sem match state — apenas voltar ao lobby
      let new_room = RoomState(..room, phase: ShowingResults)
      CoordinatorOk(new_room, [ScheduleTimer(15_000, "return_to_lobby")])
    }
    option.Some(match_state) -> {
      case engine_bridge.end_match(match_state) {
        engine_bridge.MatchCompleted(
          finished_match,
          final_scores,
          ranking,
          highlights,
        ) -> {
          let scores_dict = unsafe_coerce_scores(final_scores)
          let ranking_data = engine_bridge.extract_ranking(ranking)
          let highlights_data = engine_bridge.extract_highlights(highlights)

          let new_room =
            RoomState(
              ..room,
              phase: ShowingResults,
              match_state: option.Some(finished_match),
            )

          CoordinatorOk(new_room, [
            Broadcast(
              "game_ended",
              GameEndedPayload(
                final_scores: scores_dict,
                ranking: ranking_data,
                highlights: highlights_data,
                return_to_lobby_in_seconds: 15,
              ),
            ),
            ScheduleTimer(15_000, "return_to_lobby"),
          ])
        }

        engine_bridge.TiebreakerNeeded(
          tiebreaker_info,
          tied_player_ids,
          tied_score,
        ) -> {
          // Armazenar tiebreaker info no match_state para handle_tiebreaker
          let new_room =
            RoomState(
              ..room,
              match_state: option.Some(tiebreaker_info),
            )

          CoordinatorOk(new_room, [
            Broadcast(
              "tiebreaker_starting",
              TiebreakerStartingPayload(
                tied_player_ids: tied_player_ids,
                tied_score: tied_score,
                grace_period_seconds: 3,
              ),
            ),
            ScheduleTimer(3000, "tiebreaker_grace_end"),
          ])
        }

        engine_bridge.EndMatchError(msg) ->
          CoordinatorError(room, "engine_error", msg)
      }
    }
  }
}

/// Voltar ao lobby após mostrar resultados.
pub fn return_to_lobby(room: RoomState) -> CoordinatorResult {
  let reset_players =
    list.map(room.players, fn(p) { PlayerInRoom(..p, ready: False) })
  let new_room =
    RoomState(
      ..room,
      phase: Waiting,
      players: reset_players,
      match_state: option.None,
    )
  CoordinatorOk(new_room, [
    Broadcast("returned_to_lobby", TextPayload("lobby")),
  ])
}

// ═══════════════════════════════════════════════════════════════
// TIEBREAKER — Gol de Ouro
// ═══════════════════════════════════════════════════════════════

/// Engine retornou TiebreakerNeeded → preparar rodada extra.
/// O tiebreaker_info está armazenado em room.match_state (como Dynamic).
/// A rodada extra é gerenciada pelo Orchestrator:
/// - Escolhe música do pool (songs_both_missed ou songs_from_others)
/// - Roda como rodada normal
/// - Após encerrar, chama resolve_tiebreaker com o vencedor
pub fn handle_tiebreaker(room: RoomState) -> CoordinatorResult {
  // Por enquanto, o tiebreaker usa o mesmo fluxo de grace_period.
  // O Process.ex dispara "tiebreaker_grace_end" que chama grace_period_ended.
  // A rodada de tiebreaker roda como uma rodada normal.
  // Quando round_timer_ended for chamado, precisamos detectar que é tiebreaker
  // e chamar resolve_tiebreaker em vez de end_match.
  //
  // TODO: Implementar detecção de rodada de tiebreaker e resolução.
  // Por enquanto, o tiebreaker funciona como rodada extra normal.
  CoordinatorOk(room, [
    Broadcast(
      "tiebreaker_starting",
      CountdownEvent(3),
    ),
    ScheduleTimer(3000, "tiebreaker_grace_end"),
  ])
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/// Identity function para coerção de tipos (Erlang runtime — sem overhead).
@external(erlang, "gleam_stdlib", "identity")
fn coerce(value: a) -> b

/// Converter Dynamic scores para Dict(String, Int).
/// O Engine retorna um Map Erlang nativo (Dict Gleam compila para map).
fn unsafe_coerce_scores(scores: dynamic.Dynamic) -> Dict(String, Int) {
  coerce(scores)
}
