// playlist/importer.gleam — Importação de Playlists (Spotify + YouTube Music)
//
// Busca playlists e tracks das plataformas externas.
// Spotify fornece ISRC; YouTube não (parse de título).
// Deezer NÃO é importado aqui — é só motor de áudio.
//
// Usa phoenix_bridge.http_get para chamadas HTTP.
// Retorna RawTrack (sem resolução Deezer — isso é job do resolver).

import gleam/dynamic.{type Dynamic}
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import phoenix_bridge
import playlist/types.{type PlaylistSummary, type RawTrack, PlaylistSummary, RawTrack}

// ═══════════════════════════════════════════════════════════════
// LIST PLAYLISTS
// ═══════════════════════════════════════════════════════════════

/// Listar playlists do jogador em uma plataforma.
pub fn list_playlists(
  platform: String,
  access_token: String,
) -> Result(List(PlaylistSummary), String) {
  case platform {
    "spotify" -> list_spotify_playlists(access_token, 0, [])
    "youtube_music" -> list_youtube_playlists(access_token, "")
    _ -> Error("unsupported_platform")
  }
}

// ═══════════════════════════════════════════════════════════════
// IMPORT TRACKS
// ═══════════════════════════════════════════════════════════════

/// Importar tracks de uma playlist. Retorna summary + lista de RawTrack.
pub fn import_tracks(
  platform: String,
  playlist_id: String,
  access_token: String,
) -> Result(#(PlaylistSummary, List(RawTrack)), String) {
  case platform {
    "spotify" -> import_spotify_tracks(playlist_id, access_token)
    "youtube_music" -> import_youtube_tracks(playlist_id, access_token)
    _ -> Error("unsupported_platform")
  }
}

// ═══════════════════════════════════════════════════════════════
// SPOTIFY — List Playlists
// ═══════════════════════════════════════════════════════════════

