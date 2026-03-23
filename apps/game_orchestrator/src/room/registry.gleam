// room/registry.gleam — Registro e Lookup de Salas
//
// Gerencia criação e descoberta de salas por invite_code.
// Toda interação com OTP (DynamicSupervisor, Registry) via FFI.

import room/state.{type RoomState}
import room/server

/// Resultado da criação de sala.
pub type CreateRoomResult {
  CreateRoomResult(room_state: RoomState, invite_code: String)
}

/// Criar sala: gerar código, criar estado, iniciar processo via FFI.
pub fn create_room(
  room_id: String,
  host_id: String,
  host_nickname: String,
  now_ms: Int,
) -> Result(CreateRoomResult, String) {
  let invite_code = generate_invite_code()
  let initial_state = server.create_room(room_id, invite_code, host_id, host_nickname, now_ms)

  case start_room_process(initial_state) {
    Ok(_) -> Ok(CreateRoomResult(room_state: initial_state, invite_code: invite_code))
    Error(reason) -> Error(reason)
  }
}

/// Verificar se sala existe.
pub fn room_exists(invite_code: String) -> Bool {
  case lookup_room(invite_code) {
    Ok(_) -> True
    Error(_) -> False
  }
}

/// Destruir sala.
pub fn destroy_room(invite_code: String) -> Result(Nil, String) {
  stop_room_process(invite_code)
}

// ─── FFI ───

@external(erlang, "room_registry_ffi", "generate_invite_code")
fn generate_invite_code() -> String

@external(erlang, "room_registry_ffi", "start_room_process")
fn start_room_process(initial_state: RoomState) -> Result(Nil, String)

@external(erlang, "room_registry_ffi", "lookup_room")
fn lookup_room(invite_code: String) -> Result(Nil, String)

@external(erlang, "room_registry_ffi", "stop_room_process")
fn stop_room_process(invite_code: String) -> Result(Nil, String)
