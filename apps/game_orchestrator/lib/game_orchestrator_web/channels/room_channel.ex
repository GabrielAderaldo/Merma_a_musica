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

  # ─── HANDLE_INFO (PubSub broadcasts + mensagens internas) ───

  @impl true
  def handle_info({event, payload}, socket) when is_binary(event) do
    # PubSub broadcast do Room GenServer → serializar EffectPayload → broadcast ao client
    data = serialize_effect_payload(event, payload)
    broadcast!(socket, event, data)
    {:noreply, socket}
  end

  def handle_info(message, socket) do
    # Outras mensagens (timers, etc.) → delegar ao Gleam
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

  # ═══════════════════════════════════════════════════════════════
  # EFFECT PAYLOAD SERIALIZER — converte EffectPayload (room/effects.gleam)
  # para JSON maps. Diferente do EventSerializer que converte OutboundEvent.
  # ═══════════════════════════════════════════════════════════════

  defp serialize_effect_payload("player_joined", {:player_event, id, nick}) do
    %{player_uuid: id, nickname: nick}
  end

  defp serialize_effect_payload("player_left", {:leave_event, id, reason}) do
    %{player_uuid: id, reason: reason}
  end

  defp serialize_effect_payload("player_ready_changed", {:ready_event, id, ready}) do
    %{player_uuid: id, ready: ready}
  end

  defp serialize_effect_payload("host_changed", {:host_event, id, nick}) do
    %{new_host_uuid: id, new_host_nickname: nick}
  end

  defp serialize_effect_payload("config_updated", {:config_payload, time, songs, answer, repeats, scoring}) do
    %{time_per_round: time, total_songs: songs, answer_type: answer, allow_repeats: repeats, scoring_rule: scoring}
  end

  defp serialize_effect_payload("game_starting", {:countdown_event, seconds}) do
    %{countdown_seconds: seconds}
  end

  defp serialize_effect_payload("round_starting", {:round_starting_payload, index, total, token, grace}) do
    %{round_index: index, total_rounds: total, audio_token: token, grace_period_seconds: grace}
  end

  defp serialize_effect_payload("timer_started", {:text_payload, text}) do
    %{duration_seconds: text}
  end

  defp serialize_effect_payload("answer_confirmed", {:answer_confirmed_payload, id}) do
    %{player_uuid: id}
  end

  defp serialize_effect_payload("round_ended", {:round_ended_payload, index, song, artist, album, cover, by, answers, scores, next_in}) do
    %{
      round_index: index,
      song: %{name: song, artist: artist, album: album, cover_url: cover, contributed_by: by},
      answers: Enum.map(answers, fn {pid, text, time, correct, points} ->
        %{player_uuid: pid, answer_text: text, response_time: time, is_correct: correct, points_earned: points}
      end),
      scores: gleam_dict_to_map(scores),
      next_round_in_seconds: next_in
    }
  end

  defp serialize_effect_payload("game_ended", {:game_ended_payload, scores, ranking, highlights, return_in}) do
    %{
      final_scores: gleam_dict_to_map(scores),
      ranking: Enum.map(ranking, fn {pos, id, nick, pts, correct, avg} ->
        %{position: pos, player_uuid: id, nickname: nick, total_points: pts, correct_answers: correct, avg_response_time: avg}
      end),
      highlights: serialize_highlights(highlights),
      return_to_lobby_in_seconds: return_in
    }
  end

  defp serialize_effect_payload("tiebreaker_starting", {:tiebreaker_starting_payload, ids, score, grace}) do
    %{tied_player_ids: ids, tied_score: score, grace_period_seconds: grace}
  end

  defp serialize_effect_payload("room_destroyed", reason) do
    %{reason: to_string(reason)}
  end

  defp serialize_effect_payload("song_range_updated", {:song_range_payload, min, max, total}) do
    %{min: min, max: max, total_players: total}
  end

  # Fallback — evento desconhecido, enviar payload raw
  defp serialize_effect_payload(_event, payload) do
    %{data: inspect(payload)}
  end

  # Helper: converte Gleam Dict (Erlang :gleam@dict format) para Elixir map
  defp gleam_dict_to_map(gleam_dict) do
    try do
      :gleam@dict.to_list(gleam_dict)
      |> Map.new()
    rescue
      _ -> %{}
    end
  end

  defp serialize_highlights({{streak_id, streak_nick, streak_count},
                              {fast_id, fast_nick, fast_time, fast_song},
                              {correct_id, correct_nick, correct_count}}) do
    %{
      best_streak: %{player_uuid: streak_id, nickname: streak_nick, streak: streak_count},
      fastest_answer: %{player_uuid: fast_id, nickname: fast_nick, time: fast_time, song_name: fast_song},
      most_correct: %{player_uuid: correct_id, nickname: correct_nick, count: correct_count}
    }
  end

  defp serialize_highlights(_), do: %{}
end
