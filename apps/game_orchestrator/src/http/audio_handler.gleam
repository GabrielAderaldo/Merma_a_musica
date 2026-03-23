// http/audio_handler.gleam — Handler REST: Áudio
//
// Chamado por: AudioController → :http@audio_handler.*
//
// NOTA: Diferente dos outros handlers, retorna StreamUrl (não HttpResponse)
// porque o controller faz proxy do áudio diretamente.

import phoenix_bridge/types.{HttpError}

/// Resultado — URL para proxy ou erro
pub type AudioResult {
  /// URL do preview no Deezer CDN para o controller fazer proxy
  StreamUrl(url: String)
  /// Erro (token inválido, expirado, etc.)
  AudioError(status: Int, code: String, message: String)
}

/// GET /api/v1/audio/:audio_token — Resolver token e retornar URL para proxy
pub fn handle_audio_stream(audio_token: String) -> AudioResult {
  // TODO: resolver audio_token via cache ETS → retornar preview_url do Deezer
  // O controller faz proxy do stream (sanitiza headers, remove metadata)
  AudioError(501, "not_implemented", "Streaming de áudio ainda não implementado.")
}

/// GET /api/v1/audio/preview/:deezer_track_id — Preview 5s para validação
pub fn handle_preview(deezer_track_id: String) -> AudioResult {
  // TODO: montar URL de preview do Deezer → retornar para proxy
  AudioError(501, "not_implemented", "Preview de áudio ainda não implementado.")
}
