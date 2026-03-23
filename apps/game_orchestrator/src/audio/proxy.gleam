// audio/proxy.gleam — Proxy de Stream de Áudio
//
// O QUE É: Faz proxy do preview do Deezer para o frontend.
// Frontend nunca vê a URL real do Deezer (anti-cheat).
//
// LIMITES ARQUITETURAIS:
// - Usa phoenix_bridge.http_get para buscar áudio do Deezer CDN
// - Sanitiza headers de resposta (remove metadata de plataforma)
// - Responde com Content-Type: audio/mpeg
// - NÃO armazena áudio em disco (apenas streaming)
//
// RESPONSABILIDADES:
// - proxy_audio: resolver token → fetch preview → stream para frontend
// - proxy_preview: preview rápido 5s para validação de playlist
// - sanitize_headers: remover headers que identifiquem o Deezer

