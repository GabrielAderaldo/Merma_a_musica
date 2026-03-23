# phoenix_bridge_backend.ex — Backend do Phoenix Bridge
#
# O QUE É: Implementação das funções @external que o Gleam chama.
# Este é o ÚNICO módulo Elixir que o Gleam conhece diretamente.
#
# LIMITES ARQUITETURAIS:
# - NÃO contém lógica de negócio — apenas executa ações de infra
# - Cada função é uma tradução direta: Gleam call → Phoenix/OTP action
# - Nome do módulo é atom (:phoenix_bridge_backend) para FFI Gleam
# - Retornos seguem convenção Gleam: {:ok, value} | {:error, reason}
# - NÃO toma decisões — apenas executa o que o Gleam pede
#
# COMO É CHAMADO:
# - Gleam: phoenix_bridge.broadcast("room:ABC123", "player_joined", payload)
# - Compila para: :phoenix_bridge_backend.broadcast("room:ABC123", "player_joined", payload)
# - Elixir executa: Phoenix.PubSub.broadcast(...)

defmodule :phoenix_bridge_backend do

  # ═══════════════════════════════════════════════════════════════
  # BROADCAST / PUSH
  # ═══════════════════════════════════════════════════════════════

  @doc """
  Broadcast evento para todos os subscribers de um tópico via PubSub.
  O Channel escuta esses broadcasts e repassa para os clients WebSocket.
  """
  def broadcast(topic, event, payload) do
    case Phoenix.PubSub.broadcast(GameOrchestrator.PubSub, topic, {event, payload}) do
      :ok -> {:ok, nil}
      {:error, reason} -> {:error, inspect(reason)}
    end
  end

  @doc """
  Envia mensagem direta para um processo (identificado por PID).
  O processo recebe {:push, event, payload} na sua mailbox.
  """
  def push_to(pid, event, payload) do
    send(pid, {:push, event, payload})
    {:ok, nil}
  end

  # ═══════════════════════════════════════════════════════════════
  # TIMERS
  # ═══════════════════════════════════════════════════════════════

  @doc """
  Agendar envio de mensagem para um processo após delay_ms milissegundos.
  Retorna timer_ref que pode ser cancelado com cancel_timer/1.
  """
  def schedule_after(target_pid, delay_ms, message) do
    Process.send_after(target_pid, message, delay_ms)
  end

  @doc """
  Cancelar timer agendado. Seguro para chamar com refs inválidos.
  """
  def cancel_timer(timer_ref) do
    Process.cancel_timer(timer_ref)
    nil
  end

  # ═══════════════════════════════════════════════════════════════
  # REGISTRY
  # ═══════════════════════════════════════════════════════════════

  @doc """
  Registrar o processo atual no Registry com um nome único.
  Usado para registrar salas pelo invite_code.
  """
  def register_process(name) do
    case Registry.register(GameOrchestrator.RoomRegistry, name, nil) do
      {:ok, _pid} -> {:ok, nil}
      {:error, {:already_registered, _pid}} -> {:error, "already_registered"}
    end
  end

  @doc """
  Buscar PID de um processo pelo nome no Registry.
  """
  def lookup_process(name) do
    case Registry.lookup(GameOrchestrator.RoomRegistry, name) do
      [{pid, _value}] -> {:ok, pid}
      [] -> {:error, nil}
    end
  end

  # ═══════════════════════════════════════════════════════════════
  # SUPERVISOR
  # ═══════════════════════════════════════════════════════════════

  @doc """
  Iniciar processo filho no DynamicSupervisor.
  module e args são termos Erlang passados direto pelo Gleam.
  """
  def start_child(module, args) do
    case DynamicSupervisor.start_child(
      GameOrchestrator.RoomSupervisor,
      {module, args}
    ) do
      {:ok, pid} -> {:ok, pid}
      {:error, reason} -> {:error, inspect(reason)}
    end
  end

  @doc """
  Parar processo filho do DynamicSupervisor.
  """
  def stop_child(pid) do
    case DynamicSupervisor.terminate_child(GameOrchestrator.RoomSupervisor, pid) do
      :ok -> {:ok, nil}
      {:error, reason} -> {:error, inspect(reason)}
    end
  end

  # ═══════════════════════════════════════════════════════════════
  # PROCESS
  # ═══════════════════════════════════════════════════════════════

  @doc """
  Retorna PID do processo que está executando esta chamada.
  """
  def self_pid do
    self()
  end

  # ═══════════════════════════════════════════════════════════════
  # ETS CACHE
  # ═══════════════════════════════════════════════════════════════

  @doc """
  Armazenar valor no cache ETS com TTL.
  Formato: {key, value, expires_at_unix_seconds}
  """
  def cache_put(table, key, value, ttl_seconds) do
    table_atom = ensure_table(table)
    expires_at = System.system_time(:second) + ttl_seconds
    :ets.insert(table_atom, {key, value, expires_at})
    nil
  end

  @doc """
  Buscar valor no cache ETS. Retorna {:error, nil} se não encontrado ou expirado.
  Entradas expiradas são deletadas on-read (lazy cleanup).
  """
  def cache_get(table, key) do
    table_atom = ensure_table(table)

    case :ets.lookup(table_atom, key) do
      [{^key, value, expires_at}] ->
        if System.system_time(:second) < expires_at do
          {:ok, value}
        else
          :ets.delete(table_atom, key)
          {:error, nil}
        end

      [] ->
        {:error, nil}
    end
  end

  @doc """
  Deletar entrada do cache ETS.
  """
  def cache_delete(table, key) do
    table_atom = ensure_table(table)
    :ets.delete(table_atom, key)
    nil
  end

  # Garante que a tabela ETS existe, criando se necessário.
  # Tabelas são :set com :public access e :named_table.
  defp ensure_table(table) when is_binary(table) do
    table_atom = String.to_atom(table)

    case :ets.whereis(table_atom) do
      :undefined ->
        :ets.new(table_atom, [:set, :public, :named_table])
        table_atom

      _tid ->
        table_atom
    end
  end

  # ═══════════════════════════════════════════════════════════════
  # HTTP CLIENT
  # ═══════════════════════════════════════════════════════════════

  @doc """
  HTTP GET request via :httpc (built-in do Erlang/OTP).
  Retorna {status_code, response_body} ou {:error, reason}.
  """
  def http_get(url, headers) do
    headers_charlist =
      Enum.map(headers, fn {k, v} ->
        {String.to_charlist(k), String.to_charlist(v)}
      end)

    case :httpc.request(:get, {String.to_charlist(url), headers_charlist}, [], body_format: :binary) do
      {:ok, {{_http_version, status, _reason}, _resp_headers, body}} ->
        {:ok, {status, IO.iodata_to_binary(body)}}

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end

  @doc """
  HTTP POST request via :httpc.
  body é uma string JSON já serializada pelo Gleam.
  """
  def http_post(url, headers, body) do
    headers_charlist =
      Enum.map(headers, fn {k, v} ->
        {String.to_charlist(k), String.to_charlist(v)}
      end)

    content_type =
      headers
      |> Enum.find(fn {k, _v} -> String.downcase(k) == "content-type" end)
      |> case do
        {_k, v} -> String.to_charlist(v)
        nil -> ~c"application/json"
      end

    case :httpc.request(
           :post,
           {String.to_charlist(url), headers_charlist, content_type, body},
           [],
           body_format: :binary
         ) do
      {:ok, {{_http_version, status, _reason}, _resp_headers, resp_body}} ->
        {:ok, {status, IO.iodata_to_binary(resp_body)}}

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end
end
