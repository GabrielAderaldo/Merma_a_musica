// room/state.gleam — Tipos do Estado da Sala
//
// Estado que o GenServer da sala mantém em memória.
// Tipos do Orchestrator — independentes do Game Engine.
// O Engine é invocado via coordinator quando necessário.

import gleam/dynamic.{type Dynamic}
import gleam/option.{type Option}

/// Fase da sala (ciclo de vida do Orchestrator, não do Engine).
pub type RoomPhase {
  /// Lobby — jogadores entram, configuram, ficam prontos
  Waiting
  /// Partida em andamento — rodadas ativas
  InMatch
  /// Mostrando resultados (5s antes de voltar ao lobby)
  ShowingResults
}

/// Status de conexão WebSocket de um jogador.
pub type ConnectionStatus {
  Online
  /// Desconectado desde timestamp (ms). Removido após 2 min.
  Disconnected(since_ms: Int)
}

/// Jogador no contexto da sala (diferente do Player do Engine).
pub type PlayerInRoom {
  PlayerInRoom(
    id: String,
    nickname: String,
    /// Playlist validada (None se não importou). Armazena como Dynamic
    /// porque o tipo real é do Engine — o Orchestrator não precisa dos campos internos.
    playlist: Option(Dynamic),
    ready: Bool,
    connection: ConnectionStatus,
    /// Plataforma de autenticação (para exibição)
    platform: Option(String),
  )
}

/// Config da partida (espelho simplificado do Engine MatchConfiguration).
/// O Orchestrator valida ranges antes de enviar ao Engine.
pub type RoomConfig {
  RoomConfig(
    time_per_round: Int,
    total_songs: Int,
    answer_type: String,
    allow_repeats: Bool,
    scoring_rule: String,
  )
}

/// Estado completo da sala — mantido pelo GenServer.
pub type RoomState {
  RoomState(
    id: String,
    invite_code: String,
    host_id: String,
    players: List(PlayerInRoom),
    phase: RoomPhase,
    config: RoomConfig,
    /// Estado do match do Engine (Dynamic porque pode ser WaitingMatch, ActiveMatch ou FinishedMatch)
    match_state: Option(Dynamic),
    /// Referências de timers ativos (para cancelamento)
    timer_refs: List(Dynamic),
    /// Timestamp de criação da sala (ms)
    created_at_ms: Int,
  )
}

/// Defaults para uma sala nova.
pub fn default_config() -> RoomConfig {
  RoomConfig(
    time_per_round: 30,
    total_songs: 3,
    answer_type: "both",
    allow_repeats: False,
    scoring_rule: "speed_bonus",
  )
}

/// Criar estado inicial de uma sala.
pub fn new_room(
  id: String,
  invite_code: String,
  host_id: String,
  host_nickname: String,
  now_ms: Int,
) -> RoomState {
  let host = PlayerInRoom(
    id: host_id,
    nickname: host_nickname,
    playlist: option.None,
    ready: False,
    connection: Online,
    platform: option.None,
  )

  RoomState(
    id: id,
    invite_code: invite_code,
    host_id: host_id,
    players: [host],
    phase: Waiting,
    config: default_config(),
    match_state: option.None,
    timer_refs: [],
    created_at_ms: now_ms,
  )
}
