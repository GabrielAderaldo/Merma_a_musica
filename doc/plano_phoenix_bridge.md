# Plano de Implementação — Phoenix Bridge (Gleam ↔ Elixir FFI)

**Objetivo**: Criar um wrapper mínimo que expõe Phoenix/Elixir como infraestrutura consumível pelo Gleam, inspirado no padrão MethodChannel/EventChannel do Flutter/Dart com código nativo.

---

## 1. Conceito

### 1.1 Analogia com Flutter

No Flutter, o Dart (linguagem principal) comunica com código nativo (Swift/Kotlin) através de:

| Flutter | Nosso Projeto |
|---|---|
| **Dart** (linguagem principal) | **Gleam** (linguagem principal) |
| **Swift/Kotlin** (plataforma nativa) | **Elixir/Phoenix** (infraestrutura BEAM) |
| **MethodChannel** (call → response) | **Phoenix.Bridge.call** (request → reply) |
| **EventChannel** (stream contínuo) | **Phoenix.Bridge.stream** (subscribe → events) |
| **Platform code é mínimo** | **Elixir é mínimo — só infra** |

### 1.2 Princípio

Elixir/Phoenix não contém lógica. Ele apenas:
1. **Recebe** eventos da rede (HTTP requests, WebSocket messages)
2. **Entrega** para o Gleam processar via callback registrado
3. **Envia** respostas/broadcasts que o Gleam solicita

O Gleam nunca importa Phoenix. Ele consome uma **interface tipada e limpa** que abstrai a infra por baixo.

### 1.3 Camadas

```
┌─────────────────────────────────────────────┐
│           Gleam (App Logic)                 │
│  Room Server, Coordinator, Playlists, etc.  │
├─────────────────────────────────────────────┤
│         Phoenix Bridge (Gleam)              │  ← Tipos + funções @external
│  Tipos tipados, callbacks, funções de envio │
├─────────────────────────────────────────────┤
│      Bridge Backend (Elixir)                │  ← Implementação mínima
│  Phoenix Channel, Router, PubSub wrappers   │
├─────────────────────────────────────────────┤
│         Phoenix / OTP (Elixir)              │  ← Lib externa, não tocamos
│  Endpoint, Channel, PubSub, Supervisor      │
└─────────────────────────────────────────────┘
```

---

## 2. Arquitetura do Bridge

### 2.1 Dois módulos, duas linguagens

| Módulo | Linguagem | Papel |
|---|---|---|
| `phoenix_bridge.gleam` | Gleam | **Interface pública** — tipos, funções que o app Gleam chama |
| `phoenix_bridge_backend.ex` | Elixir | **Implementação** — traduz chamadas Gleam para Phoenix |

### 2.2 Dois padrões de comunicação

#### MethodChannel (Request → Reply)
Para operações pontuais onde Gleam pede algo e espera resposta.

```
Gleam                           Elixir
  │                               │
  │── bridge.push(topic, event,   │
  │   payload)                    │
  │──────────────────────────────>│── Phoenix.Channel.push(...)
  │                               │
  │── bridge.broadcast(topic,     │
  │   event, payload)             │
  │──────────────────────────────>│── Phoenix.PubSub.broadcast(...)
  │                               │
  │── bridge.reply(ref, payload)  │
  │──────────────────────────────>│── Phoenix.Channel.reply(...)
```

#### EventChannel (Stream contínuo)
Para eventos que chegam da rede e são entregues ao Gleam.

```
Cliente (Browser)               Elixir                    Gleam
  │                               │                         │
  │── WS: "submit_answer" ──────>│                         │
  │                               │── handler(event,        │
  │                               │   payload, state)       │
  │                               │─────────────────────────>│
  │                               │                         │── processa
  │                               │                         │── retorna ação
  │                               │<─────────────────────────│
  │<── WS: "answer_confirmed" ───│                         │
```

---

## 3. Fases de Implementação

