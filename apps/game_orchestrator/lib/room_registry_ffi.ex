# room_registry_ffi.ex — FFI para o room/registry.gleam
#
# Funções que o Gleam chama via @external.
# Gerencia processos de sala via DynamicSupervisor + Registry.

defmodule :room_registry_ffi do
  @chars ~c"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

  @doc "Gerar invite_code de 6 caracteres alfanuméricos maiúsculos."
  def generate_invite_code do
    1..6
    |> Enum.map(fn _ -> Enum.random(@chars) end)
    |> List.to_string()
  end

  @doc "Iniciar processo GenServer da sala via DynamicSupervisor."
  def start_room_process(initial_state) do
    case DynamicSupervisor.start_child(
      GameOrchestrator.RoomSupervisor,
      {GameOrchestrator.Room.Process, initial_state}
    ) do
      {:ok, _pid} -> {:ok, nil}
      {:error, reason} -> {:error, inspect(reason)}
    end
  end

  @doc "Buscar sala por invite_code no Registry."
  def lookup_room(invite_code) do
    case Registry.lookup(GameOrchestrator.RoomRegistry, invite_code) do
      [{_pid, _}] -> {:ok, nil}
      [] -> {:error, "room_not_found"}
    end
  end

  @doc "Parar processo da sala."
  def stop_room_process(invite_code) do
    case Registry.lookup(GameOrchestrator.RoomRegistry, invite_code) do
      [{pid, _}] ->
        DynamicSupervisor.terminate_child(GameOrchestrator.RoomSupervisor, pid)
        {:ok, nil}
      [] ->
        {:error, "room_not_found"}
    end
  end
end
