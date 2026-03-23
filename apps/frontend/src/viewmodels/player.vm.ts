// viewmodels/player.vm.ts — ViewModel: Jogador
//
// O QUE É: Estado reativo + ações do jogador.
// Reatividade implementada à mão (vanilla): observer pattern ou pub/sub simples.
//
// PADRÃO MVVM FUNCIONAL:
// - createPlayerVM() retorna { state, subscribe, actions }
// - Views chamam subscribe(callback) para reagir a mudanças de estado
// - Actions mutam estado + notificam subscribers
// - ZERO libs de reatividade — apenas callbacks e closures
//
// LIMITES ARQUITETURAIS:
// - Importa Repositories (player.repository) para persistência
// - NÃO importa Views, Services, nem outros ViewModels
// - Único owner do estado do jogador
//
// RESPONSABILIDADES:
// - state: playerUuid, nickname, platform, tokens
// - derived: isAuthenticated, displayName
// - actions: updateNickname, login, logout
// - subscribe(listener): notificado a cada mudança de state
// - Hydrate state do Repository no boot (UUID do cookie, nickname do localStorage)
