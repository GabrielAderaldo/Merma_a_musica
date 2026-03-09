import game_engine/types.{type Player, type Song}
import gleam/list

/// Distribui músicas das playlists dos jogadores para a partida.
/// Pega músicas igualmente de cada jogador, alternando entre eles.
/// Se allow_repeats=False, remove duplicatas por song.id.
pub fn select_songs(
  players: List(Player),
  total_songs: Int,
  allow_repeats: Bool,
) -> List(Song) {
  let all_songs = collect_from_playlists(players)
  let unique_songs = case allow_repeats {
    True -> all_songs
    False -> deduplicate(all_songs)
  }
  unique_songs
  |> list.take(total_songs)
}

/// Coleta músicas alternando entre as playlists dos jogadores.
/// Round-robin: pega 1 de cada jogador, depois repete.
fn collect_from_playlists(players: List(Player)) -> List(Song) {
  let playlists = list.map(players, fn(p) { p.playlist })
  interleave(playlists, [])
}

/// Intercala listas: pega o primeiro de cada, depois repete.
fn interleave(
  lists: List(List(Song)),
  acc: List(Song),
) -> List(Song) {
  let non_empty = list.filter(lists, fn(l) { !list.is_empty(l) })
  case list.is_empty(non_empty) {
    True -> list.reverse(acc)
    False -> {
      let heads =
        list.filter_map(non_empty, fn(l) { list.first(l) })
      let tails =
        list.map(non_empty, fn(l) { list.drop(l, 1) })
      interleave(tails, list.append(list.reverse(heads), acc))
    }
  }
}

/// Remove músicas duplicadas por ID, mantendo a primeira ocorrência.
fn deduplicate(songs: List(Song)) -> List(Song) {
  deduplicate_loop(songs, [], [])
}

fn deduplicate_loop(
  songs: List(Song),
  seen_ids: List(String),
  acc: List(Song),
) -> List(Song) {
  case songs {
    [] -> list.reverse(acc)
    [song, ..rest] -> {
      case list.contains(seen_ids, song.id) {
        True -> deduplicate_loop(rest, seen_ids, acc)
        False ->
          deduplicate_loop(rest, [song.id, ..seen_ids], [song, ..acc])
      }
    }
  }
}
