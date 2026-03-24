// http/auth_handler.gleam — Handler REST: Auth OAuth
//
// OAuth é APENAS para importar playlists (Spotify + YouTube Music).
// NÃO é login — login é nickname + UUID no cookie.
// Deezer NÃO tem OAuth aqui — é só motor de áudio (API pública).
//
// Chamado por: AuthController → :http@auth_handler.*

import gleam/dynamic
import gleam/dynamic/decode
import gleam/json
import gleam/string
import phoenix_bridge
import phoenix_bridge/types.{type HttpResponse, HttpError, HttpOk}
import playlist/oauth_config
import playlist/types as ptypes

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

// ═══════════════════════════════════════════════════════════════
// LOGIN — Gerar URL de redirect OAuth
// ═══════════════════════════════════════════════════════════════

/// GET /auth/:platform/login — Redirecionar para OAuth da plataforma
pub fn handle_login(
  platform: String,
  _redirect_uri: String,
) -> LoginResult {
  case oauth_config.get_config(platform) {
    Error(reason) ->
      LoginError(400, "config_error", "OAuth config error: " <> reason)
    Ok(config) -> {
      let state = phoenix_bridge.random_hex(16)
      let url = build_auth_url(platform, config, state)
      Redirect(url)
    }
  }
}

fn build_auth_url(
  platform: String,
  config: ptypes.OAuthConfig,
  state: String,
) -> String {
  case platform {
    "spotify" -> build_spotify_auth_url(config, state)
    "youtube_music" -> build_youtube_auth_url(config, state)
    _ -> ""
  }
}

fn build_spotify_auth_url(config: ptypes.OAuthConfig, state: String) -> String {
  let params =
    phoenix_bridge.url_encode([
      #("client_id", config.client_id),
      #("response_type", "code"),
      #("redirect_uri", config.redirect_uri),
      #("scope", "playlist-read-private"),
      #("state", state),
    ])
  "https://accounts.spotify.com/authorize?" <> params
}

fn build_youtube_auth_url(config: ptypes.OAuthConfig, state: String) -> String {
  let params =
    phoenix_bridge.url_encode([
      #("client_id", config.client_id),
      #("response_type", "code"),
      #("redirect_uri", config.redirect_uri),
      #("scope", "https://www.googleapis.com/auth/youtube.readonly"),
      #("state", state),
      #("access_type", "offline"),
      #("prompt", "consent"),
    ])
  "https://accounts.google.com/o/oauth2/v2/auth?" <> params
}

// ═══════════════════════════════════════════════════════════════
// CALLBACK — Trocar code por tokens + redirect ao frontend
// ═══════════════════════════════════════════════════════════════

/// GET /auth/:platform/callback — Trocar code por tokens, redirect ao frontend
pub fn handle_callback(
  platform: String,
  params: dynamic.Dynamic,
) -> LoginResult {
  let code_decoder =
    decode.field("code", decode.string, fn(code) {
      decode.success(code)
    })
  case decode.run(params, code_decoder) {
    Error(_) ->
      LoginError(400, "missing_code", "OAuth callback missing 'code' parameter")
    Ok(code) -> do_callback(platform, code)
  }
}

