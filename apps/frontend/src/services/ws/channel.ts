// services/ws/channel.ts — Service: Phoenix Channel Client
//
// O QUE É: Funções para join/leave/send/listen em canal Phoenix.
//
// LIMITES ARQUITETURAIS:
// - Wrapper fino sobre o Channel object do phoenix
// - Sem estado próprio — retorna Channel para o caller gerenciar
// - Consumido por repositories/room.repository.ts
//
// RESPONSABILIDADES:
// - joinChannel(invite_code, params) → Channel (room:{invite_code})
// - sendEvent(channel, event, payload) → push
// - onEvent(channel, event, callback) → listen
