// shared/levenshtein.gleam — Algoritmo genérico de distância de edição
//
// Puro, sem conhecimento do domínio. Usado pelo validation service.

import gleam/int
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string

/// Distância de Levenshtein entre duas strings.
pub fn distance(a: String, b: String) -> Int {
  let a_chars = string.to_graphemes(a)
  let b_chars = string.to_graphemes(b)
  let b_len = list.length(b_chars)

  case a_chars {
    [] -> b_len
    _ ->
      case b_chars {
        [] -> list.length(a_chars)
        _ -> compute(a_chars, b_chars, b_len)
      }
  }
}

fn compute(a_chars: List(String), b_chars: List(String), b_len: Int) -> Int {
  let initial_row = make_range(0, b_len)

  let final_row =
    list.index_fold(a_chars, initial_row, fn(row, a_char, i) {
      update_row(row, a_char, b_chars, i + 1)
    })

  case list.last(final_row) {
    Ok(dist) -> dist
    Error(_) -> 0
  }
}

fn update_row(
  prev_row: List(Int),
  a_char: String,
  b_chars: List(String),
  row_index: Int,
) -> List(Int) {
  let initial_diag = case prev_row {
    [first, ..] -> first
    [] -> 0
  }
  let initial = #([row_index], initial_diag)

  let #(new_row_rev, _) =
    list.index_fold(b_chars, initial, fn(acc, b_char, j) {
      let #(row_acc, prev_diag) = acc

      let prev_above = case list_at_int(prev_row, j + 1) {
        Some(v) -> v
        None -> 0
      }

      let prev_left = case row_acc {
        [last, ..] -> last
        [] -> 0
      }

      let cost = case a_char == b_char {
        True -> 0
        False -> 1
      }

      let min_val =
        int.min(int.min(prev_left + 1, prev_above + 1), prev_diag + cost)

      #([min_val, ..row_acc], prev_above)
    })

  list.reverse(new_row_rev)
}

fn make_range(from: Int, to: Int) -> List(Int) {
  case from > to {
    True -> []
    False -> [from, ..make_range(from + 1, to)]
  }
}

fn list_at_int(items: List(Int), index: Int) -> Option(Int) {
  case index < 0 {
    True -> None
    False -> list_at_int_loop(items, index, 0)
  }
}

fn list_at_int_loop(items: List(Int), target: Int, current: Int) -> Option(Int) {
  case items {
    [] -> None
    [first, ..rest] ->
      case current == target {
        True -> Some(first)
        False -> list_at_int_loop(rest, target, current + 1)
      }
  }
}
