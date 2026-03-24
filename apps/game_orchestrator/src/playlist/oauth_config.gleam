// playlist/oauth_config.gleam — Leitura de credenciais OAuth do ambiente
//
// Lê env vars via phoenix_bridge.get_env. Retorna OAuthConfig por plataforma.
// Só Spotify e YouTube Music — Deezer não tem OAuth (é só motor de áudio).

import phoenix_bridge
import playlist/types.{type OAuthConfig, OAuthConfig}

/// Obter config OAuth para uma plataforma.
pub fn get_config(platform: String) -> Result(OAuthConfig, String) {
  case platform {
    "spotify" -> get_spotify_config()
    "youtube_music" -> get_youtube_config()
    _ -> Error("unsupported_platform")
  }
}

/// Obter URL base do frontend (para redirect após OAuth callback).
pub fn get_frontend_url() -> Result(String, String) {
  case phoenix_bridge.get_env("FRONTEND_URL") {
    Ok(url) -> Ok(url)
    Error(_) -> Error("missing_config:FRONTEND_URL")
  }
}

fn get_spotify_config() -> Result(OAuthConfig, String) {
  use client_id <- require_env("SPOTIFY_CLIENT_ID")
  use client_secret <- require_env("SPOTIFY_CLIENT_SECRET")
  use redirect_uri <- require_env("SPOTIFY_REDIRECT_URI")
  Ok(OAuthConfig(
    client_id: client_id,
    client_secret: client_secret,
    redirect_uri: redirect_uri,
  ))
}

fn get_youtube_config() -> Result(OAuthConfig, String) {
  use client_id <- require_env("YOUTUBE_CLIENT_ID")
  use client_secret <- require_env("YOUTUBE_CLIENT_SECRET")
  use redirect_uri <- require_env("YOUTUBE_REDIRECT_URI")
  Ok(OAuthConfig(
    client_id: client_id,
    client_secret: client_secret,
    redirect_uri: redirect_uri,
  ))
}

fn require_env(
  key: String,
  next: fn(String) -> Result(OAuthConfig, String),
) -> Result(OAuthConfig, String) {
  case phoenix_bridge.get_env(key) {
    Ok(value) -> next(value)
    Error(_) -> Error("missing_config:" <> key)
  }
}
