// services/ws/connection.ts — Service: WebSocket Connection
//
// O QUE É: Gerencia conexão WebSocket singleton via lib `phoenix` (única dep externa).
//
// LIMITES ARQUITETURAIS:
// - `phoenix` é a ÚNICA dependência externa do frontend (client oficial Phoenix Channels)
// - Singleton: uma conexão por sessão
// - Sem estado reativo — apenas gerencia o socket
// - URL via process.env.PUBLIC_WS_URL (inline pelo Bun)
// - Consumido por repositories/room.repository.ts
//
// RESPONSABILIDADES:
// - connectSocket(): criar e conectar Socket Phoenix
// - getSocket(): retornar socket ativo (throw se não conectado)
// - disconnectSocket(): desconectar e limpar
