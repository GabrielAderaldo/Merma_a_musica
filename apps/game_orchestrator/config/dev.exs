# dev.exs — Configuração de desenvolvimento

import Config

config :game_orchestrator, GameOrchestratorWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}, port: 4000],
  check_origin: false,
  code_reloader: false,
  debug_errors: true,
  secret_key_base: "dev-secret-key-base-that-is-at-least-64-bytes-long-for-phoenix-to-accept-it-ok",
  server: true

config :logger, level: :debug
