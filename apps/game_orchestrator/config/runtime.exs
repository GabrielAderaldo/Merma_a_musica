# runtime.exs — Configuração em runtime (lê variáveis de ambiente)

import Config

if config_env() == :prod do
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise "SECRET_KEY_BASE not set"

  host = System.get_env("PHX_HOST") || "merma-api.caninhagames.fortal.br"
  port = String.to_integer(System.get_env("PORT") || "4000")

  config :game_orchestrator, GameOrchestratorWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [ip: {0, 0, 0, 0}, port: port],
    secret_key_base: secret_key_base,
    server: true
end
