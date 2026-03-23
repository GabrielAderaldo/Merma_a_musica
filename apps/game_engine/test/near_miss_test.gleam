// ═══════════════════════════════════════════════════════════════
// near_miss_test — Domain Service: detecção "na trave"
// ═══════════════════════════════════════════════════════════════
// Testa check_answer_detailed ISOLADO.
// Verifica thresholds de similaridade sem setup de match.

import game_engine/domain/services/validation
import game_engine/domain/types/config.{Both, SongName}
import gleeunit/should
import test_helpers.{make_song}

// ─── Detecção básica ───

pub fn detected_on_close_wrong_answer_test() {
  // "Bohemian Razzoxx" — ~76% similar → errado mas near miss
  let result =
    validation.check_answer_detailed(
      "Bohemian Razzoxx",
      make_song("1", "Bohemian Rhapsody", "Queen"),
      SongName,
    )
  should.equal(result.is_correct, False)
  should.equal(result.is_near_miss, True)
}

pub fn not_detected_on_correct_answer_test() {
  let result =
    validation.check_answer_detailed(
      "Bohemian Rhapsody",
      make_song("1", "Bohemian Rhapsody", "Queen"),
      SongName,
    )
  should.equal(result.is_correct, True)
  should.equal(result.is_near_miss, False)
}

pub fn not_detected_on_very_wrong_answer_test() {
  let result =
    validation.check_answer_detailed(
      "musica completamente diferente",
      make_song("1", "Bohemian Rhapsody", "Queen"),
      SongName,
    )
  should.equal(result.is_correct, False)
  should.equal(result.is_near_miss, False)
}

// ─── Both mode ───

pub fn both_mode_near_miss_on_artist_test() {
  // "Queon" vs "Queen" = 1 erro em 5 chars → near miss
  let result =
    validation.check_answer_detailed(
      "Queon",
      make_song("1", "Bohemian Rhapsody", "Queen"),
      Both,
    )
  should.equal(result.is_correct, False)
  should.equal(result.is_near_miss, True)
}
