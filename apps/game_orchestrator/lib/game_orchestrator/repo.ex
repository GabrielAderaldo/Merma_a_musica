defmodule GameOrchestrator.Repo do
  use Ecto.Repo,
    otp_app: :game_orchestrator,
    adapter: Ecto.Adapters.Postgres
end
