// room/server.gleam — API pública do Room Server
//
// Interface para criar salas. A interação com processos ativos
// é feita via GenServer Elixir (Room.Process) diretamente.

import room/state.{type RoomState}

/// Criar estado inicial de uma sala.
/// O caller (HTTP handler) usa este estado para iniciar o GenServer.
pub fn create_room(
  room_id: String,
  invite_code: String,
  host_id: String,
  host_nickname: String,
  now_ms: Int,
) -> RoomState {
  state.new_room(room_id, invite_code, host_id, host_nickname, now_ms)
}
