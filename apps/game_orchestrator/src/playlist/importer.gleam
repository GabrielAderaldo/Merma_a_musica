// playlist/importer.gleam — Importação de Playlists
//
// O QUE É: Importa playlists de plataformas externas (Spotify, Deezer, YouTube Music).
//
// LIMITES ARQUITETURAIS:
// - Usa phoenix_bridge.http_get para chamadas às APIs externas
// - Conhece os formatos de resposta de cada API (Spotify, Deezer, YouTube)
// - NÃO persiste dados — retorna ao caller que decide o que cachear
// - Respeita rate limits via throttling (Deezer: 50 req/5s)
//
// RESPONSABILIDADES:
// - list_playlists: listar playlists do jogador em uma plataforma
// - import_playlist: buscar todas as faixas de uma playlist
// - Extrair metadados: nome, artista, ISRC (quando disponível)
// - Delegar validação no Deezer para resolver.gleam

