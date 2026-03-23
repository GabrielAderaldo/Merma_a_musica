// ═══════════════════════════════════════════════════════════════
// song_selection_test — Domain Service: seleção e distribuição
// ═══════════════════════════════════════════════════════════════
// Testa range, quotas e select_songs ISOLADOS.

import game_engine/domain/services/song_selection
import gleam/list
import gleeunit/should
import test_helpers.{make_player, make_song, player_with_songs}

// ─── calculate_range ───

pub fn range_for_1_player_test() {
  let range = song_selection.calculate_range(1)
  should.equal(range.min, 1)
  should.equal(range.max, 5)
}

pub fn range_for_4_players_test() {
  let range = song_selection.calculate_range(4)
  should.equal(range.min, 4)
  should.equal(range.max, 20)
}

pub fn range_for_20_players_test() {
  let range = song_selection.calculate_range(20)
  should.equal(range.min, 20)
  should.equal(range.max, 100)
}

// ─── distribute_quotas ───

pub fn quotas_even_distribution_test() {
  should.equal(song_selection.distribute_quotas(12, 3), [4, 4, 4])
}

pub fn quotas_round_robin_remainder_test() {
  should.equal(song_selection.distribute_quotas(13, 3), [5, 4, 4])
}

pub fn quotas_two_remainder_test() {
  should.equal(song_selection.distribute_quotas(14, 3), [5, 5, 4])
}

pub fn quotas_single_player_test() {
  should.equal(song_selection.distribute_quotas(5, 1), [5])
}

pub fn quotas_zero_songs_test() {
  should.equal(song_selection.distribute_quotas(0, 3), [0, 0, 0])
}

// ─── select_songs ───

pub fn distributes_from_playlists_test() {
  let p1 =
    player_with_songs("p1", "Gabriel", [
      make_song("s1", "Song A", "Artist A"),
      make_song("s2", "Song B", "Artist B"),
      make_song("s3", "Song C", "Artist C"),
    ])
  let p2 =
    player_with_songs("p2", "Maria", [
      make_song("s4", "Song D", "Artist D"),
      make_song("s5", "Song E", "Artist E"),
      make_song("s6", "Song F", "Artist F"),
    ])
  let result = song_selection.select_songs([p1, p2], 4, True)
  should.equal(result.players_with_playlist, 2)
  should.equal(list.length(result.songs), 4)
}

pub fn tags_contributed_by_correctly_test() {
  let p1 =
    player_with_songs("p1", "Gabriel", [make_song("s1", "Song A", "Artist A")])
  let p2 =
    player_with_songs("p2", "Maria", [make_song("s2", "Song B", "Artist B")])
  let result = song_selection.select_songs([p1, p2], 2, True)
  let assert Ok(first) = list.first(result.songs)
  should.equal(first.contributed_by, "p1")
  let assert Ok(second) = list.last(result.songs)
  should.equal(second.contributed_by, "p2")
}

pub fn round_robin_when_uneven_test() {
  let p1 =
    player_with_songs("p1", "Gabriel", [
      make_song("s1", "Song A", "Artist A"),
      make_song("s2", "Song B", "Artist B"),
      make_song("s3", "Song C", "Artist C"),
    ])
  let p2 =
    player_with_songs("p2", "Maria", [
      make_song("s4", "Song D", "Artist D"),
      make_song("s5", "Song E", "Artist E"),
    ])
  let result = song_selection.select_songs([p1, p2], 5, True)
  should.equal(list.length(result.songs), 5)
}

pub fn removes_duplicates_when_no_repeats_test() {
  let shared = make_song("shared_id", "Same Song", "Same Artist")
  let p1 =
    player_with_songs("p1", "Gabriel", [
      shared,
      make_song("s2", "Song B", "Artist B"),
    ])
  let p2 =
    player_with_songs("p2", "Maria", [
      shared,
      make_song("s3", "Song C", "Artist C"),
    ])
  let result = song_selection.select_songs([p1, p2], 4, False)
  let ids = list.map(result.songs, fn(s) { s.song.id })
  let unique_ids = list.unique(ids)
  should.equal(list.length(ids), list.length(unique_ids))
}

pub fn keeps_duplicates_when_repeats_allowed_test() {
  let shared = make_song("shared_id", "Same Song", "Same Artist")
  let p1 = player_with_songs("p1", "Gabriel", [shared])
  let p2 = player_with_songs("p2", "Maria", [shared])
  let result = song_selection.select_songs([p1, p2], 2, True)
  should.equal(list.length(result.songs), 2)
}

pub fn ignores_players_without_playlist_test() {
  let p1 =
    player_with_songs("p1", "Gabriel", [
      make_song("s1", "Song A", "Artist A"),
      make_song("s2", "Song B", "Artist B"),
    ])
  let p2 = make_player("p2", "Maria")
  let result = song_selection.select_songs([p1, p2], 2, True)
  should.equal(result.players_with_playlist, 1)
  should.equal(list.length(result.songs), 2)
}

pub fn returns_empty_when_no_playlists_test() {
  let result =
    song_selection.select_songs(
      [make_player("p1", "Gabriel"), make_player("p2", "Maria")],
      4,
      True,
    )
  should.equal(result.players_with_playlist, 0)
  should.equal(list.length(result.songs), 0)
}

pub fn handles_player_with_fewer_songs_than_quota_test() {
  let p1 =
    player_with_songs("p1", "Gabriel", [make_song("s1", "Song A", "Artist A")])
  let p2 =
    player_with_songs("p2", "Maria", [
      make_song("s2", "Song B", "Artist B"),
      make_song("s3", "Song C", "Artist C"),
      make_song("s4", "Song D", "Artist D"),
    ])
  let result = song_selection.select_songs([p1, p2], 4, True)
  should.be_true(list.length(result.songs) <= 4)
  should.be_true(list.length(result.songs) >= 3)
}
