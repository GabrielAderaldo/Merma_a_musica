# health_controller.ex — Controller REST de Health (Thin Wrapper → Gleam)

defmodule GameOrchestratorWeb.HealthController do
  use Phoenix.Controller, formats: [:json]
  alias GameOrchestratorWeb.ResponseHelper

  def index(conn, _params) do
    result = :http@health_handler.handle_health()
    ResponseHelper.execute(conn, result, &serialize_health/1)
  end

  defp serialize_health({:health_body, status, active_rooms, connected_players, uptime_seconds}) do
    %{
      status: status,
      active_rooms: active_rooms,
      connected_players: connected_players,
      uptime_seconds: uptime_seconds
    }
  end
end
