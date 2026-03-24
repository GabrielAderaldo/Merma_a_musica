# audio_controller.ex — Controller REST de Áudio (Thin Wrapper → Gleam)
#
# NOTA: Diferente dos outros controllers, stream retorna audio/mpeg (não JSON).
# O Gleam resolve o audio_token → preview_url, o Elixir faz proxy do stream.

defmodule GameOrchestratorWeb.AudioController do
  use Phoenix.Controller

  # GET /api/v1/audio/:audio_token
  def stream(conn, %{"audio_token" => audio_token}) do
    case :http@audio_handler.handle_audio_stream(audio_token) do
      {:stream_url, url} ->
        proxy_audio(conn, url)

      {:audio_error, status, code, message} ->
        conn
        |> put_status(status)
        |> put_resp_content_type("application/json")
        |> json(%{error: %{code: code, message: message}})
    end
  end

  # GET /api/v1/audio/preview/:deezer_track_id
  def preview(conn, %{"deezer_track_id" => track_id}) do
    case :http@audio_handler.handle_preview(track_id) do
      {:stream_url, url} ->
        proxy_audio(conn, url)

      {:audio_error, status, code, message} ->
        conn
        |> put_status(status)
        |> put_resp_content_type("application/json")
        |> json(%{error: %{code: code, message: message}})
    end
  end

  # ─── Audio Proxy ───
  # Faz GET na URL do Deezer e repassa o stream para o client.
  # Headers sanitizados — nenhuma info do Deezer chega ao browser.

  defp proxy_audio(conn, url) do
    case :httpc.request(:get, {String.to_charlist(url), []}, [], body_format: :binary) do
      {:ok, {{_http, 200, _reason}, _headers, body}} ->
        conn
        |> put_resp_content_type("audio/mpeg")
        |> send_resp(200, body)

      _ ->
        conn
        |> put_status(502)
        |> put_resp_content_type("application/json")
        |> json(%{error: %{code: "audio_unavailable", message: "Áudio temporariamente indisponível."}})
    end
  end
end
