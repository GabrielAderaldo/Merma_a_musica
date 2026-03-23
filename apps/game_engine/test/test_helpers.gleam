// test_helpers.gleam — Factories e setups compartilhados (adaptado DDD)
// Centraliza a criação de dados de teste para evitar duplicação
// entre os arquivos de teste. Cada factory cria o MÍNIMO necessário
// para o teste funcionar — adicione variantes conforme necessidade.

import game_engine
import game_engine/domain/events.{MatchStarted, RoundStarted}
import game_engine/domain/types/config.{
  type MatchConfiguration, Both, MatchConfiguration, Simple, SpeedBonus,
}
import game_engine/domain/types/media.{
  type Album, type Artist, type Playlist, type SelectedSong, type Song, Album,
  Artist, Playlist, SelectedSong, Song, Spotify,
}
import game_engine/domain/types/player.{type Player, Connected, Player}
import gleam/list

// ─── Factories: Value Objects ───

pub fn make_artist(id: String, name: String) -> Artist {
  Artist(id: id, name: name)
}

pub fn make_album(id: String, title: String) -> Album {
  Album(id: id, title: title, cover_url: "https://cover/" <> id)
}

pub fn make_song(id: String, name: String, artist_name: String) -> Song {
  Song(
    id: id,
    name: name,
    artist: make_artist("a_" <> id, artist_name),
    album: make_album("al_" <> id, "Album of " <> name),
    preview_url: "https://preview/" <> id,
    duration_seconds: 210,
  )
}

pub fn make_selected(
  id: String,
  name: String,
  artist_name: String,
  by: String,
) -> SelectedSong {
  SelectedSong(song: make_song(id, name, artist_name), contributed_by: by)
}

// ─── Factories: Playlists ───

pub fn make_empty_playlist() -> Playlist {
  Playlist(
    id: "",
    name: "",
    platform: Spotify,
    cover_url: "",
    tracks: [],
    total_tracks: 0,
    valid_tracks: 0,
  )
}

pub fn make_playlist_with(songs: List(Song)) -> Playlist {
  let count = list.length(songs)
  Playlist(
    id: "pl_1",
    name: "Test Playlist",
    platform: Spotify,
    cover_url: "https://cover/pl_1",
    tracks: songs,
    total_tracks: count,
    valid_tracks: count,
  )
}

// ─── Factories: Players ───

pub fn make_player(id: String, name: String) -> Player {
  Player(
    id: id,
    name: name,
    playlist: make_empty_playlist(),
    state: Connected,
    score: 0,
  )
}

pub fn player_with_songs(id: String, name: String, songs: List(Song)) -> Player {
  Player(
    id: id,
    name: name,
    playlist: make_playlist_with(songs),
    state: Connected,
    score: 0,
  )
}

pub fn make_players() -> List(Player) {
  [make_player("p1", "Gabriel"), make_player("p2", "Maria")]
}

// ─── Factories: Configs ───

pub fn make_config() -> MatchConfiguration {
  MatchConfiguration(
    time_per_round: 30,
    total_songs: 3,
    answer_type: Both,
    allow_repeats: False,
    scoring_rule: SpeedBonus,
  )
}

pub fn simple_config(total_songs: Int) -> MatchConfiguration {
  MatchConfiguration(
    time_per_round: 30,
    total_songs: total_songs,
    answer_type: Both,
    allow_repeats: False,
    scoring_rule: Simple,
  )
}

pub fn config_with_answer_type(answer_type) -> MatchConfiguration {
  MatchConfiguration(..make_config(), total_songs: 1, answer_type: answer_type)
}

// ─── Factories: Songs ───

pub fn make_songs() -> List(Song) {
  [
    make_song("1", "Bohemian Rhapsody", "Queen"),
    make_song("2", "Evidências", "Chitãozinho e Xororó"),
    make_song("3", "Garota de Ipanema", "Tom Jobim"),
  ]
}

pub fn make_selected_songs() -> List(SelectedSong) {
  [
    make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    make_selected("2", "Evidências", "Chitãozinho e Xororó", "p2"),
    make_selected("3", "Garota de Ipanema", "Tom Jobim", "p1"),
  ]
}

// ─── Setup Composites ───

/// Avança um match até InProgress com a primeira round iniciada.
/// Retorna (match_in_round, current_round).
pub fn setup_in_round(
  config: MatchConfiguration,
  players: List(Player),
  selected: List(SelectedSong),
) {
  let assert Ok(m) = game_engine.new_match("test", config, players, selected)
  let m2 =
    list.fold(players, m, fn(acc, p) {
      let assert Ok(updated) = game_engine.set_player_ready(acc, p.id)
      updated
    })
  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m2)
  let assert Ok(RoundStarted(match: in_round, round: round)) =
    game_engine.start_round(started)
  #(in_round, round)
}

/// Setup mínimo: 2 players, 1 song, Simple scoring, já em round.
pub fn setup_simple_1_round() {
  let config = simple_config(1)
  let selected = [make_selected("1", "Bohemian Rhapsody", "Queen", "p1")]
  setup_in_round(config, make_players(), selected)
}

/// Setup mínimo: 2 players, 2 songs, Simple scoring, já em round.
pub fn setup_simple_2_rounds() {
  let config = simple_config(2)
  let selected = [
    make_selected("1", "Bohemian Rhapsody", "Queen", "p1"),
    make_selected("2", "Evidências", "Chitãozinho e Xororó", "p2"),
  ]
  setup_in_round(config, make_players(), selected)
}
