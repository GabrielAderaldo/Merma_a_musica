// http/auth_handler.gleam — Handler REST: Auth OAuth
//
// Chamado por: AuthController → :http@auth_handler.*
//
// NOTA: handle_login retorna Redirect (não HttpResponse) porque
// o OAuth precisa de HTTP 302. O AuthController trata isso separado.

import gleam/dynamic.{type Dynamic}
import phoenix_bridge/types.{type HttpResponse, HttpError}

/// Response body para callback e refresh (tokens)
pub type OAuthTokensBody {
  OAuthTokensBody(
    access_token: String,
    refresh_token: String,
    expires_in: Int,
    platform: String,
    platform_user_id: String,
    platform_username: String,
  )
}

/// Resultado do login — redirect ou erro
pub type LoginResult {
  Redirect(url: String)
  LoginError(status: Int, code: String, message: String)
}

/// GET /api/v1/auth/:platform/login — Gerar URL de redirect OAuth
pub fn handle_login(
  platform: String,
  redirect_uri: String,
) -> LoginResult {
  // TODO: montar URL OAuth baseado na plataforma
  // Spotify: https://accounts.spotify.com/authorize?...
  // Deezer: https://connect.deezer.com/oauth/auth.php?...
  // YouTube: https://accounts.google.com/o/oauth2/v2/auth?...
  LoginError(501, "not_implemented", "Login OAuth ainda não implementado.")
}

/// GET /api/v1/auth/:platform/callback — Trocar code por tokens
pub fn handle_callback(
  platform: String,
  params: Dynamic,
) -> HttpResponse(OAuthTokensBody) {
  // TODO: extrair code dos params → trocar por tokens via API da plataforma
  HttpError(501, "not_implemented", "OAuth callback ainda não implementado.")
}

/// POST /api/v1/auth/:platform/refresh — Renovar token
pub fn handle_refresh(
  platform: String,
  params: Dynamic,
) -> HttpResponse(OAuthTokensBody) {
  // TODO: extrair refresh_token → chamar API da plataforma → retornar novos tokens
  HttpError(501, "not_implemented", "Token refresh ainda não implementado.")
}
