// models/room.ts — Model: Sala
//
// O QUE É: Interfaces TypeScript puras para representar salas.
//
// LIMITES ARQUITETURAIS:
// - APENAS types/interfaces — zero lógica
// - Importa apenas outros models (Player, MatchConfiguration, SongRange)
// - Source of truth: Asyncapi.yaml (room_state event) + Openapi.yaml
//
// TIPOS ESPERADOS:
// - RoomState: "waiting" | "in_match" | "finished"
// - Room: room_id, invite_code, state, host_player_uuid, config, players[], song_range
// - RoomCreated: room_id, invite_code, invite_link, host_player_uuid, websocket_url, websocket_topic
// - RoomInfo: room_id, invite_code, state, player_count, max_players, host_nickname
