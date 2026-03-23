// viewmodels/room.vm.ts — ViewModel: Sala
//
// O QUE É: Estado reativo da sala + lifecycle do canal WebSocket.
// O ViewModel mais complexo — coordena Repository (REST + WS) com estado reativo.
//
// PADRÃO MVVM FUNCIONAL:
// - createRoomVM(playerVM) retorna { state, subscribe, actions }
// - Gerencia join/leave do canal WS
// - Escuta eventos server→client e atualiza state + notifica subscribers
// - Actions enviam eventos client→server via Repository
//
// LIMITES ARQUITETURAIS:
// - Importa Repositories (room.repository)
// - Compõe com PlayerVM (precisa do UUID e nickname para join)
// - NÃO importa Views nem Services
//
// RESPONSABILIDADES:
// - state: roomId, inviteCode, roomState, hostPlayerUuid, config, players[], songRange, connected
// - derived: isHost(uuid), allReady, playerCount
// - actions: createRoom, joinRoom, leaveRoom, toggleReady, configureMatch,
//   startGame, selectPlaylist
// - lifecycle: connect (join WS channel + bind event listeners), disconnect
// - Processar eventos: player_joined, player_left, player_ready_changed,
//   config_updated, host_changed, game_starting, error
