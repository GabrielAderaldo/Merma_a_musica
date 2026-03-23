// domain/services/validation/normalize.gleam — Normalização de strings do domínio
//
// Regras específicas do quiz musical: acentos, artigos, parênteses.

import gleam/list
import gleam/string

/// Normalizar string para comparação de respostas.
pub fn normalize(text: String) -> String {
  text
  |> string.lowercase()
  |> remove_accents()
  |> remove_between("(", ")")
  |> remove_between("[", "]")
  |> remove_articles()
  |> collapse_spaces()
  |> string.trim()
}

fn remove_accents(text: String) -> String {
  text
  |> string.replace("á", "a")
  |> string.replace("à", "a")
  |> string.replace("ã", "a")
  |> string.replace("â", "a")
  |> string.replace("é", "e")
  |> string.replace("è", "e")
  |> string.replace("ê", "e")
  |> string.replace("í", "i")
  |> string.replace("ì", "i")
  |> string.replace("ó", "o")
  |> string.replace("ò", "o")
  |> string.replace("õ", "o")
  |> string.replace("ô", "o")
  |> string.replace("ú", "u")
  |> string.replace("ù", "u")
  |> string.replace("ü", "u")
  |> string.replace("ç", "c")
  |> string.replace("ñ", "n")
}

fn remove_between(text: String, open: String, close: String) -> String {
  case string.split_once(text, open) {
    Error(_) -> text
    Ok(#(before, rest)) ->
      case string.split_once(rest, close) {
        Error(_) -> text
        Ok(#(_, after)) -> remove_between(before <> after, open, close)
      }
  }
}

fn remove_articles(text: String) -> String {
  let articles = [
    "the ",
    "o ",
    "a ",
    "os ",
    "as ",
    "el ",
    "la ",
    "les ",
    "los ",
    "las ",
  ]
  list.fold(articles, text, fn(acc, article) {
    case string.starts_with(acc, article) {
      True -> string.drop_start(acc, string.length(article))
      False -> acc
    }
  })
}

fn collapse_spaces(text: String) -> String {
  case string.contains(text, "  ") {
    True -> collapse_spaces(string.replace(text, "  ", " "))
    False -> text
  }
}
