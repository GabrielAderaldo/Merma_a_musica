// http/audio_handler.gleam — Handler REST: Áudio
//
// Resolve audio_token → preview_url do Deezer.
// O controller Elixir faz o proxy real (fetch + sanitize headers).
//
// Fluxo de jogo:
// 1. Coordinator gera token ao iniciar rodada (audio/token.gleam)
// 2. Frontend faz GET /api/v1/audio/:token
// 3. Este handler resolve token → retorna StreamUrl(preview_url)
// 4. Controller faz proxy do áudio do Deezer CDN → audio/mpeg
// 5. Token é single-use (invalidado após resolução)
//
// Fluxo de validação de playlist:
// 1. Frontend quer ouvir preview de uma track
// 2. GET /api/v1/audio/preview/:deezer_track_id
// 3. Busca preview_url na API do Deezer → retorna StreamUrl
// 4. Controller faz proxy

import audio/token
import gleam/dynamic/decode
import gleam/json
import phoenix_bridge

/// Resultado — URL para proxy ou erro
pub type AudioResult {
  StreamUrl(url: String)
  AudioError(status: Int, code: String, message: String)
}

/// GET /api/v1/audio/:audio_token — Resolver token e retornar URL para proxy
pub fn handle_audio_stream(audio_token: String) -> AudioResult {
  case token.resolve_token(audio_token) {
    Error(_) ->
      AudioError(403, "audio_token_invalid", "Token inválido ou expirado.")
    Ok(preview_url) -> {
      // Single-use: invalidar após resolver
      token.invalidate_token(audio_token)
      StreamUrl(preview_url)
    }
  }
}

/// GET /api/v1/audio/preview/:deezer_track_id — Preview para validação
pub fn handle_preview(deezer_track_id: String) -> AudioResult {
  // Buscar preview_url do Deezer via API pública
  let url = "https://api.deezer.com/track/" <> deezer_track_id
  case phoenix_bridge.http_get(url, []) {
    Error(reason) ->
      AudioError(502, "deezer_error", "Deezer unavailable: " <> reason)
    Ok(#(status, body)) ->
      case status >= 200 && status < 300 {
        False ->
          AudioError(502, "deezer_error", "Deezer returned status " <> deezer_track_id)
        True -> {
          let decoder = {
            use preview <- decode.optional_field("preview", "", decode.string)
            decode.success(preview)
          }
          case json.parse(body, decoder) {
            Ok("") ->
              AudioError(404, "no_preview", "Track has no preview available")
            Ok(preview_url) -> StreamUrl(preview_url)
            Error(_) ->
              AudioError(502, "parse_error", "Failed to parse Deezer response")
          }
        }
      }
  }
}
