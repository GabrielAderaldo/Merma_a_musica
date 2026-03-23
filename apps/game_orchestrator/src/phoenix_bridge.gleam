// phoenix_bridge.gleam — Interface FFI Gleam → Elixir
//
// O QUE É: Ponto ÚNICO de contato entre o Gleam e o Elixir/Phoenix.
// Inspirado no padrão MethodChannel/EventChannel do Flutter.
// O Gleam chama estas funções — o Elixir executa.
//
// LIMITES ARQUITETURAIS:
// - ÚNICO módulo Gleam que declara @external para o Elixir
// - Todas as funções delegam para :phoenix_bridge_backend (Elixir)
// - Nenhum outro módulo Gleam deve usar @external(erlang, ...) para Phoenix
// - Novos recursos Phoenix = adicionar função aqui + implementar no backend.ex
//
// COMO O BOUNDARY FUNCIONA:
// - Gleam chama função → compila para chamada Erlang direta (zero overhead)
// - Elixir recebe args como termos Erlang nativos (tuples, lists, binaries)
// - Retornos seguem convenção Gleam: {:ok, value} | {:error, reason}
// - Dynamic é usado APENAS para dados que o Gleam não precisa tipar
//   (PIDs, timer refs, valores de cache heterogêneos)

import gleam/dynamic.{type Dynamic}

// ═══════════════════════════════════════════════════════════════
// BROADCAST / PUSH — Enviar eventos para clients via PubSub
// ═══════════════════════════════════════════════════════════════

/// Broadcast um evento para TODOS os subscribers de um tópico.
/// Usado pelo Room Server para notificar todos os jogadores da sala.
/// O evento é um termo Erlang que o Channel intercepta e serializa.
///
/// topic: "room:ABC123"
/// event: nome do evento (ex: "player_joined")
/// payload: dados do evento como termo Erlang (o Channel serializa para JSON)
@external(erlang, "phoenix_bridge_backend", "broadcast")
pub fn broadcast(
  topic: String,
  event: String,
  payload: Dynamic,
) -> Result(Nil, String)

/// Push evento para um processo específico (identificado por PID).
/// Usado para enviar mensagens direcionadas (ex: erro só para um jogador).
/// O processo recebe {:push, event, payload} na mailbox.
@external(erlang, "phoenix_bridge_backend", "push_to")
pub fn push_to(
  pid: Dynamic,
  event: String,
  payload: Dynamic,
) -> Result(Nil, String)

// ═══════════════════════════════════════════════════════════════
// TIMERS — Agendar e cancelar mensagens futuras
// ═══════════════════════════════════════════════════════════════

/// Agendar envio de mensagem para um processo após N milissegundos.
/// Retorna timer_ref (opaco) que pode ser cancelado com cancel_timer.
///
/// Usado para: timer de rodada, grace period, timeout de reconexão,
/// timeout de inatividade da sala, pausa entre rodadas.
@external(erlang, "phoenix_bridge_backend", "schedule_after")
pub fn schedule_after(
  target_pid: Dynamic,
  delay_ms: Int,
  message: Dynamic,
) -> Dynamic

/// Cancelar um timer agendado. Idempotente — cancelar timer já
/// disparado ou inexistente não causa erro.
@external(erlang, "phoenix_bridge_backend", "cancel_timer")
pub fn cancel_timer(timer_ref: Dynamic) -> Nil

// ═══════════════════════════════════════════════════════════════
// REGISTRY — Registrar e buscar processos por nome
// ═══════════════════════════════════════════════════════════════

/// Registrar o processo atual no Registry com um nome único.
/// Usado para registrar salas pelo invite_code.
/// Retorna Error("already_registered") se o nome já existe.
@external(erlang, "phoenix_bridge_backend", "register_process")
pub fn register_process(name: String) -> Result(Nil, String)

/// Buscar PID de um processo pelo nome no Registry.
/// Retorna Error(Nil) se não encontrado.
@external(erlang, "phoenix_bridge_backend", "lookup_process")
pub fn lookup_process(name: String) -> Result(Dynamic, Nil)

// ═══════════════════════════════════════════════════════════════
// SUPERVISOR — Iniciar e parar processos filhos dinâmicos
// ═══════════════════════════════════════════════════════════════

/// Iniciar um processo filho no DynamicSupervisor.
/// Usado para criar novos processos de sala.
/// Retorna PID do processo criado ou Error com razão.
@external(erlang, "phoenix_bridge_backend", "start_child")
pub fn start_child(
  module: Dynamic,
  args: Dynamic,
) -> Result(Dynamic, String)

/// Parar um processo filho do DynamicSupervisor.
/// Usado para destruir salas inativas.
@external(erlang, "phoenix_bridge_backend", "stop_child")
pub fn stop_child(pid: Dynamic) -> Result(Nil, String)

// ═══════════════════════════════════════════════════════════════
// PROCESS — Utilitários de processo BEAM
// ═══════════════════════════════════════════════════════════════

/// Retorna o PID do processo atual.
/// Usado para agendar timers para si mesmo via schedule_after.
@external(erlang, "phoenix_bridge_backend", "self_pid")
pub fn self_pid() -> Dynamic

// ═══════════════════════════════════════════════════════════════
// ETS CACHE — Armazenamento em memória com TTL
// ═══════════════════════════════════════════════════════════════

/// Armazenar valor no cache ETS com TTL em segundos.
/// Após o TTL, a entrada é ignorada em leituras e eventualmente limpa.
///
/// Usado para: cache ISRC→Deezer (24h), audio tokens (duração da rodada),
/// cache de validação de playlists (duração da sessão).
@external(erlang, "phoenix_bridge_backend", "cache_put")
pub fn cache_put(
  table: String,
  key: Dynamic,
  value: Dynamic,
  ttl_seconds: Int,
) -> Nil

/// Buscar valor no cache ETS.
/// Retorna Error(Nil) se não encontrado ou se TTL expirou.
@external(erlang, "phoenix_bridge_backend", "cache_get")
pub fn cache_get(
  table: String,
  key: Dynamic,
) -> Result(Dynamic, Nil)

/// Deletar entrada do cache ETS.
@external(erlang, "phoenix_bridge_backend", "cache_delete")
pub fn cache_delete(
  table: String,
  key: Dynamic,
) -> Nil

// ═══════════════════════════════════════════════════════════════
// HTTP CLIENT — Chamadas HTTP para APIs externas
// ═══════════════════════════════════════════════════════════════

/// HTTP GET request.
/// Retorna #(status_code, response_body_string) ou Error com razão.
///
/// Usado para: buscar dados do Deezer, Spotify, YouTube APIs.
/// O Gleam faz parse do JSON do body com gleam_json.
@external(erlang, "phoenix_bridge_backend", "http_get")
pub fn http_get(
  url: String,
  headers: List(#(String, String)),
) -> Result(#(Int, String), String)

/// HTTP POST request.
/// body é uma string JSON já serializada pelo Gleam.
/// Retorna #(status_code, response_body_string) ou Error com razão.
///
/// Usado para: trocar OAuth codes, refresh tokens.
@external(erlang, "phoenix_bridge_backend", "http_post")
pub fn http_post(
  url: String,
  headers: List(#(String, String)),
  body: String,
) -> Result(#(Int, String), String)
