// models/errors.ts — Model: Erros
//
// O QUE É: Tipos de erros da API e WebSocket.
//
// LIMITES ARQUITETURAIS:
// - APENAS types — zero lógica
// - Source of truth: Openapi.yaml (error format)
//
// TIPOS ESPERADOS:
// - ApiErrorBody: { error: { code, message, details? } }
// - ErrorCode: union de todos os códigos de erro possíveis
//   (room_not_found, room_full, room_in_match, already_joined,
//    not_host, not_all_ready, invalid_config, not_enough_songs,
//    token_expired, token_invalid, audio_token_invalid,
//    playlist_not_found, platform_unavailable, internal_error)
