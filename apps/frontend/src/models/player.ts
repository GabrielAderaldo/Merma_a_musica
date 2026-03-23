// models/player.ts — Model: Jogador
//
// O QUE É: Interfaces TypeScript puras para representar jogadores.
//
// LIMITES ARQUITETURAIS:
// - APENAS types/interfaces — zero lógica, zero imports, zero side effects
// - Consumido por todas as camadas (Services, Repositories, ViewModels, Views)
// - Source of truth: Asyncapi.yaml (Player schema) + Openapi.yaml
//
// TIPOS ESPERADOS:
// - Platform: "spotify" | "deezer" | "youtube_music"
// - ConnectionStatus: "connected" | "disconnected" | "reconnecting"
// - PlayerIdentity: player_uuid, nickname, platform
// - OAuthTokens: access_token, refresh_token, expires_in, platform, platform_user_id, platform_username
// - Player: player_uuid, nickname, is_host, ready, connection_status, has_playlist, platform
