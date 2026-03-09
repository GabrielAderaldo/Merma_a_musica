defmodule GameOrchestrator.Playlist.SongFilter do
  @moduledoc """
  Filtra e normaliza músicas importadas das plataformas de streaming.
  Remove músicas sem preview_url e converte para o formato do jogo.
  """

  @doc "Filtra apenas músicas válidas (com preview_url)."
  def filter_valid(songs) do
    Enum.filter(songs, &valid?/1)
  end

  @doc "Normaliza uma lista de músicas para o formato usado pelo jogo."
  def normalize(songs) do
    songs
    |> filter_valid()
    |> Enum.map(&normalize_song/1)
  end

  @doc "Verifica se uma música é válida para o jogo."
  def valid?(%{preview_url: url}) when is_binary(url) and url != "", do: true
  def valid?(_), do: false

  defp normalize_song(song) do
    %{
      id: song.id,
      name: song.name,
      artist: song.artist,
      preview_url: song.preview_url
    }
  end
end
