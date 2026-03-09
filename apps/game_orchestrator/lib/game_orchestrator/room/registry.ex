defmodule GameOrchestrator.Room.Registry do
  @moduledoc """
  Gerencia criação e lookup de salas via DynamicSupervisor + Registry.
  Cada sala é um GenServer supervisionado individualmente.
  """

  alias GameOrchestrator.Room.Server

  @registry __MODULE__.Registry
  @supervisor __MODULE__.Supervisor

  def registry_name, do: @registry
  def supervisor_name, do: @supervisor

  @doc "Cria uma nova sala e retorna o invite_code."
  def create_room(host_id, host_name, config \\ %{}) do
    invite_code = generate_invite_code()

    case DynamicSupervisor.start_child(
           @supervisor,
           {Server, {invite_code, host_id, host_name, config}}
         ) do
      {:ok, _pid} -> {:ok, invite_code}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc "Busca o PID de uma sala pelo invite_code."
  def lookup(invite_code) do
    case Registry.lookup(@registry, invite_code) do
      [{pid, _}] -> {:ok, pid}
      [] -> {:error, :room_not_found}
    end
  end

  @doc "Lista todas as salas ativas."
  def list_rooms do
    @supervisor
    |> DynamicSupervisor.which_children()
    |> Enum.map(fn {_, pid, _, _} -> pid end)
    |> Enum.filter(&is_pid/1)
  end

  defp generate_invite_code do
    :crypto.strong_rand_bytes(3) |> Base.encode16(case: :upper)
  end
end
