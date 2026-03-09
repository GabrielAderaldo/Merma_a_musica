defmodule GameOrchestratorWeb.RoomControllerTest do
  use ExUnit.Case, async: false
  import Plug.Test
  import Plug.Conn

  alias GameOrchestrator.Room.Registry

  @opts GameOrchestratorWeb.Router.init([])

  setup do
    start_supervised!({Elixir.Registry, keys: :unique, name: Registry.registry_name()})
    start_supervised!({DynamicSupervisor, name: Registry.supervisor_name(), strategy: :one_for_one})
    :ok
  end

  describe "POST /api/rooms" do
    test "cria sala com sucesso" do
      conn =
        conn(:post, "/api/rooms", %{
          "host_id" => "host_1",
          "host_name" => "Alice",
          "config" => %{"total_songs" => 4, "time_per_round" => 15}
        })
        |> put_req_header("content-type", "application/json")
        |> GameOrchestratorWeb.Router.call(@opts)

      assert conn.status == 201
      body = Jason.decode!(conn.resp_body)
      assert is_binary(body["invite_code"])
      assert String.length(body["invite_code"]) == 6
    end
  end

  describe "GET /api/rooms/:code" do
    test "retorna info da sala existente" do
      {:ok, code} = Registry.create_room("host_1", "Alice", %{total_songs: 4})

      conn =
        conn(:get, "/api/rooms/#{code}")
        |> GameOrchestratorWeb.Router.call(@opts)

      assert conn.status == 200
      body = Jason.decode!(conn.resp_body)
      assert body["invite_code"] == code
      assert body["status"] == "lobby"
      assert body["host_id"] == "host_1"
      assert length(body["players"]) == 1
    end

    test "retorna 404 para sala inexistente" do
      conn =
        conn(:get, "/api/rooms/INVALID")
        |> GameOrchestratorWeb.Router.call(@opts)

      assert conn.status == 404
      body = Jason.decode!(conn.resp_body)
      assert body["error"] == "room_not_found"
    end
  end
end
