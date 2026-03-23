// playlist/filter.gleam — Filtro e Normalização de Músicas
//
// O QUE É: Filtra músicas válidas e normaliza para formato interno.
//
// LIMITES ARQUITETURAIS:
// - Função pura — recebe lista de músicas resolvidas, retorna filtradas
// - NÃO acessa APIs externas
//
// RESPONSABILIDADES:
// - Filtrar apenas músicas com preview_url válido
// - Normalizar para NormalizedSong (external_id, name, artist, preview_url, is_valid)
// - Calcular stats: total, available, fallback, unavailable

