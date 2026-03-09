defmodule GameOrchestrator.Playlist.Deezer do
  @moduledoc """
  Implementação do behaviour Platform para Deezer API.
  Usa OAuth 2.0 Authorization Code Flow.
  """

  @behaviour GameOrchestrator.Playlist.Platform

  @authorize_url "https://connect.deezer.com/oauth/auth.php"
  @token_url "https://connect.deezer.com/oauth/access_token.php"
  @api_base "https://api.deezer.com"

  @impl true
  def authorize_url(state) do
    config = config()

    params =
      URI.encode_query(%{
        app_id: config.app_id,
        redirect_uri: config.redirect_uri,
        perms: "basic_access,manage_library",
        state: state
      })

    "#{@authorize_url}?#{params}"
  end

  @impl true
  def exchange_code(code) do
    config = config()

    params =
      URI.encode_query(%{
        app_id: config.app_id,
        secret: config.secret,
        code: code,
        output: "json"
      })

    case Req.get("#{@token_url}?#{params}") do
      {:ok, %{status: 200, body: body}} when is_map(body) ->
        case body do
          %{"access_token" => token} ->
            {:ok, %{access_token: token, refresh_token: nil}}

          %{"error_reason" => reason} ->
            {:error, {:deezer_error, reason}}

          _ ->
            {:error, {:deezer_error, :unexpected_response}}
        end

      {:ok, %{status: status, body: body}} ->
        {:error, {:deezer_error, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @impl true
  def get_playlists(access_token) do
    case api_get("/user/me/playlists", access_token) do
      {:ok, body} ->
        playlists =
          Enum.map(body["data"] || [], fn item ->
            %{
              id: to_string(item["id"]),
              name: item["title"],
              total: item["nb_tracks"] || 0
            }
          end)

        {:ok, playlists}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @impl true
  def get_playlist_tracks(access_token, playlist_id) do
    fetch_all_tracks(access_token, "/playlist/#{playlist_id}/tracks?limit=100", [])
  end

  defp fetch_all_tracks(access_token, path, acc) do
    case api_get(path, access_token) do
      {:ok, body} ->
        songs =
          (body["data"] || [])
          |> Enum.map(fn track ->
            %{
              id: to_string(track["id"]),
              name: track["title"],
              artist: get_in(track, ["artist", "name"]) || "",
              preview_url: track["preview"],
              duration_ms: (track["duration"] || 0) * 1000
            }
          end)

        all = acc ++ songs

        case body["next"] do
          nil ->
            {:ok, all}

          next_url ->
            uri = URI.parse(next_url)
            path = "#{uri.path}?#{uri.query}"
            fetch_all_tracks(access_token, path, all)
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp api_get(path, access_token) do
    separator = if String.contains?(path, "?"), do: "&", else: "?"
    url = "#{@api_base}#{path}#{separator}access_token=#{access_token}"

    case Req.get(url) do
      {:ok, %{status: 200, body: %{"error" => %{"code" => 300}}}} ->
        {:error, :token_expired}

      {:ok, %{status: 200, body: %{"error" => error}}} ->
        {:error, {:deezer_error, error}}

      {:ok, %{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        {:error, {:deezer_error, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp config do
    %{
      app_id: Application.get_env(:game_orchestrator, :deezer_app_id, ""),
      secret: Application.get_env(:game_orchestrator, :deezer_secret, ""),
      redirect_uri: Application.get_env(:game_orchestrator, :deezer_redirect_uri, "")
    }
  end
end
