// viewmodels/playlist.vm.ts — ViewModel: Playlists
//
// O QUE É: Estado reativo de playlists + ações de import/validação.
//
// PADRÃO MVVM FUNCIONAL:
// - createPlaylistVM(playerVM) retorna { state, subscribe, actions }
// - Compõe com PlayerVM (precisa de tokens para chamadas API)
//
// LIMITES ARQUITETURAIS:
// - Usa Repository (playlist.repository) — cache first, API fallback
// - Ativo apenas na tela de perfil/playlists
//
// RESPONSABILIDADES:
// - state: playlists[], importResult, isLoading, isImporting
// - derived: validTrackCount, availabilityStats
// - actions: fetchPlaylists, importPlaylist, selectForGame