fn do_callback(platform: String, code: String) -> LoginResult {
  // Obter config
  case oauth_config.get_config(platform) {
    Error(reason) ->
      LoginError(500, "config_error", reason)
    Ok(config) -> {
      // Trocar code por tokens
      case exchange_code(platform, config, code) {
        Error(reason) ->
          LoginError(500, "token_exchange_failed", reason)
        Ok(#(access_token, refresh_token, expires_in)) -> {
          // Buscar perfil do usuário
          case fetch_user_profile(platform, access_token) {
            Error(reason) ->
              LoginError(500, "profile_fetch_failed", reason)
            Ok(#(user_id, username)) ->
              build_frontend_redirect(
                platform,
                access_token,
                refresh_token,
                expires_in,
                user_id,
                username,
              )
          }
        }
      }
    }
  }
}

fn exchange_code(
  platform: String,
  config: ptypes.OAuthConfig,
  code: String,
) -> Result(#(String, String, Int), String) {
  case platform {
    "spotify" -> exchange_spotify_code(config, code)
    "youtube_music" -> exchange_youtube_code(config, code)
    _ -> Error("unsupported_platform")
  }
}

fn exchange_spotify_code(
  config: ptypes.OAuthConfig,
  code: String,
) -> Result(#(String, String, Int), String) {
  let credentials =
    phoenix_bridge.base64_encode(config.client_id <> ":" <> config.client_secret)
  let headers = [
    #("Content-Type", "application/x-www-form-urlencoded"),
    #("Authorization", "Basic " <> credentials),
  ]
  let body =
    phoenix_bridge.url_encode([
      #("grant_type", "authorization_code"),
      #("code", code),
      #("redirect_uri", config.redirect_uri),
    ])

  case phoenix_bridge.http_post("https://accounts.spotify.com/api/token", headers, body) {
    Error(reason) -> Error("http_error: " <> reason)
    Ok(#(status, response_body)) ->
      case status >= 200 && status < 300 {
        False -> Error("spotify_token_error: status " <> string.inspect(status))
        True -> parse_token_response(response_body)
      }
  }
}

fn exchange_youtube_code(
  config: ptypes.OAuthConfig,
  code: String,
) -> Result(#(String, String, Int), String) {
  let headers = [#("Content-Type", "application/x-www-form-urlencoded")]
  let body =
    phoenix_bridge.url_encode([
      #("grant_type", "authorization_code"),
      #("code", code),
      #("redirect_uri", config.redirect_uri),
      #("client_id", config.client_id),
      #("client_secret", config.client_secret),
    ])

  case phoenix_bridge.http_post("https://oauth2.googleapis.com/token", headers, body) {
    Error(reason) -> Error("http_error: " <> reason)
    Ok(#(status, response_body)) ->
      case status >= 200 && status < 300 {
        False -> Error("youtube_token_error: status " <> string.inspect(status))
        True -> parse_token_response(response_body)
      }
  }
}

fn parse_token_response(
  body: String,
) -> Result(#(String, String, Int), String) {
  case json.parse(body, token_response_decoder()) {
    Ok(tokens) -> Ok(tokens)
    Error(_) -> Error("failed to parse token response")
  }
}

fn token_response_decoder() -> decode.Decoder(#(String, String, Int)) {
  decode.field("access_token", decode.string, fn(access_token) {
    // refresh_token pode não existir em alguns flows
    decode.optional_field("refresh_token", "", decode.string, fn(refresh_token) {
      decode.field("expires_in", decode.int, fn(expires_in) {
        decode.success(#(access_token, refresh_token, expires_in))
      })
    })
  })
}

// ═══════════════════════════════════════════════════════════════
// PERFIL DO USUÁRIO
// ═══════════════════════════════════════════════════════════════

fn fetch_user_profile(
  platform: String,
  access_token: String,
) -> Result(#(String, String), String) {
  case platform {
    "spotify" -> fetch_spotify_profile(access_token)
    "youtube_music" -> fetch_youtube_profile(access_token)
    _ -> Error("unsupported_platform")
  }
}

fn fetch_spotify_profile(
  access_token: String,
) -> Result(#(String, String), String) {
  let headers = [#("Authorization", "Bearer " <> access_token)]
  case phoenix_bridge.http_get("https://api.spotify.com/v1/me", headers) {
    Error(reason) -> Error("http_error: " <> reason)
    Ok(#(status, body)) ->
      case status {
        200 -> {
          let id_decoder =
            decode.field("id", decode.string, fn(id) {
              decode.success(id)
            })
          let name_decoder =
            decode.optional_field("display_name", "Spotify User", decode.string, fn(name) {
              decode.success(name)
            })
          case json.parse(body, id_decoder), json.parse(body, name_decoder) {
            Ok(id), Ok(name) -> Ok(#(id, name))
            _, _ -> Error("failed to parse spotify profile")
          }
        }
        _ -> Error("spotify_profile_error: status " <> string.inspect(status))
      }
  }
}

fn fetch_youtube_profile(
  access_token: String,
) -> Result(#(String, String), String) {
  let headers = [#("Authorization", "Bearer " <> access_token)]
  let url =
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true"
  case phoenix_bridge.http_get(url, headers) {
    Error(reason) -> Error("http_error: " <> reason)
    Ok(#(status, body)) ->
      case status {
        200 -> parse_youtube_channel(body)
        _ -> Error("youtube_profile_error: status " <> string.inspect(status))
      }
  }
}

fn parse_youtube_channel(body: String) -> Result(#(String, String), String) {
  let item_decoder = {
    use id <- decode.field("id", decode.string)
    use title <- decode.subfield(["snippet", "title"], decode.string)
    decode.success(#(id, title))
  }
  let decoder = {
    use items <- decode.field("items", decode.list(item_decoder))
    decode.success(items)
  }
  case json.parse(body, decoder) {
    Ok([first, ..]) -> Ok(first)
    Ok([]) -> Error("no youtube channels found")
    Error(_) -> Error("failed to parse youtube channels")
  }
}

// ═══════════════════════════════════════════════════════════════
// REDIRECT AO FRONTEND
// ═══════════════════════════════════════════════════════════════

fn build_frontend_redirect(
  platform: String,
  access_token: String,
  refresh_token: String,
  expires_in: Int,
  user_id: String,
  username: String,
) -> LoginResult {
  case oauth_config.get_frontend_url() {
    Error(_) ->
      LoginError(500, "config_error", "FRONTEND_URL not configured")
    Ok(frontend_url) -> {
      let params =
        phoenix_bridge.url_encode([
          #("access_token", access_token),
          #("refresh_token", refresh_token),
          #("expires_in", string.inspect(expires_in)),
          #("platform", platform),
          #("platform_user_id", user_id),
          #("platform_username", username),
        ])
      Redirect(frontend_url <> "/#/auth/callback?" <> params)
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// REFRESH — Renovar token
// ═══════════════════════════════════════════════════════════════

/// POST /auth/:platform/refresh — Renovar access token
pub fn handle_refresh(
  platform: String,
  params: dynamic.Dynamic,
) -> HttpResponse(OAuthTokensBody) {
  let refresh_token_decoder =
    decode.field("refresh_token", decode.string, fn(token) {
      decode.success(token)
    })
  case decode.run(params, refresh_token_decoder) {
    Error(_) ->
      HttpError(400, "missing_refresh_token", "refresh_token is required")
    Ok(refresh_token) -> do_refresh(platform, refresh_token)
  }
}

fn do_refresh(
  platform: String,
  refresh_token: String,
) -> HttpResponse(OAuthTokensBody) {
  case oauth_config.get_config(platform) {
    Error(reason) -> HttpError(500, "config_error", reason)
    Ok(config) -> {
      case refresh_tokens(platform, config, refresh_token) {
        Error(reason) -> HttpError(500, "refresh_failed", reason)
        Ok(#(new_access, new_refresh, expires_in)) ->
          HttpOk(
            200,
            OAuthTokensBody(
              access_token: new_access,
              // Se veio novo refresh_token, usar; senão, retornar o original
              refresh_token: case new_refresh {
                "" -> refresh_token
                r -> r
              },
              expires_in: expires_in,
              platform: platform,
              platform_user_id: "",
              platform_username: "",
            ),
          )
      }
    }
  }
}

fn refresh_tokens(
  platform: String,
  config: ptypes.OAuthConfig,
  refresh_token: String,
) -> Result(#(String, String, Int), String) {
  case platform {
    "spotify" -> refresh_spotify(config, refresh_token)
    "youtube_music" -> refresh_youtube(config, refresh_token)
    _ -> Error("unsupported_platform")
  }
}

fn refresh_spotify(
  config: ptypes.OAuthConfig,
  refresh_token: String,
) -> Result(#(String, String, Int), String) {
  let credentials =
    phoenix_bridge.base64_encode(config.client_id <> ":" <> config.client_secret)
  let headers = [
    #("Content-Type", "application/x-www-form-urlencoded"),
    #("Authorization", "Basic " <> credentials),
  ]
  let body =
    phoenix_bridge.url_encode([
      #("grant_type", "refresh_token"),
      #("refresh_token", refresh_token),
    ])

  case phoenix_bridge.http_post("https://accounts.spotify.com/api/token", headers, body) {
    Error(reason) -> Error("http_error: " <> reason)
    Ok(#(status, response_body)) ->
      case status >= 200 && status < 300 {
        False -> Error("spotify_refresh_error: status " <> string.inspect(status))
        True -> parse_token_response(response_body)
      }
  }
}

fn refresh_youtube(
  config: ptypes.OAuthConfig,
  refresh_token: String,
) -> Result(#(String, String, Int), String) {
  let headers = [#("Content-Type", "application/x-www-form-urlencoded")]
  let body =
    phoenix_bridge.url_encode([
      #("grant_type", "refresh_token"),
      #("refresh_token", refresh_token),
      #("client_id", config.client_id),
      #("client_secret", config.client_secret),
    ])

  case phoenix_bridge.http_post("https://oauth2.googleapis.com/token", headers, body) {
    Error(reason) -> Error("http_error: " <> reason)
    Ok(#(status, response_body)) ->
      case status >= 200 && status < 300 {
        False -> Error("youtube_refresh_error: status " <> string.inspect(status))
        True -> parse_token_response(response_body)
      }
  }
}
