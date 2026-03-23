// services/audio/player.ts — Service: HTML5 Audio Player
//
// O QUE É: Wrapper funcional sobre HTML5 Audio API nativa do browser.
// Vanilla puro — sem libs.
//
// LIMITES ARQUITETURAIS:
// - Usa new Audio() nativo do browser
// - Áudio vem do proxy backend (GET /api/v1/audio/{token})
// - NÃO conhece Deezer/Spotify — apenas consome URL de stream
// - Retorna handle com métodos (load, play, pause, stop, destroy, isBuffered)
// - Consumido por viewmodels/audio.vm.ts
//
// RESPONSABILIDADES:
// - createAudioPlayer() → AudioPlayerHandle
//   - load(audioToken): fetch + buffer do áudio
//   - play(), pause(), stop(), destroy()
//   - isBuffered(): boolean
