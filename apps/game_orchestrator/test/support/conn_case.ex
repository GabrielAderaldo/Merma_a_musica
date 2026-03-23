# conn_case.ex — Helper para testes de Controller
#
# O QUE É: Setup compartilhado para testes de HTTP/REST.

defmodule GameOrchestratorWeb.ConnCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      import Plug.Conn
      import Phoenix.ConnTest
      @endpoint GameOrchestratorWeb.Endpoint
    end
  end

  setup _tags do
    {:ok, conn: Phoenix.ConnTest.build_conn()}
  end
end
