// views/layouts/main-layout.ts — Layout: Principal
//
// O QUE É: Layout base da aplicação (header + main + footer).
// Wraps o conteúdo da page atual.
//
// LIMITES ARQUITETURAIS:
// - View PURA — estrutura HTML estática + slot para conteúdo dinâmico
//
// RESPONSABILIDADES:
// - Header: logo + navegação mínima
// - Main: slot onde o router monta a page
// - Footer: créditos
