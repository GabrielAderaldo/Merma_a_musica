# response_helper.ex — Helper para executar HttpResponse do Gleam
#
# O QUE É: Interpreta HttpResponse (custom type Gleam) e converte
# em resposta Phoenix (conn com status + JSON body).
#
# LIMITES ARQUITETURAIS:
# - APENAS serialização de resposta — zero lógica de negócio
# - Usado por TODOS os controllers como helper compartilhado
#
# COMO O GLEAM HttpResponse COMPILA PARA ERLANG:
# - HttpOk(status, body)          → {:http_ok, status, body_tuple}
# - HttpError(status, code, msg)  → {:http_error, status, code, msg}
#
# O body é um tipo Gleam específico por handler. O helper converte
# para map JSON chamando um serializer function passado pelo controller.

defmodule GameOrchestratorWeb.ResponseHelper do
  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]

  @doc """
  Executa HttpResponse do Gleam.
  serialize_fn converte o body tipado Gleam → map JSON.
  """
  def execute(conn, gleam_result, serialize_fn \\ &passthrough/1) do
    case gleam_result do
      {:http_ok, status, body} ->
        conn
        |> put_status(status)
        |> json(serialize_fn.(body))

      {:http_error, status, code, message} ->
        conn
        |> put_status(status)
        |> json(%{error: %{code: code, message: message}})
    end
  end

  defp passthrough(body) when is_map(body), do: body
  defp passthrough(body), do: %{data: body}
end
