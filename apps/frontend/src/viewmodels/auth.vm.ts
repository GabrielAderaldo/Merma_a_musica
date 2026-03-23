// viewmodels/auth.vm.ts — ViewModel: Autenticação OAuth
//
// O QUE É: Estado reativo de auth + ações de login/logout.
//
// PADRÃO MVVM FUNCIONAL:
// - createAuthVM(playerVM) retorna { state, subscribe, actions }
// - Compõe com PlayerVM (atualiza tokens do jogador ao logar)
//
// LIMITES ARQUITETURAIS:
// - Usa Repository (auth.repository) para login URLs, refresh, storage
// - NÃO faz fetch direto — sempre via Repository
//
// RESPONSABILIDADES:
// - state: isLoading, error
// - actions: loginWith(platform), processCallback(code), logout
