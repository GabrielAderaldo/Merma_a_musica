defmodule GameOrchestrator.Room.Server do
  @moduledoc """
  GenServer que gerencia o estado de uma sala de jogo.
  Cada sala tem seu próprio processo supervisionado.

  Estados: :lobby → :playing → :finished
  """

  use GenServer, restart: :temporary

  alias GameOrchestrator.Room.Coordinator
  alias GameOrchestrator.Room.Registry, as: RoomRegistry

  # Sala destruída após 30 minutos de inatividade
  @inactivity_timeout :timer.minutes(30)
  # Jogador desconectado removido após 2 minutos
  @reconnect_timeout :timer.minutes(2)

  defstruct [
    :room_id,
    :invite_code,
    :host_id,
    :match,
    :current_round,
    :round_timer,
    :inactivity_timer,
    status: :lobby,
    players: [],
    config: %{},
    songs: []
  ]

  # --- API Pública ---

  def start_link({invite_code, host_id, host_name, config}) do
    GenServer.start_link(__MODULE__, {invite_code, host_id, host_name, config},
      name: via(invite_code)
    )
  end

  def join(invite_code, player_id, player_name, playlist \\ []) do
    GenServer.call(via(invite_code), {:join, player_id, player_name, playlist})
  end

  def mark_ready(invite_code, player_id) do
    GenServer.call(via(invite_code), {:mark_ready, player_id})
  end

  def mark_unready(invite_code, player_id) do
    GenServer.call(via(invite_code), {:mark_unready, player_id})
  end

  def start_game(invite_code, player_id) do
    GenServer.call(via(invite_code), {:start_game, player_id})
  end

  def submit_answer(invite_code, player_id, answer_text, answer_time) do
    GenServer.cast(via(invite_code), {:submit_answer, player_id, answer_text, answer_time})
  end

  def get_state(invite_code) do
    GenServer.call(via(invite_code), :get_state)
  end

  def player_disconnect(invite_code, player_id) do
    GenServer.cast(via(invite_code), {:player_disconnect, player_id})
  end

  def player_reconnect(invite_code, player_id) do
    GenServer.call(via(invite_code), {:player_reconnect, player_id})
  end

  # --- Callbacks ---

  @impl true
  def init({invite_code, host_id, host_name, config}) do
    inactivity_timer = schedule_inactivity_timeout()

    state = %__MODULE__{
      room_id: "room_#{invite_code}",
      invite_code: invite_code,
      host_id: host_id,
      config: config,
      players: [new_player(host_id, host_name, [])],
      inactivity_timer: inactivity_timer
    }

    {:ok, state}
  end

  # --- Join ---

  @impl true
  def handle_call({:join, player_id, player_name, playlist}, _from, %{status: :lobby} = state) do
    cond do
      Enum.any?(state.players, &(&1.id == player_id)) ->
        {:reply, {:error, :already_joined}, state}

      true ->
        player = new_player(player_id, player_name, playlist)
        new_state = %{state | players: state.players ++ [player]} |> reset_inactivity()
        {:reply, {:ok, new_state.invite_code}, new_state}
    end
  end

  def handle_call({:join, _player_id, _name, _playlist}, _from, state) do
    {:reply, {:error, :game_already_started}, state}
  end

  # --- Mark Ready ---

  @impl true
  def handle_call({:mark_ready, player_id}, _from, %{status: :lobby} = state) do
    case find_player(state, player_id) do
      nil ->
        {:reply, {:error, :player_not_found}, state}

      player ->
        updated_players = update_player(state.players, player_id, %{player | ready: true})
        new_state = %{state | players: updated_players} |> reset_inactivity()
        {:reply, :ok, new_state}
    end
  end

  def handle_call({:mark_ready, _}, _from, state) do
    {:reply, {:error, :invalid_state}, state}
  end

  # --- Mark Unready ---

  @impl true
  def handle_call({:mark_unready, player_id}, _from, %{status: :lobby} = state) do
    case find_player(state, player_id) do
      nil ->
        {:reply, {:error, :player_not_found}, state}

      player ->
        updated_players = update_player(state.players, player_id, %{player | ready: false})
        new_state = %{state | players: updated_players} |> reset_inactivity()
        {:reply, :ok, new_state}
    end
  end

  def handle_call({:mark_unready, _}, _from, state) do
    {:reply, {:error, :invalid_state}, state}
  end

  # --- Start Game (só host) ---

  @impl true
  def handle_call({:start_game, player_id}, _from, %{status: :lobby} = state) do
    cond do
      player_id != state.host_id ->
        {:reply, {:error, :not_host}, state}

      not all_players_ready?(state) ->
        {:reply, {:error, :not_all_ready}, state}

      true ->
        case do_start_game(state) do
          {:ok, new_state} ->
            {:reply, {:ok, :game_started}, new_state |> reset_inactivity()}

          {:error, reason} ->
            {:reply, {:error, reason}, state}
        end
    end
  end

  def handle_call({:start_game, _}, _from, state) do
    {:reply, {:error, :invalid_state}, state}
  end

  # --- Get State ---

  @impl true
  def handle_call(:get_state, _from, state) do
    reply = %{
      invite_code: state.invite_code,
      status: state.status,
      players: state.players,
      host_id: state.host_id,
      config: state.config
    }

    {:reply, {:ok, reply}, state}
  end

  # --- Player Reconnect ---

  @impl true
  def handle_call({:player_reconnect, player_id}, _from, state) do
    case find_player(state, player_id) do
      nil ->
        {:reply, {:error, :player_not_found}, state}

      %{connection_status: :disconnected} = player ->
        cancel_timer(player.reconnect_timer)

        updated_players =
          update_player(state.players, player_id, %{
            player
            | connection_status: :connected,
              reconnect_timer: nil
          })

        {:reply, :ok, %{state | players: updated_players} |> reset_inactivity()}

      _player ->
        {:reply, :ok, state}
    end
  end

  # --- Submit Answer ---

  @impl true
  def handle_cast({:submit_answer, player_id, answer_text, answer_time}, %{status: :playing} = state) do
    case Coordinator.submit_answer(state.match, player_id, answer_text, answer_time) do
      {:ok, updated_match, _is_correct, _points} ->
        new_state = %{state | match: updated_match} |> reset_inactivity()

        if Coordinator.all_answered?(updated_match) do
          {:noreply, do_end_round(new_state)}
        else
          {:noreply, new_state}
        end

      {:error, _reason} ->
        {:noreply, state}
    end
  end

  def handle_cast({:submit_answer, _, _, _}, state) do
    {:noreply, state}
  end

  # --- Player Disconnect ---

  @impl true
  def handle_cast({:player_disconnect, player_id}, state) do
    case find_player(state, player_id) do
      nil ->
        {:noreply, state}

      player ->
        reconnect_timer = Process.send_after(self(), {:reconnect_timeout, player_id}, @reconnect_timeout)

        updated_players =
          update_player(state.players, player_id, %{
            player
            | connection_status: :disconnected,
              reconnect_timer: reconnect_timer
          })

        {:noreply, %{state | players: updated_players}}
    end
  end

  # --- Timers ---

  @impl true
  def handle_info(:round_timeout, %{status: :playing} = state) do
    {:noreply, do_end_round(state)}
  end

  def handle_info(:round_timeout, state) do
    {:noreply, state}
  end

  @impl true
  def handle_info(:start_next_round, %{status: :playing} = state) do
    case do_start_round(state) do
      {:ok, new_state} -> {:noreply, new_state}
      {:error, _} -> {:noreply, do_finish(state)}
    end
  end

  def handle_info(:start_next_round, state) do
    {:noreply, state}
  end

  @impl true
  def handle_info({:reconnect_timeout, player_id}, state) do
    case find_player(state, player_id) do
      %{connection_status: :disconnected} ->
        updated_players = Enum.reject(state.players, &(&1.id == player_id))
        new_state = %{state | players: updated_players}

        # Se ficou sem jogadores suficientes durante o jogo, finaliza
        if state.status == :playing and length(updated_players) < 2 do
          {:noreply, do_finish(new_state)}
        else
          {:noreply, new_state}
        end

      _ ->
        {:noreply, state}
    end
  end

  @impl true
  def handle_info(:inactivity_timeout, state) do
    {:stop, :normal, state}
  end

  # --- Lógica interna ---

  defp do_start_game(state) do
    songs = collect_songs(state.players)
    total_songs = Map.get(state.config, :total_songs, length(songs))
    config = Map.put(state.config, :total_songs, total_songs)

    with {:ok, match} <- Coordinator.create_match(state.room_id, state.players, songs, config),
         match <- ready_all_players(match, state.players),
         {:ok, match} <- Coordinator.start_match(match),
         {:ok, match, round} <- Coordinator.start_round(match) do
      timer = schedule_round_timeout(config)

      {:ok,
       %{
         state
         | status: :playing,
           match: match,
           current_round: round,
           round_timer: timer,
           config: config,
           songs: songs
       }}
    end
  end

  defp do_start_round(state) do
    cancel_timer(state.round_timer)

    case Coordinator.start_round(state.match) do
      {:ok, updated_match, round} ->
        timer = schedule_round_timeout(state.config)
        {:ok, %{state | match: updated_match, current_round: round, round_timer: timer}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp do_end_round(state) do
    cancel_timer(state.round_timer)

    case Coordinator.end_round(state.match) do
      {:ok, updated_match, _scores} ->
        new_state = %{state | match: updated_match, round_timer: nil}

        if Coordinator.last_round?(updated_match) do
          do_finish(new_state)
        else
          Process.send_after(self(), :start_next_round, 3_000)
          new_state
        end

      {:error, _reason} ->
        state
    end
  end

  defp do_finish(state) do
    case Coordinator.end_match(state.match) do
      {:ok, updated_match, _scores, _winner} ->
        %{state | status: :finished, match: updated_match}

      {:error, _} ->
        %{state | status: :finished}
    end
  end

  defp ready_all_players(match, players) do
    Enum.reduce(players, match, fn player, acc ->
      case Coordinator.set_player_ready(acc, player.id) do
        {:ok, updated} -> updated
        {:error, _} -> acc
      end
    end)
  end

  defp collect_songs(players) do
    players
    |> Enum.flat_map(fn p -> p.playlist || [] end)
    |> Enum.uniq_by(fn s -> s.id end)
  end

  defp schedule_round_timeout(config) do
    time = Map.get(config, :time_per_round, 30)
    Process.send_after(self(), :round_timeout, time * 1_000)
  end

  defp schedule_inactivity_timeout do
    Process.send_after(self(), :inactivity_timeout, @inactivity_timeout)
  end

  defp reset_inactivity(state) do
    cancel_timer(state.inactivity_timer)
    %{state | inactivity_timer: schedule_inactivity_timeout()}
  end

  defp cancel_timer(nil), do: :ok
  defp cancel_timer(ref), do: Process.cancel_timer(ref)

  defp find_player(state, player_id) do
    Enum.find(state.players, &(&1.id == player_id))
  end

  defp update_player(players, player_id, updated_player) do
    Enum.map(players, fn p ->
      if p.id == player_id, do: updated_player, else: p
    end)
  end

  defp all_players_ready?(state) do
    Enum.all?(state.players, & &1.ready)
  end

  defp new_player(id, name, playlist) do
    %{
      id: id,
      name: name,
      playlist: playlist,
      ready: false,
      connection_status: :connected,
      reconnect_timer: nil
    }
  end

  defp via(invite_code) do
    {:via, Registry, {RoomRegistry.registry_name(), invite_code}}
  end
end
