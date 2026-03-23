// utils/debounce.ts — Debounce
//
// O QUE É: Função de debounce vanilla para o autocomplete.
//
// LIMITES ARQUITETURAIS:
// - Função pura — usa setTimeout nativo
//
// RESPONSABILIDADES:
// - debounce(fn, delayMs): retorna função debounced
// - Usado no input de resposta (300ms antes de enviar autocomplete_search)
