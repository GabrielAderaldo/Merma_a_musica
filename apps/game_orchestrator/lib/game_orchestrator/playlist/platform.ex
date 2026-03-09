defmodule GameOrchestrator.Playlist.Platform do
  @moduledoc """
  Behaviour que define a interface para qualquer plataforma de streaming.
  Permite trocar entre Spotify, Deezer, Mock, etc.
  """

  @type token :: %{access_token: String.t(), refresh_token: String.t() | nil}
  @type playlist :: %{id: String.t(), name: String.t(), total: integer()}
  @type song :: %{
          id: String.t(),
          name: String.t(),
          artist: String.t(),
          preview_url: String.t() | nil,
          duration_ms: integer()
        }

  @doc "Gera a URL de autorização OAuth."
  @callback authorize_url(state :: String.t()) :: String.t()

  @doc "Troca o authorization code por tokens."
  @callback exchange_code(code :: String.t()) :: {:ok, token()} | {:error, term()}

  @doc "Lista as playlists do usuário autenticado."
  @callback get_playlists(access_token :: String.t()) ::
              {:ok, [playlist()]} | {:error, term()}

  @doc "Retorna as músicas de uma playlist específica."
  @callback get_playlist_tracks(access_token :: String.t(), playlist_id :: String.t()) ::
              {:ok, [song()]} | {:error, term()}
end
