import game_engine
import game_engine/types.{
  type MatchConfiguration, type Player, type Song,
  AnswerProcessed, Both, Connected, Finished, InProgress, InvalidState,
  MatchCompleted, MatchConfiguration, MatchStarted, NoMoreRounds,
  NotAllPlayersReady, NotEnoughPlayers, NotEnoughSongs, Player,
  PlayerAlreadyAnswered, PlayerNotFound, RoundAlreadyEnded, RoundCompleted,
  RoundStarted, Simple, Song, SongName, SongsDivisibilityError, SpeedBonus,
  WaitingForPlayers,
}
import game_engine/scoring
import game_engine/answer
import game_engine/round
import game_engine/song_selection
import gleam/dict
import gleam/list
import gleeunit

pub fn main() -> Nil {
  gleeunit.main()
}

// --- Helpers ---

fn test_song(name: String, artist: String) -> Song {
  Song(
    id: name <> "-" <> artist,
    name: name,
    artist: artist,
    preview_url: "http://example.com",
  )
}

fn test_config() -> MatchConfiguration {
  MatchConfiguration(
    time_per_round: 15,
    total_songs: 2,
    answer_type: SongName,
    allow_repeats: False,
    scoring_rule: Simple,
  )
}

fn test_player(id: String, name: String) -> Player {
  Player(id: id, name: name, playlist: [], state: Connected, score: 0)
}

fn test_songs() -> List(Song) {
  [
    test_song("Bohemian Rhapsody", "Queen"),
    test_song("Imagine", "John Lennon"),
  ]
}

// --- Testes: answer validation ---

pub fn validate_correct_song_name_test() {
  let song = test_song("Bohemian Rhapsody", "Queen")
  assert answer.validate("bohemian rhapsody", song, SongName) == True
}

pub fn validate_incorrect_song_name_test() {
  let song = test_song("Bohemian Rhapsody", "Queen")
  assert answer.validate("imagine", song, SongName) == False
}

pub fn validate_artist_name_test() {
  let song = test_song("Bohemian Rhapsody", "Queen")
  assert answer.validate("queen", song, types.ArtistName) == True
}

pub fn validate_both_accepts_song_test() {
  let song = test_song("Bohemian Rhapsody", "Queen")
  assert answer.validate("bohemian rhapsody", song, Both) == True
}

pub fn validate_both_accepts_artist_test() {
  let song = test_song("Bohemian Rhapsody", "Queen")
  assert answer.validate("queen", song, Both) == True
}

pub fn validate_case_insensitive_test() {
  let song = test_song("Bohemian Rhapsody", "Queen")
  assert answer.validate("BOHEMIAN RHAPSODY", song, SongName) == True
}

pub fn validate_trims_whitespace_test() {
  let song = test_song("Bohemian Rhapsody", "Queen")
  assert answer.validate("  bohemian rhapsody  ", song, SongName) == True
}

// --- Testes: scoring ---

pub fn simple_scoring_correct_test() {
  let config = test_config()
  assert scoring.calculate_points(config, 5.0, True) == 100
}

pub fn simple_scoring_incorrect_test() {
  let config = test_config()
  assert scoring.calculate_points(config, 5.0, False) == 0
}

pub fn speed_bonus_fast_answer_test() {
  let config = MatchConfiguration(..test_config(), scoring_rule: SpeedBonus)
  let points = scoring.calculate_points(config, 1.0, True)
  // Base 100 + bonus proporcional ao tempo restante
  assert points > 100
}

pub fn speed_bonus_slow_answer_test() {
  let config = MatchConfiguration(..test_config(), scoring_rule: SpeedBonus)
  let points = scoring.calculate_points(config, 14.0, True)
  // Quase no limite, bonus mínimo
  assert points >= 100
  assert points < 120
}

// --- Testes: round ---

