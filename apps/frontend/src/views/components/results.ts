// views/components/results.ts — Component: Resultados
//
// O QUE É: Tela de resultados finais. Renderizado dentro de room.ts
// quando gameVM.state.phase === "results".
//
// LIMITES ARQUITETURAIS:
// - View PURA — cria DOM com dados do gameVM.state.gameResult
//
// RESPONSABILIDADES:
// - Ranking final: posição, nickname, pontos, acertos, tempo médio
// - Destaque visual para vencedor(es)
// - Highlights: maior streak, resposta mais rápida, mais acertos
// - Countdown para retorno ao lobby (5s)
