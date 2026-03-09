## 📌 Adendo: Interfaces entre Gleam (Engine) ↔ Elixir (Orchestrator) no BEAM

### 🎯 Objetivo da Integração

Permitir que o processo Elixir (que representa uma sala e orquestra a partida) **chame a lógica pura da engine em Gleam**, passando comandos (como "iniciar partida", "responder", "avançar rodada") e recebendo eventos ou estado atualizado de forma direta e eficiente.

---

### 🔌 Modo de Integração: **Chamadas diretas no BEAM**

#### ✅ Por que usar o mesmo nó BEAM?

*   **Zero overhead de rede/serialização**: Gleam compila para Erlang bytecode — Elixir chama módulos Gleam diretamente, sem gRPC, HTTP ou qualquer protocolo de rede.
*   **Economia de recursos**: Em um servidor com 2GB de RAM, eliminar um serviço separado e a camada gRPC economiza memória significativa.
*   **Deploy unificado**: Uma única release OTP contém Engine + Orchestrator, simplificando operações.
*   **Contrato tipado em tempo de compilação**: Gleam tem type safety forte — erros de contrato são detectados pelo compilador.
*   **Desacoplamento lógico mantido**: A separação é feita via módulos/aplicações OTP, não processos físicos separados.

---

### 🧱 Interface sugerida (Contrato via tipos Gleam)

#### 🔁 Comunicação:

*   **Entrada (Elixir → Gleam)**: Chamadas diretas de função (ex: `game_engine.start_match(config, players)`)
*   **Saída (Gleam → Elixir)**: Retorno de `Result(Event, EngineError)` ou envio de mensagens via message passing

#### 📦 Formato dos dados:

*   Custom types Gleam nativos — sem necessidade de serialização. Elixir recebe como tuples/records Erlang.

#### 📘 Exemplo de interface:

```gleam
// Exemplo de função pública do Game Engine
pub fn start_match(
  config: MatchConfiguration,
  players: List(Player),
) -> Result(MatchStarted, EngineError)

pub fn submit_answer(
  match: Match,
  player_id: String,
  answer: String,
  response_time: Float,
) -> Result(AnswerProcessed, EngineError)
```

---

### 🛠️ Como funciona na prática:

1.  **Gleam (Engine)**:
    *   Expõe funções públicas nos módulos do Game Engine.
    *   Cada função recebe dados tipados e retorna `Result` com o evento ou erro.
    *   Lógica pura, sem side effects — fácil de testar.

2.  **Elixir (Orchestrator)**:
    *   Chama os módulos Gleam compilados diretamente (ex: `:game_engine.start_match(config, players)`).
    *   Trata os resultados no processo da sala.
    *   Sem necessidade de client stubs ou geração de código.

---

### 🧪 Sugestão de testes

*   Testes unitários em Gleam puro para a engine (sem dependência de Elixir).
*   Testes de integração no Orchestrator chamando a engine diretamente.
*   Property-based testing para validar invariantes do domínio.

---

### 🔄 Evolução futura

*   Se necessário escalar a engine separadamente no futuro, pode-se extrair para um nó BEAM separado usando distributed Erlang ou migrar para gRPC — a interface lógica permanece a mesma.
*   A arquitetura atual prioriza simplicidade e economia de recursos para o MVP.

---

## ✅ Resumo

*   Engine em **Gleam** roda no **mesmo nó BEAM** que o Orchestrator em Elixir.
*   Comunicação via **chamadas diretas de módulo** — sem gRPC, sem serialização.
*   Contrato garantido pela **tipagem forte do Gleam** em tempo de compilação.
*   Mantenha a interface **simples, explícita e baseada em funções puras com Result types**.