pub fn round_submit_answer_test() {
  let song = test_song("Imagine", "John Lennon")
  let r = round.new(0, song)
  let config = test_config()

  let assert Ok(#(updated, player_answer)) =
    round.submit_answer(r, "p1", "imagine", 3.0, config)

  assert player_answer.is_correct == True
  assert player_answer.points == 100
  assert dict.size(updated.answers) == 1
}

pub fn round_reject_double_answer_test() {
  let song = test_song("Imagine", "John Lennon")
  let r = round.new(0, song)
  let config = test_config()

  let assert Ok(#(updated, _)) =
    round.submit_answer(r, "p1", "imagine", 3.0, config)

  let assert Error(PlayerAlreadyAnswered("p1")) =
    round.submit_answer(updated, "p1", "imagine", 5.0, config)
}

pub fn round_reject_after_ended_test() {
  let song = test_song("Imagine", "John Lennon")
  let r = round.new(0, song) |> round.end
  let config = test_config()

  let assert Error(RoundAlreadyEnded) =
    round.submit_answer(r, "p1", "imagine", 3.0, config)
}

pub fn round_all_answered_test() {
  let song = test_song("Imagine", "John Lennon")
  let r = round.new(0, song)
  let config = test_config()

  assert round.all_answered(r, 2) == False

  let assert Ok(#(r, _)) = round.submit_answer(r, "p1", "imagine", 3.0, config)
  assert round.all_answered(r, 2) == False

  let assert Ok(#(r, _)) = round.submit_answer(r, "p2", "wrong", 5.0, config)
  assert round.all_answered(r, 2) == True
}

// --- Testes: match lifecycle ---

pub fn create_match_test() {
  let players = [test_player("p1", "Alice"), test_player("p2", "Bob")]
  let assert Ok(m) = game_engine.new_match("m1", test_config(), players, test_songs())

  assert m.state == WaitingForPlayers
  assert m.current_round_index == 0
}

pub fn create_match_not_enough_players_test() {
  let players = [test_player("p1", "Alice")]
  let assert Error(NotEnoughPlayers) =
    game_engine.new_match("m1", test_config(), players, test_songs())
}

pub fn set_player_ready_test() {
  let players = [test_player("p1", "Alice"), test_player("p2", "Bob")]
  let assert Ok(m) = game_engine.new_match("m1", test_config(), players, test_songs())

  let assert Ok(m) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m) = game_engine.set_player_ready(m, "p2")

  let assert Ok(MatchStarted(match: started)) = game_engine.start_match(m)
  assert started.state == InProgress
}

pub fn start_match_not_ready_test() {
  let players = [test_player("p1", "Alice"), test_player("p2", "Bob")]
  let assert Ok(m) = game_engine.new_match("m1", test_config(), players, test_songs())

  let assert Error(NotAllPlayersReady) = game_engine.start_match(m)
}

pub fn full_match_lifecycle_test() {
  let players = [test_player("p1", "Alice"), test_player("p2", "Bob")]
  let assert Ok(m) = game_engine.new_match("m1", test_config(), players, test_songs())

  // Ready
  let assert Ok(m) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m) = game_engine.set_player_ready(m, "p2")

  // Start match
  let assert Ok(MatchStarted(match: m)) = game_engine.start_match(m)
  assert m.state == InProgress

  // Round 1
  let assert Ok(RoundStarted(match: m, round: r1)) = game_engine.start_round(m)
  assert r1.index == 0
  assert r1.song.name == "Bohemian Rhapsody"

  // Submeter respostas
  let assert Ok(AnswerProcessed(match: m, player_id: "p1", is_correct: True, points_earned: 100)) =
    game_engine.submit_answer(m, "p1", "bohemian rhapsody", 3.0)

  let assert Ok(AnswerProcessed(match: m, player_id: "p2", is_correct: False, points_earned: 0)) =
    game_engine.submit_answer(m, "p2", "wrong answer", 5.0)

  assert game_engine.all_answered(m) == True

  // End round 1
  let assert Ok(RoundCompleted(match: m, ..)) = game_engine.end_round(m)

  // Round 2
  let assert Ok(RoundStarted(match: m, round: r2)) = game_engine.start_round(m)
  assert r2.index == 1
  assert r2.song.name == "Imagine"

  let assert Ok(AnswerProcessed(match: m, ..)) =
    game_engine.submit_answer(m, "p1", "imagine", 2.0)

  let assert Ok(AnswerProcessed(match: m, ..)) =
    game_engine.submit_answer(m, "p2", "imagine", 4.0)

  // End round 2
  let assert Ok(RoundCompleted(match: m, ..)) = game_engine.end_round(m)

  // Sem mais rodadas
  let assert Error(NoMoreRounds) = game_engine.start_round(m)

  // End match
  let assert Ok(MatchCompleted(match: finished, final_scores: scores, winner_id: winner)) =
    game_engine.end_match(m)

  assert finished.state == Finished
  assert winner == "p1"

  let assert Ok(p1_score) = dict.get(scores, "p1")
  let assert Ok(p2_score) = dict.get(scores, "p2")
  assert p1_score == 200
  assert p2_score == 100
}

// --- Testes: fuzzy answer validation ---

pub fn validate_accented_answer_test() {
  let song = test_song("Emoções", "Roberto Carlos")
  assert answer.validate("emocoes", song, SongName) == True
}

pub fn validate_accented_artist_test() {
  let song = test_song("Garota de Ipanema", "João Gilberto")
  assert answer.validate("joao gilberto", song, types.ArtistName) == True
}

pub fn validate_punctuation_ignored_test() {
  let song = test_song("Don't Stop Me Now", "Queen")
  assert answer.validate("dont stop me now", song, SongName) == True
}

pub fn validate_extra_spaces_test() {
  let song = test_song("Hey   Jude", "The Beatles")
  // A música tem espaços extras, normalização colapsa
  assert answer.validate("hey jude", song, SongName) == True
}

pub fn validate_hyphen_as_space_test() {
  let song = test_song("Rock-and-Roll", "Led Zeppelin")
  assert answer.validate("rock and roll", song, SongName) == True
}

// --- Testes: song selection ---

pub fn select_songs_interleaves_playlists_test() {
  let p1 =
    Player(
      ..test_player("p1", "Alice"),
      playlist: [
        test_song("A1", "X"),
        test_song("A2", "X"),
      ],
    )
  let p2 =
    Player(
      ..test_player("p2", "Bob"),
      playlist: [
        test_song("B1", "Y"),
        test_song("B2", "Y"),
      ],
    )

  let songs = song_selection.select_songs([p1, p2], 4, True)
  assert list.length(songs) == 4

  // Deve intercalar: A1, B1, A2, B2
  let assert [s1, s2, s3, s4] = songs
  assert s1.name == "A1"
  assert s2.name == "B1"
  assert s3.name == "A2"
  assert s4.name == "B2"
}

pub fn select_songs_limits_total_test() {
  let p1 =
    Player(
      ..test_player("p1", "Alice"),
      playlist: [
        test_song("A1", "X"),
        test_song("A2", "X"),
        test_song("A3", "X"),
      ],
    )
  let p2 =
    Player(
      ..test_player("p2", "Bob"),
      playlist: [
        test_song("B1", "Y"),
        test_song("B2", "Y"),
        test_song("B3", "Y"),
      ],
    )

  let songs = song_selection.select_songs([p1, p2], 2, True)
  assert list.length(songs) == 2
}

pub fn select_songs_deduplicates_test() {
  let shared_song = Song(id: "same", name: "Same Song", artist: "X", preview_url: "http://x")
  let p1 = Player(..test_player("p1", "Alice"), playlist: [shared_song])
  let p2 = Player(..test_player("p2", "Bob"), playlist: [shared_song])

  let songs = song_selection.select_songs([p1, p2], 2, False)
  // Só deve ter 1 música (duplicata removida)
  assert list.length(songs) == 1
}

pub fn select_songs_allows_repeats_test() {
  let shared_song = Song(id: "same", name: "Same Song", artist: "X", preview_url: "http://x")
  let p1 = Player(..test_player("p1", "Alice"), playlist: [shared_song])
  let p2 = Player(..test_player("p2", "Bob"), playlist: [shared_song])

  let songs = song_selection.select_songs([p1, p2], 2, True)
  assert list.length(songs) == 2
}

// --- Testes: match validation edge cases ---

pub fn create_match_not_enough_songs_test() {
  let players = [test_player("p1", "Alice"), test_player("p2", "Bob")]
  let config = MatchConfiguration(..test_config(), total_songs: 10)
  let assert Error(NotEnoughSongs) =
    game_engine.new_match("m1", config, players, test_songs())
}

pub fn create_match_songs_not_divisible_test() {
  let players = [test_player("p1", "A"), test_player("p2", "B")]
  let songs = [
    test_song("S1", "X"),
    test_song("S2", "X"),
    test_song("S3", "X"),
  ]
  let config = MatchConfiguration(..test_config(), total_songs: 3)
  let assert Error(SongsDivisibilityError(3, 2)) =
    game_engine.new_match("m1", config, players, songs)
}

pub fn set_ready_unknown_player_test() {
  let players = [test_player("p1", "Alice"), test_player("p2", "Bob")]
  let assert Ok(m) = game_engine.new_match("m1", test_config(), players, test_songs())
  let assert Error(PlayerNotFound("p99")) = game_engine.set_player_ready(m, "p99")
}

pub fn submit_answer_unknown_player_test() {
  let players = [test_player("p1", "Alice"), test_player("p2", "Bob")]
  let assert Ok(m) = game_engine.new_match("m1", test_config(), players, test_songs())
  let assert Ok(m) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m) = game_engine.set_player_ready(m, "p2")
  let assert Ok(MatchStarted(match: m)) = game_engine.start_match(m)
  let assert Ok(RoundStarted(match: m, ..)) = game_engine.start_round(m)

  let assert Error(PlayerNotFound("ghost")) =
    game_engine.submit_answer(m, "ghost", "test", 1.0)
}

pub fn start_match_wrong_state_test() {
  let players = [test_player("p1", "Alice"), test_player("p2", "Bob")]
  let assert Ok(m) = game_engine.new_match("m1", test_config(), players, test_songs())
  let assert Ok(m) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m) = game_engine.set_player_ready(m, "p2")
  let assert Ok(MatchStarted(match: m)) = game_engine.start_match(m)

  // Tentar iniciar de novo estando InProgress
  let assert Error(InvalidState(_)) = game_engine.start_match(m)
}

