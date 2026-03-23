# config.exs — Configuração base (todos os ambientes)

import Config

config :game_orchestrator, GameOrchestratorWeb.Endpoint,
  url: [host: "localhost"],
  render_errors: [formats: [json: GameOrchestratorWeb.ErrorJSON], layout: false],
  pubsub_server: GameOrchestrator.PubSub

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

import_config "#{config_env()}.exs"
