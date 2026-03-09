import game_engine/types.{
  type EngineError, type Player, Answered, Connected, Player, PlayerNotFound,
  Ready,
}
import gleam/dict
import gleam/list
import gleam/order
import gleam/result

/// Encontra um jogador por ID.
pub fn find(
  players: List(Player),
  player_id: String,
) -> Result(Player, EngineError) {
  case list.find(players, fn(p) { p.id == player_id }) {
    Ok(player) -> Ok(player)
    Error(_) -> Error(PlayerNotFound(player_id))
  }
}

/// Atualiza um jogador específico na lista.
pub fn update(
  players: List(Player),
  player_id: String,
  updater: fn(Player) -> Player,
) -> List(Player) {
  list.map(players, fn(p) {
    case p.id == player_id {
      True -> updater(p)
      False -> p
    }
  })
}

/// Marca um jogador como Ready.
pub fn set_ready(players: List(Player), player_id: String) -> List(Player) {
  update(players, player_id, fn(p) { Player(..p, state: Ready) })
}

/// Marca um jogador como Answered e soma pontos.
pub fn set_answered(
  players: List(Player),
  player_id: String,
  points: Int,
) -> List(Player) {
  update(players, player_id, fn(p) {
    Player(..p, state: Answered, score: p.score + points)
  })
}

/// Reseta todos os jogadores para Connected (início de rodada).
pub fn reset_states(players: List(Player)) -> List(Player) {
  list.map(players, fn(p) { Player(..p, state: Connected) })
}

/// Verifica se todos estão prontos.
pub fn all_ready(players: List(Player)) -> Bool {
  list.all(players, fn(p) { p.state == Ready })
}

/// Extrai scores como Dict.
pub fn scores(players: List(Player)) -> dict.Dict(String, Int) {
  list.fold(players, dict.new(), fn(acc, p) { dict.insert(acc, p.id, p.score) })
}

/// Encontra o ID do jogador com maior pontuação.
pub fn winner_id(players: List(Player)) -> String {
  players
  |> list.sort(fn(a, b) {
    case a.score > b.score {
      True -> order.Lt
      False ->
        case a.score == b.score {
          True -> order.Eq
          False -> order.Gt
        }
    }
  })
  |> list.first
  |> result.map(fn(p: Player) { p.id })
  |> result.unwrap("")
}
