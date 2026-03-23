// views/components/lobby.ts — Component: Lobby
//
// O QUE É: Componente do lobby (sala de espera). Renderizado dentro de room.ts
// quando roomState === "waiting".
//
// LIMITES ARQUITETURAIS:
// - View PURA — cria DOM + binda ViewModels
// - Recebe roomVM e playerVM como dependências
//
// RESPONSABILIDADES:
// - Lista de jogadores (cards com nome, status pronto, host badge, playlist badge)
// - Código de convite + botão copiar
// - Botão "Pronto" / "Não Pronto" → roomVM.actions.toggleReady
// - Painel de config (só host): sliders/selects para MatchConfiguration
// - Botão "Iniciar" (só host, ativo quando allReady)
