// game/skip_vote.gleam — Sistema de Votação para Pular Rodada
//
// Lógica pura: recebe estado de votos, retorna resultado.
// Condição: todos responderam + maioria votou pular → encerrar rodada.
// Jogador só pode votar APÓS ter respondido.

import gleam/list

/// Estado dos votos de skip numa rodada.
pub type SkipState {
  SkipState(
    /// IDs dos jogadores que já responderam a rodada
    answered: List(String),
    /// IDs dos jogadores que votaram pular
    voted_skip: List(String),
    /// Total de jogadores na partida
    total_players: Int,
  )
}

/// Resultado de registrar um voto.
pub type VoteResult {
  /// Voto registrado com sucesso
  VoteOk(
    state: SkipState,
    current_votes: Int,
    votes_needed: Int,
  )
  /// Voto rejeitado (jogador não respondeu ainda, ou já votou)
  VoteRejected(reason: String)
}

/// Criar estado inicial de skip para uma rodada.
pub fn new_state(total_players: Int) -> SkipState {
  SkipState(answered: [], voted_skip: [], total_players: total_players)
}

/// Marcar jogador como tendo respondido (habilita voto de skip).
pub fn mark_answered(state: SkipState, player_id: String) -> SkipState {
  case list.contains(state.answered, player_id) {
    True -> state
    False ->
      SkipState(..state, answered: [player_id, ..state.answered])
  }
}

/// Registrar voto de skip de um jogador.
/// Só aceita se o jogador já respondeu e ainda não votou.
pub fn register_vote(
  state: SkipState,
  player_id: String,
) -> VoteResult {
  case list.contains(state.answered, player_id) {
    False -> VoteRejected("must_answer_first")
    True ->
      case list.contains(state.voted_skip, player_id) {
        True -> VoteRejected("already_voted")
        False -> {
          let new_state =
            SkipState(..state, voted_skip: [player_id, ..state.voted_skip])
          let current = list.length(new_state.voted_skip)
          let needed = votes_needed(state.total_players)
          VoteOk(
            state: new_state,
            current_votes: current,
            votes_needed: needed,
          )
        }
      }
  }
}

/// Verificar se a rodada deve ser pulada.
/// Condição: todos responderam E maioria votou pular.
pub fn should_skip(state: SkipState) -> Bool {
  let all_answered =
    list.length(state.answered) >= state.total_players
  let enough_votes =
    list.length(state.voted_skip) >= votes_needed(state.total_players)
  all_answered && enough_votes
}

/// Número de votos necessários (maioria simples: >50%).
pub fn votes_needed(total_players: Int) -> Int {
  total_players / 2 + 1
}

/// Contagem atual de votos.
pub fn current_vote_count(state: SkipState) -> Int {
  list.length(state.voted_skip)
}
