defmodule GameOrchestratorWeb.RoomController do
  use GameOrchestratorWeb, :controller

  alias GameOrchestrator.Room.{Registry, Server}

  def create(conn, params) do
    host_id = Map.get(params, "host_id", "")
    host_name = Map.get(params, "host_name", "Anônimo")

    config =
      params
      |> Map.get("config", %{})
      |> parse_config()

    case Registry.create_room(host_id, host_name, config) do
      {:ok, invite_code} ->
        conn
        |> put_status(:created)
        |> json(%{invite_code: invite_code})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: inspect(reason)})
    end
  end

  def show(conn, %{"code" => code}) do
    case Registry.lookup(code) do
      {:error, :room_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "room_not_found"})

      {:ok, _pid} ->
        {:ok, state} = Server.get_state(code)

        json(conn, %{
          invite_code: state.invite_code,
          status: state.status,
          host_id: state.host_id,
          players:
            Enum.map(state.players, fn p ->
              %{id: p.id, name: p.name, ready: p.ready}
            end)
        })
    end
  end

  defp parse_config(raw) do
    %{}
    |> maybe_put(:total_songs, raw, "total_songs", &parse_int/1)
    |> maybe_put(:time_per_round, raw, "time_per_round", &parse_int/1)
    |> maybe_put(:answer_type, raw, "answer_type", &parse_atom/1)
    |> maybe_put(:allow_repeats, raw, "allow_repeats", &parse_bool/1)
    |> maybe_put(:scoring_rule, raw, "scoring_rule", &parse_atom/1)
  end

  defp maybe_put(map, key, raw, raw_key, parser) do
    case Map.fetch(raw, raw_key) do
      {:ok, value} -> Map.put(map, key, parser.(value))
      :error -> map
    end
  end

  defp parse_int(v) when is_integer(v), do: v
  defp parse_int(v) when is_binary(v), do: String.to_integer(v)

  defp parse_atom(v) when is_atom(v), do: v
  defp parse_atom(v) when is_binary(v), do: String.to_existing_atom(v)

  defp parse_bool(v) when is_boolean(v), do: v
  defp parse_bool("true"), do: true
  defp parse_bool(_), do: false
end
