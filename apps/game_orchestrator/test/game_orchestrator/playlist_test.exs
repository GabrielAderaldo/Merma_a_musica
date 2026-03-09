defmodule GameOrchestrator.PlaylistTest do
  use ExUnit.Case, async: false

  alias GameOrchestrator.Playlist
  alias GameOrchestrator.Playlist.{Cache, SongFilter}

  setup do
    start_supervised!(Cache)
    :ok
  end

  # --- SongFilter ---

  describe "SongFilter" do
    test "filtra músicas sem preview_url" do
      songs = [
        %{id: "1", name: "A", artist: "X", preview_url: "http://x.mp3", duration_ms: 100},
        %{id: "2", name: "B", artist: "Y", preview_url: nil, duration_ms: 200},
        %{id: "3", name: "C", artist: "Z", preview_url: "", duration_ms: 300},
        %{id: "4", name: "D", artist: "W", preview_url: "http://w.mp3", duration_ms: 400}
      ]

      valid = SongFilter.filter_valid(songs)
      assert length(valid) == 2
      assert Enum.map(valid, & &1.id) == ["1", "4"]
    end

    test "normalize retorna apenas campos do jogo" do
      songs = [
        %{id: "1", name: "A", artist: "X", preview_url: "http://x.mp3", duration_ms: 100}
      ]

      [normalized] = SongFilter.normalize(songs)
      assert normalized == %{id: "1", name: "A", artist: "X", preview_url: "http://x.mp3"}
      refute Map.has_key?(normalized, :duration_ms)
    end
  end

  # --- Cache ---

  describe "Cache" do
    test "put e get funcionam" do
      Cache.put(:test_key, "hello")
      assert {:ok, "hello"} = Cache.get(:test_key)
    end

    test "entrada expirada retorna :miss" do
      Cache.put(:expired_key, "data", 1)
      Process.sleep(5)
      assert :miss = Cache.get(:expired_key)
    end

    test "delete remove entrada" do
      Cache.put(:del_key, "data")
      Cache.delete(:del_key)
      assert :miss = Cache.get(:del_key)
    end

    test "clear limpa tudo" do
      Cache.put(:k1, "v1")
      Cache.put(:k2, "v2")
      Cache.clear()
      assert :miss = Cache.get(:k1)
      assert :miss = Cache.get(:k2)
    end
  end

  # --- Playlist Facade (usando Mock via config override) ---

  describe "Playlist facade com Mock" do
    test "supported_platforms retorna lista" do
      platforms = Playlist.supported_platforms()
      assert "spotify" in platforms
      assert "deezer" in platforms
      assert "youtube_music" in platforms
    end

    test "resolve_platform sem override retorna erro para plataforma desconhecida" do
      # Temporariamente remove o override para testar a resolução real
      original = Application.get_env(:game_orchestrator, :playlist_platform)
      Application.delete_env(:game_orchestrator, :playlist_platform)

      assert {:error, :unsupported_platform} = Playlist.resolve_platform("napster")
      assert {:ok, GameOrchestrator.Playlist.Spotify} = Playlist.resolve_platform("spotify")
      assert {:ok, GameOrchestrator.Playlist.Deezer} = Playlist.resolve_platform("deezer")
      assert {:ok, GameOrchestrator.Playlist.YouTubeMusic} = Playlist.resolve_platform("youtube_music")

      Application.put_env(:game_orchestrator, :playlist_platform, original)
    end

    test "authorize_url retorna URL" do
      # Mock está configurado via :playlist_platform no config de test
      {:ok, url} = Playlist.authorize_url("spotify", "test_state")
      assert is_binary(url)
      assert String.contains?(url, "mock")
    end

    test "exchange_code retorna tokens" do
      assert {:ok, %{access_token: "mock_access_token"}} = Playlist.exchange_code("spotify", "any_code")
    end

    test "get_playlists retorna lista de playlists" do
      {:ok, playlists} = Playlist.get_playlists("spotify", "mock_token")
      assert length(playlists) == 3
      assert hd(playlists).name == "Rock Clássico"
    end

    test "get_playlists usa cache na segunda chamada" do
      {:ok, _} = Playlist.get_playlists("spotify", "cached_token")
      # Segunda chamada vem do cache (key inclui platform)
      assert {:ok, _} = Cache.get({:playlists, "spotify", "cached_token"})
    end

    test "get_playlist_songs filtra músicas sem preview_url" do
      {:ok, songs} = Playlist.get_playlist_songs("spotify", "mock_token", "playlist_1")
      # playlist_1 tem 5 músicas, mas Hotel California tem preview_url: nil
      assert length(songs) == 4
      refute Enum.any?(songs, &(&1.name == "Hotel California"))
    end

    test "get_playlist_songs normaliza formato" do
      {:ok, songs} = Playlist.get_playlist_songs("spotify", "mock_token", "playlist_2")
      # playlist_2 tem 4 músicas, Emoções tem preview_url: nil
      assert length(songs) == 3
      [first | _] = songs
      assert Map.keys(first) |> Enum.sort() == [:artist, :id, :name, :preview_url]
    end

    test "get_playlist_songs usa cache" do
      {:ok, _} = Playlist.get_playlist_songs("spotify", "mock_token", "playlist_cache_test")
      assert {:ok, _} = Cache.get({:songs, "spotify", "playlist_cache_test"})
    end

    test "plataforma não suportada retorna erro (sem override)" do
      original = Application.get_env(:game_orchestrator, :playlist_platform)
      Application.delete_env(:game_orchestrator, :playlist_platform)

      assert {:error, :unsupported_platform} = Playlist.authorize_url("napster")
      assert {:error, :unsupported_platform} = Playlist.exchange_code("napster", "code")
      assert {:error, :unsupported_platform} = Playlist.get_playlists("napster", "token")
      assert {:error, :unsupported_platform} = Playlist.get_playlist_songs("napster", "token", "id")

      Application.put_env(:game_orchestrator, :playlist_platform, original)
    end
  end
end
