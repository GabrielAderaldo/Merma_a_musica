# error_json.ex — Formato de Erro Padrão
#
# O QUE É: Renderiza erros HTTP no formato padrão da API.
#
# LIMITES ARQUITETURAIS:
# - Formato fixo: { "error": { "code": "...", "message": "..." } }
# - Usado por todos os controllers
#
# RESPONSABILIDADES:
# - Renderizar erros 4xx e 5xx no formato JSON padrão

defmodule GameOrchestratorWeb.ErrorJSON do
  def render("404.json", _assigns) do
    %{error: %{code: "not_found", message: "Recurso não encontrado."}}
  end

  def render("500.json", _assigns) do
    %{error: %{code: "internal_error", message: "Erro interno do servidor."}}
  end

  def render(template, _assigns) do
    %{error: %{code: "unknown", message: Phoenix.Controller.status_message_from_template(template)}}
  end
end
