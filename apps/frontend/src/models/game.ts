// models/game.ts — Model: Partida e Gameplay
//
// O QUE É: Interfaces TypeScript puras para configuração, rodada, pontuação e highlights.
//
// LIMITES ARQUITETURAIS:
// - APENAS types/interfaces — zero lógica
// - Source of truth: Asyncapi.yaml + GDD (doc/documents/gdd.md)
//
// TIPOS ESPERADOS:
// - AnswerType: "song" | "artist" | "both"
// - ScoringRule: "simple" | "speed_bonus"
// - AudioSource: "deezer" | "spotify_sdk"
// - GamePhase: "waiting_round" | "grace_period" | "playing" | "revealing" | "results"
// - MatchConfiguration: time_per_round, total_songs, answer_type, allow_repeats, scoring_rule
// - SongRange: min, max, current_players, players_with_playlist
// - RevealedSong: name, artist, album, cover_url, contributed_by
// - PlayerAnswer: player_uuid, nickname, answer_text, is_correct, points_earned, response_time
// - RoundResult: round_index, song, answers[], scores, next_round_in_seconds
// - RankingEntry: position, player_uuid, nickname, total_points, correct_answers, avg_response_time
// - Highlights: best_streak, fastest_answer, most_correct
// - GameResult: final_scores, ranking[], highlights, return_to_lobby_in_seconds
