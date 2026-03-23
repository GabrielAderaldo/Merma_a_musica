// utils/dom.ts — Utilitários de DOM
//
// O QUE É: Helpers vanilla para criar e manipular elementos DOM.
// Reduz boilerplate de document.createElement + classList + textContent.
//
// LIMITES ARQUITETURAIS:
// - Funções puras — recebem dados, retornam HTMLElement
// - ZERO libs — apenas DOM API nativa
// - Usados por todas as Views
//
// RESPONSABILIDADES:
// - el(tag, attrs?, children?): criar elemento com atributos e filhos
// - text(content): criar TextNode
// - on(element, event, handler): addEventListener typesafe
// - bind(element, property, subscribeFn): subscribe a mudanças e atualizar DOM
//   (helper para conectar ViewModel.subscribe → DOM update)
// - removeChildren(element): limpar filhos de um elemento
