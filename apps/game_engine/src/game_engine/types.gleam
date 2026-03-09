import gleam/dict.{type Dict}

// --- Value Objects ---

/// Dados de uma música usada na rodada.
pub type Song {
  Song(id: String, name: String, artist: String, preview_url: String)
}

/// Define o que será aceito como resposta válida.
pub type AnswerType {
  SongName
  ArtistName
  Both
}

/// Regra de pontuação da partida.
pub type ScoringRule {
  Simple
  SpeedBonus
}

/// Configuração imutável de uma partida.
pub type MatchConfiguration {
  MatchConfiguration(
    time_per_round: Int,
    total_songs: Int,
    answer_type: AnswerType,
    allow_repeats: Bool,
    scoring_rule: ScoringRule,
  )
}

/// Resposta de um jogador em uma rodada.
pub type Answer {
  Answer(text: String, answer_time: Float, is_correct: Bool, points: Int)
}

// --- Enums de Estado ---

/// Estado do jogador dentro da partida.
pub type PlayerState {
  Connected
  Ready
  Answered
}

/// Estado de uma rodada.
pub type RoundState {
  RoundInProgress
  RoundEnded
}

/// Estado da partida.
pub type MatchState {
  WaitingForPlayers
  InProgress
  Finished
}

// --- Entidades ---

/// Jogador dentro de uma partida.
pub type Player {
  Player(
    id: String,
    name: String,
    playlist: List(Song),
    state: PlayerState,
    score: Int,
  )
}

/// Uma rodada do jogo.
pub type Round {
  Round(
    index: Int,
    song: Song,
    answers: Dict(String, Answer),
    state: RoundState,
  )
}

// --- Aggregate Root ---

/// Aggregate principal: representa uma partida completa.
pub type Match {
  Match(
    id: String,
    state: MatchState,
    config: MatchConfiguration,
    players: List(Player),
    rounds: List(Round),
    current_round_index: Int,
    songs: List(Song),
  )
}

// --- Eventos de Domínio ---

/// Eventos emitidos pelo Game Engine em resposta a comandos.
pub type MatchEvent {
  MatchStarted(match: Match)
  RoundStarted(match: Match, round: Round)
  AnswerProcessed(
    match: Match,
    player_id: String,
    is_correct: Bool,
    points_earned: Int,
  )
  RoundCompleted(match: Match, round: Round, scores: Dict(String, Int))
  MatchCompleted(match: Match, final_scores: Dict(String, Int), winner_id: String)
}

// --- Erros ---

/// Erros tipados retornados pelo Game Engine.
pub type EngineError {
  InvalidState(message: String)
  PlayerNotFound(player_id: String)
  NotEnoughPlayers
  NotAllPlayersReady
  NotEnoughSongs
  SongsDivisibilityError(total_songs: Int, total_players: Int)
  RoundAlreadyEnded
  PlayerAlreadyAnswered(player_id: String)
  NoMoreRounds
}
