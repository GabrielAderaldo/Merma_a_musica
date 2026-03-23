// views/pages/room.ts — Page: Sala ( /room/:code )
//
// O QUE É: Página principal da sala. Gerencia 3 estados internos
// (lobby → jogo → resultados) sem mudar de URL.
//
// LIMITES ARQUITETURAIS:
// - View PURA — cria DOM + binda ViewModels + subscribe para re-render
// - A page mais complexa — delega renderização para sub-components
//   baseado no roomState (waiting → LobbyComponent, in_match → GameComponent, etc.)
// - Conecta WS ao montar, desconecta ao desmontar
//
// RESPONSABILIDADES:
// - Ao montar: roomVM.actions.joinRoom(code) → conectar WS
// - Ao desmontar: roomVM.actions.leaveRoom() → desconectar WS
// - Renderizar baseado em roomVM.state.roomState:
//   - "waiting" → monta lobby component
//   - "in_match" → monta game component
//   - "finished" → monta results component
// - Re-render automático quando roomState muda (via subscribe)
