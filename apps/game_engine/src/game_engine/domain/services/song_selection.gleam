// domain/services/song_selection.gleam — Domain Service: Seleção de Músicas

import game_engine/domain/types/media.{type SelectedSong, SelectedSong}
import game_engine/domain/types/player.{type Player}
import gleam/int
import gleam/list

pub type SongRange {
  SongRange(min: Int, max: Int)
}

pub type SelectionResult {
  SelectionResult(songs: List(SelectedSong), players_with_playlist: Int)
}

pub fn calculate_range(total_players: Int) -> SongRange {
  SongRange(min: int.max(1, total_players), max: total_players * 5)
}

pub fn select_songs(
  players: List(Player),
  total_songs: Int,
  allow_repeats: Bool,
) -> SelectionResult {
  let with_playlist =
    list.filter(players, fn(p) { !list.is_empty(p.playlist.tracks) })
  let count = list.length(with_playlist)

  case count {
    0 -> SelectionResult(songs: [], players_with_playlist: 0)
    _ -> {
      let quotas = distribute_quotas(total_songs, count)
      let collected = collect_songs(with_playlist, quotas)
      let final_songs = case allow_repeats {
        True -> collected
        False -> deduplicate(collected)
      }
      SelectionResult(songs: final_songs, players_with_playlist: count)
    }
  }
}

pub fn distribute_quotas(total: Int, num_players: Int) -> List(Int) {
  case num_players {
    0 -> []
    _ ->
      build_quotas(num_players, total / num_players, total % num_players, 0, [])
  }
}

fn build_quotas(
  total: Int,
  base: Int,
  remainder: Int,
  current: Int,
  acc: List(Int),
) -> List(Int) {
  case current >= total {
    True -> list.reverse(acc)
    False -> {
      let quota = case current < remainder {
        True -> base + 1
        False -> base
      }
      build_quotas(total, base, remainder, current + 1, [quota, ..acc])
    }
  }
}

fn collect_songs(players: List(Player), quotas: List(Int)) -> List(SelectedSong) {
  zip_collect(players, quotas, [])
}

fn zip_collect(
  players: List(Player),
  quotas: List(Int),
  acc: List(SelectedSong),
) -> List(SelectedSong) {
  case players, quotas {
    [], _ -> list.reverse(acc)
    _, [] -> list.reverse(acc)
    [player, ..rp], [quota, ..rq] -> {
      let songs = list.take(player.playlist.tracks, quota)
      let selected =
        list.map(songs, fn(s) {
          SelectedSong(song: s, contributed_by: player.id)
        })
      let new_acc =
        list.fold(list.reverse(selected), acc, fn(a, s) { [s, ..a] })
      zip_collect(rp, rq, new_acc)
    }
  }
}

fn deduplicate(songs: List(SelectedSong)) -> List(SelectedSong) {
  dedup_loop(songs, [], [])
}

fn dedup_loop(
  songs: List(SelectedSong),
  seen: List(String),
  acc: List(SelectedSong),
) -> List(SelectedSong) {
  case songs {
    [] -> list.reverse(acc)
    [s, ..rest] ->
      case list.contains(seen, s.song.id) {
        True -> dedup_loop(rest, seen, acc)
        False -> dedup_loop(rest, [s.song.id, ..seen], [s, ..acc])
      }
  }
}
