// playlist/types.gleam — Tipos do contexto de Playlist Integration
//
// Todos os tipos usados pelo pipeline: OAuth, importação, resolução Deezer, filtragem.
// Deezer NÃO é plataforma de import — é só motor de áudio.

import gleam/option.{type Option}

// ═══════════════════════════════════════════════════════════════
// OAuth
// ═══════════════════════════════════════════════════════════════

/// Credenciais OAuth de uma plataforma.
pub type OAuthConfig {
  OAuthConfig(
    client_id: String,
    client_secret: String,
    redirect_uri: String,
  )
}

/// Plataformas suportadas para importação de playlists.
/// Deezer NÃO está aqui — é só motor de áudio (API pública, sem auth).
pub type ImportPlatform {
  Spotify
  YoutubeMusic
}

/// Converter string para ImportPlatform.
pub fn parse_platform(platform: String) -> Result(ImportPlatform, Nil) {
  case platform {
    "spotify" -> Ok(Spotify)
    "youtube_music" -> Ok(YoutubeMusic)
    _ -> Error(Nil)
  }
}

/// Converter ImportPlatform para string.
pub fn platform_to_string(platform: ImportPlatform) -> String {
  case platform {
    Spotify -> "spotify"
    YoutubeMusic -> "youtube_music"
  }
}

// ═══════════════════════════════════════════════════════════════
// Tracks
// ═══════════════════════════════════════════════════════════════

/// Track extraído da plataforma original (antes de resolver no Deezer).
pub type RawTrack {
  RawTrack(
    original_id: String,
    original_name: String,
    original_artist: String,
    isrc: Option(String),
  )
}

/// Status de resolução no Deezer.
pub type TrackStatus {
  Available
  Unavailable
}

/// Track após resolução no Deezer.
pub type ResolvedTrack {
  ResolvedTrack(
    original_id: String,
    original_name: String,
    original_artist: String,
    deezer_track_id: Option(Int),
    deezer_name: String,
    deezer_artist: String,
    deezer_album: String,
    deezer_cover_url: String,
    preview_url: Option(String),
    confidence: Float,
    status: TrackStatus,
  )
}

/// Dados do Deezer cacheados no ETS (isrc_cache).
pub type DeezerCacheEntry {
  DeezerCacheEntry(
    deezer_track_id: Int,
    title: String,
    artist_name: String,
    album_title: String,
    cover_url: String,
    preview_url: String,
  )
}

// ═══════════════════════════════════════════════════════════════
// Playlists
// ═══════════════════════════════════════════════════════════════

/// Playlist resumida (para listagem, sem tracks).
pub type PlaylistSummary {
  PlaylistSummary(
    id: String,
    name: String,
    platform: String,
    cover_url: String,
    track_count: Int,
  )
}

/// Estatísticas de importação.
pub type ImportStats {
  ImportStats(total: Int, available: Int, unavailable: Int)
}

/// Playlist completa após validação no Deezer.
pub type ValidatedPlaylist {
  ValidatedPlaylist(
    summary: PlaylistSummary,
    tracks: List(ResolvedTrack),
    stats: ImportStats,
  )
}
