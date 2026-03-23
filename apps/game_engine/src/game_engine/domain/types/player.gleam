// domain/types/player.gleam — Entity: Jogador

import game_engine/domain/types/media.{type Playlist}

pub type PlayerState {
  Connected
  Ready
  Answered
}

/// Entity com identidade por id.
pub type Player {
  Player(
    id: String,
    name: String,
    playlist: Playlist,
    state: PlayerState,
    score: Int,
  )
}
