// game/autocomplete.gleam — Busca de Sugestões
//
// O QUE É: Fornece sugestões de autocomplete durante a rodada.
//
// LIMITES ARQUITETURAIS:
// - Busca no pool TOTAL de músicas de todas as playlists dos jogadores
//   (não apenas as selecionadas para a partida — evita spoiler)
// - Operação em memória — sem I/O externo
// - Max 10 resultados por query
//
// RESPONSABILIDADES:
// - search: receber query (min 2 chars) → retornar sugestões (nome/artista)
// - Normalizar busca (lowercase, sem acentos) antes de comparar

