// views/pages/login.ts — Page: Login OAuth ( /login )
//
// O QUE É: Processa callback OAuth e redireciona.
//
// LIMITES ARQUITETURAIS:
// - View PURA — lê query params, chama authVM, redireciona
//
// RESPONSABILIDADES:
// - Ler ?code=...&state=... da URL (callback OAuth)
// - Chamar authVM.actions.processCallback(code)
// - Redirecionar para / ou para a sala anterior
