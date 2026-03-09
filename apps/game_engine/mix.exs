defmodule GameEngine.MixProject do
  use Mix.Project

  @gleam_build_path "build/dev/erlang"
  @project_dir __DIR__

  def project do
    [
      app: :game_engine,
      version: "0.1.0",
      elixir: "~> 1.15",
      start_permanent: Mix.env() == :prod,
      deps: [],
      compilers: [:gleam_build] ++ Mix.compilers(),
      prune_code_paths: false
    ]
  end

  def application do
    [
      extra_applications: [:logger]
    ]
  end

  def project_dir, do: @project_dir

  # Retorna os paths dos BEAM files compilados pelo Gleam
  def beam_paths do
    gleam_build = Path.expand(@gleam_build_path, @project_dir)

    if File.dir?(gleam_build) do
      gleam_build
      |> File.ls!()
      |> Enum.map(&Path.join([gleam_build, &1, "ebin"]))
      |> Enum.filter(&File.dir?/1)
    else
      []
    end
  end
end

# Custom compiler que roda `gleam build`
defmodule Mix.Tasks.Compile.GleamBuild do
  use Mix.Task.Compiler

  def run(_args) do
    project_dir = GameEngine.MixProject.project_dir()

    case System.cmd("gleam", ["build"], cd: project_dir, stderr_to_stdout: true) do
      {output, 0} ->
        Mix.shell().info(output)

        # Copia os .beam files do Gleam para o ebin do Mix
        mix_ebin = Mix.Project.compile_path()
        File.mkdir_p!(mix_ebin)

        GameEngine.MixProject.beam_paths()
        |> Enum.each(fn ebin_path ->
          ebin_path
          |> File.ls!()
          |> Enum.filter(&String.ends_with?(&1, ".beam"))
          |> Enum.each(fn beam_file ->
            File.cp!(
              Path.join(ebin_path, beam_file),
              Path.join(mix_ebin, beam_file)
            )
          end)
        end)

        {:ok, []}

      {output, _} ->
        Mix.shell().error(output)
        {:error, []}
    end
  end
end
