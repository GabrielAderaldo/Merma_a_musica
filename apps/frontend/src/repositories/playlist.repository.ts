// repositories/playlist.repository.ts — Repository: Playlists
//
// O QUE É: Combina REST (api/playlists) + sessionStorage (cache de sessão).
// Cache first — se a playlist já foi importada nessa sessão, retorna do cache.
//
// LIMITES ARQUITETURAIS:
// - Importa Services (api/playlists) para chamadas REST
// - Cache em sessionStorage (morre ao fechar o browser)
// - Consumido por viewmodels/playlist.vm.ts
//
// RESPONSABILIDADES:
// - fetchPlaylists(platform, accessToken): listar (cache first)
// - importPlaylist(platform, playlistId, accessToken): importar + cachear
// - getCachedValidated(): playlists já validadas do cache
// - clearCache(): limpar cache de sessão
