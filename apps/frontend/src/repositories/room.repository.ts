// repositories/room.repository.ts — Repository: Sala
//
// O QUE É: Combina REST (api/rooms) + WebSocket (ws/connection, ws/channel)
// para fornecer interface unificada de sala ao ViewModel.
//
// LIMITES ARQUITETURAIS:
// - Importa Services (api/rooms, ws/connection, ws/channel)
// - Retorna dados crus — ViewModel decide o que fazer
// - Consumido por viewmodels/room.vm.ts
//
// RESPONSABILIDADES:
// - create(playerUuid, nickname): criar sala via REST
// - getInfo(inviteCode): info pública via REST
// - join(inviteCode, playerUuid, nickname): entrar via REST
// - connectChannel(inviteCode, playerUuid, nickname): join canal WS, retorna Channel
// - disconnectChannel(channel): leave canal WS
// - send(channel, event, payload): enviar evento WS
// - listen(channel, event, callback): escutar evento WS
