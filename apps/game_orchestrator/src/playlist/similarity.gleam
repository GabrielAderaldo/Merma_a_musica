// playlist/similarity.gleam — Normalização e similaridade de texto
//
// Usado pelo resolver para validar que o match no Deezer é a mesma música.
// Reusa o algoritmo Levenshtein do game_engine (mesmo nó BEAM).

import gleam/float
import gleam/int
import gleam/string

// Levenshtein do game_engine — compilado pro mesmo nó BEAM
@external(erlang, "shared@levenshtein", "distance")
fn levenshtein_distance(a: String, b: String) -> Int

/// Normalizar texto para comparação de matching.
/// Lowercase, remove acentos, remove conteúdo entre (...) e [...], trim.
pub fn normalize_for_matching(text: String) -> String {
  text
  |> string.lowercase()
  |> remove_accents()
  |> remove_between("(", ")")
  |> remove_between("[", "]")
  |> collapse_spaces()
  |> string.trim()
}

/// Score de similaridade entre duas strings (0.0 a 1.0).
/// Normaliza ambas antes de comparar.
pub fn similarity_score(a: String, b: String) -> Float {
  let na = normalize_for_matching(a)
  let nb = normalize_for_matching(b)
  let len_a = string.length(na)
  let len_b = string.length(nb)
  let max_len = int.max(len_a, len_b)

  case max_len {
    0 -> 1.0
    _ -> {
      let dist = levenshtein_distance(na, nb)
      let score = 1.0 -. int.to_float(dist) /. int.to_float(max_len)
      float.max(0.0, score)
    }
  }
}

/// Verificar se um resultado do Deezer é bom match para o original.
/// Retorna #(is_match, confidence) onde confidence é a média dos scores.
/// Threshold: >= 0.80.
pub fn is_good_match(
  orig_name: String,
  orig_artist: String,
  dz_name: String,
  dz_artist: String,
) -> #(Bool, Float) {
  let name_score = similarity_score(orig_name, dz_name)
  let artist_score = similarity_score(orig_artist, dz_artist)

  // Se artista está vazio (YouTube sem separator), dar mais peso ao nome
  let confidence = case orig_artist {
    "" -> name_score
    _ -> { name_score +. artist_score } /. 2.0
  }

  #(confidence >=. 0.80, confidence)
}

// ═══════════════════════════════════════════════════════════════
// HELPERS (implementação local, ~30 linhas)
// ═══════════════════════════════════════════════════════════════

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
        Ok(#(_, after)) -> remove_between(string.trim(before <> after), open, close)
      }
  }
}

fn collapse_spaces(text: String) -> String {
  case string.contains(text, "  ") {
    True -> collapse_spaces(string.replace(text, "  ", " "))
    False -> text
  }
}
