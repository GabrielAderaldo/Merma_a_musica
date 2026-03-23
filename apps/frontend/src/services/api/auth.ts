// services/api/auth.ts — Service: API de Auth
//
// O QUE É: Funções puras async para OAuth.
//
// LIMITES ARQUITETURAIS:
// - Consumido por repositories/auth.repository.ts
//
// RESPONSABILIDADES:
// - refreshToken(platform, refresh_token) → POST /auth/:platform/refresh → OAuthTokens
