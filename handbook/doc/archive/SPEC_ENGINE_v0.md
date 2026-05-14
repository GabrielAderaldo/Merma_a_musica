# 🧠 Especificação: @merma/domain (TS 6.0)

Esta especificação detalha o **Core Domain** do jogo, implementado como um pacote puramente funcional em **Vanilla TypeScript 6.0**.

## 1. 🎯 Objetivos do Pacote
- **Independência Total**: Zero dependências externas (exceto `@merma/schema` para contratos).
- **Rigor Matemático**: Uso de tipos fortes para impedir estados impossíveis.
- **Testabilidade**: 100% de cobertura via `bun test` com funções puras.

## 2. 🛡️ Padrões de Implementação

### 2.1 Result Type (Tratamento de Erros)
Toda operação que pode falhar retorna um `Result<T, E>`.
```typescript
type Result<T, E> = { ok: true, value: T } | { ok: false, error: E }
```

### 2.2 Branded Types (Segurança de IDs)
```typescript
type UserId = string & { readonly __brand: "UserId" }
```

## 3. 🕹️ Lógica da Engine

### 3.1 O Ciclo da Rodada (Round)
1. **Selection**: Seleciona uma música aleatória do pool de músicas da sala.
2. **Start**: Inicia o timer e emite o evento de início com o `AudioToken`.
3. **Validation**: Compara a resposta do jogador com o título/artista usando **Levenshtein Distance** (implementação interna em `packages/domain`).
4. **Scoring**: Atribui pontos baseados no tempo de resposta e precisão.

### 3.2 Invariantes de Negócio
- Uma sala não pode iniciar sem pelo menos 2 jogadores (exceto modo treino).
- O tempo de resposta não pode ser superior ao tempo total da rodada.
- Playlists duplicadas na mesma sala são ignoradas.

## 🧪 Estratégia de Testes
Os testes devem focar em casos de borda:
- Respostas quase certas (fuzzy match).
- Empates de milissegundos no final da rodada.
- Cálculo de bônus de velocidade.
