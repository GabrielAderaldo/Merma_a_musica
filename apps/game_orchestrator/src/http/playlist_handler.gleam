// http/playlist_handler.gleam — Handler REST: Playlists
//
// Chamado por: PlaylistController → :http@playlist_handler.*

import gleam/dynamic.{type Dynamic}
import phoenix_bridge/types.{type HttpResponse, HttpError}

/// GET /api/v1/playlists/:platform — Listar playlists
pub fn handle_list_playlists(
  platform: String,
  access_token: String,
) -> HttpResponse(Dynamic) {
  // TODO: chamar API da plataforma via phoenix_bridge.http_get → retornar lista
  HttpError(501, "not_implemented", "Listagem de playlists ainda não implementada.")
}

/// POST /api/v1/playlists/:platform/:playlist_id/import — Importar + validar
pub fn handle_import_playlist(
  platform: String,
  playlist_id: String,
  access_token: String,
) -> HttpResponse(Dynamic) {
  // TODO: importar playlist → resolver no Deezer → filtrar → retornar stats
  HttpError(501, "not_implemented", "Importação de playlist ainda não implementada.")
}

/// GET /api/v1/playlists/validated — Playlists já validadas (cache)
pub fn handle_get_validated(
  player_uuid: String,
) -> HttpResponse(Dynamic) {
  // TODO: buscar no cache ETS → retornar playlists validadas
  HttpError(501, "not_implemented", "Playlists validadas ainda não implementadas.")
}
