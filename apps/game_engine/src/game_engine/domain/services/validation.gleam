// domain/services/validation.gleam — Domain Service: Validação de Respostas
//
// Regra de negócio: "80% similaridade = correto, 60-80% = na trave".
// Usa normalize (domínio) e levenshtein (shared/genérico).

import game_engine/domain/services/validation/normalize
import game_engine/domain/types/answer.{type AnswerResult, AnswerResult}
import game_engine/domain/types/config.{
  type AnswerType, ArtistName, Both, SongName,
}
import game_engine/domain/types/media.{type Song}
import gleam/int
import gleam/string
import shared/levenshtein

/// Verificar resposta (compatibilidade — retorna Bool).
pub fn check_answer(
  answer_text: String,
  song: Song,
  answer_type: AnswerType,
) -> Bool {
  let result = check_answer_detailed(answer_text, song, answer_type)
  result.is_correct
}

/// Verificação detalhada: is_correct + is_near_miss.
pub fn check_answer_detailed(
  answer_text: String,
  song: Song,
  answer_type: AnswerType,
) -> AnswerResult {
  let normalized = normalize.normalize(answer_text)

  case answer_type {
    SongName -> check_similarity(normalized, normalize.normalize(song.name))
    ArtistName ->
      check_similarity(normalized, normalize.normalize(song.artist.name))
    Both -> {
      let song_result =
        check_similarity(normalized, normalize.normalize(song.name))
      let artist_result =
        check_similarity(normalized, normalize.normalize(song.artist.name))
      let correct = song_result.is_correct || artist_result.is_correct
      let near = case correct {
        True -> False
        False -> song_result.is_near_miss || artist_result.is_near_miss
      }
      AnswerResult(is_correct: correct, is_near_miss: near)
    }
  }
}

/// >80% = correto, 60-80% = near miss, <60% = errado.
fn check_similarity(answer: String, target: String) -> AnswerResult {
  case answer == "" || target == "" {
    True -> AnswerResult(is_correct: False, is_near_miss: False)
    False ->
      case answer == target {
        True -> AnswerResult(is_correct: True, is_near_miss: False)
        False -> {
          let dist = levenshtein.distance(answer, target)
          let max_len = int.max(string.length(answer), string.length(target))
          case max_len {
            0 -> AnswerResult(is_correct: False, is_near_miss: False)
            _ -> {
              let similarity =
                1.0 -. int.to_float(dist) /. int.to_float(max_len)
              case similarity >. 0.8 {
                True -> AnswerResult(is_correct: True, is_near_miss: False)
                False ->
                  case similarity >. 0.6 {
                    True -> AnswerResult(is_correct: False, is_near_miss: True)
                    False ->
                      AnswerResult(is_correct: False, is_near_miss: False)
                  }
              }
            }
          }
        }
      }
  }
}
