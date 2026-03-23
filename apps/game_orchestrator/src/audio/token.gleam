// audio/token.gleam — Gerenciamento de Audio Tokens
//
// Gera tokens opacos (UUID) que mapeiam para preview_url no cache ETS.
// Parte do sistema anti-cheat: a URL real nunca é exposta ao frontend.
//
// Fluxo:
// 1. Coordinator gera token ao iniciar rodada → frontend recebe token
// 2. Frontend pede áudio via GET /api/audio/:token
// 3. Audio handler resolve token → busca preview_url → proxy stream
// 4. Token invalidado ao fim da rodada (single-use + TTL)

import gleam/dynamic.{type Dynamic}
import phoenix_bridge
import room/engine_bridge

/// Cache table name para audio tokens
const cache_table = "audio_tokens"

/// TTL padrão: 120 segundos (tempo máximo de uma rodada + margem)
const token_ttl_seconds = 120

/// Converter qualquer valor para Dynamic (identity no Erlang)
@external(erlang, "gleam_stdlib", "identity")
fn to_dynamic(value: a) -> Dynamic

/// Converter Dynamic de volta para tipo concreto (identity — caller garante o tipo)
@external(erlang, "gleam_stdlib", "identity")
fn from_dynamic(value: Dynamic) -> a

/// Gerar token de áudio para uma preview_url.
/// Armazena no cache ETS com TTL.
/// Retorna o token UUID gerado.
pub fn generate_token(preview_url: String) -> String {
  let token = engine_bridge.generate_uuid()
  phoenix_bridge.cache_put(
    cache_table,
    to_dynamic(token),
    to_dynamic(preview_url),
    token_ttl_seconds,
  )
  token
}

/// Resolver token → preview_url.
/// Retorna a URL se o token é válido e não expirou.
pub fn resolve_token(token: String) -> Result(String, Nil) {
  case phoenix_bridge.cache_get(cache_table, to_dynamic(token)) {
    Ok(value) -> Ok(from_dynamic(value))
    Error(_) -> Error(Nil)
  }
}

/// Invalidar um token específico (fim da rodada).
pub fn invalidate_token(token: String) -> Nil {
  phoenix_bridge.cache_delete(cache_table, to_dynamic(token))
}
