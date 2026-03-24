// channel/room_handler.gleam — Handler de Eventos WebSocket
//
// Conecta o Phoenix Channel ao Room Server GenServer.
// Cada handler decodifica payload → chama GenServer → retorna HandlerResult.
// Broadcasts voltam via PubSub → room_channel.ex trata diretamente.

import gleam/dynamic.{type Dynamic}
import gleam/dynamic/decode
import gleam/list
import gleam/option.{None}
import phoenix_bridge
import phoenix_bridge/types.{
  type HandlerResult, type InfoResult, type MatchConfigPayload,
  type OutboundEvent, type PlayerPayload,
  HandlerError, InfoNoReply, NoReply,
  MatchConfigPayload, PlayerPayload, RoomStateEvent, RoomStatePayload,
  ScoringSimple, Song, SongRangePayload, StatusConnected,
}

// ═══════════════════════════════════════════════════════════════
// CHANNEL STATE
// ═══════════════════════════════════════════════════════════════

pub type ChannelState {
  ChannelState(
    invite_code: String,
    player_uuid: String,
    nickname: String,
  )
}

// ═══════════════════════════════════════════════════════════════
// JOIN
// ═══════════════════════════════════════════════════════════════

pub fn handle_join(
  invite_code: String,
  params: Dynamic,
) -> Result(#(OutboundEvent, ChannelState), String) {
  let params_decoder = {
    use player_uuid <- decode.field("player_uuid", decode.string)
    use nickname <- decode.field("nickname", decode.string)
    decode.success(#(player_uuid, nickname))
  }

  case decode.run(params, params_decoder) {
    Error(_) -> Error("missing player_uuid or nickname")
    Ok(#(player_uuid, nickname)) -> {
      // Registrar jogador no Room GenServer
      let command =
        phoenix_bridge.to_dynamic(#("join", player_uuid, nickname))
      case phoenix_bridge.call_room(invite_code, command) {
        Error(reason) -> Error(reason)
        Ok(_) -> {
          // Buscar estado completo para enviar ao jogador
          case phoenix_bridge.get_room_state(invite_code) {
            Error(reason) -> Error(reason)
            Ok(room_state) -> {
              let event = build_room_state_event(room_state)
              let state =
                ChannelState(invite_code:, player_uuid:, nickname:)
              Ok(#(event, state))
            }
          }
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// EVENT DISPATCHER
// ═══════════════════════════════════════════════════════════════

pub fn handle_event(
  event: String,
  payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  case event {
    "player_ready" -> call_simple(state, #("set_ready", state.player_uuid, True))
    "player_unready" -> call_simple(state, #("set_ready", state.player_uuid, False))
    "configure_match" -> handle_configure_match(payload, state)
    "start_game" -> call_simple(state, #("start_game", state.player_uuid))
    "submit_answer" -> handle_submit_answer(payload, state)
    "vote_skip" -> NoReply(state)
    "select_playlist" -> handle_select_playlist(payload, state)
    "player_leave" -> call_simple(state, #("leave", state.player_uuid))
    "autocomplete_search" -> NoReply(state)
    _ -> HandlerError("unknown_event", "Unknown event: " <> event, state)
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLE_INFO — PubSub é tratado no room_channel.ex diretamente
// ═══════════════════════════════════════════════════════════════

pub fn handle_info(
  _message: Dynamic,
  state: ChannelState,
) -> InfoResult(ChannelState) {
  InfoNoReply(state)
}

// ═══════════════════════════════════════════════════════════════
// TERMINATE
// ═══════════════════════════════════════════════════════════════

pub fn handle_terminate(
  _reason: Dynamic,
  state: ChannelState,
) -> Nil {
  let now_ms = get_now_ms()
  let command =
    phoenix_bridge.to_dynamic(#("disconnect", state.player_uuid, now_ms))
  let _ = phoenix_bridge.call_room(state.invite_code, command)
  Nil
}

// ═══════════════════════════════════════════════════════════════
// COMMAND HELPERS
// ═══════════════════════════════════════════════════════════════

/// Comando simples: converter para Dynamic, enviar, retornar NoReply ou erro.
fn call_simple(
  state: ChannelState,
  command: a,
) -> HandlerResult(ChannelState) {
  case phoenix_bridge.call_room(state.invite_code, phoenix_bridge.to_dynamic(command)) {
    Ok(_) -> NoReply(state)
    Error(reason) -> HandlerError("command_failed", reason, state)
  }
}

fn handle_configure_match(
  payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  let decoder = {
    use time_per_round <- decode.optional_field("time_per_round", 30, decode.int)
    use total_songs <- decode.optional_field("total_songs", 10, decode.int)
    use answer_type <- decode.optional_field("answer_type", "song", decode.string)
    use allow_repeats <- decode.optional_field("allow_repeats", False, decode.bool)
    use scoring_rule <- decode.optional_field("scoring_rule", "simple", decode.string)
    decode.success(#(time_per_round, total_songs, answer_type, allow_repeats, scoring_rule))
  }

  case decode.run(payload, decoder) {
    Error(_) -> HandlerError("invalid_payload", "Invalid config", state)
    Ok(config) ->
      call_simple(state, #("configure", state.player_uuid, config))
  }
}

fn handle_submit_answer(
  payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  let decoder = {
    use answer_text <- decode.field("answer_text", decode.string)
    use time_ms <- decode.optional_field("time_ms", 0, decode.int)
    decode.success(#(answer_text, time_ms))
  }

  case decode.run(payload, decoder) {
    Error(_) -> HandlerError("invalid_payload", "Missing answer_text", state)
    Ok(#(answer_text, time_ms)) ->
      call_simple(
        state,
        #("submit_answer", state.player_uuid, answer_text, time_ms),
      )
  }
}

fn handle_select_playlist(
  payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  let decoder = {
    use playlist_id <- decode.field("playlist_id", decode.string)
    use platform <- decode.field("platform", decode.string)
    decode.success(#(playlist_id, platform))
  }

  case decode.run(payload, decoder) {
    Error(_) ->
      HandlerError("invalid_payload", "Missing playlist_id or platform", state)
    Ok(#(playlist_id, platform)) ->
      call_simple(
        state,
        #("select_playlist", state.player_uuid, playlist_id, platform),
      )
  }
}

// ═══════════════════════════════════════════════════════════════
// BUILD ROOM STATE EVENT
// ═══════════════════════════════════════════════════════════════

fn build_room_state_event(room_state: Dynamic) -> OutboundEvent {
  let room_id = decode_at_string(room_state, 1, "")
  let invite_code = decode_at_string(room_state, 2, "")
  let host_id = decode_at_string(room_state, 3, "")
  let players = decode_players(room_state)
  let config = decode_config(room_state)
  let player_count = list.length(players)
  let with_playlist =
    list.count(players, fn(p) { p.has_playlist })

  RoomStateEvent(RoomStatePayload(
    room_id: room_id,
    invite_code: invite_code,
    state: "waiting",
    host_player_uuid: host_id,
    config: config,
    players: players,
    song_range: SongRangePayload(
      min: 1,
      max: 5,
      current_players: player_count,
      players_with_playlist: with_playlist,
    ),
  ))
}

fn decode_at_string(data: Dynamic, index: Int, default: String) -> String {
  case decode.run(data, decode.at([index], decode.string)) {
    Ok(val) -> val
    Error(_) -> default
  }
}

fn decode_players(room_state: Dynamic) -> List(PlayerPayload) {
  case decode.run(room_state, decode.at([4], decode.list(decode.dynamic))) {
    Ok(items) -> list.filter_map(items, decode_player)
    Error(_) -> []
  }
}

fn decode_player(data: Dynamic) -> Result(PlayerPayload, Nil) {
  // PlayerInRoom: {:player_in_room, id, nickname, playlist, ready, connection, platform}
  let id_result = decode.run(data, decode.at([1], decode.string))
  let nick_result = decode.run(data, decode.at([2], decode.string))
  let ready_result = decode.run(data, decode.at([4], decode.bool))

  case id_result, nick_result, ready_result {
    Ok(id), Ok(nick), Ok(ready) ->
      Ok(PlayerPayload(
        player_uuid: id,
        nickname: nick,
        is_host: False,
        ready: ready,
        connection_status: StatusConnected,
        has_playlist: False,
        platform: None,
      ))
    _, _, _ -> Error(Nil)
  }
}

fn decode_config(room_state: Dynamic) -> MatchConfigPayload {
  // RoomConfig no index 6: {:room_config, time, songs, answer, repeats, scoring}
  case decode.run(room_state, decode.at([6], decode.dynamic)) {
    Ok(config) -> {
      let time = case decode.run(config, decode.at([1], decode.int)) {
        Ok(v) -> v
        Error(_) -> 30
      }
      let songs = case decode.run(config, decode.at([2], decode.int)) {
        Ok(v) -> v
        Error(_) -> 10
      }
      MatchConfigPayload(
        time_per_round: time,
        total_songs: songs,
        answer_type: Song,
        allow_repeats: False,
        scoring_rule: ScoringSimple,
      )
    }
    Error(_) ->
      MatchConfigPayload(
        time_per_round: 30,
        total_songs: 10,
        answer_type: Song,
        allow_repeats: False,
        scoring_rule: ScoringSimple,
      )
  }
}

// ═══════════════════════════════════════════════════════════════
// FFI
// ═══════════════════════════════════════════════════════════════

@external(erlang, "phoenix_bridge_backend", "get_now_ms")
fn get_now_ms() -> Int
