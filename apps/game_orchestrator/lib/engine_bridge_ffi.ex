# engine_bridge_ffi.ex — FFI para room/engine_bridge.gleam
#
# Faz a ponte entre o Orchestrator (Gleam) e o Game Engine (Gleam em outro package).
# Converte tipos Room → Engine, chama funções do Engine, converte resultados de volta.
#
# Os tipos Gleam compilam para tuples Erlang:
#   Player(id, name, playlist, state, score) → {:player, id, name, playlist, state, score}
#   Song(id, name, artist, album, preview_url, duration) → {:song, id, name, artist, album, url, dur}
#   etc.
#
# Módulos Engine:
#   :game_engine — facade (new_match, start_match, start_round, submit_answer, etc.)
#   :"game_engine@domain@services@song_selection" — select_songs

defmodule :engine_bridge_ffi do

  # ─── Utilitários ───

  @doc "Embaralhar lista."
  def shuffle_list(list) when is_list(list), do: Enum.shuffle(list)

  @doc "Gerar UUID v4."
  def generate_uuid do
    <<a::32, b::16, c::16, d::16, e::48>> = :crypto.strong_rand_bytes(16)
    c = Bitwise.bor(Bitwise.band(c, 0x0FFF), 0x4000)
    d = Bitwise.bor(Bitwise.band(d, 0x3FFF), 0x8000)

    :io_lib.format(~c"~8.16.0b-~4.16.0b-~4.16.0b-~4.16.0b-~12.16.0b", [a, b, c, d, e])
    |> List.to_string()
    |> String.downcase()
  end

  # ─── Start Game (sequência completa) ───

  @doc """
  Orquestra toda a sequência de início de jogo:
  1. Converte PlayerInRoom → Engine Player (com Playlist do Dynamic)
  2. Embaralha tracks de cada playlist
  3. Chama song_selection.select_songs
  4. Chama game_engine.new_match
  5. Chama game_engine.set_player_ready para cada jogador
  6. Chama game_engine.start_match
  7. Chama game_engine.start_round (primeira rodada)
  8. Retorna StartGameResult

  Recebe RoomConfig e PlayerInRoom como tuples Gleam nativos.
  """
  def start_game(room_id, room_config, players_in_room) do
    try do
      # 1. Converter config
      engine_config = convert_config(room_config)

      # 2. Converter jogadores (PlayerInRoom → Engine Player)
      engine_players = Enum.map(players_in_room, &convert_player/1)

      # 3. Embaralhar tracks de cada jogador e selecionar músicas
      shuffled_players = Enum.map(engine_players, fn player ->
        # Player = {:player, id, name, playlist, state, score}
        {:player, id, name, playlist, state, score} = player
        # Playlist = {:playlist, pid, pname, platform, cover, tracks, total, valid}
        {:playlist, pid, pname, platform, cover, tracks, total, valid} = playlist
        shuffled_tracks = Enum.shuffle(tracks)
        new_playlist = {:playlist, pid, pname, platform, cover, shuffled_tracks, total, valid}
        {:player, id, name, new_playlist, state, score}
      end)

      # 4. Selecionar músicas via Engine
      total_songs = elem(engine_config, 2)  # MatchConfiguration.total_songs
      allow_repeats = elem(engine_config, 4)  # MatchConfiguration.allow_repeats
      selection_result = :"game_engine@domain@services@song_selection".select_songs(
        shuffled_players, total_songs, allow_repeats
      )
      # SelectionResult = {:selection_result, songs, players_with_playlist}
      selected_songs = elem(selection_result, 1)

      case selected_songs do
        [] -> {:error, "Nenhuma música disponível para seleção."}
        _ ->
          # 5. Criar match
          case :game_engine.new_match(room_id, engine_config, shuffled_players, selected_songs) do
            {:ok, waiting_match} ->
              # 6. Marcar todos como ready
              ready_match = Enum.reduce(shuffled_players, {:ok, waiting_match}, fn player, acc ->
                case acc do
                  {:ok, m} ->
                    player_id = elem(player, 1)
                    :game_engine.set_player_ready(m, player_id)
                  err -> err
                end
              end)

              case ready_match do
                {:ok, all_ready_match} ->
                  # 7. Iniciar partida
                  case :game_engine.start_match(all_ready_match) do
                    {:ok, match_started} ->
                      # MatchStarted = {:match_started, active_match}
                      active_match = elem(match_started, 1)

                      # 8. Iniciar primeira rodada
                      case :game_engine.start_round(active_match) do
                        {:ok, round_started} ->
                          # RoundStarted = {:round_started, updated_match, active_round}
                          updated_match = elem(round_started, 1)
                          active_round = elem(round_started, 2)

                          # ActiveRound = {:active_round, index, song, answers, contributed_by}
                          round_index = elem(active_round, 1)
                          song = elem(active_round, 2)
                          contributed_by = elem(active_round, 4)

                          # Song = {:song, id, name, artist, album, preview_url, duration}
                          preview_url = elem(song, 5)
                          song_name = elem(song, 2)
                          # Artist = {:artist, id, name}
                          artist = elem(song, 3)
                          artist_name = elem(artist, 2)

                          # Total rounds = length(active_rounds)
                          active_rounds = elem(updated_match, 4)
                          total_rounds = length(active_rounds) + length(elem(updated_match, 5))

                          result = {:start_game_result,
                            updated_match,
                            round_index,
                            total_rounds,
                            preview_url,
                            contributed_by,
                            song_name,
                            artist_name
                          }
                          {:ok, result}

                        {:error, err} -> {:error, "start_round falhou: #{inspect(err)}"}
                      end

                    {:error, err} -> {:error, "start_match falhou: #{inspect(err)}"}
                  end

                {:error, err} -> {:error, "set_player_ready falhou: #{inspect(err)}"}
              end

            {:error, err} -> {:error, "new_match falhou: #{inspect(err)}"}
          end
      end
    rescue
      e -> {:error, "Erro ao iniciar jogo: #{Exception.message(e)}"}
    end
  end

  # ─── Submit Answer ───

  def submit_answer(match_state, player_id, answer_text, response_time) do
    case :game_engine.submit_answer(match_state, player_id, answer_text, response_time) do
      {:ok, answer_processed} ->
        # AnswerProcessed = {:answer_processed, updated_match, player_id, is_correct, points}
        updated_match = elem(answer_processed, 1)
        pid = elem(answer_processed, 2)
        is_correct = elem(answer_processed, 3)
        points = elem(answer_processed, 4)
        all_answered = :game_engine.all_answered(updated_match)

        {:submit_ok, updated_match, pid, is_correct, points, all_answered}

      {:error, err} ->
        {:submit_error, "submit_answer falhou: #{inspect(err)}"}
    end
  end

  # ─── End Round ───

  def end_round(match_state) do
    # Checar se é última rodada ANTES de end_round
    is_last = :game_engine.is_last_round(match_state)

    case :game_engine.end_round(match_state) do
      {:ok, round_completed} ->
        # RoundCompleted = {:round_completed, updated_match, ended_round, scores}
        updated_match = elem(round_completed, 1)
        ended_round = elem(round_completed, 2)
        scores = elem(round_completed, 3)

        # has_more_rounds: se NÃO era a última rodada, há mais
        has_more = not is_last

        {:end_round_ok, updated_match, ended_round, scores, has_more}

      {:error, err} ->
        {:end_round_error, "end_round falhou: #{inspect(err)}"}
    end
  end

  # ─── Next Round (start_round para rodada seguinte) ───

  def next_round(match_state) do
    case :game_engine.start_round(match_state) do
      {:ok, round_started} ->
        # RoundStarted = {:round_started, updated_match, active_round}
        updated_match = elem(round_started, 1)
        active_round = elem(round_started, 2)

        round_index = elem(active_round, 1)
        song = elem(active_round, 2)
        contributed_by = elem(active_round, 4)

        preview_url = elem(song, 5)
        song_name = elem(song, 2)
        artist = elem(song, 3)
        artist_name = elem(artist, 2)

        active_rounds = elem(updated_match, 4)
        total_rounds = length(active_rounds) + length(elem(updated_match, 5))

        {:next_round_ok, updated_match, round_index, total_rounds,
         preview_url, contributed_by, song_name, artist_name}

      {:error, err} ->
        {:next_round_error, "start_round falhou: #{inspect(err)}"}
    end
  end

  # ─── End Match ───

  def end_match(match_state) do
    case :game_engine.end_match(match_state) do
      {:ok, event} ->
        case elem(event, 0) do
          :match_completed ->
            # MatchCompleted = {:match_completed, finished_match, final_scores, ranking, highlights}
            {:match_completed, elem(event, 1), elem(event, 2), elem(event, 3), elem(event, 4)}

          :tiebreaker_needed ->
            # TiebreakerNeeded = {:tiebreaker_needed, tiebreaker_info}
            info = elem(event, 1)
            # TiebreakerInfo = {:tiebreaker_info, match, tied_ids, tied_score, songs_missed, songs_others, partial_ranking, highlights}
            tied_ids = elem(info, 2)
            tied_score = elem(info, 3)
            {:tiebreaker_needed, info, tied_ids, tied_score}
        end

      {:error, err} ->
        {:end_match_error, "end_match falhou: #{inspect(err)}"}
    end
  end

  # ─── Resolve Tiebreaker ───

  def resolve_tiebreaker(tiebreaker_info, winner_id) do
    event = :game_engine.resolve_tiebreaker(tiebreaker_info, winner_id)
    # Sempre retorna MatchCompleted
    {:tiebreaker_resolved, elem(event, 1), elem(event, 2), elem(event, 3), elem(event, 4)}
  end

  # ─── Helpers de extração de dados do Engine ───

  @doc "Extrair dados de EndedRound para payload de broadcast."
  def extract_ended_round(ended_round) do
    # EndedRound = {:ended_round, index, song, answers, contributed_by}
    index = elem(ended_round, 1)
    song = elem(ended_round, 2)
    answers = elem(ended_round, 3)  # Dict (gleam/dict = mapa Erlang)
    contributed_by = elem(ended_round, 4)

    song_name = elem(song, 2)
    artist = elem(song, 3)
    artist_name = elem(artist, 2)
    album = elem(song, 4)
    album_title = elem(album, 2)
    cover_url = elem(album, 3)

    # Converter answers dict para lista de tuples
    answers_list = case answers do
      m when is_map(m) ->
        Enum.map(m, fn {player_id, answer} ->
          # Answer = {:answer, text, time, is_correct, is_near_miss, points}
          {player_id, elem(answer, 1), elem(answer, 2), elem(answer, 3), elem(answer, 5)}
        end)
      _ -> []
    end

    {index, song_name, artist_name, album_title, cover_url, contributed_by, answers_list}
  end

  @doc "Extrair dados de ranking para payload de broadcast."
  def extract_ranking(ranking) when is_list(ranking) do
    Enum.map(ranking, fn entry ->
      # RankingEntry = {:ranking_entry, position, player_id, nickname, total_points, correct, avg_time}
      {elem(entry, 1), elem(entry, 2), elem(entry, 3), elem(entry, 4), elem(entry, 5), elem(entry, 6)}
    end)
  end

  @doc "Extrair dados de highlights para payload de broadcast."
  def extract_highlights(highlights) do
    # Highlights = {:highlights, best_streak, fastest, most_correct, near_miss}
    streak = elem(highlights, 1)
    fastest = elem(highlights, 2)
    most_correct = elem(highlights, 3)
    _near_miss = elem(highlights, 4)

    # HighlightStreak = {:highlight_streak, player_id, nickname, streak}
    streak_data = {elem(streak, 1), elem(streak, 2), elem(streak, 3)}
    # HighlightFastest = {:highlight_fastest, player_id, nickname, time, song_name}
    fastest_data = {elem(fastest, 1), elem(fastest, 2), elem(fastest, 3), elem(fastest, 4)}
    # HighlightMostCorrect = {:highlight_most_correct, player_id, nickname, count}
    most_correct_data = {elem(most_correct, 1), elem(most_correct, 2), elem(most_correct, 3)}

    {streak_data, fastest_data, most_correct_data}
  end

  # ─── Conversão de Tipos ───

  # Converter RoomConfig → Engine MatchConfiguration
  # RoomConfig = {:room_config, time_per_round, total_songs, answer_type, allow_repeats, scoring_rule}
  # MatchConfiguration = {:match_configuration, time_per_round, total_songs, answer_type, allow_repeats, scoring_rule}
  defp convert_config(room_config) do
    time = elem(room_config, 1)
    songs = elem(room_config, 2)
    answer_type_str = elem(room_config, 3)
    allow_repeats = elem(room_config, 4)
    scoring_str = elem(room_config, 5)

    answer_type = case answer_type_str do
      "song" -> :song_name
      "artist" -> :artist_name
      "both" -> :both
      _ -> :both
    end

    scoring = case scoring_str do
      "simple" -> :simple
      "speed_bonus" -> :speed_bonus
      _ -> :speed_bonus
    end

    {:match_configuration, time, songs, answer_type, allow_repeats, scoring}
  end

  # Converter PlayerInRoom → Engine Player
  # PlayerInRoom = {:player_in_room, id, nickname, playlist_opt, ready, connection, platform}
  # Player = {:player, id, name, playlist, state, score}
  defp convert_player(player_in_room) do
    id = elem(player_in_room, 1)
    nickname = elem(player_in_room, 2)
    playlist_opt = elem(player_in_room, 3)

    # Option(Dynamic): {:some, playlist} ou :none
    playlist = case playlist_opt do
      {:some, p} -> p
      :none -> {:playlist, "", "", :spotify, "", [], 0, 0}
    end

    {:player, id, nickname, playlist, :connected, 0}
  end
end
