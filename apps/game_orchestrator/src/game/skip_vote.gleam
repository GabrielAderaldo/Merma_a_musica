// game/skip_vote.gleam — Sistema de Votação para Pular
//
// O QUE É: Gerencia votos para pular rodada antecipadamente.
//
// LIMITES ARQUITETURAIS:
// - Lógica pura — recebe estado dos votos, retorna resultado
// - NÃO controla timers — quem encerra a rodada é o coordinator
//
// RESPONSABILIDADES:
// - register_vote: registrar voto de um jogador (só após ter respondido)
// - should_skip: verificar se condições foram atingidas
//   (todos responderam + maioria votou pular)
// - get_vote_count: contar votos atuais vs necessários

