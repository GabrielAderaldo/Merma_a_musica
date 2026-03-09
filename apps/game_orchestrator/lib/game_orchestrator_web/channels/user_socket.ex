defmodule GameOrchestratorWeb.UserSocket do
  use Phoenix.Socket

  channel "room:*", GameOrchestratorWeb.RoomChannel

  @impl true
  def connect(params, socket, _connect_info) do
    case Map.fetch(params, "player_id") do
      {:ok, player_id} when is_binary(player_id) and player_id != "" ->
        player_name = Map.get(params, "player_name", "Anônimo")
        socket = socket |> assign(:player_id, player_id) |> assign(:player_name, player_name)
        {:ok, socket}

      _ ->
        :error
    end
  end

  @impl true
  def id(socket), do: "player:#{socket.assigns.player_id}"
end
