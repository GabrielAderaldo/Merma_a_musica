// utils/observable.ts — Sistema de Reatividade Vanilla
//
// O QUE É: Implementação minimalista de observer pattern para conectar
// ViewModels (state) → Views (DOM updates). ZERO libs externas.
//
// LIMITES ARQUITETURAIS:
// - Vanilla puro — apenas callbacks, closures e Set
// - Usado APENAS pelos ViewModels para notificar Views
// - ~30 linhas de código
//
// RESPONSABILIDADES:
// - createObservable<T>(initialValue): retorna { get, set, subscribe }
//   - get(): retorna valor atual
//   - set(newValue): atualiza valor + notifica todos os subscribers
//   - subscribe(listener): registra callback, retorna unsubscribe fn
// - createComputed<T>(deriveFn, deps[]): valor derivado que atualiza
//   quando alguma dependência muda
//
// PADRÃO DE USO:
//   // No ViewModel:
//   const nickname = createObservable("");
//   nickname.set("Gabriel");
//
//   // Na View:
//   const unsub = nickname.subscribe((value) => {
//     element.textContent = value;
//   });
