// channel/room_handler.gleam — Handler de Eventos WebSocket
//
// O QUE É: Processa TODOS os eventos WebSocket recebidos pelo
// Phoenix Channel. É o "Dart side" do EventChannel.
//
// LIMITES ARQUITETURAIS:
// - Chamado pelo room_channel.ex (Elixir thin wrapper)
// - Recebe evento + payload (Dynamic) + state → retorna HandlerResult
// - O Elixir interpreta o HandlerResult e executa (push, broadcast, reply)
// - NÃO conhece Phoenix.Channel — só retorna dados declarativos
//
// COMO É CHAMADO PELO ELIXIR:
// - :channel@room_handler.handle_join(invite_code, params)
// - :channel@room_handler.handle_event(event, payload, state)
// - :channel@room_handler.handle_info(message, state)
// - :channel@room_handler.handle_terminate(reason, state)
//
// RESPONSABILIDADES:
// - handle_join: validar entrada na sala, retornar room_state
// - handle_event: despachar por nome do evento para handler específico
// - handle_info: processar timers e PubSub
// - handle_terminate: cleanup ao desconectar

import gleam/dynamic.{type Dynamic}
import phoenix_bridge/types.{
  type HandlerResult, type InfoResult, type OutboundEvent,
  NoReply, Reply, Broadcast, ReplyAndBroadcast, Push, HandlerError,
  InfoPush, InfoNoReply, InfoBroadcast,
  ErrorEvent,
}

/// Estado do channel — opaco para o Elixir, tipado para o Gleam.
/// Mantido no socket.assigns.gleam_state pelo Channel Elixir.
pub type ChannelState {
  ChannelState(
    invite_code: String,
    player_uuid: String,
    nickname: String,
  )
}

/// Chamado pelo Channel Elixir quando um client faz join em "room:{code}".
/// Retorna Ok(#(OutboundEvent, ChannelState)) ou Error(String).
pub fn handle_join(
  invite_code: String,
  params: Dynamic,
) -> Result(#(OutboundEvent, ChannelState), String) {
  // TODO: Implementar quando o Room Server existir
  // 1. Decodificar params (player_uuid, nickname)
  // 2. Buscar sala pelo invite_code via Room Registry
  // 3. Adicionar jogador na sala
  // 4. Montar RoomStateEvent com estado atual
  // 5. Retornar Ok(#(room_state_event, channel_state))
  Error("not_implemented")
}

/// Chamado pelo Channel Elixir para QUALQUER evento client→server.
/// Despacha para handler específico baseado no nome do evento.
pub fn handle_event(
  event: String,
  payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  case event {
    "player_ready" -> handle_player_ready(payload, state)
    "player_unready" -> handle_player_unready(payload, state)
    "configure_match" -> handle_configure_match(payload, state)
    "start_game" -> handle_start_game(payload, state)
    "submit_answer" -> handle_submit_answer(payload, state)
    "vote_skip" -> handle_vote_skip(payload, state)
    "select_playlist" -> handle_select_playlist(payload, state)
    "player_leave" -> handle_player_leave(payload, state)
    "autocomplete_search" -> handle_autocomplete_search(payload, state)
    _ -> HandlerError("unknown_event", "Evento desconhecido: " <> event, state)
  }
}

/// Chamado pelo Channel Elixir para mensagens internas (timers, PubSub).
pub fn handle_info(
  message: Dynamic,
  state: ChannelState,
) -> InfoResult(ChannelState) {
  // TODO: Implementar quando timers e PubSub existirem
  // Pattern match no message para identificar tipo:
  // - Timer de rodada expirou
  // - Timer de grace period expirou
  // - PubSub broadcast de outro processo
  InfoNoReply(state)
}

/// Chamado pelo Channel Elixir quando o client desconecta.
pub fn handle_terminate(
  _reason: Dynamic,
  _state: ChannelState,
) -> Nil {
  // TODO: Implementar quando Room Server existir
  // 1. Notificar Room Server que jogador desconectou
  // 2. Iniciar timer de reconexão (2 min)
  Nil
}

// ═══════════════════════════════════════════════════════════════
// HANDLERS INDIVIDUAIS (stubs — implementar com Room Server)
// ═══════════════════════════════════════════════════════════════

fn handle_player_ready(
  _payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  // TODO: decode player_uuid → chamar room server → broadcast player_ready_changed
  NoReply(state)
}

fn handle_player_unready(
  _payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  NoReply(state)
}

fn handle_configure_match(
  _payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  // TODO: validar se é host → decode config → chamar room server → broadcast config_updated
  NoReply(state)
}

fn handle_start_game(
  _payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  // TODO: validar se é host → chamar room server → broadcast game_starting
  NoReply(state)
}

fn handle_submit_answer(
  _payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  // TODO: decode answer_text → chamar room server → reply answer_confirmed
  NoReply(state)
}

fn handle_vote_skip(
  _payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  // TODO: chamar room server → broadcast player_voted_skip
  NoReply(state)
}

fn handle_select_playlist(
  _payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  // TODO: decode playlist_id + platform → chamar room server
  NoReply(state)
}

fn handle_player_leave(
  _payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  // TODO: chamar room server → broadcast player_left
  NoReply(state)
}

fn handle_autocomplete_search(
  _payload: Dynamic,
  state: ChannelState,
) -> HandlerResult(ChannelState) {
  // TODO: decode query → buscar no pool → reply autocomplete_results
  NoReply(state)
}