### Fase 1 — Tipos base do Bridge (Gleam)

**Arquivo**: `src/phoenix_bridge/types.gleam`

```gleam
/// Representa um tópico Phoenix Channel (ex: "room:ABC123")
pub type Topic = String

/// Representa um nome de evento (ex: "submit_answer")
pub type EventName = String

/// Payload genérico — será Dynamic no boundary, tipado no app
pub type RawPayload = Dynamic

/// Referência para reply de um channel message
pub type ChannelRef = Dynamic

/// Resultado de um handler de evento
pub type HandlerResult(state) {
  /// Não responde nada, só atualiza estado
  NoReply(state)
  /// Responde ao remetente com payload
  Reply(payload: RawPayload, state: state)
  /// Broadcast para todos no tópico
  Broadcast(event: EventName, payload: RawPayload, state: state)
  /// Reply ao remetente + broadcast para todos
  ReplyAndBroadcast(
    reply_payload: RawPayload,
    broadcast_event: EventName,
    broadcast_payload: RawPayload,
    state: state,
  )
  /// Erro — envia erro ao remetente
  Error(code: String, message: String, state: state)
}

/// Ação que o Gleam pode solicitar ao Phoenix a qualquer momento
pub type BridgeAction {
  /// Push evento para um client específico (via socket pid)
  PushToClient(topic: Topic, event: EventName, payload: RawPayload)
  /// Broadcast para todos no tópico
  BroadcastToTopic(topic: Topic, event: EventName, payload: RawPayload)
  /// Agendar mensagem para o próprio processo após N ms
  ScheduleMessage(delay_ms: Int, message: RawPayload)
  /// Cancelar timer agendado
  CancelTimer(timer_ref: Dynamic)
}
```

**Critério**: Tipos compilam, são expressivos o suficiente para cobrir todos os casos de uso do Channel.

---

### Fase 2 — Funções @external do Bridge (Gleam → Elixir)

**Arquivo**: `src/phoenix_bridge.gleam`

```gleam
import gleam/dynamic.{type Dynamic}

// ─── BROADCAST / PUSH ───

/// Broadcast evento para todos os subscribers de um tópico via PubSub
@external(erlang, "phoenix_bridge_backend", "broadcast")
pub fn broadcast(
  topic: String,
  event: String,
  payload: Dynamic,
) -> Result(Nil, String)

/// Push evento para um client específico (via socket assign/pid)
@external(erlang, "phoenix_bridge_backend", "push_to")
pub fn push_to(
  socket_pid: Dynamic,
  event: String,
  payload: Dynamic,
) -> Result(Nil, String)

// ─── TIMERS ───

/// Agendar mensagem para o processo atual após N milissegundos
@external(erlang, "phoenix_bridge_backend", "schedule_after")
pub fn schedule_after(
  target_pid: Dynamic,
  delay_ms: Int,
  message: Dynamic,
) -> Dynamic  // retorna timer_ref

/// Cancelar timer agendado
@external(erlang, "phoenix_bridge_backend", "cancel_timer")
pub fn cancel_timer(timer_ref: Dynamic) -> Nil

// ─── REGISTRY ───

/// Registrar processo com nome no Registry
@external(erlang, "phoenix_bridge_backend", "register_process")
pub fn register_process(
  name: String,
) -> Result(Nil, String)

/// Lookup processo por nome no Registry
@external(erlang, "phoenix_bridge_backend", "lookup_process")
pub fn lookup_process(
  name: String,
) -> Result(Dynamic, Nil)

// ─── SUPERVISOR ───

/// Iniciar processo filho no DynamicSupervisor
@external(erlang, "phoenix_bridge_backend", "start_child")
pub fn start_child(
  module: Dynamic,
  args: Dynamic,
) -> Result(Dynamic, String)

/// Parar processo filho
@external(erlang, "phoenix_bridge_backend", "stop_child")
pub fn stop_child(pid: Dynamic) -> Result(Nil, String)

// ─── PID / PROCESS ───

/// Retorna PID do processo atual
@external(erlang, "phoenix_bridge_backend", "self_pid")
pub fn self_pid() -> Dynamic

// ─── ETS (CACHE) ───

/// Guardar valor no cache ETS
@external(erlang, "phoenix_bridge_backend", "cache_put")
pub fn cache_put(
  table: String,
  key: Dynamic,
  value: Dynamic,
  ttl_seconds: Int,
) -> Nil

/// Buscar valor no cache ETS
@external(erlang, "phoenix_bridge_backend", "cache_get")
pub fn cache_get(
  table: String,
  key: Dynamic,
) -> Result(Dynamic, Nil)

/// Deletar valor do cache ETS
@external(erlang, "phoenix_bridge_backend", "cache_delete")
pub fn cache_delete(
  table: String,
  key: Dynamic,
) -> Nil

// ─── HTTP CLIENT (para APIs externas) ───

/// HTTP GET request
@external(erlang, "phoenix_bridge_backend", "http_get")
pub fn http_get(
  url: String,
  headers: List(#(String, String)),
) -> Result(#(Int, String), String)

/// HTTP POST request
@external(erlang, "phoenix_bridge_backend", "http_post")
pub fn http_post(
  url: String,
  headers: List(#(String, String)),
  body: String,
) -> Result(#(Int, String), String)
```

