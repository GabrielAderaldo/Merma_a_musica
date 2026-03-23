# event_serializer.ex — Serialização de OutboundEvent Gleam → JSON map
#
# O QUE É: Converte tuples Erlang (geradas pelos custom types Gleam)
# em {event_name_string, json_map} que o Phoenix Channel sabe enviar.
#
# LIMITES ARQUITETURAIS:
# - APENAS serialização — zero lógica de negócio
# - Cada clause corresponde a um variant do OutboundEvent (types.gleam)
# - Se um novo evento for adicionado no Gleam, adicionar clause aqui
# - Centraliza TODA conversão Gleam→JSON num único lugar
#
# COMO OS TIPOS GLEAM COMPILAM PARA ERLANG:
# - RoomStateEvent(payload) → {:room_state_event, payload_tuple}
# - PlayerPayload(uuid, nick, host, ready, conn, has_pl, platform)
#   → {:player_payload, uuid, nick, host, ready, conn, has_pl, platform}
# - Option(Some(x)) → {:some, x}
# - Option(None) → :none

defmodule GameOrchestratorWeb.EventSerializer do

  @doc """
  Converte OutboundEvent em {event_name, map_payload}.
  Usado pelo Channel para broadcast!/push com nome do evento.
  """
  def to_event(outbound_event) do
    {name, data} = serialize(outbound_event)
    {name, data}
  end

  @doc """
  Converte OutboundEvent em map (sem o nome do evento).
  Usado no join reply.
  """
  def to_map(outbound_event) do
    {_name, data} = serialize(outbound_event)
    data
  end

  # ═══════════════════════════════════════════════════════════════
  # LOBBY EVENTS
  # ═══════════════════════════════════════════════════════════════

  defp serialize({:room_state_event, payload}) do
    {"room_state", serialize_room_state(payload)}
  end

  defp serialize({:player_joined_event, player}) do
    {"player_joined", %{player: serialize_player(player)}}
  end

  defp serialize({:player_left_event, player_uuid, reason}) do
    {"player_left", %{player_uuid: player_uuid, reason: serialize_leave_reason(reason)}}
  end

  defp serialize({:player_ready_changed_event, player_uuid, ready}) do
    {"player_ready_changed", %{player_uuid: player_uuid, ready: ready}}
  end

  defp serialize({:config_updated_event, config, song_range}) do
    {"config_updated", %{
      config: serialize_match_config(config),
      song_range: serialize_song_range(song_range)
    }}
  end

  defp serialize({:host_changed_event, new_host_uuid, new_host_nickname}) do
    {"host_changed", %{new_host_uuid: new_host_uuid, new_host_nickname: new_host_nickname}}
  end

  # ═══════════════════════════════════════════════════════════════
  # GAME EVENTS
  # ═══════════════════════════════════════════════════════════════

  defp serialize({:game_starting_event, countdown_seconds}) do
    {"game_starting", %{countdown_seconds: countdown_seconds}}
  end

  defp serialize({:round_starting_event, payload}) do
    {"round_starting", serialize_round_starting(payload)}
  end

  defp serialize({:timer_started_event, duration_seconds}) do
    {"timer_started", %{duration_seconds: duration_seconds}}
  end

  defp serialize({:answer_confirmed_event, player_uuid}) do
    {"answer_confirmed", %{player_uuid: player_uuid}}
  end

  defp serialize({:player_voted_skip_event, player_uuid, skip_votes, votes_needed}) do
    {"player_voted_skip", %{
      player_uuid: player_uuid,
      skip_votes: skip_votes,
      votes_needed: votes_needed
    }}
  end

  defp serialize({:round_ended_event, payload}) do
    {"round_ended", serialize_round_ended(payload)}
  end

  defp serialize({:game_ended_event, payload}) do
    {"game_ended", serialize_game_ended(payload)}
  end

  defp serialize({:autocomplete_results_event, query, results}) do
    {"autocomplete_results", %{
      query: query,
      results: Enum.map(results, &serialize_autocomplete_entry/1)
    }}
  end

  # ═══════════════════════════════════════════════════════════════
  # SYSTEM EVENTS
  # ═══════════════════════════════════════════════════════════════

  defp serialize({:error_event, code, message}) do
    {"error", %{code: code, message: message}}
  end

  # ═══════════════════════════════════════════════════════════════
  # PAYLOAD SERIALIZERS
  # ═══════════════════════════════════════════════════════════════

  defp serialize_room_state({:room_state_payload, room_id, invite_code, state,
                             host_player_uuid, config, players, song_range}) do
    %{
      room_id: room_id,
      invite_code: invite_code,
      state: state,
      host_player_uuid: host_player_uuid,
      config: serialize_match_config(config),
      players: Enum.map(players, &serialize_player/1),
      song_range: serialize_song_range(song_range)
    }
  end

  defp serialize_player({:player_payload, uuid, nickname, is_host, ready,
                          connection_status, has_playlist, platform}) do
    %{
      player_uuid: uuid,
      nickname: nickname,
      is_host: is_host,
      ready: ready,
      connection_status: serialize_connection_status(connection_status),
      has_playlist: has_playlist,
      platform: serialize_option(platform, &serialize_platform/1)
    }
  end

  defp serialize_match_config({:match_config_payload, time_per_round, total_songs,
                                answer_type, allow_repeats, scoring_rule}) do
    %{
      time_per_round: time_per_round,
      total_songs: total_songs,
      answer_type: serialize_answer_type(answer_type),
      allow_repeats: allow_repeats,
      scoring_rule: serialize_scoring_rule(scoring_rule)
    }
  end

  defp serialize_song_range({:song_range_payload, min, max, current_players, players_with_playlist}) do
    %{
      min: min,
      max: max,
      current_players: current_players,
      players_with_playlist: players_with_playlist
    }
  end

  defp serialize_round_starting({:round_starting_payload, round_index, total_rounds,
                                  audio_token, audio_source, grace_period_seconds}) do
    %{
      round_index: round_index,
      total_rounds: total_rounds,
      audio_token: audio_token,
      audio_source: serialize_audio_source(audio_source),
      grace_period_seconds: grace_period_seconds
    }
  end

  defp serialize_round_ended({:round_ended_payload, round_index, song, answers,
                               scores, next_round_in_seconds}) do
    %{
      round_index: round_index,
      song: serialize_revealed_song(song),
      answers: Enum.map(answers, &serialize_player_answer/1),
      scores: gleam_dict_to_map(scores),
      next_round_in_seconds: next_round_in_seconds
    }
  end

  defp serialize_revealed_song({:revealed_song_payload, name, artist, album, cover_url, contributed_by}) do
    %{name: name, artist: artist, album: album, cover_url: cover_url, contributed_by: contributed_by}
  end

  defp serialize_player_answer({:player_answer_payload, uuid, nickname, answer_text,
                                 is_correct, points_earned, response_time}) do
    %{
      player_uuid: uuid,
      nickname: nickname,
      answer_text: answer_text,
      is_correct: is_correct,
      points_earned: points_earned,
      response_time: serialize_option(response_time, & &1)
    }
  end

  defp serialize_game_ended({:game_ended_payload, final_scores, ranking,
                              highlights, return_to_lobby_in_seconds}) do
    %{
      final_scores: gleam_dict_to_map(final_scores),
      ranking: Enum.map(ranking, &serialize_ranking_entry/1),
      highlights: serialize_highlights(highlights),
      return_to_lobby_in_seconds: return_to_lobby_in_seconds
    }
  end

  defp serialize_ranking_entry({:ranking_entry_payload, position, uuid, nickname,
                                 total_points, correct_answers, avg_response_time}) do
    %{
      position: position,
      player_uuid: uuid,
      nickname: nickname,
      total_points: total_points,
      correct_answers: correct_answers,
      avg_response_time: serialize_option(avg_response_time, & &1)
    }
  end

  defp serialize_highlights({:highlights_payload, best_streak, fastest_answer, most_correct}) do
    %{
      best_streak: serialize_option(best_streak, &serialize_highlight_streak/1),
      fastest_answer: serialize_option(fastest_answer, &serialize_highlight_fastest/1),
      most_correct: serialize_option(most_correct, &serialize_highlight_most_correct/1)
    }
  end

  defp serialize_highlight_streak({:highlight_streak_payload, uuid, nickname, streak}) do
    %{player_uuid: uuid, nickname: nickname, streak: streak}
  end

  defp serialize_highlight_fastest({:highlight_fastest_payload, uuid, nickname, time, song_name}) do
    %{player_uuid: uuid, nickname: nickname, time: time, song_name: song_name}
  end

  defp serialize_highlight_most_correct({:highlight_most_correct_payload, uuid, nickname, count}) do
    %{player_uuid: uuid, nickname: nickname, count: count}
  end

  defp serialize_autocomplete_entry({:autocomplete_entry, text, result_type}) do
    %{text: text, type: serialize_autocomplete_type(result_type)}
  end

  # ═══════════════════════════════════════════════════════════════
  # ENUM SERIALIZERS
  # ═══════════════════════════════════════════════════════════════

  defp serialize_connection_status(:status_connected), do: "connected"
  defp serialize_connection_status(:status_disconnected), do: "disconnected"
  defp serialize_connection_status(:status_reconnecting), do: "reconnecting"

  defp serialize_leave_reason(:voluntary), do: "voluntary"
  defp serialize_leave_reason(:timeout), do: "timeout"
  defp serialize_leave_reason(:kicked), do: "kicked"

  defp serialize_audio_source(:deezer), do: "deezer"
  defp serialize_audio_source(:spotify_sdk), do: "spotify_sdk"

  defp serialize_platform(:spotify), do: "spotify"
  defp serialize_platform(:platform_deezer), do: "deezer"
  defp serialize_platform(:youtube_music), do: "youtube_music"

  defp serialize_answer_type(:song), do: "song"
  defp serialize_answer_type(:artist), do: "artist"
  defp serialize_answer_type(:answer_both), do: "both"

  defp serialize_scoring_rule(:scoring_simple), do: "simple"
  defp serialize_scoring_rule(:scoring_speed_bonus), do: "speed_bonus"

  defp serialize_autocomplete_type(:autocomplete_song), do: "song"
  defp serialize_autocomplete_type(:autocomplete_artist), do: "artist"

  # ═══════════════════════════════════════════════════════════════
  # HELPERS
  # ═══════════════════════════════════════════════════════════════

  # Gleam Option: Some(x) → {:some, x}, None → :none
  defp serialize_option(:none, _fun), do: nil
  defp serialize_option({:some, value}, fun), do: fun.(value)

  # Gleam Dict → Elixir Map
  defp gleam_dict_to_map(gleam_dict) do
    gleam_dict
    |> :gleam@dict.to_list()
    |> Map.new()
  end
end
