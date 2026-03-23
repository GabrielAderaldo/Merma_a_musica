// domain/errors.gleam — Domain Errors (por workflow)

pub type LobbyError {
  NotEnoughPlayers
  NotAllPlayersReady
  NotEnoughSongs
  LobbyPlayerNotFound(player_id: String)
}

pub type RoundError {
  RoundPlayerNotFound(player_id: String)
  NoMoreRounds
}

pub type FinishError {
  MatchNotActive(message: String)
}
