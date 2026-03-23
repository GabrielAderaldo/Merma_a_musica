# telemetry.ex — Métricas e Telemetria
#
# O QUE É: Configuração de métricas do Phoenix.
#
# LIMITES ARQUITETURAIS:
# - Infraestrutura de observabilidade — sem lógica de negócio
#
# RESPONSABILIDADES:
# - Métricas HTTP (request count, duration)
# - Métricas WebSocket (connections, messages)
# - Métricas de VM (memory, processes)

defmodule GameOrchestratorWeb.Telemetry do
  use Supervisor

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    children = []
    Supervisor.init(children, strategy: :one_for_one)
  end
end
