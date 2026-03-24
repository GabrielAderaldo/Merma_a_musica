// playlist/filter.gleam — Filtro e Estatísticas de Playlists Validadas
//
// Funções puras. Recebe tracks resolvidos, calcula stats,
// monta ValidatedPlaylist completo.

import gleam/list
import playlist/types.{
  type ImportStats, type PlaylistSummary, type ResolvedTrack,
  type ValidatedPlaylist, Available, ImportStats, Unavailable,
  ValidatedPlaylist,
}

/// Montar ValidatedPlaylist a partir de summary e tracks resolvidos.
/// Retorna TODOS os tracks (available + unavailable) — frontend mostra status de cada.
pub fn build_validated(
  summary: PlaylistSummary,
  tracks: List(ResolvedTrack),
) -> ValidatedPlaylist {
  let stats = calculate_stats(tracks)
  ValidatedPlaylist(summary: summary, tracks: tracks, stats: stats)
}

/// Filtrar apenas tracks Available (para uso no game engine).
pub fn available_tracks(
  validated: ValidatedPlaylist,
) -> List(ResolvedTrack) {
  list.filter(validated.tracks, fn(track) { track.status == Available })
}

/// Calcular estatísticas de importação.
fn calculate_stats(tracks: List(ResolvedTrack)) -> ImportStats {
  let total = list.length(tracks)
  let available =
    list.count(tracks, fn(track) { track.status == Available })
  let unavailable = total - available
  ImportStats(total: total, available: available, unavailable: unavailable)
}
