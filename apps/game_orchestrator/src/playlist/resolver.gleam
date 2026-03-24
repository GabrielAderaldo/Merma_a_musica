// playlist/resolver.gleam — Resolução de Músicas no Deezer
//
// Deezer é o motor de áudio universal. Este módulo busca cada track
// no Deezer para obter o preview_url de 30 segundos.
//
// Estratégia: ISRC primeiro (Spotify), fallback nome+artista (YouTube).
// Rate limit: 50 req/5s → processar em batches de 40 + sleep.
// Cache: ETS isrc_cache (24h TTL).

import gleam/dict
import gleam/dynamic.{type Dynamic}
import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import phoenix_bridge
import playlist/similarity
import playlist/types.{
  type DeezerCacheEntry, type RawTrack, type ResolvedTrack, Available,
  DeezerCacheEntry, ResolvedTrack, Unavailable,
}

const isrc_cache_table = "isrc_cache"

const isrc_cache_ttl = 86_400

// 24h em segundos

const batch_size = 40

const batch_sleep_ms = 5100

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/// Resolver lista de tracks no Deezer. Respeita rate limiting.
pub fn resolve_tracks(tracks: List(RawTrack)) -> List(ResolvedTrack) {
  do_resolve(tracks, [], 0)
}

fn do_resolve(
  remaining: List(RawTrack),
  acc: List(ResolvedTrack),
  request_count: Int,
) -> List(ResolvedTrack) {
  case remaining {
    [] -> list.reverse(acc)
    [track, ..rest] -> {
      // Rate limit check
      let request_count = case request_count >= batch_size {
        True -> {
          phoenix_bridge.sleep(batch_sleep_ms)
          0
        }
        False -> request_count
      }

      let #(resolved, requests_made) = resolve_single(track)
      do_resolve(rest, [resolved, ..acc], request_count + requests_made)
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// RESOLVE SINGLE TRACK
// ═══════════════════════════════════════════════════════════════

/// Resolver um track no Deezer. Retorna #(ResolvedTrack, requests_feitas).
fn resolve_single(track: RawTrack) -> #(ResolvedTrack, Int) {
  // 1. Checar cache ISRC
  case check_isrc_cache(track) {
    Ok(resolved) -> #(resolved, 0)
    Error(_) ->
      // 2. Tentar ISRC no Deezer
      case try_isrc_lookup(track) {
        Ok(#(resolved, reqs)) -> #(resolved, reqs)
        Error(reqs_used) ->
          // 3. Fallback: busca por nome+artista
          case try_name_search(track) {
            Ok(#(resolved, reqs)) -> #(resolved, reqs_used + reqs)
            Error(reqs) -> #(make_unavailable(track), reqs_used + reqs)
          }
      }
  }
}

// ═══════════════════════════════════════════════════════════════
// ISRC CACHE
// ═══════════════════════════════════════════════════════════════

fn check_isrc_cache(track: RawTrack) -> Result(ResolvedTrack, Nil) {
  case track.isrc {
    None -> Error(Nil)
    Some(isrc) ->
      case phoenix_bridge.cache_get(isrc_cache_table, phoenix_bridge.to_dynamic(isrc)) {
        Error(_) -> Error(Nil)
        Ok(cached_dynamic) -> {
          // O cache armazena DeezerCacheEntry como dict Erlang
          case decode_cache_entry(cached_dynamic) {
            Ok(entry) ->
              Ok(ResolvedTrack(
                original_id: track.original_id,
                original_name: track.original_name,
                original_artist: track.original_artist,
                deezer_track_id: Some(entry.deezer_track_id),
                deezer_name: entry.title,
                deezer_artist: entry.artist_name,
                deezer_album: entry.album_title,
                deezer_cover_url: entry.cover_url,
                preview_url: Some(entry.preview_url),
                confidence: 1.0,
                status: Available,
              ))
            Error(_) -> Error(Nil)
          }
        }
      }
  }
}

fn decode_cache_entry(
  data: Dynamic,
) -> Result(DeezerCacheEntry, Nil) {
  let decoder = {
    use deezer_track_id <- decode.field("id", decode.int)
    use title <- decode.field("title", decode.string)
    use artist_name <- decode.field("artist_name", decode.string)
    use album_title <- decode.field("album_title", decode.string)
    use cover_url <- decode.field("cover_url", decode.string)
    use preview_url <- decode.field("preview_url", decode.string)
    decode.success(DeezerCacheEntry(
      deezer_track_id: deezer_track_id,
      title: title,
      artist_name: artist_name,
      album_title: album_title,
      cover_url: cover_url,
      preview_url: preview_url,
    ))
  }
  case decode.run(data, decoder) {
    Ok(entry) -> Ok(entry)
    Error(_) -> Error(Nil)
  }
}

fn cache_isrc(isrc: String, entry: DeezerCacheEntry) -> Nil {
  let value =
    phoenix_bridge.to_dynamic(
      dict.from_list([
        #("id", phoenix_bridge.to_dynamic(entry.deezer_track_id)),
        #("title", phoenix_bridge.to_dynamic(entry.title)),
        #("artist_name", phoenix_bridge.to_dynamic(entry.artist_name)),
        #("album_title", phoenix_bridge.to_dynamic(entry.album_title)),
        #("cover_url", phoenix_bridge.to_dynamic(entry.cover_url)),
        #("preview_url", phoenix_bridge.to_dynamic(entry.preview_url)),
      ]),
    )
  phoenix_bridge.cache_put(
    isrc_cache_table,
    phoenix_bridge.to_dynamic(isrc),
    value,
    isrc_cache_ttl,
  )
}

// ═══════════════════════════════════════════════════════════════
// ISRC LOOKUP
// ═══════════════════════════════════════════════════════════════

fn try_isrc_lookup(
  track: RawTrack,
) -> Result(#(ResolvedTrack, Int), Int) {
  case track.isrc {
    None -> Error(0)
    Some(isrc) -> {
      let url = "https://api.deezer.com/2.0/track/isrc:" <> isrc
      case phoenix_bridge.http_get(url, []) {
        Error(_) -> Error(1)
        Ok(#(status, body)) ->
          case status >= 200 && status < 300 {
            False -> Error(1)
            True ->
              case parse_deezer_track(body) {
                Error(_) -> Error(1)
                Ok(entry) ->
                  case entry.preview_url {
                    "" -> Error(1)
                    _ -> {
                      // Cachear resultado
                      cache_isrc(isrc, entry)
                      Ok(#(
                        ResolvedTrack(
                          original_id: track.original_id,
                          original_name: track.original_name,
                          original_artist: track.original_artist,
                          deezer_track_id: Some(entry.deezer_track_id),
                          deezer_name: entry.title,
                          deezer_artist: entry.artist_name,
                          deezer_album: entry.album_title,
                          deezer_cover_url: entry.cover_url,
                          preview_url: Some(entry.preview_url),
                          confidence: 1.0,
                          status: Available,
                        ),
                        1,
                      ))
                    }
                  }
              }
          }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// NAME SEARCH
// ═══════════════════════════════════════════════════════════════

fn try_name_search(
  track: RawTrack,
) -> Result(#(ResolvedTrack, Int), Int) {
  let query =
    "track:\"" <> track.original_name <> "\" artist:\"" <> track.original_artist
    <> "\""
  let params = phoenix_bridge.url_encode([#("q", query), #("limit", "5")])
  let url = "https://api.deezer.com/search?" <> params

  case phoenix_bridge.http_get(url, []) {
    Error(_) -> Error(1)
    Ok(#(status, body)) ->
      case status >= 200 && status < 300 {
        False -> Error(1)
        True ->
          case parse_deezer_search_results(body) {
            Error(_) -> Error(1)
            Ok(results) ->
              case find_best_match(track, results) {
                None -> Error(1)
                Some(#(entry, confidence)) -> {
                  // Cachear se tem ISRC
                  case track.isrc {
                    Some(isrc) -> cache_isrc(isrc, entry)
                    None -> Nil
                  }
                  Ok(#(
                    ResolvedTrack(
                      original_id: track.original_id,
                      original_name: track.original_name,
                      original_artist: track.original_artist,
                      deezer_track_id: Some(entry.deezer_track_id),
                      deezer_name: entry.title,
                      deezer_artist: entry.artist_name,
                      deezer_album: entry.album_title,
                      deezer_cover_url: entry.cover_url,
                      preview_url: Some(entry.preview_url),
                      confidence: confidence,
                      status: Available,
                    ),
                    1,
                  ))
                }
              }
          }
      }
  }
}

fn find_best_match(
  track: RawTrack,
  results: List(DeezerCacheEntry),
) -> Option(#(DeezerCacheEntry, Float)) {
  results
  |> list.filter(fn(entry) { entry.preview_url != "" })
  |> list.filter_map(fn(entry) {
    let #(is_match, confidence) =
      similarity.is_good_match(
        track.original_name,
        track.original_artist,
        entry.title,
        entry.artist_name,
      )
    case is_match {
      True -> Ok(#(entry, confidence))
      False -> Error(Nil)
    }
  })
  |> list.first()
  |> option.from_result()
}

// ═══════════════════════════════════════════════════════════════
// DEEZER JSON PARSING
// ═══════════════════════════════════════════════════════════════

fn parse_deezer_track(body: String) -> Result(DeezerCacheEntry, Nil) {
  case json.parse(body, deezer_track_decoder()) {
    Ok(entry) -> entry
    Error(_) -> Error(Nil)
  }
}

fn parse_deezer_search_results(
  body: String,
) -> Result(List(DeezerCacheEntry), Nil) {
  let decoder = {
    use items <- decode.field(
      "data",
      decode.list(deezer_track_decoder()),
    )
    decode.success(items)
  }
  case json.parse(body, decoder) {
    Ok(items) -> {
      let entries =
        list.filter_map(items, fn(result) {
          case result {
            Ok(entry) -> Ok(entry)
            Error(_) -> Error(Nil)
          }
        })
      Ok(entries)
    }
    Error(_) -> Error(Nil)
  }
}

/// Decoder para o sub-objeto album da API do Deezer.
/// Retorna #(title, cover_url) com defaults vazios.
fn album_decoder() -> decode.Decoder(#(String, String)) {
  use title <- decode.optional_field("title", "", decode.string)
  use cover_url <- decode.optional_field("cover_medium", "", decode.string)
  decode.success(#(title, cover_url))
}

/// Decoder para um track individual da API do Deezer.
/// Retorna Result porque tracks não-readable devem ser filtrados.
fn deezer_track_decoder() -> decode.Decoder(Result(DeezerCacheEntry, Nil)) {
  use id <- decode.field("id", decode.int)
  use title <- decode.field("title", decode.string)
  use artist <- decode.subfield(["artist", "name"], decode.string)
  use album_info <- decode.optional_field(
    "album",
    #("", ""),
    album_decoder(),
  )
  use preview_url <- decode.optional_field("preview", "", decode.string)
  use readable <- decode.optional_field("readable", True, decode.bool)
  let #(album_title, cover_url) = album_info
  case readable {
    False -> decode.success(Error(Nil))
    True ->
      decode.success(Ok(DeezerCacheEntry(
        deezer_track_id: id,
        title: title,
        artist_name: artist,
        album_title: album_title,
        cover_url: cover_url,
        preview_url: preview_url,
      )))
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

fn make_unavailable(track: RawTrack) -> ResolvedTrack {
  ResolvedTrack(
    original_id: track.original_id,
    original_name: track.original_name,
    original_artist: track.original_artist,
    deezer_track_id: None,
    deezer_name: "",
    deezer_artist: "",
    deezer_album: "",
    deezer_cover_url: "",
    preview_url: None,
    confidence: 0.0,
    status: Unavailable,
  )
}