**Critério**: Cada função tem implementação correspondente no Elixir. Gleam compila sem erros.

---

### Fase 3 — Backend do Bridge (Elixir)

**Arquivo**: `lib/phoenix_bridge_backend.ex`

```elixir
defmodule :phoenix_bridge_backend do
  @moduledoc """
  Backend do Phoenix Bridge.
  Implementa as funções que o Gleam chama via @external.
  Este é o ÚNICO módulo Elixir que o Gleam conhece diretamente.
  """

  # ─── BROADCAST / PUSH ───

  def broadcast(topic, event, payload) do
    case Phoenix.PubSub.broadcast(GameOrchestrator.PubSub, topic, {event, payload}) do
      :ok -> {:ok, nil}
      {:error, reason} -> {:error, inspect(reason)}
    end
  end

  def push_to(socket_pid, event, payload) do
    send(socket_pid, {:push, event, payload})
    {:ok, nil}
  end

  # ─── TIMERS ───

  def schedule_after(target_pid, delay_ms, message) do
    Process.send_after(target_pid, message, delay_ms)
  end

  def cancel_timer(timer_ref) do
    Process.cancel_timer(timer_ref)
    nil
  end

  # ─── REGISTRY ───

  def register_process(name) do
    case Registry.register(GameOrchestrator.RoomRegistry, name, nil) do
      {:ok, _} -> {:ok, nil}
      {:error, {:already_registered, _}} -> {:error, "already_registered"}
    end
  end

  def lookup_process(name) do
    case Registry.lookup(GameOrchestrator.RoomRegistry, name) do
      [{pid, _}] -> {:ok, pid}
      [] -> {:error, nil}
    end
  end

  # ─── SUPERVISOR ───

  def start_child(module, args) do
    case DynamicSupervisor.start_child(
      GameOrchestrator.RoomSupervisor,
      {module, args}
    ) do
      {:ok, pid} -> {:ok, pid}
      {:error, reason} -> {:error, inspect(reason)}
    end
  end

  def stop_child(pid) do
    case DynamicSupervisor.terminate_child(GameOrchestrator.RoomSupervisor, pid) do
      :ok -> {:ok, nil}
      {:error, reason} -> {:error, inspect(reason)}
    end
  end

  # ─── PID ───

  def self_pid, do: self()

  # ─── ETS CACHE ───

  def cache_put(table, key, value, ttl_seconds) do
    table_atom = String.to_existing_atom(table)
    expires_at = System.system_time(:second) + ttl_seconds
    :ets.insert(table_atom, {key, value, expires_at})
    nil
  end

  def cache_get(table, key) do
    table_atom = String.to_existing_atom(table)
    case :ets.lookup(table_atom, key) do
      [{^key, value, expires_at}] ->
        if System.system_time(:second) < expires_at do
          {:ok, value}
        else
          :ets.delete(table_atom, key)
          {:error, nil}
        end
      [] -> {:error, nil}
    end
  end

  def cache_delete(table, key) do
    table_atom = String.to_existing_atom(table)
    :ets.delete(table_atom, key)
    nil
  end

  # ─── HTTP CLIENT ───

  def http_get(url, headers) do
    headers_charlist = Enum.map(headers, fn {k, v} ->
      {String.to_charlist(k), String.to_charlist(v)}
    end)

    case :httpc.request(:get, {String.to_charlist(url), headers_charlist}, [], []) do
      {:ok, {{_, status, _}, _, body}} ->
        {:ok, {status, to_string(body)}}
      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end

  def http_post(url, headers, body) do
    headers_charlist = Enum.map(headers, fn {k, v} ->
      {String.to_charlist(k), String.to_charlist(v)}
    end)

    content_type = headers
      |> Enum.find(fn {k, _} -> String.downcase(k) == "content-type" end)
      |> case do
        {_, v} -> String.to_charlist(v)
        nil -> ~c"application/json"
      end

    case :httpc.request(
      :post,
      {String.to_charlist(url), headers_charlist, content_type, body},
      [], []
    ) do
      {:ok, {{_, status, _}, _, resp_body}} ->
        {:ok, {status, to_string(resp_body)}}
      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end
end
```

