defmodule GameOrchestratorWeb.RoomChannelTest do
  use GameOrchestratorWeb.ChannelCase, async: false

  alias GameOrchestrator.Room.Registry

  @songs [
    %{
      "id" => "s1",
      "name" => "Bohemian Rhapsody",
      "artist" => "Queen",
      "preview_url" => "http://example.com/1"
    },
    %{
      "id" => "s2",
      "name" => "Imagine",
      "artist" => "John Lennon",
      "preview_url" => "http://example.com/2"
    }
  ]

  defp create_socket(player_id, player_name) do
    connect(GameOrchestratorWeb.UserSocket, %{
      "player_id" => player_id,
      "player_name" => player_name
    })
  end

  defp create_room_and_join(host_id \\ "host_1", host_name \\ "Alice") do
    config = %{total_songs: 2, time_per_round: 5}
    {:ok, code} = Registry.create_room(host_id, host_name, config)
    {:ok, socket} = create_socket(host_id, host_name)
    {:ok, _reply, socket} = subscribe_and_join(socket, "room:" <> code, %{"playlist" => @songs})
    {code, socket}
  end

  describe "join" do
    test "jogador entra na sala via channel" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      {:ok, socket} = create_socket("p2", "Bob")

      {:ok, reply, _socket} =
        subscribe_and_join(socket, "room:" <> code, %{"playlist" => @songs})

      assert reply.invite_code == code
    end

    test "rejeita conexão sem player_id" do
      assert :error = connect(GameOrchestratorWeb.UserSocket, %{})
    end

    test "retorna erro para sala inexistente" do
      {:ok, socket} = create_socket("p1", "Alice")

      assert {:error, %{reason: _}} =
               subscribe_and_join(socket, "room:INVALID", %{})
    end

    test "reconexão de jogador existente" do
      {:ok, code} = Registry.create_room("host_1", "Alice")
      {:ok, socket1} = create_socket("p2", "Bob")
      {:ok, _reply, _socket1} = subscribe_and_join(socket1, "room:" <> code, %{})

      # Simula reconexão (mesmo player_id tenta entrar de novo)
      {:ok, socket2} = create_socket("p2", "Bob")
      {:ok, reply, _socket2} = subscribe_and_join(socket2, "room:" <> code, %{})
      assert reply.reconnected == true
    end
  end

  describe "mark_ready" do
    test "jogador marca como pronto e broadcast é enviado" do
      {code, _host_socket} = create_room_and_join()

      # Segundo jogador entra
      {:ok, p2_socket} = create_socket("p2", "Bob")
      {:ok, _reply, p2_socket} = subscribe_and_join(p2_socket, "room:" <> code, %{"playlist" => @songs})

      # p2 marca ready
      ref = push(p2_socket, "mark_ready", %{})
      assert_reply ref, :ok

      # Host deve receber o broadcast
      assert_broadcast "player_ready", %{player_id: "p2"}
    end
  end

  describe "start_game" do
    test "host inicia o jogo após todos prontos" do
      {code, host_socket} = create_room_and_join()

      {:ok, p2_socket} = create_socket("p2", "Bob")
      {:ok, _reply, p2_socket} = subscribe_and_join(p2_socket, "room:" <> code, %{"playlist" => @songs})

      # Ambos prontos
      push(host_socket, "mark_ready", %{})
      push(p2_socket, "mark_ready", %{})
      Process.sleep(50)

      # Host inicia
      ref = push(host_socket, "start_game", %{})
      assert_reply ref, :ok
      assert_broadcast "game_started", %{}
    end

    test "não-host não pode iniciar" do
      {code, _host_socket} = create_room_and_join()

      {:ok, p2_socket} = create_socket("p2", "Bob")
      {:ok, _reply, p2_socket} = subscribe_and_join(p2_socket, "room:" <> code, %{"playlist" => @songs})

      ref = push(p2_socket, "start_game", %{})
      assert_reply ref, :error, %{reason: "not_host"}
    end

    test "não inicia sem todos prontos" do
      {code, host_socket} = create_room_and_join()

      {:ok, p2_socket} = create_socket("p2", "Bob")
      {:ok, _reply, _p2_socket} = subscribe_and_join(p2_socket, "room:" <> code, %{"playlist" => @songs})

      # Só host pronto
      push(host_socket, "mark_ready", %{})
      Process.sleep(50)

      ref = push(host_socket, "start_game", %{})
      assert_reply ref, :error, %{reason: "not_all_ready"}
    end
  end

  describe "submit_answer" do
    test "jogador submete resposta" do
      {code, host_socket} = create_room_and_join()

      {:ok, p2_socket} = create_socket("p2", "Bob")
      {:ok, _reply, p2_socket} = subscribe_and_join(p2_socket, "room:" <> code, %{"playlist" => @songs})

      push(host_socket, "mark_ready", %{})
      push(p2_socket, "mark_ready", %{})
      Process.sleep(50)

      ref = push(host_socket, "start_game", %{})
      assert_reply ref, :ok
      Process.sleep(50)

      ref = push(p2_socket, "submit_answer", %{"text" => "Bohemian Rhapsody", "time" => 3500})
      assert_reply ref, :ok
    end
  end

  describe "disconnect" do
    test "broadcast player_left ao desconectar" do
      {code, _host_socket} = create_room_and_join()

      {:ok, p2_socket} = create_socket("p2", "Bob")
      {:ok, _reply, p2_socket} = subscribe_and_join(p2_socket, "room:" <> code, %{})

      Process.unlink(p2_socket.channel_pid)
      close(p2_socket)

      assert_broadcast "player_left", %{player_id: "p2"}
    end
  end
end
