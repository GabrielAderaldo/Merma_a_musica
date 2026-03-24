// http/room_handler.gleam — Handler REST: Salas
//
// Chamado por: RoomController → :http@room_handler.*
// Cria salas via Registry, consulta estado, retorna dados de conexão WS.

import gleam/dynamic.{type Dynamic}
import gleam/dynamic/decode
import gleam/list
import phoenix_bridge
import phoenix_bridge/types.{type HttpResponse, HttpError, HttpOk}
import room/registry

/// Response body para POST /rooms
pub type RoomCreatedBody {
  RoomCreatedBody(
    room_id: String,
    invite_code: String,
    invite_link: String,
    host_player_uuid: String,
    websocket_url: String,
    websocket_topic: String,
  )
}

/// Response body para GET /rooms/:code
pub type RoomInfoBody {
  RoomInfoBody(
    room_id: String,
    invite_code: String,
    state: String,
    player_count: Int,
    max_players: Int,
    host_nickname: String,
  )
}

/// Response body para POST /rooms/:code/join
pub type JoinRoomBody {
  JoinRoomBody(
    room_id: String,
    invite_code: String,
    websocket_url: String,
    websocket_topic: String,
    player_uuid: String,
  )
}

/// POST /api/v1/rooms — Criar sala
pub fn handle_create_room(params: Dynamic) -> HttpResponse(RoomCreatedBody) {
  let decoder = {
    use player_uuid <- decode.field("player_uuid", decode.string)
    use nickname <- decode.field("nickname", decode.string)
    decode.success(#(player_uuid, nickname))
  }

  case decode.run(params, decoder) {
    Error(_) ->
      HttpError(400, "invalid_params", "player_uuid and nickname are required")
    Ok(#(player_uuid, nickname)) -> {
      let now_ms = get_now_ms()
      // room_id = player_uuid como seed (simples pro MVP)
      let room_id = player_uuid <> "_" <> int_to_string(now_ms)

      case registry.create_room(room_id, player_uuid, nickname, now_ms) {
        Error(reason) ->
          HttpError(500, "create_failed", reason)
        Ok(result) -> {
          let code = result.invite_code
          HttpOk(
            201,
            RoomCreatedBody(
              room_id: room_id,
              invite_code: code,
              invite_link: "/room/" <> code,
              host_player_uuid: player_uuid,
              websocket_url: "/socket/websocket",
              websocket_topic: "room:" <> code,
            ),
          )
        }
      }
    }
  }
}

/// GET /api/v1/rooms/:invite_code — Info pública da sala
pub fn handle_get_room(invite_code: String) -> HttpResponse(RoomInfoBody) {
  case phoenix_bridge.get_room_state(invite_code) {
    Error(_) -> HttpError(404, "room_not_found", "Room not found")
    Ok(room_state) -> {
      let room_id = decode_at_string(room_state, 1, "")
      let host_id = decode_at_string(room_state, 3, "")
      let players = decode_player_list(room_state)
      let player_count = list.length(players)
      let host_nick = find_nickname(players, host_id)

      HttpOk(
        200,
        RoomInfoBody(
          room_id: room_id,
          invite_code: invite_code,
          state: "waiting",
          player_count: player_count,
          max_players: 20,
          host_nickname: host_nick,
        ),
      )
    }
  }
}

/// POST /api/v1/rooms/:invite_code/join — Entrar na sala (retorna dados WS)
pub fn handle_join_room(
  invite_code: String,
  params: Dynamic,
) -> HttpResponse(JoinRoomBody) {
  let decoder = {
    use player_uuid <- decode.field("player_uuid", decode.string)
    decode.success(player_uuid)
  }

  case decode.run(params, decoder) {
    Error(_) ->
      HttpError(400, "invalid_params", "player_uuid is required")
    Ok(player_uuid) -> {
      // Verificar se sala existe
      case registry.room_exists(invite_code) {
        False -> HttpError(404, "room_not_found", "Room not found")
        True -> {
          let room_id = case phoenix_bridge.get_room_state(invite_code) {
            Ok(state) -> decode_at_string(state, 1, "")
            Error(_) -> ""
          }
          HttpOk(
            200,
            JoinRoomBody(
              room_id: room_id,
              invite_code: invite_code,
              websocket_url: "/socket/websocket",
              websocket_topic: "room:" <> invite_code,
              player_uuid: player_uuid,
            ),
          )
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

fn decode_at_string(data: Dynamic, index: Int, default: String) -> String {
  case decode.run(data, decode.at([index], decode.string)) {
    Ok(val) -> val
    Error(_) -> default
  }
}

fn decode_player_list(
  room_state: Dynamic,
) -> List(#(String, String)) {
  // Players no index 4 do tuple, cada player tem id no [1] e nick no [2]
  case decode.run(room_state, decode.at([4], decode.list(decode.dynamic))) {
    Ok(items) -> list.filter_map(items, fn(item) {
      let id_decoder = decode.at([1], decode.string)
      let nick_decoder = decode.at([2], decode.string)
      case decode.run(item, id_decoder), decode.run(item, nick_decoder) {
        Ok(id), Ok(nick) -> Ok(#(id, nick))
        _, _ -> Error(Nil)
      }
    })
    Error(_) -> []
  }
}

fn find_nickname(
  players: List(#(String, String)),
  target_id: String,
) -> String {
  case players {
    [] -> ""
    [#(id, nick), ..rest] ->
      case id == target_id {
        True -> nick
        False -> find_nickname(rest, target_id)
      }
  }
}

@external(erlang, "phoenix_bridge_backend", "get_now_ms")
fn get_now_ms() -> Int

@external(erlang, "erlang", "integer_to_binary")
fn int_to_string(n: Int) -> String
