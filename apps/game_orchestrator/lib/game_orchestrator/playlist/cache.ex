defmodule GameOrchestrator.Playlist.Cache do
  @moduledoc """
  Cache ETS para playlists importadas com TTL.
  Evita chamadas repetidas à API do Spotify/Deezer.
  """

  use GenServer

  @table :playlist_cache
  @default_ttl :timer.minutes(15)
  @cleanup_interval :timer.minutes(5)

  # --- API Pública ---

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc "Busca uma playlist no cache. Retorna {:ok, data} ou :miss."
  def get(key) do
    case :ets.lookup(@table, key) do
      [{^key, data, expires_at}] ->
        if System.monotonic_time(:millisecond) < expires_at do
          {:ok, data}
        else
          :ets.delete(@table, key)
          :miss
        end

      [] ->
        :miss
    end
  catch
    :error, :badarg -> :miss
  end

  @doc "Armazena uma playlist no cache com TTL."
  def put(key, data, ttl \\ @default_ttl) do
    expires_at = System.monotonic_time(:millisecond) + ttl
    :ets.insert(@table, {key, data, expires_at})
    :ok
  catch
    :error, :badarg -> :ok
  end

  @doc "Remove uma entrada do cache."
  def delete(key) do
    :ets.delete(@table, key)
    :ok
  catch
    :error, :badarg -> :ok
  end

  @doc "Limpa todo o cache."
  def clear do
    :ets.delete_all_objects(@table)
    :ok
  catch
    :error, :badarg -> :ok
  end

  # --- Callbacks ---

  @impl true
  def init(_opts) do
    table = :ets.new(@table, [:named_table, :set, :public, read_concurrency: true])
    schedule_cleanup()
    {:ok, %{table: table}}
  end

  @impl true
  def handle_info(:cleanup, state) do
    now = System.monotonic_time(:millisecond)

    :ets.foldl(
      fn {key, _data, expires_at}, _acc ->
        if now >= expires_at, do: :ets.delete(@table, key)
        nil
      end,
      nil,
      @table
    )

    schedule_cleanup()
    {:noreply, state}
  end

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval)
  end
end
