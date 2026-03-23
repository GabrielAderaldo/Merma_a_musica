# application.ex — Supervisor Tree
#
# O QUE É: Entry point da aplicação OTP. Inicia toda a infraestrutura
# que o Gleam consome via phoenix_bridge.
#
# LIMITES ARQUITETURAIS:
# - Apenas inicia supervisores, registries e o endpoint Phoenix
# - NÃO inicia lógica de negócio — isso é feito pelo Gleam quando necessário
# - SEM Ecto.Repo — sem banco de dados no MVP
#
# RESPONSABILIDADES:
# - Iniciar Phoenix.PubSub (para broadcast de eventos)
# - Iniciar Registry (para lookup de salas por invite_code)
# - Iniciar DynamicSupervisor (para processos de salas)
# - Criar tabelas ETS (cache de playlists, ISRC→Deezer, audio tokens)
# - Iniciar Phoenix Endpoint (HTTP + WebSocket)

defmodule GameOrchestrator.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # PubSub para broadcast de eventos entre processos
      {Phoenix.PubSub, name: GameOrchestrator.PubSub},

      # Registry para lookup de salas por invite_code
      {Registry, keys: :unique, name: GameOrchestrator.RoomRegistry},

      # DynamicSupervisor para processos de salas
      {DynamicSupervisor, name: GameOrchestrator.RoomSupervisor, strategy: :one_for_one},

      # Phoenix Endpoint (HTTP + WebSocket)
      GameOrchestratorWeb.Endpoint,
    ]

    opts = [strategy: :one_for_one, name: GameOrchestrator.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
