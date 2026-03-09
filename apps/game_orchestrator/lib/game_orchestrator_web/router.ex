defmodule GameOrchestratorWeb.Router do
  use GameOrchestratorWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  # Health check (sem pipeline para ser mais leve)
  get "/health", GameOrchestratorWeb.HealthController, :index

  # OAuth callback (GET redirect dos providers — fora do /api)
  scope "/auth", GameOrchestratorWeb do
    pipe_through :api
    get "/:platform/callback", PlaylistController, :auth_callback
  end

  scope "/api", GameOrchestratorWeb do
    pipe_through :api

    post "/rooms", RoomController, :create
    get "/rooms/:code", RoomController, :show

    # Plataformas suportadas
    get "/platforms", PlaylistController, :platforms

    # Auth OAuth por plataforma (spotify, deezer, youtube_music)
    get "/auth/:platform", PlaylistController, :auth_url
    get "/auth/:platform/callback", PlaylistController, :auth_callback

    # Playlists e songs por plataforma
    get "/playlists/:platform", PlaylistController, :index
    get "/playlists/:platform/:id/songs", PlaylistController, :songs
  end
end
