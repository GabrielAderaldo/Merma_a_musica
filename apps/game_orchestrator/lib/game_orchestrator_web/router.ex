# router.ex — Phoenix Router
#
# O QUE É: Mapeamento de rotas HTTP para controllers.
#
# LIMITES ARQUITETURAIS:
# - Apenas mapeamento — NÃO contém lógica
# - Controllers são thin wrappers que delegam para Gleam handlers
# - Rotas seguem o contrato definido em Openapi.yaml
#
# RESPONSABILIDADES:
# - /api/v1/* → controllers REST
# - /auth/* → auth controller (OAuth callbacks)
# - /health → health controller

defmodule GameOrchestratorWeb.Router do
  use Phoenix.Router

  pipeline :api do
    plug :accepts, ["json"]
  end

  # Health check
  scope "/", GameOrchestratorWeb do
    pipe_through :api
    get "/health", HealthController, :index
  end

  # API v1
  scope "/api/v1", GameOrchestratorWeb do
    pipe_through :api

    # Salas
    post "/rooms", RoomController, :create
    get "/rooms/:invite_code", RoomController, :show
    post "/rooms/:invite_code/join", RoomController, :join

    # Auth OAuth
    get "/auth/:platform/login", AuthController, :login
    get "/auth/:platform/callback", AuthController, :callback
    post "/auth/:platform/refresh", AuthController, :refresh

    # Playlists
    get "/playlists/:platform", PlaylistController, :index
    post "/playlists/:platform/:playlist_id/import", PlaylistController, :import
    get "/playlists/validated", PlaylistController, :validated

    # Áudio
    get "/audio/:audio_token", AudioController, :stream
    get "/audio/preview/:deezer_track_id", AudioController, :preview
  end
end
