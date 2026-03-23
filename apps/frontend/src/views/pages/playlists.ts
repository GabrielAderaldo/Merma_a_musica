// views/pages/playlists.ts — Page: Playlists ( /profile/playlists )
//
// O QUE É: Gerenciamento e validação de playlists.
//
// LIMITES ARQUITETURAIS:
// - Requer autenticação OAuth (usa authVM + playlistVM)
//
// RESPONSABILIDADES:
// - Listar playlists da plataforma conectada
// - Botão importar → playlistVM.actions.importPlaylist
// - Mostrar resultado de validação (tracks com status)
// - Preview 5s de músicas válidas
// - Stats: disponíveis, fallback, indisponíveis
