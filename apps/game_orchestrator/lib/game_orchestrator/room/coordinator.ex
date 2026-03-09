defmodule GameOrchestrator.Room.Coordinator do
  @moduledoc """
  Orquestra o fluxo do jogo traduzindo chamadas do GenServer
  para o Game Engine (Gleam) e interpretando os eventos retornados.

  Gleam types mapeiam para Erlang tuples:
  - Song → {:song, id, name, artist, preview_url}
  - Player → {:player, id, name, playlist, state, score}
  - MatchConfiguration → {:match_configuration, time_per_round, total_songs, answer_type, allow_repeats, scoring_rule}
  - Match → {:match, id, state, config, players, rounds, current_round_index, songs}
  - MatchStarted → {:match_started, match}
  - RoundStarted → {:round_started, match, round}
  - AnswerProcessed → {:answer_processed, match, player_id, is_correct, points_earned}
  - RoundCompleted → {:round_completed, match, round, scores}
  - MatchCompleted → {:match_completed, match, final_scores, winner_id}
  """

  @doc "Cria a match no Engine a partir dos dados da sala."
  def create_match(room_id, players, songs, config) do
    gleam_players = Enum.map(players, &to_gleam_player/1)
    gleam_songs = Enum.map(songs, &to_gleam_song/1)
    gleam_config = to_gleam_config(config)

    :game_engine.new_match(room_id, gleam_config, gleam_players, gleam_songs)
  end

  @doc "Marca um jogador como pronto."
  def set_player_ready(match, player_id) do
    :game_engine.set_player_ready(match, player_id)
  end

  @doc "Inicia a partida."
  def start_match(match) do
    case :game_engine.start_match(match) do
      {:ok, {:match_started, updated_match}} ->
        {:ok, updated_match}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc "Inicia a próxima rodada."
  def start_round(match) do
    case :game_engine.start_round(match) do
      {:ok, {:round_started, updated_match, round}} ->
        {:ok, updated_match, round}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc "Processa resposta de um jogador."
  def submit_answer(match, player_id, answer_text, answer_time) do
    case :game_engine.submit_answer(match, player_id, answer_text, answer_time) do
      {:ok, {:answer_processed, updated_match, _pid, is_correct, points}} ->
        {:ok, updated_match, is_correct, points}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc "Encerra a rodada atual."
  def end_round(match) do
    case :game_engine.end_round(match) do
      {:ok, {:round_completed, updated_match, _round, scores}} ->
        {:ok, updated_match, scores}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc "Encerra a partida."
  def end_match(match) do
    case :game_engine.end_match(match) do
      {:ok, {:match_completed, updated_match, final_scores, winner_id}} ->
        {:ok, updated_match, final_scores, winner_id}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc "Verifica se todos responderam na rodada atual."
  def all_answered?(match) do
    :game_engine.all_answered(match)
  end

  @doc "Verifica se é a última rodada."
  def last_round?(match) do
    :game_engine.is_last_round(match)
  end

  # --- Conversores Elixir → Gleam ---

  defp to_gleam_player(%{id: id, name: name, playlist: playlist}) do
    gleam_songs = Enum.map(playlist || [], &to_gleam_song/1)
    {:player, id, name, gleam_songs, :connected, 0}
  end

  defp to_gleam_song(%{id: id, name: name, artist: artist, preview_url: url}) do
    {:song, id, name, artist, url}
  end

  defp to_gleam_config(config) do
    {:match_configuration,
     Map.get(config, :time_per_round, 30),
     Map.get(config, :total_songs, 4),
     Map.get(config, :answer_type, :song_name),
     Map.get(config, :allow_repeats, false),
     Map.get(config, :scoring_rule, :simple)}
  end
end
