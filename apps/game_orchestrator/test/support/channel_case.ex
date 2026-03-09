defmodule GameOrchestratorWeb.ChannelCase do
  @moduledoc """
  Case template para testes de Phoenix Channels sem dependência de Ecto.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      import Phoenix.ChannelTest
      @endpoint GameOrchestratorWeb.Endpoint
    end
  end

  setup_all do
    # Phoenix Endpoint precisa estar rodando para Channel tests
    case GameOrchestratorWeb.Endpoint.start_link() do
      {:ok, _} -> :ok
      {:error, {:already_started, _}} -> :ok
    end

    :ok
  end

  setup do
    alias GameOrchestrator.Room.Registry, as: RoomRegistry

    start_supervised!({Elixir.Registry, keys: :unique, name: RoomRegistry.registry_name()})
    start_supervised!({DynamicSupervisor, name: RoomRegistry.supervisor_name(), strategy: :one_for_one})

    :ok
  end
end
