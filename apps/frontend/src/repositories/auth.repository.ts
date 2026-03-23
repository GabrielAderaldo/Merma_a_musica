// repositories/auth.repository.ts — Repository: Auth OAuth
//
// O QUE É: Combina Service (api/auth) + Storage (player.repository)
// para fornecer tokens válidos ao ViewModel.
//
// LIMITES ARQUITETURAIS:
// - Importa Services (api/auth) para refresh via rede
// - Importa player.repository para persistência local
// - Consumido por viewmodels/auth.vm.ts
//
// RESPONSABILIDADES:
// - getLoginUrl(platform, redirectUri): montar URL de redirect OAuth
// - getValidTokens(platform): retornar do cache ou null
// - saveAndReturn(platform, tokens): salvar + retornar
// - refreshIfExpired(platform): tentar refresh, salvar ou limpar
// - logout(platform): limpar tokens locais
