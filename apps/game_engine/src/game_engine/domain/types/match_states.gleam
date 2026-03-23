// domain/types/match_states.gleam — Aggregate Root: Estados da Partida
//
// Transições: WaitingMatch → ActiveMatch → FinishedMatch
// O compilador garante que funções só aceitam o estado correto.

import game_engine/domain/types/config.{type MatchConfiguration}
import game_engine/domain/types/media.{type Song}
import game_engine/domain/types/player.{type Player}
import game_engine/domain/types/round.{type ActiveRound, type EndedRound}

/// Aguardando jogadores ficarem prontos.
pub type WaitingMatch {
  WaitingMatch(
    id: String,
    config: MatchConfiguration,
    players: List(Player),
    rounds: List(ActiveRound),
    songs: List(Song),
  )
}

/// Partida em andamento.
pub type ActiveMatch {
  ActiveMatch(
    id: String,
    config: MatchConfiguration,
    players: List(Player),
    active_rounds: List(ActiveRound),
    ended_rounds: List(EndedRound),
    current_round_index: Int,
    songs: List(Song),
  )
}

/// Partida finalizada — imutável.
pub type FinishedMatch {
  FinishedMatch(
    id: String,
    config: MatchConfiguration,
    players: List(Player),
    rounds: List(EndedRound),
    songs: List(Song),
  )
}
