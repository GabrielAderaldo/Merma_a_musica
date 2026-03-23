# endpoint.ex — Phoenix Endpoint
#
# O QUE É: Configuração do servidor HTTP + WebSocket.
#
# LIMITES ARQUITETURAIS:
# - Infraestrutura pura — configuração de plugs e socket
# - NÃO contém lógica de negócio
#
# RESPONSABILIDADES:
# - Configurar WebSocket path (/socket)
# - Configurar plugs HTTP (parsers, CORS, router)
# - Servir em porta configurável (default 4000)

defmodule GameOrchestratorWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :game_orchestrator

  socket "/socket", GameOrchestratorWeb.UserSocket,
    websocket: [timeout: 45_000],
    longpoll: false

  plug Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason

  plug CORSPlug
  plug GameOrchestratorWeb.Router
end
