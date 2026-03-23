// room/commands.gleam — Lógica pura de comandos da sala
//
// Cada função recebe RoomState + dados → retorna CommandResult(RoomState).
// ZERO side effects — efeitos são dados declarativos.

import gleam/dynamic
import gleam/int
import gleam/list
import gleam/option
import room/effects.{
  type Effect, type CommandResult,
  Broadcast, ScheduleTimer,
  CmdOk, CmdError,
  PlayerEvent, ReadyEvent, LeaveEvent, HostEvent, CountdownEvent,
  ConfigPayload, SongRangePayload,
}
import room/state.{
  type RoomState, type PlayerInRoom, type RoomConfig,
  RoomState, PlayerInRoom, Online, Disconnected,
  Waiting, InMatch, ShowingResults,
}

const max_players = 20

// ═══════════════════════════════════════════════════════════════
// JOIN / LEAVE
// ═══════════════════════════════════════════════════════════════

pub fn join(
  room: RoomState,
  player_id: String,
  nickname: String,
) -> CommandResult(RoomState) {
  case room.phase {
    InMatch | ShowingResults ->
      CmdError(room, "room_in_match", "Partida em andamento, não pode entrar.")
    Waiting ->
      case find_player(room.players, player_id) {
        option.Some(_) ->
          CmdError(room, "already_joined", "Jogador já está na sala.")
        option.None ->
          case list.length(room.players) >= max_players {
            True ->
              CmdError(room, "room_full", "A sala está cheia (máximo 20 jogadores).")
            False -> {
              let player = PlayerInRoom(
                id: player_id, nickname: nickname,
                playlist: option.None, ready: False,
                connection: Online, platform: option.None,
              )
              let new_state = RoomState(..room, players: list.append(room.players, [player]))
              CmdOk(new_state, [Broadcast("player_joined", PlayerEvent(player_id, nickname))])
            }
          }
      }
  }
}

