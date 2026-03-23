// views/components/game.ts — Component: Game (Core Loop)
//
// O QUE É: Componente de gameplay. Renderizado dentro de room.ts
// quando roomState === "in_match".
//
// LIMITES ARQUITETURAIS:
// - View PURA — cria DOM + binda gameVM, audioVM
// - Transiciona internamente entre fases (grace → playing → revealing)
//   baseado em gameVM.state.phase
//
// RESPONSABILIDADES:
// - Grace period: "Preparando rodada X de Y..." + buffer áudio
// - Playing: timer visual, campo de resposta com autocomplete,
//   badges de quem respondeu, botão skip, placar lateral
// - Revealing: música (nome, artista, álbum, cover, dono),
//   respostas de todos, pontos ganhos, placar atualizado
// - Re-render automático quando phase muda
