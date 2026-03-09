defmodule GameOrchestratorWeb.RoomChannel do
  @moduledoc """
  Canal Phoenix para interação em tempo real com uma sala de jogo.
  Topic: "room:{invite_code}"

  Eventos client → server:
    - "mark_ready"
    - "start_game"
    - "submit_answer" %{"text" => ..., "time" => ...}

  Broadcasts server → clients:
    - "player_joined" %{"player_id" => ..., "name" => ...}
    - "player_ready" %{"player_id" => ...}
    - "game_started"
    - "round_started" %{"round_index" => ..., "song" => ...}
    - "answer_result" %{"player_id" => ..., "is_correct" => ..., "points" => ...}
    - "round_ended" %{"scores" => ...}
    - "game_ended" %{"final_scores" => ..., "winner_id" => ...}
    - "player_left" %{"player_id" => ...}
  """

  use GameOrchestratorWeb, :channel

  alias GameOrchestrator.Room.{Registry, Server}

  @impl true
  def join("room:" <> invite_code, payload, socket) do
    case Registry.lookup(invite_code) do
      {:error, :room_not_found} ->
        {:error, %{reason: "room_not_found"}}

      {:ok, _pid} ->
        do_join(invite_code, payload, socket)
    end
  end

  defp do_join(invite_code, payload, socket) do
    player_id = socket.assigns.player_id
    player_name = socket.assigns.player_name
    playlist = Map.get(payload, "playlist", []) |> parse_playlist()

    case Server.join(invite_code, player_id, player_name, playlist) do
      {:ok, _code} ->
        socket = assign(socket, :invite_code, invite_code)
        send(self(), :after_join)
        {:ok, %{invite_code: invite_code}, socket}

      {:error, :already_joined} ->
        # Reconexão — jogador já está na sala
        case Server.player_reconnect(invite_code, player_id) do
          :ok ->
            socket = assign(socket, :invite_code, invite_code)
            send(self(), :after_join)
            {:ok, %{invite_code: invite_code, reconnected: true}, socket}

          {:error, reason} ->
            {:error, %{reason: to_string(reason)}}
        end

      {:error, reason} ->
        {:error, %{reason: to_string(reason)}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    player_id = socket.assigns.player_id
    player_name = socket.assigns.player_name

    broadcast_from!(socket, "player_joined", %{
      player_id: player_id,
      name: player_name
    })

    case Server.get_state(socket.assigns.invite_code) do
      {:ok, state} ->
        push(socket, "room_state", serialize_room_state(state))

      _ ->
        :ok
    end

    {:noreply, socket}
  end

  @impl true
  def handle_in("mark_ready", _payload, socket) do
    case Server.mark_ready(socket.assigns.invite_code, socket.assigns.player_id) do
      :ok ->
        broadcast!(socket, "player_ready", %{player_id: socket.assigns.player_id})
        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: to_string(reason)}}, socket}
    end
  end

  @impl true
  def handle_in("mark_unready", _payload, socket) do
    case Server.mark_unready(socket.assigns.invite_code, socket.assigns.player_id) do
      :ok ->
        broadcast!(socket, "player_unready", %{player_id: socket.assigns.player_id})
        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: to_string(reason)}}, socket}
    end
  end

  @impl true
  def handle_in("start_game", _payload, socket) do
    case Server.start_game(socket.assigns.invite_code, socket.assigns.player_id) do
      {:ok, :game_started} ->
        broadcast!(socket, "game_started", %{})

        # Envia info da primeira rodada
        case Server.get_state(socket.assigns.invite_code) do
          {:ok, %{status: :playing}} ->
            push_round_info(socket)

          _ ->
            :ok
        end

        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: to_string(reason)}}, socket}
    end
  end

  @impl true
  def handle_in("submit_answer", %{"text" => text, "time" => time}, socket) do
    Server.submit_answer(
      socket.assigns.invite_code,
      socket.assigns.player_id,
      text,
      time / 1.0
    )

    {:reply, :ok, socket}
  end

  def handle_in("submit_answer", _payload, socket) do
    {:reply, {:error, %{reason: "missing text or time"}}, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    if Map.has_key?(socket.assigns, :invite_code) do
      Server.player_disconnect(socket.assigns.invite_code, socket.assigns.player_id)

      broadcast_from!(socket, "player_left", %{
        player_id: socket.assigns.player_id
      })
    end

    :ok
  end

  # --- Helpers ---

  defp push_round_info(_socket) do
    # Round info será enviado quando o Server notificar via PubSub (Fase futura)
    # Por ora, os clientes recebem o estado via get_state
    :ok
  end

  defp serialize_room_state(state) do
    %{
      invite_code: state.invite_code,
      status: state.status,
      host_id: state.host_id,
      players:
        Enum.map(state.players, fn p ->
          %{
            id: p.id,
            name: p.name,
            ready: p.ready,
            connection_status: p.connection_status
          }
        end)
    }
  end

  defp parse_playlist(songs) when is_list(songs) do
    Enum.map(songs, fn song ->
      %{
        id: Map.get(song, "id", ""),
        name: Map.get(song, "name", ""),
        artist: Map.get(song, "artist", ""),
        preview_url: Map.get(song, "preview_url", "")
      }
    end)
  end

  defp parse_playlist(_), do: []
end
