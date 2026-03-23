// viewmodels/game.vm.ts — ViewModel: Partida em Andamento
//
// O QUE É: Estado reativo do gameplay (rodada, timer, respostas, scores).
//
// PADRÃO MVVM FUNCIONAL:
// - createGameVM(roomVM) retorna { state, subscribe, actions }
// - Gerencia timer local (setInterval, countdown sincronizado com backend)
// - Processa eventos de rodada recebidos do RoomVM
//
// LIMITES ARQUITETURAIS:
// - Timer é countdown LOCAL — backend é fonte da verdade
// - Ativo APENAS durante in_match — reset entre partidas
// - Compõe com RoomVM (recebe eventos de jogo do canal WS)
//
// RESPONSABILIDADES:
// - state: roundIndex, totalRounds, timerSeconds, myAnswer, hasAnswered,
//   phase, scores, roundResult, gameResult
// - derived: isLastRound, isPlaying, timeRemaining
// - actions: submitAnswer, voteSkip, updateAnswer
// - event processors: processRoundStarting, processTimerStarted,
//   processAnswerConfirmed, processRoundEnded, processGameEnded
// - timer: startCountdown, stopCountdown
