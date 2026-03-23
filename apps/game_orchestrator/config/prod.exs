# prod.exs — Configuração de produção

import Config

config :game_orchestrator, GameOrchestratorWeb.Endpoint,
  url: [host: "merma-api.caninhagames.fortal.br", port: 443, scheme: "https"],
  check_origin: [
    "https://merma.caninhagames.fortal.br",
    "https://merma-api.caninhagames.fortal.br",
  ]

config :logger, level: :info
