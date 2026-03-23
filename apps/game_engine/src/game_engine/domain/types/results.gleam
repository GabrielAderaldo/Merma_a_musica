// domain/types/results.gleam — Value Objects de Resultado

pub type RankingEntry {
  RankingEntry(
    position: Int,
    player_id: String,
    nickname: String,
    total_points: Int,
    correct_answers: Int,
    avg_response_time: Float,
  )
}

pub type Highlights {
  Highlights(
    best_streak: HighlightStreak,
    fastest_answer: HighlightFastest,
    most_correct: HighlightMostCorrect,
    near_miss: HighlightNearMiss,
  )
}

pub type HighlightStreak {
  HighlightStreak(player_id: String, nickname: String, streak: Int)
}

pub type HighlightFastest {
  HighlightFastest(
    player_id: String,
    nickname: String,
    time: Float,
    song_name: String,
  )
}

pub type HighlightMostCorrect {
  HighlightMostCorrect(player_id: String, nickname: String, count: Int)
}

pub type HighlightNearMiss {
  HighlightNearMiss(player_id: String, nickname: String, count: Int)
}
