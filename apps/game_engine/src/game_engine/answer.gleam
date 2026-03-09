import game_engine/types.{type AnswerType, type Song, ArtistName, Both, SongName}
import gleam/string

/// Verifica se a resposta do jogador é correta, comparando com a música da rodada.
/// Strategy: o AnswerType determina contra o que comparar.
pub fn validate(
  answer_text: String,
  song: Song,
  answer_type: AnswerType,
) -> Bool {
  let normalized_answer = normalize(answer_text)

  case answer_type {
    SongName -> fuzzy_match(normalized_answer, normalize(song.name))
    ArtistName -> fuzzy_match(normalized_answer, normalize(song.artist))
    Both ->
      fuzzy_match(normalized_answer, normalize(song.name))
      || fuzzy_match(normalized_answer, normalize(song.artist))
  }
}

/// Comparação fuzzy: compara após normalização completa.
fn fuzzy_match(answer: String, expected: String) -> Bool {
  answer == expected
}

/// Normaliza texto para comparação:
/// - lowercase
/// - trim
/// - remove acentos comuns
/// - remove pontuação
fn normalize(text: String) -> String {
  text
  |> string.lowercase
  |> string.trim
  |> remove_accents
  |> remove_punctuation
}

fn remove_accents(text: String) -> String {
  text
  |> string.replace("á", "a")
  |> string.replace("à", "a")
  |> string.replace("ã", "a")
  |> string.replace("â", "a")
  |> string.replace("ä", "a")
  |> string.replace("é", "e")
  |> string.replace("è", "e")
  |> string.replace("ê", "e")
  |> string.replace("ë", "e")
  |> string.replace("í", "i")
  |> string.replace("ì", "i")
  |> string.replace("î", "i")
  |> string.replace("ï", "i")
  |> string.replace("ó", "o")
  |> string.replace("ò", "o")
  |> string.replace("õ", "o")
  |> string.replace("ô", "o")
  |> string.replace("ö", "o")
  |> string.replace("ú", "u")
  |> string.replace("ù", "u")
  |> string.replace("û", "u")
  |> string.replace("ü", "u")
  |> string.replace("ç", "c")
  |> string.replace("ñ", "n")
}

fn remove_punctuation(text: String) -> String {
  text
  |> string.replace("'", "")
  |> string.replace("'", "")
  |> string.replace("\"", "")
  |> string.replace(".", "")
  |> string.replace(",", "")
  |> string.replace("!", "")
  |> string.replace("?", "")
  |> string.replace("-", " ")
  |> string.replace("_", " ")
  |> collapse_spaces
}

/// Remove espaços duplos.
fn collapse_spaces(text: String) -> String {
  case string.contains(text, "  ") {
    True ->
      text
      |> string.replace("  ", " ")
      |> collapse_spaces
    False -> text
  }
}
