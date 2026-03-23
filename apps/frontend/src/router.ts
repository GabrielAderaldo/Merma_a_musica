// router.ts — Router Manual (History API)
//
// O QUE É: SPA router minimalista usando History API nativa.
// Zero dependências. ~50 linhas.
//
// LIMITES ARQUITETURAIS:
// - Apenas roteamento — NÃO contém lógica de negócio
// - NÃO conhece ViewModels, Services ou DOM específico
// - Cada rota mapeia para uma função Page que retorna HTMLElement
// - Suporta parâmetros dinâmicos (/room/:code → params.code)
//
// RESPONSABILIDADES:
// - register(path, pageFn): registrar rota com pattern matching
// - navigate(path): navegar via pushState (sem reload)
// - start(rootEl): escutar popstate + renderizar rota inicial
// - matchRoute(pathname): extrair params e retornar pageFn correspondente
// - Fallback 404 quando nenhuma rota bate
//
// PADRÃO:
// - pageFn recebe (params: Record<string, string>) e retorna HTMLElement
// - O router limpa rootEl.innerHTML e appenda o elemento retornado
// - Links internos usam navigate() em vez de <a href> (interceptar clicks)