**Critério**: Todas as funções chamáveis do Gleam. Testes de integração passam.

---

### Fase 4 — Channel Handler (EventChannel pattern)

O lado "EventChannel" — Phoenix Channel que delega TUDO para Gleam.

**Arquivo**: `lib/game_orchestrator_web/channels/room_channel.ex`

```elixir
defmodule GameOrchestratorWeb.RoomChannel do
  @moduledoc """
  Thin wrapper Channel. Recebe eventos WS e delega para Gleam.
  Equivalente ao "native side" do EventChannel no Flutter.
  """
  use Phoenix.Channel

  @impl true
  def join("room:" <> invite_code, params, socket) do
    # Delega para Gleam
    case :room_channel_handler.handle_join(invite_code, params) do
      {:ok, reply, state} ->
        socket = assign(socket, :gleam_state, state)
        socket = assign(socket, :invite_code, invite_code)
        {:ok, reply, socket}
      {:error, reason} ->
        {:error, %{reason: reason}}
    end
  end

  @impl true
  def handle_in(event, payload, socket) do
    # Delega QUALQUER evento para Gleam
    gleam_state = socket.assigns.gleam_state

    case :room_channel_handler.handle_event(event, payload, gleam_state) do
      {:no_reply, new_state} ->
        {:noreply, assign(socket, :gleam_state, new_state)}

      {:reply, reply_payload, new_state} ->
        {:reply, {:ok, reply_payload}, assign(socket, :gleam_state, new_state)}

      {:broadcast, broadcast_event, broadcast_payload, new_state} ->
        broadcast!(socket, broadcast_event, broadcast_payload)
        {:noreply, assign(socket, :gleam_state, new_state)}

      {:reply_and_broadcast, reply_payload, broadcast_event, broadcast_payload, new_state} ->
        broadcast!(socket, broadcast_event, broadcast_payload)
        {:reply, {:ok, reply_payload}, assign(socket, :gleam_state, new_state)}

      {:error, code, message, new_state} ->
        push(socket, "error", %{code: code, message: message})
        {:noreply, assign(socket, :gleam_state, new_state)}
    end
  end

  @impl true
  def handle_info(message, socket) do
    # Mensagens do PubSub/timers → delega para Gleam
    gleam_state = socket.assigns.gleam_state

    case :room_channel_handler.handle_info(message, gleam_state) do
      {:push, event, payload, new_state} ->
        push(socket, event, payload)
        {:noreply, assign(socket, :gleam_state, new_state)}

      {:no_reply, new_state} ->
        {:noreply, assign(socket, :gleam_state, new_state)}
    end
  end

  @impl true
  def terminate(reason, socket) do
    gleam_state = socket.assigns.gleam_state
    :room_channel_handler.handle_terminate(reason, gleam_state)
    :ok
  end
end
```

