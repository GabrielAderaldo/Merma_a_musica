// main.ts — Bootstrap da Aplicação
//
// O QUE É: Ponto de entrada único. Executado uma vez no boot.
//
// LIMITES ARQUITETURAIS:
// - Cria instâncias dos ViewModels (singletons para toda a app)
// - Inicia o router com mapeamento rotas → pages
// - Monta layout root no div#app
// - NÃO contém lógica de negócio nem manipulação de DOM
//
// RESPONSABILIDADES:
// - Instanciar todos os ViewModels
// - Registrar rotas: /, /room/:code, /room/create, /room/join,
//   /profile, /profile/playlists, /login
// - Chamar router.start()
