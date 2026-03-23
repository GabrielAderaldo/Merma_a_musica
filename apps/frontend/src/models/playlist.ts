// models/playlist.ts — Model: Playlist e Música
//
// O QUE É: Interfaces TypeScript puras para playlists importadas/validadas.
//
// LIMITES ARQUITETURAIS:
// - APENAS types/interfaces — zero lógica
// - Source of truth: Openapi.yaml (playlist import response)
//
// TIPOS ESPERADOS:
// - TrackStatus: "available" | "fallback" | "unavailable"
// - PlaylistSummary: playlist_id, name, track_count, cover_url, platform
// - ImportedTrack: original_id, original_name, original_artist, original_platform,
//   isrc, status, deezer_track_id, deezer_name, deezer_artist, deezer_album,
//   deezer_cover_url, match_confidence
// - ImportedPlaylist: playlist_id, name, platform, tracks[], stats{total, available, fallback, unavailable}
// - AutocompleteResult: text, type("song" | "artist")