**Arquivo Gleam**: `src/room_channel_handler.gleam`

```gleam
/// Handler Gleam que o Channel Elixir chama.
/// Este é o "Dart side" do EventChannel.

pub fn handle_join(invite_code: String, params: Dynamic)
  -> Result(#(Dynamic, Dynamic), String)
{
  // Lógica de join — buscar sala, validar, retornar state
  todo
}

pub fn handle_event(event: String, payload: Dynamic, state: Dynamic)
  -> HandlerResult(Dynamic)
{
  case event {
    "player_ready" -> handle_player_ready(payload, state)
    "player_unready" -> handle_player_unready(payload, state)
    "configure_match" -> handle_configure_match(payload, state)
    "start_game" -> handle_start_game(payload, state)
    "submit_answer" -> handle_submit_answer(payload, state)
    "vote_skip" -> handle_vote_skip(payload, state)
    "select_playlist" -> handle_select_playlist(payload, state)
    "player_leave" -> handle_player_leave(payload, state)
    "autocomplete_search" -> handle_autocomplete(payload, state)
    _ -> NoReply(state)
  }
}

pub fn handle_info(message: Dynamic, state: Dynamic) {
  // Timers, PubSub messages, etc.
  todo
}

pub fn handle_terminate(reason: Dynamic, state: Dynamic) {
  // Cleanup
  todo
}
```

**Critério**: Channel funciona end-to-end. Gleam recebe eventos, processa, e respostas chegam ao client.

---

### Fase 5 — REST Handler (MethodChannel pattern)

Mesmo padrão para HTTP — Controllers Elixir são thin wrappers.

**Arquivo**: `lib/game_orchestrator_web/controllers/api_controller.ex`

```elixir
defmodule GameOrchestratorWeb.ApiController do
  @moduledoc """
  Controller genérico que delega para Gleam.
  Equivalente ao MethodChannel — request/reply.
  """
  use GameOrchestratorWeb, :controller

  # Cada rota chama o handler Gleam correspondente
  def create_room(conn, params) do
    case :rest_handler.handle_create_room(params) do
      {:ok, response} -> json(conn, response) |> put_status(201)
      {:error, code, message, status} ->
        conn |> put_status(status) |> json(%{error: %{code: code, message: message}})
    end
  end

  def get_room(conn, %{"invite_code" => code}) do
    case :rest_handler.handle_get_room(code) do
      {:ok, response} -> json(conn, response)
      {:error, code, message, status} ->
        conn |> put_status(status) |> json(%{error: %{code: code, message: message}})
    end
  end

  # ... mesmo padrão para todas as rotas
end
```

**Critério**: Nenhuma lógica nos controllers. Toda decisão está no Gleam.

---

### Fase 6 — Application Setup (Elixir)

**Arquivo**: `lib/game_orchestrator/application.ex`

Supervisor tree que inicia toda a infra que o Gleam consome:

```elixir
children = [
  # PubSub (para broadcast)
  {Phoenix.PubSub, name: GameOrchestrator.PubSub},

  # Registry (para lookup de processos por nome)
  {Registry, keys: :unique, name: GameOrchestrator.RoomRegistry},

  # DynamicSupervisor (para processos filhos dinâmicos)
  {DynamicSupervisor, name: GameOrchestrator.RoomSupervisor, strategy: :one_for_one},

  # ETS tables (cache)
  # Criados no init

  # Phoenix Endpoint
  GameOrchestratorWeb.Endpoint,
]
```

