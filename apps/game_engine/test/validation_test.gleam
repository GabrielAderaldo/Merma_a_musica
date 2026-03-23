// ═══════════════════════════════════════════════════════════════
// validation_test — Domain Service: fuzzy matching
// ═══════════════════════════════════════════════════════════════
// Testa o serviço de validação ISOLADO do agregado.
// Funções puras: normalize, levenshtein, check_answer.
// Nenhum setup de match necessário.

import game_engine/domain/services/validation
import game_engine/domain/services/validation/normalize
import game_engine/domain/types/config.{ArtistName, Both, SongName}
import gleeunit/should
import shared/levenshtein
import test_helpers.{make_song}

// ─── normalize ───

pub fn normalize_removes_accents_test() {
  should.equal(normalize.normalize("Evidências"), "evidencias")
}

pub fn normalize_removes_parenthetical_test() {
  should.equal(normalize.normalize("Song (feat. X)"), "song")
}

pub fn normalize_removes_articles_test() {
  should.equal(normalize.normalize("The Weeknd"), "weeknd")
}

// ─── levenshtein ───

pub fn levenshtein_exact_match_test() {
  should.equal(levenshtein.distance("abc", "abc"), 0)
}

pub fn levenshtein_one_edit_test() {
  should.equal(levenshtein.distance("abc", "abd"), 1)
}

// ─── check_answer: song name mode ───

pub fn fuzzy_match_accepts_close_answer_test() {
  let song = make_song("1", "Bohemian Rhapsody", "Queen")
  should.equal(
    validation.check_answer("bohemian rapsody", song, SongName),
    True,
  )
}

pub fn fuzzy_match_rejects_distant_answer_test() {
  let song = make_song("1", "Bohemian Rhapsody", "Queen")
  should.equal(
    validation.check_answer("musica aleatoria", song, SongName),
    False,
  )
}

// ─── check_answer: both mode ───

pub fn both_mode_accepts_artist_test() {
  let song = make_song("1", "Bohemian Rhapsody", "Queen")
  should.equal(validation.check_answer("Queen", song, Both), True)
}

pub fn both_mode_accepts_song_name_test() {
  let song = make_song("1", "Bohemian Rhapsody", "Queen")
  should.equal(validation.check_answer("Bohemian Rhapsody", song, Both), True)
}
