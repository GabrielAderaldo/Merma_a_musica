// services/api/playlists.ts — Service: API de Playlists
//
// O QUE É: Funções puras async para playlists.
//
// LIMITES ARQUITETURAIS:
// - Consumido por repositories/playlist.repository.ts
//
// RESPONSABILIDADES:
// - listPlaylists(platform, access_token) → GET /playlists/:platform
// - importPlaylist(platform, playlist_id, access_token) → POST /playlists/:platform/:id/import
// - getValidated(player_uuid) → GET /playlists/validated
