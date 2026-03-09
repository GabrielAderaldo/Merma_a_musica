defmodule GameOrchestrator.Playlist.YouTubeMusic do
  @moduledoc """
  Implementação do behaviour Platform para YouTube Music via YouTube Data API v3.
  Usa OAuth 2.0 do Google (Authorization Code Flow).
  Playlists e tracks são acessados via YouTube Data API.
  """

  @behaviour GameOrchestrator.Playlist.Platform

  @authorize_url "https://accounts.google.com/o/oauth2/v2/auth"
  @token_url "https://oauth2.googleapis.com/token"
  @api_base "https://www.googleapis.com/youtube/v3"

  @impl true
  def authorize_url(state) do
    config = config()

    params =
      URI.encode_query(%{
        client_id: config.client_id,
        redirect_uri: config.redirect_uri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/youtube.readonly",
        access_type: "offline",
        state: state
      })

    "#{@authorize_url}?#{params}"
  end

  @impl true
  def exchange_code(code) do
    config = config()

    case Req.post(@token_url,
           form: [
             code: code,
             client_id: config.client_id,
             client_secret: config.client_secret,
             redirect_uri: config.redirect_uri,
             grant_type: "authorization_code"
           ]
         ) do
      {:ok, %{status: 200, body: body}} ->
        {:ok,
         %{
           access_token: body["access_token"],
           refresh_token: body["refresh_token"]
         }}

      {:ok, %{status: status, body: body}} ->
        {:error, {:youtube_error, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @impl true
  def get_playlists(access_token) do
    params =
      URI.encode_query(%{
        part: "snippet,contentDetails",
        mine: "true",
        maxResults: 50
      })

    case api_get("/playlists?#{params}", access_token) do
      {:ok, body} ->
        playlists =
          Enum.map(body["items"] || [], fn item ->
            %{
              id: item["id"],
              name: get_in(item, ["snippet", "title"]),
              total: get_in(item, ["contentDetails", "itemCount"]) || 0
            }
          end)

        {:ok, playlists}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @impl true
  def get_playlist_tracks(access_token, playlist_id) do
    fetch_all_items(access_token, playlist_id, nil, [])
  end

  defp fetch_all_items(access_token, playlist_id, page_token, acc) do
    params =
      %{
        part: "snippet,contentDetails",
        playlistId: playlist_id,
        maxResults: 50
      }
      |> maybe_put_page_token(page_token)
      |> URI.encode_query()

    case api_get("/playlistItems?#{params}", access_token) do
      {:ok, body} ->
        songs =
          (body["items"] || [])
          |> Enum.filter(fn item ->
            get_in(item, ["snippet", "resourceId", "kind"]) == "youtube#video"
          end)
          |> Enum.map(fn item ->
            video_id = get_in(item, ["snippet", "resourceId", "videoId"])

            %{
              id: video_id,
              name: get_in(item, ["snippet", "title"]) || "",
              artist: get_in(item, ["snippet", "videoOwnerChannelTitle"]) || "",
              preview_url: build_preview_url(video_id),
              duration_ms: 0
            }
          end)

        all = acc ++ songs

        case body["nextPageToken"] do
          nil -> {:ok, all}
          next -> fetch_all_items(access_token, playlist_id, next, all)
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp maybe_put_page_token(params, nil), do: params
  defp maybe_put_page_token(params, token), do: Map.put(params, :pageToken, token)

  defp build_preview_url(nil), do: nil

  defp build_preview_url(video_id) do
    "https://www.youtube.com/watch?v=#{video_id}"
  end

  defp api_get(path, access_token) do
    url = "#{@api_base}#{path}"

    case Req.get(url, headers: [{"authorization", "Bearer #{access_token}"}]) do
      {:ok, %{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %{status: 401}} ->
        {:error, :token_expired}

      {:ok, %{status: 403, body: %{"error" => %{"errors" => [%{"reason" => "quotaExceeded"} | _]}}}} ->
        {:error, :quota_exceeded}

      {:ok, %{status: status, body: body}} ->
        {:error, {:youtube_error, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp config do
    %{
      client_id: Application.get_env(:game_orchestrator, :youtube_client_id, ""),
      client_secret: Application.get_env(:game_orchestrator, :youtube_client_secret, ""),
      redirect_uri: Application.get_env(:game_orchestrator, :youtube_redirect_uri, "")
    }
  end
end
