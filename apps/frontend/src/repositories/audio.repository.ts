// repositories/audio.repository.ts — Repository: Áudio
//
// O QUE É: Resolve audio_token → URL de stream do proxy backend.
//
// LIMITES ARQUITETURAIS:
// - Simples — apenas monta URLs. Sem fetch, sem cache.
// - Consumido por viewmodels/audio.vm.ts
//
// RESPONSABILIDADES:
// - getStreamUrl(audioToken): URL do proxy de áudio da rodada
// - getPreviewUrl(deezerTrackId): URL do preview 5s (validação de playlist)