fn list_spotify_playlists(
  access_token: String,
  offset: Int,
  acc: List(PlaylistSummary),
) -> Result(List(PlaylistSummary), String) {
  let url =
    "https://api.spotify.com/v1/me/playlists?limit=50&offset="
    <> int.to_string(offset)
  let headers = [#("Authorization", "Bearer " <> access_token)]

  case phoenix_bridge.http_get(url, headers) {
    Error(reason) -> Error("spotify_http_error: " <> reason)
    Ok(#(401, _)) -> Error("token_expired")
    Ok(#(429, _)) -> {
      // Rate limited — esperar e retry
      phoenix_bridge.sleep(2000)
      list_spotify_playlists(access_token, offset, acc)
    }
    Ok(#(status, body)) ->
      case status >= 200 && status < 300 {
        False ->
          Error("spotify_error: status " <> int.to_string(status))
        True -> {
          case parse_spotify_playlists_page(body) {
            Error(reason) -> Error(reason)
            Ok(#(playlists, total)) -> {
              let all = list.append(acc, playlists)
              let new_offset = offset + 50
              case new_offset >= total {
                True -> Ok(all)
                False -> {
                  phoenix_bridge.sleep(100)
                  list_spotify_playlists(access_token, new_offset, all)
                }
              }
            }
          }
        }
      }
  }
}

fn parse_spotify_playlists_page(
  body: String,
) -> Result(#(List(PlaylistSummary), Int), String) {
  let decoder = {
    use total <- decode.field("total", decode.int)
    use items <- decode.field("items", decode.list(decode.dynamic))
    decode.success(#(items, total))
  }

  case json.parse(body, decoder) {
    Ok(#(items, total)) -> {
      let playlists = list.filter_map(items, parse_spotify_playlist_item)
      Ok(#(playlists, total))
    }
    Error(_) -> Error("failed to parse spotify playlists response")
  }
}

fn parse_spotify_playlist_item(
  item: Dynamic,
) -> Result(PlaylistSummary, Nil) {
  let decoder = {
    use id <- decode.field("id", decode.string)
    use name <- decode.field("name", decode.string)
    decode.success(#(id, name))
  }

  case decode.run(item, decoder) {
    Ok(#(id, name)) -> {
      let cover_url = get_spotify_cover(item)
      let track_count = get_spotify_track_count(item)
      Ok(PlaylistSummary(
        id: id,
        name: name,
        platform: "spotify",
        cover_url: cover_url,
        track_count: track_count,
      ))
    }
    Error(_) -> Error(Nil)
  }
}

fn get_spotify_cover(item: Dynamic) -> String {
  let decoder =
    decode.field("images", decode.list(decode.at(["url"], decode.string)), fn(urls) {
      decode.success(urls)
    })
  case decode.run(item, decoder) {
    Ok([first, ..]) -> first
    _ -> ""
  }
}

fn get_spotify_track_count(item: Dynamic) -> Int {
  // Usar "items" (novo, pós fev/2026) com fallback para "tracks" (deprecado)
  let items_decoder = decode.at(["items", "total"], decode.int)
  let tracks_decoder = decode.at(["tracks", "total"], decode.int)
  case decode.run(item, items_decoder) {
    Ok(count) -> count
    _ ->
      case decode.run(item, tracks_decoder) {
        Ok(count) -> count
        _ -> 0
      }
  }
}

// ═══════════════════════════════════════════════════════════════
// SPOTIFY — Import Tracks
// ═══════════════════════════════════════════════════════════════

fn import_spotify_tracks(
  playlist_id: String,
  access_token: String,
) -> Result(#(PlaylistSummary, List(RawTrack)), String) {
  // Buscar summary da playlist
  use summary <- result.try(fetch_spotify_playlist_summary(
    playlist_id,
    access_token,
  ))
  // Buscar todas as tracks
  use tracks <- result.try(fetch_spotify_tracks(
    playlist_id,
    access_token,
    0,
    [],
  ))
  Ok(#(summary, tracks))
}

fn fetch_spotify_playlist_summary(
  playlist_id: String,
  access_token: String,
) -> Result(PlaylistSummary, String) {
  let url =
    "https://api.spotify.com/v1/playlists/" <> playlist_id
    <> "?fields=id,name,images,tracks(total)"
  let headers = [#("Authorization", "Bearer " <> access_token)]

  case phoenix_bridge.http_get(url, headers) {
    Error(reason) -> Error("spotify_http_error: " <> reason)
    Ok(#(status, body)) ->
      case status >= 200 && status < 300 {
        False -> Error("spotify_error: status " <> int.to_string(status))
        True -> {
          case json.parse(body, decode.dynamic) {
            Ok(data) ->
              case parse_spotify_playlist_item(data) {
                Ok(summary) -> Ok(summary)
                Error(_) -> Error("failed to parse playlist summary")
              }
            Error(_) -> Error("failed to parse playlist json")
          }
        }
      }
  }
}

fn fetch_spotify_tracks(
  playlist_id: String,
  access_token: String,
  offset: Int,
  acc: List(RawTrack),
) -> Result(List(RawTrack), String) {
  // Usar /items (não /tracks — deprecado desde fev/2026)
  let url =
    "https://api.spotify.com/v1/playlists/" <> playlist_id
    <> "/items?limit=50&offset=" <> int.to_string(offset)
  let headers = [#("Authorization", "Bearer " <> access_token)]

  case phoenix_bridge.http_get(url, headers) {
    Error(reason) -> Error("spotify_http_error: " <> reason)
    Ok(#(401, _)) -> Error("token_expired")
    Ok(#(429, _)) -> {
      phoenix_bridge.sleep(2000)
      fetch_spotify_tracks(playlist_id, access_token, offset, acc)
    }
    Ok(#(status, body)) ->
      case status >= 200 && status < 300 {
        False -> Error("spotify_error: status " <> int.to_string(status))
        True -> {
          case parse_spotify_tracks_page(body) {
            Error(reason) -> Error(reason)
            Ok(#(tracks, total)) -> {
              let all = list.append(acc, tracks)
              let new_offset = offset + 50
              case new_offset >= total {
                True -> Ok(all)
                False -> {
                  phoenix_bridge.sleep(100)
                  fetch_spotify_tracks(
                    playlist_id,
                    access_token,
                    new_offset,
                    all,
                  )
                }
              }
            }
          }
        }
      }
  }
}

fn parse_spotify_tracks_page(
  body: String,
) -> Result(#(List(RawTrack), Int), String) {
  let decoder = {
    use total <- decode.field("total", decode.int)
    use items <- decode.field("items", decode.list(decode.dynamic))
    decode.success(#(items, total))
  }

  case json.parse(body, decoder) {
    Ok(#(items, total)) -> {
      let tracks = list.filter_map(items, parse_spotify_track_item)
      Ok(#(tracks, total))
    }
    Error(_) -> Error("failed to parse spotify tracks response")
  }
}

fn parse_spotify_track_item(item: Dynamic) -> Result(RawTrack, Nil) {
  // Campo "item" (novo) com fallback para "track" (antigo)
  let item_decoder = decode.field("item", decode.dynamic, fn(t) {
    decode.success(t)
  })
  let track_decoder = decode.field("track", decode.dynamic, fn(t) {
    decode.success(t)
  })
  let track_data = case decode.run(item, item_decoder) {
    Ok(t) -> Ok(t)
    Error(_) -> decode.run(item, track_decoder)
  }

  case track_data {
    Error(_) -> Error(Nil)
    Ok(track) -> {
      let decoder = {
        use id <- decode.field("id", decode.string)
        use name <- decode.field("name", decode.string)
        decode.success(#(id, name))
      }

      case decode.run(track, decoder) {
        Ok(#(id, name)) -> {
          let artist = get_spotify_first_artist(track)
          let isrc = get_spotify_isrc(track)
          Ok(RawTrack(
            original_id: id,
            original_name: name,
            original_artist: artist,
            isrc: isrc,
          ))
        }
        Error(_) -> Error(Nil)
      }
    }
  }
}

fn get_spotify_first_artist(track: Dynamic) -> String {
  let decoder =
    decode.field("artists", decode.list(decode.at(["name"], decode.string)), fn(names) {
      decode.success(names)
    })
  case decode.run(track, decoder) {
    Ok([first, ..]) -> first
    _ -> ""
  }
}

fn get_spotify_isrc(track: Dynamic) -> Option(String) {
  // Tratar defensivamente — external_ids pode não existir
  let decoder = decode.at(["external_ids", "isrc"], decode.string)
  case decode.run(track, decoder) {
    Ok(isrc) -> Some(isrc)
    Error(_) -> None
  }
}

// ═══════════════════════════════════════════════════════════════
// YOUTUBE MUSIC — List Playlists
// ═══════════════════════════════════════════════════════════════

fn list_youtube_playlists(
  access_token: String,
  page_token: String,
) -> Result(List(PlaylistSummary), String) {
  let base_url =
    "https://www.googleapis.com/youtube/v3/playlists?mine=true&part=snippet,contentDetails&maxResults=50"
  let url = case page_token {
    "" -> base_url
    token -> base_url <> "&pageToken=" <> token
  }
  let headers = [#("Authorization", "Bearer " <> access_token)]

  case phoenix_bridge.http_get(url, headers) {
    Error(reason) -> Error("youtube_http_error: " <> reason)
    Ok(#(401, _)) -> Error("token_expired")
    Ok(#(status, body)) ->
      case status >= 200 && status < 300 {
        False -> Error("youtube_error: status " <> int.to_string(status))
        True -> parse_youtube_playlists_page(body, access_token)
      }
  }
}

fn parse_youtube_playlists_page(
  body: String,
  access_token: String,
) -> Result(List(PlaylistSummary), String) {
  let decoder = {
    use items <- decode.field("items", decode.list(decode.dynamic))
    use next_page <- decode.optional_field("nextPageToken", "", decode.string)
    decode.success(#(items, next_page))
  }

  case json.parse(body, decoder) {
    Error(_) -> Error("failed to parse youtube playlists response")
    Ok(#(items, next_page)) -> {
      let playlists = list.filter_map(items, parse_youtube_playlist_item)
      case next_page {
        "" -> Ok(playlists)
        token -> {
          case list_youtube_playlists(access_token, token) {
            Ok(more) -> Ok(list.append(playlists, more))
            Error(reason) -> Error(reason)
          }
        }
      }
    }
  }
}

fn parse_youtube_playlist_item(
  item: Dynamic,
) -> Result(PlaylistSummary, Nil) {
  let decoder = {
    use id <- decode.field("id", decode.string)
    use title <- decode.subfield(["snippet", "title"], decode.string)
    decode.success(#(id, title))
  }

  case decode.run(item, decoder) {
    Ok(#(id, title)) -> {
      let cover_url = get_youtube_thumbnail(item)
      let track_count = get_youtube_item_count(item)
      Ok(PlaylistSummary(
        id: id,
        name: title,
        platform: "youtube_music",
        cover_url: cover_url,
        track_count: track_count,
      ))
    }
    Error(_) -> Error(Nil)
  }
}

fn get_youtube_thumbnail(item: Dynamic) -> String {
  let decoder =
    decode.at(["snippet", "thumbnails", "medium", "url"], decode.string)
  case decode.run(item, decoder) {
    Ok(url) -> url
    _ -> ""
  }
}

fn get_youtube_item_count(item: Dynamic) -> Int {
  let decoder =
    decode.at(["contentDetails", "itemCount"], decode.int)
  case decode.run(item, decoder) {
    Ok(count) -> count
    _ -> 0
  }
}

// ═══════════════════════════════════════════════════════════════
// YOUTUBE MUSIC — Import Tracks
// ═══════════════════════════════════════════════════════════════

fn import_youtube_tracks(
  playlist_id: String,
  access_token: String,
) -> Result(#(PlaylistSummary, List(RawTrack)), String) {
  // Buscar summary
  use summary <- result.try(fetch_youtube_playlist_summary(
    playlist_id,
    access_token,
  ))
  // Buscar tracks
  use tracks <- result.try(fetch_youtube_tracks(playlist_id, access_token, ""))
  Ok(#(summary, tracks))
}

fn fetch_youtube_playlist_summary(
  playlist_id: String,
  access_token: String,
) -> Result(PlaylistSummary, String) {
  let url =
    "https://www.googleapis.com/youtube/v3/playlists?id=" <> playlist_id
    <> "&part=snippet,contentDetails"
  let headers = [#("Authorization", "Bearer " <> access_token)]

  case phoenix_bridge.http_get(url, headers) {
    Error(reason) -> Error("youtube_http_error: " <> reason)
    Ok(#(status, body)) ->
      case status >= 200 && status < 300 {
        False -> Error("youtube_error: status " <> int.to_string(status))
        True -> {
          let decoder =
            decode.field("items", decode.list(decode.dynamic), fn(items) {
              decode.success(items)
            })
          case json.parse(body, decoder) {
            Ok([first, ..]) ->
              case parse_youtube_playlist_item(first) {
                Ok(summary) -> Ok(summary)
                Error(_) -> Error("failed to parse youtube playlist")
              }
            _ -> Error("youtube playlist not found")
          }
        }
      }
  }
}

fn fetch_youtube_tracks(
  playlist_id: String,
  access_token: String,
  page_token: String,
) -> Result(List(RawTrack), String) {
  let base_url =
    "https://www.googleapis.com/youtube/v3/playlistItems?playlistId="
    <> playlist_id
    <> "&part=snippet&maxResults=50"
  let url = case page_token {
    "" -> base_url
    token -> base_url <> "&pageToken=" <> token
  }
  let headers = [#("Authorization", "Bearer " <> access_token)]

  case phoenix_bridge.http_get(url, headers) {
    Error(reason) -> Error("youtube_http_error: " <> reason)
    Ok(#(401, _)) -> Error("token_expired")
    Ok(#(status, body)) ->
      case status >= 200 && status < 300 {
        False -> Error("youtube_error: status " <> int.to_string(status))
        True -> {
          let decoder = {
            use items <- decode.field("items", decode.list(decode.dynamic))
            use next <- decode.optional_field("nextPageToken", "", decode.string)
            decode.success(#(items, next))
          }

          case json.parse(body, decoder) {
            Error(_) -> Error("failed to parse youtube tracks")
            Ok(#(items, next)) -> {
              let tracks = list.filter_map(items, parse_youtube_track_item)
              case next {
                "" -> Ok(tracks)
                token -> {
                  case fetch_youtube_tracks(playlist_id, access_token, token) {
                    Ok(more) -> Ok(list.append(tracks, more))
                    Error(reason) -> Error(reason)
                  }
                }
              }
            }
          }
        }
      }
  }
}

fn parse_youtube_track_item(item: Dynamic) -> Result(RawTrack, Nil) {
  let snippet_decoder = decode.field("snippet", decode.dynamic, fn(s) {
    decode.success(s)
  })
  case decode.run(item, snippet_decoder) {
    Error(_) -> Error(Nil)
    Ok(snippet) -> {
      let decoder = {
        use title <- decode.field("title", decode.string)
        use video_id <- decode.subfield(["resourceId", "videoId"], decode.string)
        decode.success(#(title, video_id))
      }

      case decode.run(snippet, decoder) {
        Ok(#(title, video_id)) -> {
          // Pular vídeos deletados/privados
          case title {
            "Deleted video" -> Error(Nil)
            "Private video" -> Error(Nil)
            _ -> {
              let #(artist, song_name) = parse_youtube_title(title, snippet)
              Ok(RawTrack(
                original_id: video_id,
                original_name: song_name,
                original_artist: artist,
                isrc: None,
              ))
            }
          }
        }
        Error(_) -> Error(Nil)
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// YOUTUBE TITLE PARSER
// ═══════════════════════════════════════════════════════════════

/// Parsear título do YouTube: "Artist - Song Name" ou variações.
fn parse_youtube_title(
  title: String,
  snippet: Dynamic,
) -> #(String, String) {
  case string.split_once(title, " - ") {
    Ok(#(artist, song_name)) -> {
      let clean_name = clean_youtube_suffixes(song_name)
      #(string.trim(artist), string.trim(clean_name))
    }
    Error(_) -> {
      // Sem separator — título inteiro é o nome da música
      let clean_name = clean_youtube_suffixes(title)
      let artist = get_youtube_channel_artist(snippet)
      #(artist, string.trim(clean_name))
    }
  }
}

/// Extrair nome do artista do canal (remover " - Topic").
fn get_youtube_channel_artist(snippet: Dynamic) -> String {
  let decoder =
    decode.field("videoOwnerChannelTitle", decode.string, fn(channel) {
      decode.success(channel)
    })
  case decode.run(snippet, decoder) {
    Ok(channel) -> {
      case string.split_once(channel, " - Topic") {
        Ok(#(artist, _)) -> string.trim(artist)
        Error(_) -> string.trim(channel)
      }
    }
    Error(_) -> ""
  }
}

/// Remover sufixos comuns de títulos YouTube.
fn clean_youtube_suffixes(text: String) -> String {
  text
  |> remove_between("(", ")")
  |> remove_between("[", "]")
}

fn remove_between(text: String, open: String, close: String) -> String {
  case string.split_once(text, open) {
    Error(_) -> text
    Ok(#(before, rest)) ->
      case string.split_once(rest, close) {
        Error(_) -> text
        Ok(#(_, after)) -> remove_between(string.trim(before <> after), open, close)
      }
  }
}
