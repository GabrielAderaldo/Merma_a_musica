# channel_case.ex — Helper para testes de Channel
#
# O QUE É: Setup compartilhado para testes de WebSocket/Channel.

defmodule GameOrchestratorWeb.ChannelCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      import Phoenix.ChannelTest
      @endpoint GameOrchestratorWeb.Endpoint
    end
  end
end
