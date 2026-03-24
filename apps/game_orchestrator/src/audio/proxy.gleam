// audio/proxy.gleam — Proxy de Stream de Áudio
//
// O proxy real é feito no audio_controller.ex (Elixir) usando :httpc.
// Este módulo contém a lógica Gleam de sanitização e validação.
//
// Fluxo:
// 1. audio_handler.gleam resolve token → retorna preview_url
// 2. audio_controller.ex faz GET na preview_url do Deezer CDN
// 3. Controller sanitiza headers e retorna audio/mpeg
//
// A URL do Deezer NUNCA é exposta ao frontend (anti-cheat).

/// Headers seguros para resposta de áudio.
/// Remove qualquer header que identifique o Deezer.
pub const safe_content_type = "audio/mpeg"

/// Validar se uma preview_url é do Deezer CDN.
pub fn is_valid_deezer_url(url: String) -> Bool {
  case url {
    "https://cdns-preview-" <> _ -> True
    "http://cdns-preview-" <> _ -> True
    _ -> False
  }
}
