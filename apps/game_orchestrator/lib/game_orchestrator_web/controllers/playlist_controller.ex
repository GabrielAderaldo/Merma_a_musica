defmodule GameOrchestratorWeb.PlaylistController do
  use GameOrchestratorWeb, :controller

  alias GameOrchestrator.Playlist

  @doc "GET /api/platforms — Lista plataformas suportadas."
  def platforms(conn, _params) do
    json(conn, %{platforms: Playlist.supported_platforms()})
  end

  @doc "GET /api/auth/:platform — Retorna URL de autorização."
  def auth_url(conn, %{"platform" => platform} = params) do
    state = Map.get(params, "state", "")

    case Playlist.authorize_url(platform, state) do
      {:ok, url} ->
        json(conn, %{url: url})

      {:error, :unsupported_platform} ->
        conn |> put_status(:bad_request) |> json(%{error: "unsupported platform: #{platform}"})
    end
  end

  @doc "POST /api/auth/:platform/callback — Troca code por tokens."
  def auth_callback(conn, %{"platform" => platform, "code" => code}) do
    case Playlist.exchange_code(platform, code) do
      {:ok, tokens} ->
        json(conn, %{access_token: tokens.access_token})

      {:error, :unsupported_platform} ->
        conn |> put_status(:bad_request) |> json(%{error: "unsupported platform: #{platform}"})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: inspect(reason)})
    end
  end

  def auth_callback(conn, %{"platform" => _platform}) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "missing code parameter"})
  end

  @doc "GET /api/playlists/:platform — Lista playlists do usuário."
  def index(conn, %{"platform" => platform}) do
    case get_access_token(conn) do
      nil ->
        conn |> put_status(:unauthorized) |> json(%{error: "missing access_token"})

      token ->
        case Playlist.get_playlists(platform, token) do
          {:ok, playlists} ->
            json(conn, %{playlists: playlists})

          {:error, :unsupported_platform} ->
            conn |> put_status(:bad_request) |> json(%{error: "unsupported platform: #{platform}"})

          {:error, :token_expired} ->
            conn |> put_status(:unauthorized) |> json(%{error: "token_expired"})

          {:error, reason} ->
            conn |> put_status(:bad_gateway) |> json(%{error: inspect(reason)})
        end
    end
  end

  @doc "GET /api/playlists/:platform/:id/songs — Músicas válidas de uma playlist."
  def songs(conn, %{"platform" => platform, "id" => playlist_id}) do
    case get_access_token(conn) do
      nil ->
        conn |> put_status(:unauthorized) |> json(%{error: "missing access_token"})

      token ->
        case Playlist.get_playlist_songs(platform, token, playlist_id) do
          {:ok, songs} ->
            json(conn, %{songs: songs, total: length(songs)})

          {:error, :unsupported_platform} ->
            conn |> put_status(:bad_request) |> json(%{error: "unsupported platform: #{platform}"})

          {:error, :token_expired} ->
            conn |> put_status(:unauthorized) |> json(%{error: "token_expired"})

          {:error, reason} ->
            conn |> put_status(:bad_gateway) |> json(%{error: inspect(reason)})
        end
    end
  end

  defp get_access_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> token
      _ -> nil
    end
  end
end
