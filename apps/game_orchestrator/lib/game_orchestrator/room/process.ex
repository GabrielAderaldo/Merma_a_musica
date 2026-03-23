# room/process.ex — GenServer da Sala (Elixir thin wrapper)
#
# O QUE É: Processo BEAM que mantém o RoomState (Gleam) em memória.
# Recebe comandos como mensagens, chama funções Gleam para processar,
# e executa os efeitos retornados (broadcast, timers, etc.)
#
# LIMITES ARQUITETURAIS:
# - ZERO lógica de negócio — apenas roteia e executa
# - O Gleam (room/commands) decide O QUE fazer
# - O Elixir FAZ (broadcast, timer, etc.)
# - Um processo por sala — sobrevive a desconexões de WebSocket

defmodule GameOrchestrator.Room.Process do
  use GenServer

  # ─── Start ───

  def start_link(initial_state) do
    # O invite_code é usado como nome no Registry
    invite_code = elem(initial_state, 2)  # RoomState tuple: {:room_state, id, invite_code, ...}
    GenServer.start_link(__MODULE__, initial_state, name: via(invite_code))
  end

  def child_spec(initial_state) do
    invite_code = elem(initial_state, 2)
    %{
      id: {__MODULE__, invite_code},
      start: {__MODULE__, :start_link, [initial_state]},
      restart: :temporary,
    }
  end

  # ─── Client API ───

  @doc "Enviar comando síncrono para a sala."
  def call_command(invite_code, command) do
    GenServer.call(via(invite_code), {:command, command})
  catch
    :exit, _ -> {:error, "room_not_found"}
  end

  @doc "Obter estado atual da sala."
  def get_state(invite_code) do
    GenServer.call(via(invite_code), :get_state)
  catch
    :exit, _ -> {:error, "room_not_found"}
  end

  # ─── Server Callbacks ───

  # Timeouts de lifecycle (ms)
  @inactivity_timeout 30 * 60 * 1000     # 30 min — sala waiting sem atividade
  @empty_room_timeout 2 * 60 * 1000      # 2 min — sala sem jogadores
  @results_timeout 5 * 60 * 1000         # 5 min — sala mostrando resultados

  @impl true
  def init(initial_state) do
    invite_code = elem(initial_state, 2)
    Phoenix.PubSub.subscribe(GameOrchestrator.PubSub, "room:#{invite_code}")

    # Iniciar timer de inatividade (30 min)
    Process.send_after(self(), :inactivity_timeout, @inactivity_timeout)

    {:ok, initial_state}
  end

  @impl true
  def handle_call({:command, command}, _from, state) do
    # Despachar comando para o Gleam
    {command_name, args} = command

    result = dispatch_command(command_name, state, args)

    case result do
      # CmdOk(state, effects) → {:cmd_ok, state, effects}
      {:cmd_ok, new_state, effects} ->
        execute_effects(effects, elem(new_state, 2))
        # Reset inactivity timer a cada comando bem-sucedido
        Process.send_after(self(), :inactivity_timeout, @inactivity_timeout)
        {:reply, {:ok, new_state}, new_state}

      # CmdError(state, code, message) → {:cmd_error, state, code, message}
      {:cmd_error, _state, code, message} ->
        {:reply, {:error, code, message}, state}
    end
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    {:reply, {:ok, state}, state}
  end

  @impl true
  def handle_info(message, state) do
    invite_code = elem(state, 2)

    case message do
      # ─── Lifecycle timers ───

      # Sala waiting sem atividade → destruir
      :inactivity_timeout ->
        broadcast_room_destroyed(invite_code, "inactivity")
        {:stop, :normal, state}

      # Sala vazia → destruir (disparado após último jogador sair)
      :empty_room_timeout ->
        # Verificar se realmente está vazia (jogador pode ter reconectado)
        players = elem(state, 4)  # RoomState.players
        case players do
          [] -> {:stop, :normal, state}
          _ -> {:noreply, state}
        end

      # Sala mostrando resultados → voltar ao lobby ou destruir
      :results_timeout ->
        {:stop, :normal, state}

      # ─── Game timers (coordinator) ───

      "start_engine" ->
        handle_coordinator_result(:room@coordinator.start_game(state), invite_code)

      "grace_period_end" ->
        handle_coordinator_result(:room@coordinator.grace_period_ended(state), invite_code)

      "round_timer_end" ->
        handle_coordinator_result(:room@coordinator.round_timer_ended(state), invite_code)

      "next_round" ->
        handle_coordinator_result(:room@coordinator.next_round(state), invite_code)

      "match_ended" ->
        handle_coordinator_result(:room@coordinator.match_ended(state), invite_code)

      "return_to_lobby" ->
        handle_coordinator_result(:room@coordinator.return_to_lobby(state), invite_code)

      "tiebreaker_grace_end" ->
        handle_coordinator_result(:room@coordinator.grace_period_ended(state), invite_code)

      # ─── Player timers ───

      # Timer string: "remove_PLAYERID" — remover jogador desconectado
      "remove_" <> player_id ->
        result = :room@commands.leave(state, player_id)
        case result do
          {:cmd_ok, new_state, effects} ->
            execute_effects(effects, invite_code)
            maybe_schedule_empty_check(new_state)
            {:noreply, new_state}
          {:cmd_error, state, _code, _msg} ->
            {:noreply, state}
        end

      _ ->
        {:noreply, state}
    end
  end

  # ─── Command Dispatch ───

  defp dispatch_command(command_name, state, args) do
    case command_name do
      "join" ->
        {player_id, nickname} = args
        :room@commands.join(state, player_id, nickname)

      "leave" ->
        player_id = args
        :room@commands.leave(state, player_id)

      "set_ready" ->
        {player_id, ready} = args
        :room@commands.set_ready(state, player_id, ready)

      "configure" ->
        {player_id, config} = args
        :room@commands.configure(state, player_id, config)

      "select_playlist" ->
        {player_id, playlist, platform} = args
        :room@commands.select_playlist(state, player_id, playlist, platform)

      "start_game" ->
        player_id = args
        :room@commands.start_game(state, player_id)

      "submit_answer" ->
        {player_id, answer_text, response_time} = args
        # submit_answer vai pelo coordinator (que chama o Engine)
        result = :room@coordinator.submit_answer(state, player_id, answer_text, response_time)
        # Converter CoordinatorResult → CommandResult para o handle_call
        case result do
          {:coordinator_ok, new_state, effects} -> {:cmd_ok, new_state, effects}
          {:coordinator_error, new_state, code, msg} -> {:cmd_error, new_state, code, msg}
        end

      "disconnect" ->
        {player_id, now_ms} = args
        :room@commands.player_disconnected(state, player_id, now_ms)

      "reconnect" ->
        player_id = args
        :room@commands.player_reconnected(state, player_id)

      _ ->
        {:cmd_error, state, "unknown_command", "Comando desconhecido: #{command_name}"}
    end
  end

  # ─── Effect Executor ───

  defp execute_effects(effects, invite_code) when is_list(effects) do
    Enum.each(effects, fn effect -> execute_effect(effect, invite_code) end)
  end

  defp execute_effects(_, _), do: :ok

  # Executa um Effect Gleam.
  # Os effects compilam como tuples Erlang:
  # - Broadcast(event, payload) → {:broadcast, event, payload_tuple}
  # - ScheduleTimer(delay_ms, tag) → {:schedule_timer, delay_ms, tag}
  # ─── Coordinator Result Handler ───

  # Converte CoordinatorResult em {:noreply, state} para GenServer.
  # CoordinatorOk → executa efeitos + atualiza estado
  # CoordinatorError → loga erro (não tem remetente para responder)
  defp handle_coordinator_result(result, invite_code) do
    case result do
      {:coordinator_ok, new_state, effects} ->
        execute_effects(effects, invite_code)
        {:noreply, new_state}

      {:coordinator_error, state, _code, _message} ->
        {:noreply, state}
    end
  end

  # ─── Effect Executor ───
  # - Broadcast(event, payload) → {:broadcast, event, payload_tuple}
  # - ScheduleTimer(delay_ms, tag) → {:schedule_timer, delay_ms, tag}
  # - SendError(code, message) → {:send_error, code, message}
  defp execute_effect(effect, invite_code) do
    case effect do
      {:broadcast, event, payload} ->
        Phoenix.PubSub.broadcast(
          GameOrchestrator.PubSub,
          "room:#{invite_code}",
          {event, payload}
        )

      {:schedule_timer, delay_ms, timer_tag} ->
        Process.send_after(self(), timer_tag, delay_ms)

      {:send_error, _code, _message} ->
        # TODO: enviar erro ao remetente via channel
        :ok

      _ ->
        :ok
    end
  end

  # ─── Lifecycle Helpers ───

  # Se a sala ficou vazia, agendar check de destruição
  defp maybe_schedule_empty_check(state) do
    players = elem(state, 4)
    case players do
      [] -> Process.send_after(self(), :empty_room_timeout, @empty_room_timeout)
      _ -> :ok
    end
  end

  # Broadcast que a sala vai ser destruída
  defp broadcast_room_destroyed(invite_code, reason) do
    Phoenix.PubSub.broadcast(
      GameOrchestrator.PubSub,
      "room:#{invite_code}",
      {"room_destroyed", reason}
    )
  end

  # ─── Registry ───

  defp via(invite_code) do
    {:via, Registry, {GameOrchestrator.RoomRegistry, invite_code}}
  end
end
