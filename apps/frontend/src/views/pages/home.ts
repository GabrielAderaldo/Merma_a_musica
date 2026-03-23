// views/pages/home.ts — Page: Tela Inicial ( / )
//
// O QUE É: Landing page do jogo. Primeira tela que o jogador vê.
//
// LIMITES ARQUITETURAIS:
// - View PURA — cria elementos DOM + binda dados dos ViewModels
// - NÃO importa Services, Repositories nem outros Pages
// - Recebe ViewModels como parâmetro ou acessa via módulo singleton
// - Retorna HTMLElement (o router monta no DOM)
//
// RESPONSABILIDADES:
// - Branding "Mermã, a Música!"
// - Campo de nickname (binda com playerVM)
// - Botão "Criar Sala" → router.navigate("/room/create")
// - Botão "Entrar na Sala" → campo de código + botão → router.navigate("/room/:code")
// - Botões de login OAuth (Spotify, Deezer, YouTube Music) — opcionais
