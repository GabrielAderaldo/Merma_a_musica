// repositories/player.repository.ts — Repository: Jogador
//
// O QUE É: Abstrai acesso a dados locais do jogador (cookie, localStorage).
//
// LIMITES ARQUITETURAIS:
// - Vanilla puro — usa document.cookie e localStorage nativos
// - Sem reatividade — apenas lê/escreve storages
// - Consumido APENAS por ViewModels (nunca por Views ou Services)
//
// RESPONSABILIDADES:
// - getOrCreateUuid(): ler UUID do cookie ou gerar com crypto.randomUUID()
// - getNickname() / saveNickname(name): localStorage
// - getTokens(platform) / saveTokens(platform, tokens) / clearTokens(platform): localStorage
// - clearAll(): limpar todos os dados locais do jogador
