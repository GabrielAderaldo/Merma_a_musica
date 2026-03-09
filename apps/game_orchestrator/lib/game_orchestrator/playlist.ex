defmodule GameOrchestrator.Playlist do
  @moduledoc """
  Facade para o contexto de Playlist Integration.
  Coordena autenticação, importação e filtragem de playlists.
  Suporta múltiplas plataformas: Spotify, Deezer e YouTube Music.
  """

  alias GameOrchestrator.Playlist.{Cache, SongFilter}

  @platforms %{
    "spotify" => GameOrchestrator.Playlist.Spotify,
    "deezer" => GameOrchestrator.Playlist.Deezer,
    "youtube_music" => GameOrchestrator.Playlist.YouTubeMusic
  }

  @doc "Retorna as plataformas suportadas."
  def supported_platforms, do: Map.keys(@platforms)

  @doc "Retorna a URL de autorização OAuth da plataforma."
  def authorize_url(platform_name, state \\ "") do
    case resolve_platform(platform_name) do
      {:ok, mod} -> {:ok, mod.authorize_url(state)}
      error -> error
    end
  end

  @doc "Troca o authorization code por tokens."
  def exchange_code(platform_name, code) do
    case resolve_platform(platform_name) do
      {:ok, mod} -> mod.exchange_code(code)
      error -> error
    end
  end

  @doc "Lista as playlists do usuário. Usa cache se disponível."
  def get_playlists(platform_name, access_token) do
    case resolve_platform(platform_name) do
      {:ok, mod} ->
        cache_key = {:playlists, platform_name, access_token}

        case Cache.get(cache_key) do
          {:ok, cached} ->
            {:ok, cached}

          :miss ->
            case mod.get_playlists(access_token) do
              {:ok, playlists} ->
                Cache.put(cache_key, playlists)
                {:ok, playlists}

              error ->
                error
            end
        end

      error ->
        error
    end
  end

  @doc """
  Retorna as músicas válidas de uma playlist (com preview_url),
  já normalizadas para o formato do jogo. Usa cache.
  """
  def get_playlist_songs(platform_name, access_token, playlist_id) do
    case resolve_platform(platform_name) do
      {:ok, mod} ->
        cache_key = {:songs, platform_name, playlist_id}

        case Cache.get(cache_key) do
          {:ok, cached} ->
            {:ok, cached}

          :miss ->
            case mod.get_playlist_tracks(access_token, playlist_id) do
              {:ok, tracks} ->
                songs = SongFilter.normalize(tracks)
                Cache.put(cache_key, songs)
                {:ok, songs}

              error ->
                error
            end
        end

      error ->
        error
    end
  end

  @doc false
  def resolve_platform(name) do
    case platform_override() do
      nil ->
        case Map.fetch(@platforms, name) do
          {:ok, mod} -> {:ok, mod}
          :error -> {:error, :unsupported_platform}
        end

      mod ->
        {:ok, mod}
    end
  end

  defp platform_override do
    Application.get_env(:game_orchestrator, :playlist_platform)
  end
end
