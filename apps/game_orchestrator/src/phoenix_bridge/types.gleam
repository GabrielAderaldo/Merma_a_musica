// phoenix_bridge/types.gleam — Tipos do Protocolo Bridge
//
// O QUE É: Define o protocolo de comunicação entre handlers Gleam
// e a infraestrutura Elixir/Phoenix. São tipos DECLARATIVOS:
// o Gleam diz O QUE quer fazer, o Elixir interpreta e executa.
//
// LIMITES ARQUITETURAIS:
// - Tipos puros — sem lógica, sem @external, sem side effects
// - Usados pelos handlers (channel/room_handler, http/*_handler)
// - O Elixir faz pattern match nos tuples gerados por estes tipos
// - Payloads são TIPADOS (não Dynamic) — cada handler retorna
//   o payload específico do evento via OutboundEvent
//
// COMO FUNCIONA NO BOUNDARY:
// - Gleam: retorna HandlerResult(state) com OutboundEvent tipado
// - Elixir: recebe tuple → pattern match → serializa para JSON → envia

import gleam/dict.{type Dict}
import gleam/option.{type Option}

// ═══════════════════════════════════════════════════════════════
// HANDLER RESULT — resposta de handlers WebSocket (EventChannel)
// ═══════════════════════════════════════════════════════════════

/// Resultado que um handler WebSocket retorna ao Channel Elixir.
/// O Elixir interpreta o variant e executa a ação Phoenix correspondente.
pub type HandlerResult(state) {
  /// Só atualiza estado interno, sem enviar nada ao client
  NoReply(state: state)

  /// Responde ao remetente com um evento tipado
  Reply(event: OutboundEvent, state: state)

  /// Broadcast para todos os jogadores no tópico da sala
  Broadcast(event: OutboundEvent, state: state)

  /// Responde ao remetente + broadcast para todos
  ReplyAndBroadcast(
    reply: OutboundEvent,
    broadcast: OutboundEvent,
    state: state,
  )

  /// Push evento direto para um client específico (sem ser reply)
  Push(event: OutboundEvent, state: state)

  /// Envia erro ao remetente
  HandlerError(code: String, message: String, state: state)
}

// ═══════════════════════════════════════════════════════════════
// INFO RESULT — resposta de handlers internos (timers, PubSub)
// ═══════════════════════════════════════════════════════════════

/// Resultado de handle_info (mensagens internas: timers expirados,
/// eventos PubSub de outros processos, etc.)
pub type InfoResult(state) {
  /// Push evento para o client conectado neste channel
  InfoPush(event: OutboundEvent, state: state)

  /// Só atualiza estado, sem enviar nada
  InfoNoReply(state: state)

  /// Broadcast para todos no tópico
  InfoBroadcast(event: OutboundEvent, state: state)
}

// ═══════════════════════════════════════════════════════════════
// HTTP RESPONSE — resposta de handlers REST (MethodChannel)
// ═══════════════════════════════════════════════════════════════

/// Resultado que um handler HTTP retorna ao Controller Elixir.
pub type HttpResponse(body) {
  /// Sucesso — Elixir serializa body para JSON com o status code
  HttpOk(status: Int, body: body)

  /// Erro — Elixir retorna { "error": { "code": ..., "message": ... } }
  HttpError(status: Int, code: String, message: String)
}

// ═══════════════════════════════════════════════════════════════
// OUTBOUND EVENT — evento tipado que sai do Gleam para o client
// ═══════════════════════════════════════════════════════════════

/// Cada variant é um evento server→client do Asyncapi.yaml.
/// O nome do variant determina o event name no Phoenix Channel.
/// O Elixir faz pattern match e serializa os campos para JSON.
pub type OutboundEvent {
  // ─── LOBBY ───

  /// Estado completo da sala (enviado no join e reconexão)
  RoomStateEvent(payload: RoomStatePayload)

  /// Novo jogador entrou na sala
  PlayerJoinedEvent(payload: PlayerPayload)

  /// Jogador saiu ou foi removido
  PlayerLeftEvent(player_uuid: String, reason: LeaveReason)

  /// Status de pronto mudou
  PlayerReadyChangedEvent(player_uuid: String, ready: Bool)

  /// Host alterou a configuração da partida
  ConfigUpdatedEvent(config: MatchConfigPayload, song_range: SongRangePayload)

  /// Host mudou (desconexão do anterior)
  HostChangedEvent(new_host_uuid: String, new_host_nickname: String)

  // ─── GAME ───

  /// Contagem regressiva para início da partida
  GameStartingEvent(countdown_seconds: Int)

  /// Nova rodada — frontend deve buscar áudio
  RoundStartingEvent(payload: RoundStartingPayload)

  /// Timer oficial iniciou (após grace period)
  TimerStartedEvent(duration_seconds: Int)

  /// Confirma recebimento da resposta (sem revelar se está correta)
  AnswerConfirmedEvent(player_uuid: String)

  /// Jogador votou para pular rodada
  PlayerVotedSkipEvent(
    player_uuid: String,
    skip_votes: Int,
    votes_needed: Int,
  )

  /// Rodada encerrada — revelação completa
  RoundEndedEvent(payload: RoundEndedPayload)

  /// Partida encerrada — ranking e destaques
  GameEndedEvent(payload: GameEndedPayload)

  /// Resultados de autocomplete
  AutocompleteResultsEvent(query: String, results: List(AutocompleteEntry))

  // ─── SYSTEM ───

  /// Erro direcionado ao jogador
  ErrorEvent(code: String, message: String)
}

