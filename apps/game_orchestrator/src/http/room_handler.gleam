// http/room_handler.gleam — Handler REST: Salas
//
// Chamado por: RoomController → :http@room_handler.*

import gleam/dynamic.{type Dynamic}
import phoenix_bridge/types.{type HttpResponse, HttpOk, HttpError}

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
  // TODO: decode params → criar sala via Room Registry → retornar dados
  HttpError(501, "not_implemented", "Criação de sala ainda não implementada.")
}

/// GET /api/v1/rooms/:invite_code — Info pública da sala
pub fn handle_get_room(invite_code: String) -> HttpResponse(RoomInfoBody) {
  // TODO: buscar sala via Room Registry → retornar info
  HttpError(501, "not_implemented", "Consulta de sala ainda não implementada.")
}

/// POST /api/v1/rooms/:invite_code/join — Entrar na sala
pub fn handle_join_room(
  invite_code: String,
  params: Dynamic,
) -> HttpResponse(JoinRoomBody) {
  // TODO: decode params → buscar sala → adicionar jogador → retornar dados WS
  HttpError(501, "not_implemented", "Entrada em sala ainda não implementada.")
}
