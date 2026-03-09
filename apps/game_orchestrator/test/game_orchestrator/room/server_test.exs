defmodule GameOrchestrator.Room.ServerTest do
  use ExUnit.Case, async: false

  alias GameOrchestrator.Room.{Registry, Server}

  @songs [
    %{id: "s1", name: "Bohemian Rhapsody", artist: "Queen", preview_url: "http://example.com/1"},
    %{id: "s2", name: "Imagine", artist: "John Lennon", preview_url: "http://example.com/2"},
    %{id: "s3", name: "Hey Jude", artist: "The Beatles", preview_url: "http://example.com/3"},
    %{id: "s4", name: "Stairway to Heaven", artist: "Led Zeppelin", preview_url: "http://example.com/4"}
  ]

  setup do
    start_supervised!({Elixir.Registry, keys: :unique, name: Registry.registry_name()})
    start_supervised!({DynamicSupervisor, name: Registry.supervisor_name(), strategy: :one_for_one})
    :ok
  end

  # --- Helpers ---

  defp create_ready_room(host_id \\ "host_1", config \\ %{total_songs: 2, time_per_round: 5}) do
    {:ok, code} = Registry.create_room(host_id, "Alice", config)
    {:ok, _} = Server.join(code, "p2", "Bob", @songs)
    :ok = Server.mark_ready(code, host_id)
    :ok = Server.mark_ready(code, "p2")
    {:ok, code}
  end

  # --- Criação de sala ---

  describe "criação de sala" do
    test "cria sala e retorna invite_code" do
      {:ok, invite_code} = Registry.create_room("host_1", "Alice")
      assert is_binary(invite_code)
      assert String.length(invite_code) == 6
    end

    test "host já está na sala após criação" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      {:ok, state} = Server.get_state(code)
      assert state.host_id == "host_1"
      assert length(state.players) == 1
      assert hd(state.players).name == "Alice"
      assert hd(state.players).connection_status == :connected
    end
  end

  # --- Join ---

  describe "join" do
    test "jogador entra na sala" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      {:ok, ^code} = Server.join(code, "p2", "Bob", @songs)
      {:ok, state} = Server.get_state(code)
      assert length(state.players) == 2
    end

    test "jogador duplicado é rejeitado" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      {:ok, _} = Server.join(code, "p2", "Bob")
      assert {:error, :already_joined} = Server.join(code, "p2", "Bob")
    end

    test "não pode entrar com jogo em andamento" do
      {:ok, code} = create_ready_room()
      {:ok, :game_started} = Server.start_game(code, "host_1")
      assert {:error, :game_already_started} = Server.join(code, "p3", "Charlie")
    end
  end

  # --- Mark Ready ---

  describe "mark_ready" do
    test "marca jogador como pronto" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      {:ok, _} = Server.join(code, "p2", "Bob")
      :ok = Server.mark_ready(code, "p2")

      {:ok, state} = Server.get_state(code)
      bob = Enum.find(state.players, &(&1.id == "p2"))
      assert bob.ready == true
    end

    test "jogador inexistente retorna erro" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      assert {:error, :player_not_found} = Server.mark_ready(code, "ghost")
    end

    test "não pode marcar ready fora do lobby" do
      {:ok, code} = create_ready_room()
      {:ok, :game_started} = Server.start_game(code, "host_1")
      assert {:error, :invalid_state} = Server.mark_ready(code, "p2")
    end
  end

  # --- Start Game (só host) ---

  describe "start_game" do
    test "só o host pode iniciar" do
      {:ok, code} = create_ready_room()
      assert {:error, :not_host} = Server.start_game(code, "p2")
    end

    test "não inicia com menos de 2 jogadores" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      Server.mark_ready(code, "host_1")
      assert {:error, :not_enough_players} = Server.start_game(code, "host_1")
    end

    test "não inicia se nem todos estão prontos" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      {:ok, _} = Server.join(code, "p2", "Bob", @songs)
      :ok = Server.mark_ready(code, "host_1")
      # p2 não está pronto
      assert {:error, :not_all_ready} = Server.start_game(code, "host_1")
    end

    test "inicia o jogo quando host e todos prontos" do
      {:ok, code} = create_ready_room()
      assert {:ok, :game_started} = Server.start_game(code, "host_1")

      {:ok, state} = Server.get_state(code)
      assert state.status == :playing
    end
  end

  # --- Submit Answer ---

  describe "submit_answer" do
    test "jogador submete resposta durante o jogo" do
      {:ok, code} = create_ready_room("host_1", %{total_songs: 2, time_per_round: 10})
      {:ok, :game_started} = Server.start_game(code, "host_1")

      :ok = Server.submit_answer(code, "p2", "Bohemian Rhapsody", 3.5)
      Process.sleep(100)

      {:ok, state} = Server.get_state(code)
      assert state.status == :playing
    end
  end

  # --- Reconexão ---

  describe "reconexão" do
    test "jogador desconecta e reconecta" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      {:ok, _} = Server.join(code, "p2", "Bob")

      Server.player_disconnect(code, "p2")
      Process.sleep(50)

      {:ok, state} = Server.get_state(code)
      bob = Enum.find(state.players, &(&1.id == "p2"))
      assert bob.connection_status == :disconnected

      :ok = Server.player_reconnect(code, "p2")

      {:ok, state} = Server.get_state(code)
      bob = Enum.find(state.players, &(&1.id == "p2"))
      assert bob.connection_status == :connected
    end

    test "jogador removido após timeout de reconexão" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      {:ok, _} = Server.join(code, "p2", "Bob")

      # Simula disconnect e envia o timeout manualmente
      Server.player_disconnect(code, "p2")
      Process.sleep(50)

      # Envia o timeout diretamente (em vez de esperar 2 min)
      {:ok, pid} = Registry.lookup(code)
      send(pid, {:reconnect_timeout, "p2"})
      Process.sleep(50)

      {:ok, state} = Server.get_state(code)
      assert length(state.players) == 1
      assert hd(state.players).id == "host_1"
    end
  end

  # --- Timeout de inatividade ---

  describe "inatividade" do
    test "sala é destruída após timeout de inatividade" do
      {:ok, code} = Registry.create_room("host_i", "Alice")
      {:ok, pid} = Registry.lookup(code)
      assert Process.alive?(pid)

      # Simula o timeout de inatividade
      send(pid, :inactivity_timeout)
      Process.sleep(50)

      refute Process.alive?(pid)
      assert {:error, :room_not_found} = Registry.lookup(code)
    end
  end

  # --- Round Timeout ---

  describe "round timeout" do
    @tag timeout: 10_000
    test "rodada encerra por timeout" do
      {:ok, code} = create_ready_room("host_t", %{total_songs: 2, time_per_round: 1})
      {:ok, :game_started} = Server.start_game(code, "host_t")

      {:ok, state_before} = Server.get_state(code)
      assert state_before.status == :playing

      # Espera timeout (1s) + margem + next round delay (3s)
      Process.sleep(5_000)

      {:ok, state_after} = Server.get_state(code)
      assert state_after.status in [:playing, :finished]
    end
  end

  # --- Fluxo Completo ---

  describe "fluxo completo" do
    @tag timeout: 15_000
    test "partida completa com 2 jogadores" do
      {:ok, code} = create_ready_room("host_f", %{total_songs: 2, time_per_round: 1})
      {:ok, :game_started} = Server.start_game(code, "host_f")

      {:ok, state} = Server.get_state(code)
      assert state.status == :playing

      # Rodada 1: 1s timeout + 3s delay + Rodada 2: 1s timeout = ~5s + margem
      Process.sleep(7_000)

      {:ok, final_state} = Server.get_state(code)
      assert final_state.status == :finished
    end
  end
end