**Critério**: `mix phx.server` inicia toda a infra. Gleam consegue chamar todas as funções do bridge.

---

## 4. Resumo da Interface

### O que o Gleam enxerga (a API limpa)

```
phoenix_bridge.broadcast(topic, event, payload)   → PubSub
phoenix_bridge.push_to(pid, event, payload)        → Push direto
phoenix_bridge.schedule_after(pid, ms, msg)        → Timer
phoenix_bridge.cancel_timer(ref)                   → Cancel timer
phoenix_bridge.register_process(name)              → Registry
phoenix_bridge.lookup_process(name)                → Registry lookup
phoenix_bridge.start_child(module, args)           → DynamicSupervisor
phoenix_bridge.stop_child(pid)                     → Terminate child
phoenix_bridge.self_pid()                          → Self PID
phoenix_bridge.cache_put(table, key, val, ttl)     → ETS write
phoenix_bridge.cache_get(table, key)               → ETS read
phoenix_bridge.cache_delete(table, key)            → ETS delete
phoenix_bridge.http_get(url, headers)              → HTTP GET
phoenix_bridge.http_post(url, headers, body)       → HTTP POST
```

### O que o Elixir faz (o mínimo necessário)

| Elixir | Responsabilidade |
|---|---|
| `phoenix_bridge_backend.ex` | Implementa as funções @external |
| `room_channel.ex` | Recebe WS events → delega para Gleam |
| `api_controller.ex` | Recebe HTTP requests → delega para Gleam |
| `application.ex` | Inicia supervisor tree (PubSub, Registry, DynamicSupervisor, ETS) |
| `endpoint.ex` | Config do Phoenix Endpoint |
| `router.ex` | Mapeamento de rotas → controllers |
| `user_socket.ex` | Entry point WebSocket |
| `telemetry.ex` | Métricas |

### O que o Gleam faz (toda a lógica)

| Gleam | Responsabilidade |
|---|---|
| `room_channel_handler.gleam` | Processa eventos WebSocket (EventChannel) |
| `rest_handler.gleam` | Processa requests HTTP (MethodChannel) |
| `room_server.gleam` | GenServer da sala (estado, lifecycle) |
| `coordinator.gleam` | Bridge com Game Engine |
| Tudo mais... | Playlists, áudio, autocomplete, etc. |

---

## 5. Regras do Bridge

1. **Elixir NUNCA toma decisões** — só roteia, converte e executa
2. **Gleam NUNCA importa Phoenix** — só usa `phoenix_bridge`
3. **Um único módulo Elixir** é visível ao Gleam (`phoenix_bridge_backend`)
4. **Tipos Dynamic no boundary** — conversão tipada acontece dentro do Gleam
5. **Handlers retornam ações declarativas** (NoReply, Reply, Broadcast) — o Elixir executa
6. **Novos recursos Phoenix** = adicionar função no backend + @external no bridge
7. **Testes do Gleam** podem mockar o bridge sem precisar de Phoenix rodando

---

## 6. Arquivos finais

```
apps/game_orchestrator/
  src/                                    # ← Gleam
    phoenix_bridge.gleam                  # Interface @external (API limpa)
    phoenix_bridge/types.gleam            # Tipos do bridge
    room_channel_handler.gleam            # Handler de eventos WS
    rest_handler.gleam                    # Handler de requests HTTP
    ...                                   # App logic (tudo em Gleam)

  lib/                                    # ← Elixir (infra mínima)
    phoenix_bridge_backend.ex             # Implementação das @external
    game_orchestrator/application.ex      # Supervisor tree
    game_orchestrator_web/
      endpoint.ex
      router.ex
      user_socket.ex
      telemetry.ex
      channels/room_channel.ex            # Thin wrapper → Gleam
      controllers/api_controller.ex       # Thin wrapper → Gleam
```
