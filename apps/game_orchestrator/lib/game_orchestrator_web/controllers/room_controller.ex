# room_controller.ex — Controller REST de Salas (Thin Wrapper → Gleam)

defmodule GameOrchestratorWeb.RoomController do
  use Phoenix.Controller, formats: [:json]
  alias GameOrchestratorWeb.ResponseHelper

  # POST /api/v1/rooms
  def create(conn, params) do
    result = :http@room_handler.handle_create_room(params)
    ResponseHelper.execute(conn, result, &serialize_room_created/1)
  end

  # GET /api/v1/rooms/:invite_code
  def show(conn, %{"invite_code" => invite_code}) do
    result = :http@room_handler.handle_get_room(invite_code)
    ResponseHelper.execute(conn, result, &serialize_room_info/1)
  end

  # POST /api/v1/rooms/:invite_code/join
  def join(conn, %{"invite_code" => invite_code} = params) do
    result = :http@room_handler.handle_join_room(invite_code, params)
    ResponseHelper.execute(conn, result, &serialize_join_response/1)
  end

  # ─── Serializers ───

  defp serialize_room_created({:room_created_body, room_id, invite_code, invite_link,
                                host_player_uuid, websocket_url, websocket_topic}) do
    %{
      room_id: room_id,
      invite_code: invite_code,
      invite_link: invite_link,
      host_player_uuid: host_player_uuid,
      websocket_url: websocket_url,
      websocket_topic: websocket_topic
    }
  end

  defp serialize_room_info({:room_info_body, room_id, invite_code, state,
                             player_count, max_players, host_nickname}) do
    %{
      room_id: room_id,
      invite_code: invite_code,
      state: state,
      player_count: player_count,
      max_players: max_players,
      host_nickname: host_nickname
    }
  end

  defp serialize_join_response({:join_room_body, room_id, invite_code,
                                 websocket_url, websocket_topic, player_uuid}) do
    %{
      room_id: room_id,
      invite_code: invite_code,
      websocket_url: websocket_url,
      websocket_topic: websocket_topic,
      player_uuid: player_uuid
    }
  end
end
