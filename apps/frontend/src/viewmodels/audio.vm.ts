// viewmodels/audio.vm.ts — ViewModel: Áudio
//
// O QUE É: Estado reativo do player de áudio + controle de playback.
//
// PADRÃO MVVM FUNCIONAL:
// - createAudioVM() retorna { state, subscribe, actions }
// - Wraps o AudioPlayerHandle (service) com estado observável
//
// LIMITES ARQUITETURAIS:
// - Usa Repository (audio.repository) para resolver URLs
// - Usa Service (audio/player) para controlar o HTML5 Audio
// - NÃO conhece Deezer/Spotify — apenas token opaco
//
// RESPONSABILIDADES:
// - state: isPlaying, isBuffered, audioToken, audioSource
// - actions: loadAudio(token, source), play, pause, stop, destroy
