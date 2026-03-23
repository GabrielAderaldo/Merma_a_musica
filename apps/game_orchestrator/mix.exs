# mix.exs — Configuração do Mix para o Game Orchestrator
#
# O QUE É: Projeto Elixir que serve como lib de infraestrutura.
# Compila Gleam automaticamente via custom compiler.
#
# LIMITES ARQUITETURAIS:
# - Elixir é APENAS infraestrutura (Phoenix, PubSub, Supervisor)
# - Toda lógica de negócio está em Gleam (src/)
# - Custom compiler GleamBuild integra .beam files do Gleam
# - SEM Ecto/Repo — sem banco de dados no MVP

defmodule GameOrchestrator.MixProject do
  use Mix.Project

  def project do
    [
      app: :game_orchestrator,
      version: "0.1.0",
      elixir: "~> 1.17",
      elixirc_paths: elixirc_paths(Mix.env()),
      compilers: Mix.compilers(),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
    ]
  end

  def application do
    [
      mod: {GameOrchestrator.Application, []},
      extra_applications: [:logger, :runtime_tools, :inets, :ssl],
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      {:phoenix, "~> 1.7"},
      {:phoenix_pubsub, "~> 2.1"},
      {:jason, "~> 1.4"},
      {:bandit, "~> 1.0"},
      {:cors_plug, "~> 3.0"},
    ]
  end

  defp aliases do
    [
      setup: ["deps.get", "gleam.build"],
      "gleam.build": &gleam_build/1,
      compile: ["gleam.build", "compile"],
      test: ["gleam.build", "test"],
      precommit: ["format", "gleam.build", "compile --warnings-as-errors", "test"],
    ]
  end

  # Compila Gleam (Engine + Orchestrator) e copia .beam files para o ebin do Mix
  defp gleam_build(_args) do
    project_root = File.cwd!()
    monorepo_root = Path.join([project_root, "..", ".."]) |> Path.expand()
    engine_dir = Path.join(monorepo_root, "apps/game_engine")
    target_ebin = Mix.Project.compile_path()
    File.mkdir_p!(target_ebin)

    # 1. Build game_engine
    if File.dir?(engine_dir) do
      {_, 0} = System.cmd("gleam", ["build", "--target", "erlang"],
        cd: engine_dir, stderr_to_stdout: true)

      copy_beam_files(
        Path.join([engine_dir, "build", "dev", "erlang", "game_engine", "ebin"]),
        target_ebin
      )
    end

    # 2. Build game_orchestrator (Gleam side)
    {_, 0} = System.cmd("gleam", ["build", "--target", "erlang"],
      cd: project_root, stderr_to_stdout: true)

    # Copiar .beam do orchestrator + deps Gleam (apenas packages Gleam, não stdlib Erlang/Elixir)
    gleam_packages = ["game_orchestrator", "gleam_stdlib", "gleam_json", "gleam_erlang"]
    gleam_build_dir = Path.join([project_root, "build", "dev", "erlang"])
    if File.dir?(gleam_build_dir) do
      Enum.each(gleam_packages, fn dep ->
        copy_beam_files(Path.join([gleam_build_dir, dep, "ebin"]), target_ebin)
      end)
    end
  end

  defp copy_beam_files(source_dir, target_dir) do
    if File.dir?(source_dir) do
      source_dir
      |> File.ls!()
      |> Enum.filter(&String.ends_with?(&1, ".beam"))
      |> Enum.reject(&String.contains?(&1, "_test"))
      |> Enum.each(fn file ->
        File.cp!(Path.join(source_dir, file), Path.join(target_dir, file))
      end)
    end
  end
end
