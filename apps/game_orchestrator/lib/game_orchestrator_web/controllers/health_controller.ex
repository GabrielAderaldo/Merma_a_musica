defmodule GameOrchestratorWeb.HealthController do
  use GameOrchestratorWeb, :controller

  def index(conn, _params) do
    rooms = GameOrchestrator.Room.Registry.list_rooms() |> length()

    json(conn, %{
      status: "ok",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      rooms_active: rooms
    })
  end
end
