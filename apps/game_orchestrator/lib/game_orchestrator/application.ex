defmodule GameOrchestrator.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    repo_children =
      if Application.get_env(:game_orchestrator, :skip_repo, false),
        do: [],
        else: [GameOrchestrator.Repo]

    children = [
      GameOrchestratorWeb.Telemetry
    ] ++ repo_children ++ [
      {DNSCluster, query: Application.get_env(:game_orchestrator, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: GameOrchestrator.PubSub},
      # Cache ETS para playlists importadas
      GameOrchestrator.Playlist.Cache,
      # Room Registry + DynamicSupervisor para salas de jogo
      {Registry, keys: :unique, name: GameOrchestrator.Room.Registry.registry_name()},
      {DynamicSupervisor, name: GameOrchestrator.Room.Registry.supervisor_name(), strategy: :one_for_one},
      # Start to serve requests, typically the last entry
      GameOrchestratorWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: GameOrchestrator.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    GameOrchestratorWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
