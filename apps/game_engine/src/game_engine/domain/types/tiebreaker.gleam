// domain/types/tiebreaker.gleam — Value Objects de Desempate

import game_engine/domain/types/match_states.{type ActiveMatch}
import game_engine/domain/types/media.{type Song}
import game_engine/domain/types/results.{type Highlights, type RankingEntry}

/// Info para o Orchestrator gerenciar o Gol de Ouro.
pub type TiebreakerInfo {
  TiebreakerInfo(
    match: ActiveMatch,
    tied_player_ids: List(String),
    tied_score: Int,
    songs_both_missed: List(Song),
    songs_from_others: List(Song),
    partial_ranking: List(RankingEntry),
    highlights: Highlights,
  )
}
