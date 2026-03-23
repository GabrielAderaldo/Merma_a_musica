// playlist/resolver.gleam — Resolução de Música no Deezer
//
// O QUE É: Busca cada música no Deezer para obter preview_url.
// Deezer é o motor de áudio universal do sistema.
//
// LIMITES ARQUITETURAIS:
// - Usa phoenix_bridge.http_get para API pública do Deezer (sem auth)
// - Usa phoenix_bridge.cache_get/put para cache ISRC→Deezer (ETS, TTL 24h)
// - Respeita rate limit: 50 req/5s (batch com throttle)
// - NÃO toca áudio — apenas resolve metadados e preview_url
//
// RESPONSABILIDADES:
// - resolve_by_isrc: GET /track/isrc:{ISRC} (preferencial)
// - resolve_by_name: GET /search?q=track:"{nome}" artist:"{artista}" (fallback)
// - Validar match: similaridade > 80% (normalizado, fuzzy)
// - Classificar resultado: Available (Deezer), Fallback (Spotify SDK), Unavailable

