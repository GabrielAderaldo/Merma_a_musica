# auth_controller.ex — Controller REST de Auth (Thin Wrapper → Gleam)

defmodule GameOrchestratorWeb.AuthController do
  use Phoenix.Controller, formats: [:json]
  alias GameOrchestratorWeb.ResponseHelper

  # GET /api/v1/auth/:platform/login?redirect_uri=...
  def login(conn, %{"platform" => platform} = params) do
    redirect_uri = Map.get(params, "redirect_uri", "")

    case :http@auth_handler.handle_login(platform, redirect_uri) do
      {:redirect, url} ->
        conn
        |> put_status(302)
        |> redirect(external: url)

      {:http_error, status, code, message} ->
        conn
        |> put_status(status)
        |> json(%{error: %{code: code, message: message}})
    end
  end

  # GET /auth/:platform/callback?code=...&state=...
  # Retorna redirect ao frontend com tokens na URL (não JSON)
  def callback(conn, %{"platform" => platform} = params) do
    case :http@auth_handler.handle_callback(platform, params) do
      {:redirect, url} ->
        conn
        |> put_status(302)
        |> redirect(external: url)

      {:login_error, status, code, message} ->
        conn
        |> put_status(status)
        |> json(%{error: %{code: code, message: message}})
    end
  end

  # POST /api/v1/auth/:platform/refresh
  def refresh(conn, %{"platform" => platform} = params) do
    result = :http@auth_handler.handle_refresh(platform, params)
    ResponseHelper.execute(conn, result, &serialize_tokens/1)
  end

  # ─── Serializer ───

  defp serialize_tokens({:oauth_tokens_body, access_token, refresh_token, expires_in,
                          platform, platform_user_id, platform_username}) do
    %{
      access_token: access_token,
      refresh_token: refresh_token,
      expires_in: expires_in,
      platform: platform,
      platform_user_id: platform_user_id,
      platform_username: platform_username
    }
  end
end
