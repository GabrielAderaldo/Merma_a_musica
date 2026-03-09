defmodule GameOrchestrator.Playlist.Spotify do
  @moduledoc """
  Implementação do behaviour Platform para Spotify Web API.
  Usa OAuth 2.0 Authorization Code Flow.
  """

  @behaviour GameOrchestrator.Playlist.Platform

  @authorize_url "https://accounts.spotify.com/authorize"
  @token_url "https://accounts.spotify.com/api/token"
  @api_base "https://api.spotify.com/v1"

  @impl true
  def authorize_url(state) do
    config = config()

    params =
      URI.encode_query(%{
        client_id: config.client_id,
        response_type: "code",
        redirect_uri: config.redirect_uri,
        scope: "playlist-read-private playlist-read-collaborative",
        state: state
      })

    "#{@authorize_url}?#{params}"
  end

  @impl true
  def exchange_code(code) do
    config = config()

    case Req.post(@token_url,
           form: [
             grant_type: "authorization_code",
             code: code,
             redirect_uri: config.redirect_uri,
             client_id: config.client_id,
             client_secret: config.client_secret
           ]
         ) do
      {:ok, %{status: 200, body: body}} ->
        {:ok,
         %{
           access_token: body["access_token"],
           refresh_token: body["refresh_token"]
         }}

      {:ok, %{status: status, body: body}} ->
        {:error, {:spotify_error, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @impl true
  def get_playlists(access_token) do
    case api_get("/me/playlists?limit=50", access_token) do
      {:ok, body} ->
        playlists =
          Enum.map(body["items"] || [], fn item ->
            %{
              id: item["id"],
              name: item["name"],
              total: get_in(item, ["tracks", "total"]) || 0
            }
          end)

        {:ok, playlists}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @impl true
  def get_playlist_tracks(access_token, playlist_id) do
    fetch_all_tracks(access_token, "/playlists/#{playlist_id}/tracks?limit=100", [])
  end

  # --- Helpers ---

  defp fetch_all_tracks(access_token, path, acc) do
    case api_get(path, access_token) do
      {:ok, body} ->
        songs =
          body["items"]
          |> Enum.filter(& &1["track"])
          |> Enum.map(fn item ->
            track = item["track"]

            %{
              id: track["id"],
              name: track["name"],
              artist: track["artists"] |> Enum.map(& &1["name"]) |> Enum.join(", "),
              preview_url: track["preview_url"],
              duration_ms: track["duration_ms"] || 0
            }
          end)

        all = acc ++ songs

        case body["next"] do
          nil ->
            {:ok, all}

          next_url ->
            # Spotify retorna URL completa, extraímos o path
            path = next_url |> URI.parse() |> then(&("#{&1.path}?#{&1.query}"))
            path = String.replace_prefix(path, "/v1", "")
            fetch_all_tracks(access_token, path, all)
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp api_get(path, access_token) do
    url = "#{@api_base}#{path}"

    case Req.get(url, headers: [{"authorization", "Bearer #{access_token}"}]) do
      {:ok, %{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %{status: 401}} ->
        {:error, :token_expired}

      {:ok, %{status: status, body: body}} ->
        {:error, {:spotify_error, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp config do
    %{
      client_id: Application.get_env(:game_orchestrator, :spotify_client_id, ""),
      client_secret: Application.get_env(:game_orchestrator, :spotify_client_secret, ""),
      redirect_uri: Application.get_env(:game_orchestrator, :spotify_redirect_uri, "")
    }
  end
end
