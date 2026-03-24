// http/playlist_handler.gleam — Handler REST: Playlists
//
// Orquestra o pipeline completo: import → resolve → filter → cache → response.
// Chamado por: PlaylistController → :http@playlist_handler.*

import gleam/dict
import gleam/dynamic.{type Dynamic}
import gleam/list
import gleam/option.{None, Some}
import phoenix_bridge
import phoenix_bridge/types.{type HttpResponse, HttpError, HttpOk}
import playlist/filter
import playlist/importer
import playlist/resolver
import playlist/types as ptypes

// ═══════════════════════════════════════════════════════════════
// LIST PLAYLISTS
// ═══════════════════════════════════════════════════════════════

/// GET /api/v1/playlists/:platform — Listar playlists do jogador
pub fn handle_list_playlists(
  platform: String,
  access_token: String,
) -> HttpResponse(Dynamic) {
  case access_token {
    "" -> HttpError(401, "missing_token", "access_token header is required")
    _ ->
      case importer.list_playlists(platform, access_token) {
        Error("token_expired") ->
          HttpError(401, "token_expired", "Access token expired")
        Error(reason) ->
          HttpError(502, "platform_error", reason)
        Ok(playlists) -> {
          let serialized =
            dict.from_list([
              #("playlists", phoenix_bridge.to_dynamic(list.map(playlists, serialize_summary))),
            ])
          HttpOk(200, phoenix_bridge.to_dynamic(serialized))
        }
      }
  }
}

// ═══════════════════════════════════════════════════════════════
// IMPORT PLAYLIST
// ═══════════════════════════════════════════════════════════════

/// POST /api/v1/playlists/:platform/:playlist_id/import — Importar + validar
pub fn handle_import_playlist(
  platform: String,
  playlist_id: String,
  access_token: String,
) -> HttpResponse(Dynamic) {
  case access_token {
    "" -> HttpError(401, "missing_token", "access_token header is required")
    _ ->
      case importer.import_tracks(platform, playlist_id, access_token) {
        Error("token_expired") ->
          HttpError(401, "token_expired", "Access token expired")
        Error(reason) ->
          HttpError(502, "platform_error", reason)
        Ok(#(summary, raw_tracks)) -> {
          // Resolver no Deezer
          let resolved_tracks = resolver.resolve_tracks(raw_tracks)
          // Filtrar e montar stats
          let validated = filter.build_validated(summary, resolved_tracks)
          // Cachear
          let cache_key = platform <> ":" <> playlist_id
          phoenix_bridge.cache_put(
            "playlist_cache",
            phoenix_bridge.to_dynamic(cache_key),
            phoenix_bridge.to_dynamic(validated),
            3600,
          )
          // Serializar resposta
          HttpOk(200, phoenix_bridge.to_dynamic(serialize_validated(validated)))
        }
      }
  }
}

// ═══════════════════════════════════════════════════════════════
// GET VALIDATED
// ═══════════════════════════════════════════════════════════════

/// GET /api/v1/playlists/validated — Playlists já validadas (cache)
pub fn handle_get_validated(
  player_uuid: String,
) -> HttpResponse(Dynamic) {
  case player_uuid {
    "" ->
      HttpError(400, "missing_player_uuid", "player_uuid header is required")
    _ ->
      case
        phoenix_bridge.cache_get(
          "player_playlists",
          phoenix_bridge.to_dynamic(player_uuid),
        )
      {
        Ok(cached) -> HttpOk(200, cached)
        Error(_) -> {
          let empty =
            dict.from_list([#("playlists", phoenix_bridge.to_dynamic([]))])
          HttpOk(200, phoenix_bridge.to_dynamic(empty))
        }
      }
  }
}

// ═══════════════════════════════════════════════════════════════
// SERIALIZATION (Gleam → Erlang maps → Jason)
// ═══════════════════════════════════════════════════════════════

fn serialize_validated(validated: ptypes.ValidatedPlaylist) -> dict.Dict(String, Dynamic) {
  dict.from_list([
    #("playlist", phoenix_bridge.to_dynamic(serialize_summary(validated.summary))),
    #(
      "tracks",
      phoenix_bridge.to_dynamic(list.map(validated.tracks, serialize_track)),
    ),
    #("stats", phoenix_bridge.to_dynamic(serialize_stats(validated.stats))),
  ])
}

fn serialize_summary(summary: ptypes.PlaylistSummary) -> dict.Dict(String, Dynamic) {
  dict.from_list([
    #("id", phoenix_bridge.to_dynamic(summary.id)),
    #("name", phoenix_bridge.to_dynamic(summary.name)),
    #("platform", phoenix_bridge.to_dynamic(summary.platform)),
    #("cover_url", phoenix_bridge.to_dynamic(summary.cover_url)),
    #("track_count", phoenix_bridge.to_dynamic(summary.track_count)),
  ])
}

fn serialize_track(track: ptypes.ResolvedTrack) -> dict.Dict(String, Dynamic) {
  let status_str = case track.status {
    ptypes.Available -> "available"
    _ -> "unavailable"
  }
  dict.from_list([
    #("original_id", phoenix_bridge.to_dynamic(track.original_id)),
    #("original_name", phoenix_bridge.to_dynamic(track.original_name)),
    #("original_artist", phoenix_bridge.to_dynamic(track.original_artist)),
    #(
      "deezer_track_id",
      phoenix_bridge.to_dynamic(case track.deezer_track_id {
        Some(id) -> phoenix_bridge.to_dynamic(id)
        None -> phoenix_bridge.to_dynamic(Nil)
      }),
    ),
    #("deezer_name", phoenix_bridge.to_dynamic(track.deezer_name)),
    #("deezer_artist", phoenix_bridge.to_dynamic(track.deezer_artist)),
    #("deezer_album", phoenix_bridge.to_dynamic(track.deezer_album)),
    #("deezer_cover_url", phoenix_bridge.to_dynamic(track.deezer_cover_url)),
    #(
      "preview_url",
      phoenix_bridge.to_dynamic(case track.preview_url {
        Some(url) -> phoenix_bridge.to_dynamic(url)
        None -> phoenix_bridge.to_dynamic(Nil)
      }),
    ),
    #("confidence", phoenix_bridge.to_dynamic(track.confidence)),
    #("status", phoenix_bridge.to_dynamic(status_str)),
  ])
}

fn serialize_stats(
  stats: ptypes.ImportStats,
) -> dict.Dict(String, Dynamic) {
  dict.from_list([
    #("total", phoenix_bridge.to_dynamic(stats.total)),
    #("available", phoenix_bridge.to_dynamic(stats.available)),
    #("unavailable", phoenix_bridge.to_dynamic(stats.unavailable)),
  ])
}