pub fn leave(room: RoomState, player_id: String) -> CommandResult(RoomState) {
  case find_player(room.players, player_id) {
    option.None -> CmdError(room, "not_in_room", "Jogador não está na sala.")
    option.Some(_) -> {
      let new_players = list.filter(room.players, fn(p) { p.id != player_id })
      let new_state = RoomState(..room, players: new_players)

      let #(final_state, extra_effects) = case player_id == room.host_id {
        False -> #(new_state, [])
        True -> transfer_host(new_state)
      }

      CmdOk(final_state, list.append(
        [Broadcast("player_left", LeaveEvent(player_id, "voluntary"))],
        extra_effects,
      ))
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// READY / UNREADY
// ═══════════════════════════════════════════════════════════════

pub fn set_ready(room: RoomState, player_id: String, ready: Bool) -> CommandResult(RoomState) {
  case room.phase {
    Waiting ->
      case find_player(room.players, player_id) {
        option.None -> CmdError(room, "not_in_room", "Jogador não está na sala.")
        option.Some(_) -> {
          let new_players = update_player(room.players, player_id, fn(p) {
            PlayerInRoom(..p, ready: ready)
          })
          CmdOk(
            RoomState(..room, players: new_players),
            [Broadcast("player_ready_changed", ReadyEvent(player_id, ready))],
          )
        }
      }
    _ -> CmdError(room, "invalid_state", "Só pode mudar pronto no lobby.")
  }
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURE
// ═══════════════════════════════════════════════════════════════

pub fn configure(
  room: RoomState,
  player_id: String,
  config: RoomConfig,
) -> CommandResult(RoomState) {
  case room.phase {
    Waiting ->
      case player_id == room.host_id {
        False -> CmdError(room, "not_host", "Apenas o host pode configurar a partida.")
        True -> {
          let total_players = list.length(room.players)
          let min_songs = int.max(1, total_players)
          let max_songs = total_players * 5

          case config.total_songs >= min_songs && config.total_songs <= max_songs {
            False -> CmdError(room, "invalid_config", "Total de músicas fora do range permitido.")
            True ->
              case config.time_per_round >= 10 && config.time_per_round <= 60 {
                False -> CmdError(room, "invalid_config", "Tempo por rodada deve ser entre 10 e 60 segundos.")
                True ->
                  CmdOk(RoomState(..room, config: config), [
                    Broadcast("config_updated", ConfigPayload(
                      config.time_per_round, config.total_songs,
                      config.answer_type, config.allow_repeats, config.scoring_rule,
                    )),
                    Broadcast("song_range_updated", SongRangePayload(min_songs, max_songs, total_players)),
                  ])
              }
          }
        }
      }
    _ -> CmdError(room, "invalid_state", "Só pode configurar no lobby.")
  }
}

// ═══════════════════════════════════════════════════════════════
// START GAME
// ═══════════════════════════════════════════════════════════════

pub fn start_game(room: RoomState, player_id: String) -> CommandResult(RoomState) {
  case room.phase {
    Waiting ->
      case player_id == room.host_id {
        False -> CmdError(room, "not_host", "Apenas o host pode iniciar a partida.")
        True ->
          case list.all(room.players, fn(p) { p.ready }) {
            False -> CmdError(room, "not_all_ready", "Nem todos os jogadores estão prontos.")
            True ->
              CmdOk(RoomState(..room, phase: InMatch), [
                Broadcast("game_starting", CountdownEvent(3)),
                ScheduleTimer(3000, "start_engine"),
              ])
          }
      }
    _ -> CmdError(room, "invalid_state", "Partida só pode ser iniciada no lobby.")
  }
}

// ═══════════════════════════════════════════════════════════════
// SELECT PLAYLIST
// ═══════════════════════════════════════════════════════════════

pub fn select_playlist(
  room: RoomState,
  player_id: String,
  playlist: dynamic.Dynamic,
  platform: String,
) -> CommandResult(RoomState) {
  case room.phase {
    Waiting ->
      case find_player(room.players, player_id) {
        option.None -> CmdError(room, "not_in_room", "Jogador não está na sala.")
        option.Some(_) -> {
          let new_players = update_player(room.players, player_id, fn(p) {
            PlayerInRoom(..p, playlist: option.Some(playlist), platform: option.Some(platform))
          })
          CmdOk(RoomState(..room, players: new_players), [
            Broadcast("playlist_selected", PlayerEvent(player_id, "")),
          ])
        }
      }
    _ -> CmdError(room, "invalid_state", "Só pode selecionar playlist no lobby.")
  }
}

// ═══════════════════════════════════════════════════════════════
// DISCONNECT / RECONNECT
// ═══════════════════════════════════════════════════════════════

pub fn player_disconnected(room: RoomState, player_id: String, now_ms: Int) -> CommandResult(RoomState) {
  case find_player(room.players, player_id) {
    option.None -> CmdOk(room, [])
    option.Some(_) -> {
      let new_players = update_player(room.players, player_id, fn(p) {
        PlayerInRoom(..p, connection: Disconnected(since_ms: now_ms))
      })
      CmdOk(RoomState(..room, players: new_players), [
        Broadcast("player_disconnected", PlayerEvent(player_id, "")),
        ScheduleTimer(120_000, "remove_" <> player_id),
      ])
    }
  }
}

pub fn player_reconnected(room: RoomState, player_id: String) -> CommandResult(RoomState) {
  case find_player(room.players, player_id) {
    option.None -> CmdError(room, "not_in_room", "Jogador não está mais na sala.")
    option.Some(_) -> {
      let new_players = update_player(room.players, player_id, fn(p) {
        PlayerInRoom(..p, connection: Online)
      })
      CmdOk(RoomState(..room, players: new_players), [
        Broadcast("player_reconnected", PlayerEvent(player_id, "")),
      ])
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

fn find_player(players: List(PlayerInRoom), id: String) -> option.Option(PlayerInRoom) {
  case list.find(players, fn(p) { p.id == id }) {
    Ok(p) -> option.Some(p)
    Error(_) -> option.None
  }
}

fn update_player(
  players: List(PlayerInRoom),
  id: String,
  updater: fn(PlayerInRoom) -> PlayerInRoom,
) -> List(PlayerInRoom) {
  list.map(players, fn(p) {
    case p.id == id {
      True -> updater(p)
      False -> p
    }
  })
}

fn transfer_host(room: RoomState) -> #(RoomState, List(Effect)) {
  case room.players {
    [] -> #(room, [])
    [new_host, ..] ->
      #(
        RoomState(..room, host_id: new_host.id),
        [Broadcast("host_changed", HostEvent(new_host.id, new_host.nickname))],
      )
  }
}
