// domain/types/media.gleam — Value Objects de Mídia
//
// Dados já resolvidos pelo Orchestrator. O Engine não conhece APIs externas.

pub type Platform {
  Spotify
  PlatformDeezer
  YoutubeMusic
}

pub type Artist {
  Artist(id: String, name: String)
}

pub type Album {
  Album(id: String, title: String, cover_url: String)
}

pub type Song {
  Song(
    id: String,
    name: String,
    artist: Artist,
    album: Album,
    preview_url: String,
    duration_seconds: Int,
  )
}

pub type Playlist {
  Playlist(
    id: String,
    name: String,
    platform: Platform,
    cover_url: String,
    tracks: List(Song),
    total_tracks: Int,
    valid_tracks: Int,
  )
}

pub type SelectedSong {
  SelectedSong(song: Song, contributed_by: String)
}
