// room/effects.gleam — Efeitos declarativos (o Gleam diz O QUE, o Elixir FAZ)
//
// Funções puras retornam Effects. O GenServer Elixir executa.
// Payloads são tipados — sem Dynamic.

import gleam/dict.{type Dict}
import gleam/option.{type Option}

/// Efeito que o GenServer deve executar.
pub type Effect {
  /// Broadcast evento para todos na sala
  Broadcast(event: String, payload: EffectPayload)
  /// Agendar mensagem para o processo da sala após N ms
  ScheduleTimer(delay_ms: Int, timer_tag: String)
  /// Enviar erro para o remetente
  SendError(code: String, message: String)
}

/// Payload tipado dos efeitos (compila para tuple Erlang — Elixir faz pattern match).
pub type EffectPayload {
  // ─── Lobby payloads ───
  PlayerEvent(player_id: String, nickname: String)
  ReadyEvent(player_id: String, ready: Bool)
  LeaveEvent(player_id: String, reason: String)
  HostEvent(new_host_id: String, new_host_nickname: String)
  CountdownEvent(seconds: Int)
  ConfigPayload(
    time_per_round: Int,
    total_songs: Int,
    answer_type: String,
    allow_repeats: Bool,
    scoring_rule: String,
  )
  SongRangePayload(min: Int, max: Int, total_players: Int)
  TextPayload(text: String)

  // ─── Game payloads ───

  /// Nova rodada começando (frontend busca áudio pelo token)
  RoundStartingPayload(
    round_index: Int,
    total_rounds: Int,
    audio_token: String,
    grace_period_seconds: Int,
  )

  /// Confirma que resposta foi recebida (sem revelar se correta)
  AnswerConfirmedPayload(player_id: String)

  /// Rodada encerrada — revelação completa
  RoundEndedPayload(
    round_index: Int,
    song_name: String,
    artist_name: String,
    album_title: String,
    cover_url: String,
    contributed_by: String,
    /// Lista de respostas: (player_id, answer_text, response_time, is_correct, points)
    answers: List(#(String, String, Float, Bool, Int)),
    /// Scores atuais: player_id → total_points
    scores: Dict(String, Int),
    next_round_in_seconds: Int,
  )

  /// Partida encerrada — ranking e destaques
  GameEndedPayload(
    /// player_id → total_points
    final_scores: Dict(String, Int),
    /// Lista de (position, player_id, nickname, total_points, correct_answers, avg_time)
    ranking: List(#(Int, String, String, Int, Int, Float)),
    /// (streak_data, fastest_data, most_correct_data)
    highlights: #(
      #(String, String, Int),
      #(String, String, Float, String),
      #(String, String, Int),
    ),
    return_to_lobby_in_seconds: Int,
  )

  /// Desempate "Gol de Ouro" começando
  TiebreakerStartingPayload(
    tied_player_ids: List(String),
    tied_score: Int,
    grace_period_seconds: Int,
  )
}

/// Resultado de processar um comando.
pub type CommandResult(state) {
  CmdOk(state: state, effects: List(Effect))
  CmdError(state: state, code: String, message: String)
}

/// Converter Dict Dynamic para Dict(String, Int) — helper para scores.
pub fn scores_to_dict(
  scores_list: List(#(String, Int)),
) -> Dict(String, Int) {
  dict.from_list(scores_list)
}

/// Helper para Option com valor
pub fn some(value: a) -> Option(a) {
  option.Some(value)
}
