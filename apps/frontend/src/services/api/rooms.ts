// services/api/rooms.ts — Service: API de Salas
//
// O QUE É: Funções puras async de chamada HTTP para salas.
//
// LIMITES ARQUITETURAIS:
// - Usa api() de client.ts — sem lógica própria
// - Consumido por repositories/room.repository.ts
//
// RESPONSABILIDADES:
// - createRoom(player_uuid, nickname) → POST /rooms → RoomCreated
// - getRoom(invite_code) → GET /rooms/:code → RoomInfo
// - joinRoom(invite_code, player_uuid, nickname) → POST /rooms/:code/join
