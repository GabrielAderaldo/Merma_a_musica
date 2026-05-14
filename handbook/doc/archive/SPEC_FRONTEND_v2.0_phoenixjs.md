# 🎨 Mermã, a Música! — Arquitetura Frontend (Vanilla TS)

> **Versão 2.0 — MVP | Maio 2026**
> Especificação do frontend "Zero Framework", priorizando performance bruta e controle total sobre o DOM.

---

## 1. 🏗️ Estratégia "Zero Framework"

O projeto abandonou frameworks (SolidJS/Svelte) em favor de **Vanilla TypeScript puro** e **Bun** como runtime/bundler.

### Por que Vanilla?
- **Performance**: Zero overhead de runtime ou virtual DOM.
- **Leveza**: Bundle final extremamente reduzido (~10KB).
- **Controle**: Manipulação direta do DOM para transições de jogo suaves.

---

## 2. 🏛️ Padrão MVVM Vanilla

Implementamos uma estrutura desacoplada para gerenciar o estado real-time da partida.

1.  **Models**: Interfaces TypeScript que espelham o contrato do Backend.
2.  **Repositories**: Camada de persistência (LocalStorage) e I/O (REST + Phoenix Channels).
3.  **ViewModels**: Singleton que mantém o estado reativo via padrão **Observer**.
4.  **Views**: Funções/Classes que manipulam o DOM e fazem `subscribe` nas mudanças dos ViewModels.

---

## 3. 📡 Comunicação Real-Time

O frontend utiliza o client oficial `phoenix.js` para gerenciar a conexão com o **Game Orchestrator**.

```typescript
// Exemplo de integração
const channel = socket.channel(`room:${inviteCode}`, { nickname });
channel.on("round_starting", (payload) => {
  audioPlayer.load(payload.audio_token);
});
```

---

## 4. 💅 Estilização & UI

- **Tailwind CSS**: Estilização via classes utilitárias, processada nativamente pelo Bun durante o build.
- **Dark Mode Native**: Interface projetada nativamente para tons escuros para reduzir fadiga visual.
- **Responsive-First**: Layout fluido que prioriza a experiência mobile (touch friendly).

---

## 5. 🚀 Ferramental (Bun-only)

| Ferramenta | Uso |
| :--- | :--- |
| **Bun.build** | Bundler e transpiler TS -> JS. |
| **Bun test** | Suite de testes unitários integrada. |
| **Oxlint** | Linting ultra-rápido para garantir qualidade do código. |

---
*Grounding: Segue os princípios de "Clean Code" (Robert C. Martin) aplicados ao desenvolvimento web moderno sem dependências excessivas.*
