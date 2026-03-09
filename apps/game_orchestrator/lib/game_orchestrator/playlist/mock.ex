defmodule GameOrchestrator.Playlist.Mock do
  @moduledoc """
  Implementação mock do behaviour Platform para testes e desenvolvimento.
  Retorna dados fake sem dependência de APIs externas.
  """

  @behaviour GameOrchestrator.Playlist.Platform

  @impl true
  def authorize_url(_state) do
    "http://localhost:4000/mock/spotify/callback?code=mock_code"
  end

  @impl true
  def exchange_code(_code) do
    {:ok, %{access_token: "mock_access_token", refresh_token: "mock_refresh_token"}}
  end

  @impl true
  def get_playlists(_access_token) do
    {:ok,
     [
       %{id: "playlist_1", name: "Rock Clássico", total: 5},
       %{id: "playlist_2", name: "Pop Brasileiro", total: 4},
       %{id: "playlist_3", name: "Jazz Instrumental", total: 3}
     ]}
  end

  @impl true
  def get_playlist_tracks(_access_token, playlist_id) do
    songs =
      case playlist_id do
        "playlist_1" ->
          [
            %{id: "s1", name: "Bohemian Rhapsody", artist: "Queen", preview_url: "http://example.com/bohemian.mp3", duration_ms: 354_000},
            %{id: "s2", name: "Stairway to Heaven", artist: "Led Zeppelin", preview_url: "http://example.com/stairway.mp3", duration_ms: 482_000},
            %{id: "s3", name: "Hotel California", artist: "Eagles", preview_url: nil, duration_ms: 391_000},
            %{id: "s4", name: "Comfortably Numb", artist: "Pink Floyd", preview_url: "http://example.com/numb.mp3", duration_ms: 382_000},
            %{id: "s5", name: "Back in Black", artist: "AC/DC", preview_url: "http://example.com/back.mp3", duration_ms: 255_000}
          ]

        "playlist_2" ->
          [
            %{id: "s6", name: "Garota de Ipanema", artist: "Tom Jobim", preview_url: "http://example.com/garota.mp3", duration_ms: 312_000},
            %{id: "s7", name: "Águas de Março", artist: "Elis Regina", preview_url: "http://example.com/aguas.mp3", duration_ms: 198_000},
            %{id: "s8", name: "Emoções", artist: "Roberto Carlos", preview_url: nil, duration_ms: 240_000},
            %{id: "s9", name: "Aquarela", artist: "Toquinho", preview_url: "http://example.com/aquarela.mp3", duration_ms: 267_000}
          ]

        _ ->
          [
            %{id: "s10", name: "Take Five", artist: "Dave Brubeck", preview_url: "http://example.com/five.mp3", duration_ms: 324_000},
            %{id: "s11", name: "So What", artist: "Miles Davis", preview_url: "http://example.com/sowhat.mp3", duration_ms: 562_000},
            %{id: "s12", name: "Round Midnight", artist: "Thelonious Monk", preview_url: nil, duration_ms: 415_000}
          ]
      end

    {:ok, songs}
  end
end
