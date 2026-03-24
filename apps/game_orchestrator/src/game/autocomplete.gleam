// game/autocomplete.gleam — Busca de Sugestões durante a rodada
//
// Busca no pool TOTAL de músicas de todas as playlists dos jogadores.
// Operação em memória — sem I/O externo. Max 10 resultados.

import gleam/list
import gleam/string
import playlist/similarity

/// Entrada de sugestão (nome da música ou artista).
pub type Suggestion {
  SongSuggestion(text: String)
  ArtistSuggestion(text: String)
}

/// Item do pool: cada música disponível com nome e artista.
pub type PoolEntry {
  PoolEntry(song_name: String, artist_name: String)
}

/// Buscar sugestões no pool de músicas.
/// Query mínima: 2 caracteres. Max 10 resultados.
/// Retorna sugestões de nome de música E artista que contenham a query.
pub fn search(
  query: String,
  pool: List(PoolEntry),
) -> List(Suggestion) {
  let trimmed = string.trim(query)
  case string.length(trimmed) >= 2 {
    False -> []
    True -> {
      let normalized_query = similarity.normalize_for_matching(trimmed)
      pool
      |> list.flat_map(fn(entry) { match_entry(entry, normalized_query) })
      |> deduplicate([])
      |> list.take(10)
    }
  }
}

/// Verificar se um entry do pool contém a query (no nome ou artista).
fn match_entry(
  entry: PoolEntry,
  normalized_query: String,
) -> List(Suggestion) {
  let norm_song = similarity.normalize_for_matching(entry.song_name)
  let norm_artist = similarity.normalize_for_matching(entry.artist_name)

  let song_match = string.contains(norm_song, normalized_query)
  let artist_match = string.contains(norm_artist, normalized_query)

  case song_match, artist_match {
    True, True -> [
      SongSuggestion(entry.song_name),
      ArtistSuggestion(entry.artist_name),
    ]
    True, False -> [SongSuggestion(entry.song_name)]
    False, True -> [ArtistSuggestion(entry.artist_name)]
    False, False -> []
  }
}

/// Remover duplicatas por texto (case-insensitive).
fn deduplicate(
  items: List(Suggestion),
  seen: List(String),
) -> List(Suggestion) {
  case items {
    [] -> []
    [first, ..rest] -> {
      let text = case first {
        SongSuggestion(t) -> t
        ArtistSuggestion(t) -> t
      }
      let lower = string.lowercase(text)
      case list.contains(seen, lower) {
        True -> deduplicate(rest, seen)
        False -> [first, ..deduplicate(rest, [lower, ..seen])]
      }
    }
  }
}
