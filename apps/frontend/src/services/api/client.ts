// services/api/client.ts — Service: HTTP Client
//
// O QUE É: Fetch wrapper genérico. Vanilla puro — usa fetch() nativo do browser.
//
// LIMITES ARQUITETURAIS:
// - APENAS transporte HTTP — sem estado, sem reatividade, sem cache
// - Base URL via process.env.PUBLIC_API_URL (inline pelo Bun no build)
// - Error handling: parse do body de erro → throw ApiError
// - Consumido APENAS pelos Repositories (nunca por ViewModels ou Views)
//
// RESPONSABILIDADES:
// - api<T>(path, options?): fetch genérico que retorna T ou throw ApiError
// - ApiError: class com code, userMessage, status
