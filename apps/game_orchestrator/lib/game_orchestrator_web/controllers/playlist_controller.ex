# playlist_controller.ex — Controller REST de Playlists (Thin Wrapper → Gleam)

defmodule GameOrchestratorWeb.PlaylistController do
  use Phoenix.Controller, formats: [:json]
  alias GameOrchestratorWeb.ResponseHelper

  # GET /api/v1/playlists/:platform
  def index(conn, %{"platform" => platform}) do
    access_token = get_req_header(conn, "access_token") |> List.first("")
    result = :http@playlist_handler.handle_list_playlists(platform, access_token)
    ResponseHelper.execute(conn, result, &serialize_playlists/1)
  end

  # POST /api/v1/playlists/:platform/:playlist_id/import
  def import(conn, %{"platform" => platform, "playlist_id" => playlist_id}) do
    access_token = get_req_header(conn, "access_token") |> List.first("")
    result = :http@playlist_handler.handle_import_playlist(platform, playlist_id, access_token)
    ResponseHelper.execute(conn, result, &passthrough_map/1)
  end

  # GET /api/v1/playlists/validated
  def validated(conn, _params) do
    player_uuid = get_req_header(conn, "player_uuid") |> List.first("")
    result = :http@playlist_handler.handle_get_validated(player_uuid)
    ResponseHelper.execute(conn, result, &passthrough_map/1)
  end

  # ─── Serializers ───

  defp serialize_playlists(playlists_body) do
    # TODO: serializar quando os tipos Gleam estiverem definidos
    %{playlists: playlists_body}
  end

  defp passthrough_map(body), do: body
end
