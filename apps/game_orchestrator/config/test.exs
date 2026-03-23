# test.exs — Configuração de testes
#
# NOTA: Sem banco de dados. Tudo in-memory.

import Config

config :game_orchestrator, GameOrchestratorWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "test-secret-key-base-that-is-at-least-64-bytes-long-for-phoenix-to-accept-it-ok-test",
  server: false

config :logger, level: :warning
