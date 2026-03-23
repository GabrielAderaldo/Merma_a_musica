# user_socket.ex — Entry Point WebSocket
#
# O QUE É: Socket Phoenix que registra os canais disponíveis.
#
# LIMITES ARQUITETURAIS:
# - Infraestrutura pura — apenas mapeia tópicos para channels
# - NÃO autentica — autenticação é feita no join do channel
#
# RESPONSABILIDADES:
# - Mapear "room:*" → RoomChannel

defmodule GameOrchestratorWeb.UserSocket do
  use Phoenix.Socket

  channel "room:*", GameOrchestratorWeb.RoomChannel

  @impl true
  def connect(_params, socket, _connect_info) do
    {:ok, socket}
  end

  @impl true
  def id(_socket), do: nil
end
