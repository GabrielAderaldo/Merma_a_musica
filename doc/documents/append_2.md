Claro! Aqui vai o **adendo sobre a especificação completa de comandos e eventos no Game Engine**, servindo como **contrato formal** entre o **Game Orchestrator (Elixir)** e a **Game Engine (Zig)**:

---

## 📌 Adendo: Especificação completa de comandos e eventos no **Game Engine** (contrato de integração)

### 🎯 Objetivo

Estabelecer um **contrato claro e completo de comunicação** entre o **orquestrador (Elixir)** e o **motor do jogo (Zig)**, permitindo:

* Transmitir **comandos estruturados** que controlam o jogo
* Receber **eventos de domínio** que refletem o que aconteceu na lógica
* Garantir compatibilidade entre os contextos
* Testar e evoluir cada lado de forma isolada

> Esse contrato pode ser usado como base para implementar comunicação via `Port`, `FFI`, `NIF` ou até RPC.

---

## 🔁 Estrutura de Comunicação

* **Comandos** são enviados de **Elixir → Zig** (input)
* **Eventos** são emitidos de **Zig → Elixir** (output)
* **Formato sugerido**: JSON estruturado (por legibilidade e portabilidade)
* O protocolo pode ser convertido para **binário** futuramente para performance

---

## ✅ Lista de **Comandos**

| Comando             | Descrição                                         | Campos esperados                                                 |
| ------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| `iniciar_partida`   | Cria uma partida pronta para rodadas              | `partida_id`, `jogadores`, `configuracao`, `musicas_por_jogador` |
| `iniciar_rodada`    | Avança para a próxima rodada                      | `partida_id`                                                     |
| `enviar_resposta`   | Um jogador envia uma resposta para a rodada atual | `partida_id`, `jogador_id`, `resposta`, `tempo_resposta`         |
| `finalizar_rodada`  | Finaliza a rodada manualmente ou por timeout      | `partida_id`                                                     |
| `finalizar_partida` | Força o término do jogo                           | `partida_id`                                                     |
| `resetar_partida`   | Reseta o estado para uma nova execução            | `partida_id`                                                     |

### 🧪 Exemplo de comando:

```json
{
  "command": "enviar_resposta",
  "partida_id": "abc123",
  "jogador_id": "user-1",
  "resposta": "Radiohead",
  "tempo_resposta": 7.2
}
```

---

## 📢 Lista de **Eventos**

| Evento               | O que significa                     | Campos retornados                                    |
| -------------------- | ----------------------------------- | ---------------------------------------------------- |
| `partida_iniciada`   | Partida começou com sucesso         | `rodada_atual`, `musica`, `jogadores`                |
| `rodada_iniciada`    | Nova rodada começou                 | `numero_rodada`, `musica`, `tempo_limite`            |
| `resposta_recebida`  | Uma resposta foi registrada         | `jogador_id`, `resposta`, `valida`, `tempo_resposta` |
| `resposta_certa`     | Jogador acertou                     | `jogador_id`, `ponto`, `musica`                      |
| `resposta_errada`    | Jogador errou                       | `jogador_id`                                         |
| `rodada_finalizada`  | Rodada foi encerrada                | `numero_rodada`, `respostas`, `placar_parcial`       |
| `partida_finalizada` | Fim da partida                      | `placar_final`, `vencedor_id`, `resumo_partida`      |
| `erro`               | Algum comando inválido foi recebido | `mensagem`, `tipo_erro`, `dados_recebidos`           |

### 📢 Exemplo de evento:

```json
{
  "event": "rodada_finalizada",
  "numero_rodada": 3,
  "respostas": [
    { "jogador_id": "user-1", "resposta": "Radiohead", "valida": true },
    { "jogador_id": "user-2", "resposta": "Coldplay", "valida": false }
  ],
  "placar_parcial": {
    "user-1": 3,
    "user-2": 1
  }
}
```

---

## ⚠️ Regras Gerais do Contrato

* **Todo comando válido deve gerar ao menos um evento correspondente**
* **Eventos devem ser emitidos no formato serializado padrão (JSON no MVP)**
* O `partida_id` deve estar presente em todas as mensagens
* O contrato deve ser **versão controlada** (`v1`, `v2`, etc.) para garantir compatibilidade futura

---

## 🧪 Sugestão de estrutura de contrato em código

Você pode definir esse contrato como **tipos ou structs compartilhados**, mesmo que informalmente no início, como por exemplo:

```text
[Command]
type: iniciar_partida | enviar_resposta | ...

[Event]
type: partida_iniciada | resposta_certa | ...
```

No Zig, isso pode ser modelado como enums + tagged unions.
No Elixir, como structs (`%Command{}` / `%Event{}`).

---

## ✅ Benefícios de manter esse contrato

* Garante clareza entre engine e orquestração
* Facilita testes isolados da engine (simulando comandos)
* Permite mockar engine para UI sem a engine real
* Ajuda a criar documentação pública para contribuidores (ex: contributors no GitHub)

---