pub fn end_match_wrong_state_test() {
  let players = [test_player("p1", "Alice"), test_player("p2", "Bob")]
  let assert Ok(m) = game_engine.new_match("m1", test_config(), players, test_songs())

  // Tentar encerrar estando WaitingForPlayers
  let assert Error(InvalidState(_)) = game_engine.end_match(m)
}

pub fn is_last_round_test() {
  let players = [test_player("p1", "Alice"), test_player("p2", "Bob")]
  let assert Ok(m) = game_engine.new_match("m1", test_config(), players, test_songs())
  let assert Ok(m) = game_engine.set_player_ready(m, "p1")
  let assert Ok(m) = game_engine.set_player_ready(m, "p2")
  let assert Ok(MatchStarted(match: m)) = game_engine.start_match(m)

  // Rodada 0 de 2 — não é a última
  let assert Ok(RoundStarted(match: m, ..)) = game_engine.start_round(m)
  assert game_engine.is_last_round(m) == False

  // Avança para rodada 1 (última)
  let assert Ok(AnswerProcessed(match: m, ..)) =
    game_engine.submit_answer(m, "p1", "bohemian rhapsody", 1.0)
  let assert Ok(AnswerProcessed(match: m, ..)) =
    game_engine.submit_answer(m, "p2", "wrong", 2.0)
  let assert Ok(RoundCompleted(match: m, ..)) = game_engine.end_round(m)

  assert game_engine.is_last_round(m) == True
}
