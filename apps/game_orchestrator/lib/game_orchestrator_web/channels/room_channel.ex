# room_channel.ex — Phoenix Channel (Thin Wrapper → Gleam)
#
# O QUE É: Canal WebSocket para salas de jogo.
# Implementa o padrão EventChannel — recebe eventos e delega TUDO
# para o handler Gleam (channel/room_handler.gleam).
#
# LIMITES ARQUITETURAIS:
# - ZERO lógica de negócio — apenas roteia e executa
# - Recebe evento → chama Gleam handler → interpreta HandlerResult → executa
# - O Gleam decide O QUE fazer, o Elixir FAZ
# - O Channel se inscreve no PubSub para receber broadcasts do Room Server
#
# COMO FUNCIONA O PATTERN MATCH:
# - HandlerResult é um custom type Gleam que compila para tuples Erlang:
#   NoReply(state)                          → {:no_reply, state}
#   Reply(event, state)                     → {:reply, event, state}
#   Broadcast(event, state)                 → {:broadcast, event, state}
#   ReplyAndBroadcast(reply, bcast, state)  → {:reply_and_broadcast, reply, bcast, state}
#   Push(event, state)                      → {:push, event, state}
#   HandlerError(code, msg, state)          → {:handler_error, code, msg, state}
#
# - OutboundEvent compila para tuple tagged:
#   RoomStateEvent(payload)     → {:room_state_event, payload}
#   PlayerJoinedEvent(payload)  → {:player_joined_event, payload}
#   etc.
#
# O EventSerializer converte esses tuples em {event_name, json_map}
# para o Phoenix enviar ao client.

defmodule GameOrchestratorWeb.RoomChannel do
  use Phoenix.Channel

  alias GameOrchestratorWeb.EventSerializer

  # ─── JOIN ───

  @impl true
  def join("room:" <> invite_code, params, socket) do
    case :channel@room_handler.handle_join(invite_code, params) do
      {:ok, {reply_event, gleam_state}} ->
        Phoenix.PubSub.subscribe(GameOrchestrator.PubSub, "room:#{invite_code}")

        socket =
          socket
          |> assign(:gleam_state, gleam_state)
          |> assign(:invite_code, invite_code)

        {:ok, EventSerializer.to_map(reply_event), socket}

      {:error, reason} ->
        {:error, %{reason: to_string(reason)}}
    end
  end

  # ─── HANDLE_IN (client → server) ───

  @impl true
  def handle_in(event, payload, socket) do
    result = :channel@room_handler.handle_event(event, payload, socket.assigns.gleam_state)
    execute_result(result, socket)
  end

  # ─── HANDLE_INFO (PubSub, timers, mensagens internas) ───

  @impl true
  def handle_info(message, socket) do
    result = :channel@room_handler.handle_info(message, socket.assigns.gleam_state)
    execute_info_result(result, socket)
  end

  # ─── TERMINATE ───

  @impl true
  def terminate(reason, socket) do
    if gleam_state = socket.assigns[:gleam_state] do
      :channel@room_handler.handle_terminate(reason, gleam_state)
    end

    :ok
  end

  # ═══════════════════════════════════════════════════════════════
  # EXECUTORS — Interpretam HandlerResult/InfoResult e executam
  # ═══════════════════════════════════════════════════════════════

  defp execute_result(result, socket) do
    case result do
      {:no_reply, new_state} ->
        {:noreply, put_state(socket, new_state)}

      {:reply, outbound_event, new_state} ->
        {:reply, {:ok, EventSerializer.to_map(outbound_event)}, put_state(socket, new_state)}

      {:broadcast, outbound_event, new_state} ->
        {name, data} = EventSerializer.to_event(outbound_event)
        broadcast!(socket, name, data)
        {:noreply, put_state(socket, new_state)}

      {:reply_and_broadcast, reply_event, broadcast_event, new_state} ->
        {bcast_name, bcast_data} = EventSerializer.to_event(broadcast_event)
        broadcast!(socket, bcast_name, bcast_data)
        {:reply, {:ok, EventSerializer.to_map(reply_event)}, put_state(socket, new_state)}

      {:push, outbound_event, new_state} ->
        {name, data} = EventSerializer.to_event(outbound_event)
        push(socket, name, data)
        {:noreply, put_state(socket, new_state)}

      {:handler_error, code, message, new_state} ->
        push(socket, "error", %{code: code, message: message})
        {:noreply, put_state(socket, new_state)}
    end
  end

  defp execute_info_result(result, socket) do
    case result do
      {:info_push, outbound_event, new_state} ->
        {name, data} = EventSerializer.to_event(outbound_event)
        push(socket, name, data)
        {:noreply, put_state(socket, new_state)}

      {:info_no_reply, new_state} ->
        {:noreply, put_state(socket, new_state)}

      {:info_broadcast, outbound_event, new_state} ->
        {name, data} = EventSerializer.to_event(outbound_event)
        broadcast!(socket, name, data)
        {:noreply, put_state(socket, new_state)}
    end
  end

  defp put_state(socket, new_state) do
    assign(socket, :gleam_state, new_state)
  end
end