// ═══════════════════════════════════════════════════════════════
// ENUMS DO PROTOCOLO
// ═══════════════════════════════════════════════════════════════

pub type ConnectionStatus {
  StatusConnected
  StatusDisconnected
  StatusReconnecting
}

pub type LeaveReason {
  Voluntary
  Timeout
  Kicked
}

pub type AudioSource {
  Deezer
  SpotifySdk
}

pub type Platform {
  Spotify
  PlatformDeezer
  YoutubeMusic
}

pub type AnswerType {
  Song
  Artist
  AnswerBoth
}

pub type ScoringRule {
  ScoringSimple
  ScoringSpeedBonus
}

// ═══════════════════════════════════════════════════════════════
// PAYLOADS TIPADOS — Dados estruturados dos eventos
// ═══════════════════════════════════════════════════════════════

// ─── Shared / Reutilizáveis ───

pub type PlayerPayload {
  PlayerPayload(
    player_uuid: String,
    nickname: String,
    is_host: Bool,
    ready: Bool,
    connection_status: ConnectionStatus,
    has_playlist: Bool,
    platform: Option(Platform),
  )
}

pub type MatchConfigPayload {
  MatchConfigPayload(
    time_per_round: Int,
    total_songs: Int,
    answer_type: AnswerType,
    allow_repeats: Bool,
    scoring_rule: ScoringRule,
  )
}

pub type SongRangePayload {
  SongRangePayload(
    min: Int,
    max: Int,
    current_players: Int,
    players_with_playlist: Int,
  )
}

// ─── Lobby Events ───

pub type RoomStatePayload {
  RoomStatePayload(
    room_id: String,
    invite_code: String,
    state: String,
    host_player_uuid: String,
    config: MatchConfigPayload,
    players: List(PlayerPayload),
    song_range: SongRangePayload,
  )
}

// ─── Game Events ───

pub type RoundStartingPayload {
  RoundStartingPayload(
    round_index: Int,
    total_rounds: Int,
    audio_token: String,
    audio_source: AudioSource,
    grace_period_seconds: Int,
  )
}

pub type RevealedSongPayload {
  RevealedSongPayload(
    name: String,
    artist: String,
    album: String,
    cover_url: String,
    contributed_by: String,
  )
}

pub type PlayerAnswerPayload {
  PlayerAnswerPayload(
    player_uuid: String,
    nickname: String,
    answer_text: String,
    is_correct: Bool,
    points_earned: Int,
    response_time: Option(Float),
  )
}

pub type RoundEndedPayload {
  RoundEndedPayload(
    round_index: Int,
    song: RevealedSongPayload,
    answers: List(PlayerAnswerPayload),
    scores: Dict(String, Int),
    next_round_in_seconds: Int,
  )
}

pub type RankingEntryPayload {
  RankingEntryPayload(
    position: Int,
    player_uuid: String,
    nickname: String,
    total_points: Int,
    correct_answers: Int,
    avg_response_time: Option(Float),
  )
}

pub type HighlightStreakPayload {
  HighlightStreakPayload(
    player_uuid: String,
    nickname: String,
    streak: Int,
  )
}

pub type HighlightFastestPayload {
  HighlightFastestPayload(
    player_uuid: String,
    nickname: String,
    time: Float,
    song_name: String,
  )
}

pub type HighlightMostCorrectPayload {
  HighlightMostCorrectPayload(
    player_uuid: String,
    nickname: String,
    count: Int,
  )
}

pub type HighlightsPayload {
  HighlightsPayload(
    best_streak: Option(HighlightStreakPayload),
    fastest_answer: Option(HighlightFastestPayload),
    most_correct: Option(HighlightMostCorrectPayload),
  )
}

pub type GameEndedPayload {
  GameEndedPayload(
    final_scores: Dict(String, Int),
    ranking: List(RankingEntryPayload),
    highlights: HighlightsPayload,
    return_to_lobby_in_seconds: Int,
  )
}

// ─── Autocomplete ───

pub type AutocompleteEntry {
  AutocompleteEntry(text: String, result_type: AutocompleteType)
}

pub type AutocompleteType {
  AutocompleteSong
  AutocompleteArtist
}

// ═══════════════════════════════════════════════════════════════
// INBOUND PAYLOADS — Dados que chegam do client (decode do Dynamic)
// ═══════════════════════════════════════════════════════════════

/// Payload do join do channel (params do WS join)
pub type JoinParams {
  JoinParams(player_uuid: String, nickname: String)
}

/// Payload do evento player_ready / player_unready
pub type PlayerUuidPayload {
  PlayerUuidPayload(player_uuid: String)
}

/// Payload do evento configure_match
pub type ConfigureMatchPayload {
  ConfigureMatchPayload(player_uuid: String, config: MatchConfigPayload)
}

/// Payload do evento submit_answer
pub type SubmitAnswerPayload {
  SubmitAnswerPayload(player_uuid: String, answer_text: String)
}

/// Payload do evento select_playlist
pub type SelectPlaylistPayload {
  SelectPlaylistPayload(
    player_uuid: String,
    playlist_id: String,
    platform: Platform,
  )
}

/// Payload do evento autocomplete_search
pub type AutocompleteSearchPayload {
  AutocompleteSearchPayload(player_uuid: String, query: String)
}
