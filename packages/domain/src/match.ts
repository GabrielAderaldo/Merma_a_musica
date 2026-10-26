// Partida e rodada: countdown → rodadas → completed (R-101 a R-120, R-201 a R-203, R-307).
// Cada função aplica uma transição da architecture.md; fora delas, err("illegal_state_transition").
import { elapsed, type PlayerUuid, type RoundId, type Timestamp } from "./brand.ts";
import { calculatePoints, evaluateAnswer } from "./answer.ts";
import { err, ok, type Result } from "./result.ts";
import type { Answer, DomainError, Match, Room, Round, RoundEndReason, RoundState } from "./types.ts";

export const currentRound = (match: Match): Round | undefined =>
  match.current_round_index === null ? undefined : match.rounds[match.current_round_index];

const activeMatch = (room: Room): Result<Match, DomainError> =>
  room.state === "in_match" && room.match !== null ? ok(room.match) : err("illegal_state_transition");

const withMatch = (room: Room, match: Match): Room => ({ ...room, match });

const replaceCurrentRound = (match: Match, round: Round): Match => ({
  ...match,
  rounds: match.rounds.map((r) => (r.index === round.index ? round : r)),
});

// Avança a rodada atual de `from` para `to`.
const advanceRound = (room: Room, from: RoundState, to: RoundState, now?: Timestamp): Result<Room, DomainError> => {
  const match = activeMatch(room);
  if (!match.ok) return match;
  const round = currentRound(match.value);
  if (match.value.state !== "in_progress" || round?.state !== from) return err("illegal_state_transition");
  const timer_started_at = to === "timer_running" && now !== undefined ? now : round.timer_started_at;
  return ok(withMatch(room, replaceCurrentRound(match.value, { ...round, state: to, timer_started_at })));
};

// countdown → in_progress (3s depois de game_starting).
export const finishCountdown = (room: Room): Result<Room, DomainError> => {
  const match = activeMatch(room);
  if (!match.ok) return match;
  if (match.value.state !== "countdown") return err("illegal_state_transition");
  return ok(withMatch(room, { ...match.value, state: "in_progress" }));
};

export const hasNextRound = (match: Match): boolean => match.rounds.length < match.total_rounds;

// Nova rodada em `resolving`, com a próxima música da ordem sorteada (R-306).
export const startRound = (room: Room, round_id: RoundId): Result<Room, DomainError> => {
  const match = activeMatch(room);
  if (!match.ok) return match;
  const m = match.value;
  const previous = currentRound(m);
  if (m.state !== "in_progress" || (previous !== undefined && previous.state !== "reveal") || !hasNextRound(m)) {
    return err("illegal_state_transition");
  }
  const index = m.rounds.length;
  const song = m.pool.ordered[index];
  if (song === undefined) return err("internal_error");
  const round: Round = {
    round_id,
    index,
    song,
    state: "resolving",
    timer_started_at: null,
    answers: [],
    skip_votes: [],
    end_reason: null,
  };
  return ok(withMatch(room, { ...m, rounds: [...m.rounds, round], current_round_index: index }));
};

// R-307: música sem áudio vira a próxima da reserva; sem reserva, a rodada sai e total_rounds diminui.
export const replaceUnplayableSong = (room: Room): Result<Room, DomainError> => {
  const match = activeMatch(room);
  if (!match.ok) return match;
  const m = match.value;
  const round = currentRound(m);
  if (m.state !== "in_progress" || round?.state !== "resolving") return err("illegal_state_transition");
  const [replacement, ...reserve] = m.pool.reserve;
  if (replacement !== undefined) {
    const ordered = m.pool.ordered.map((s, i) => (i === round.index ? replacement : s));
    return ok(withMatch(room, replaceCurrentRound({ ...m, pool: { ordered, reserve } }, { ...round, song: replacement })));
  }
  const rounds = m.rounds.filter((r) => r.index !== round.index);
  return ok(
    withMatch(room, {
      ...m,
      rounds,
      pool: { ...m.pool, ordered: m.pool.ordered.filter((_, i) => i !== round.index) },
      total_rounds: m.total_rounds - 1,
      current_round_index: rounds.length > 0 ? rounds.length - 1 : null,
    }),
  );
};

export const markAudioResolved = (room: Room) => advanceRound(room, "resolving", "streaming");
// round_starting emitido: começa o grace period de 3s (R-101).
export const startGracePeriod = (room: Room) => advanceRound(room, "streaming", "grace_period");
// timer_started: o tempo de resposta conta daqui (R-102).
export const startTimer = (room: Room, now: Timestamp) => advanceRound(room, "grace_period", "timer_running", now);

// Participantes da partida que ainda estão na sala: são eles que contam para o pulo (R-120).
const presentParticipants = (room: Room, match: Match): readonly PlayerUuid[] => {
  const inRoom = new Set(room.players.map((p) => p.player_uuid));
  return match.participants.map((p) => p.player_uuid).filter((id) => inRoom.has(id));
};

const acceptingRound = (room: Room, player: PlayerUuid): Result<Readonly<{ match: Match; round: Round }>, DomainError> => {
  const match = activeMatch(room);
  if (!match.ok) return err("round_not_accepting_answers");
  const round = currentRound(match.value);
  if (match.value.state !== "in_progress" || round?.state !== "timer_running" || round.timer_started_at === null) {
    return err("round_not_accepting_answers");
  }
  if (!presentParticipants(room, match.value).includes(player)) return err("player_not_in_match");
  return ok({ match: match.value, round });
};

const touchPlayer = (room: Room, player: PlayerUuid): Room => ({
  ...room,
  players: room.players.map((p) => (p.player_uuid === player ? { ...p, afk: false } : p)),
});

// R-105, R-107, R-108 e I-R-2: só com o timer correndo; a nova resposta substitui a anterior.
// O acerto não é avaliado aqui: só na entrada em reveal (I-R-4).
export const submitAnswer = (room: Room, player: PlayerUuid, text: string, now: Timestamp): Result<Room, DomainError> => {
  const accepting = acceptingRound(room, player);
  if (!accepting.ok) return accepting;
  const { match, round } = accepting.value;
  const others = round.answers.filter((a) => a.player_uuid !== player);
  // R-108: resposta vazia é "não respondeu", e quem não respondeu não vota (I-R-3).
  if (text.trim() === "") {
    const skip_votes = round.skip_votes.filter((id) => id !== player);
    return ok(touchPlayer(withMatch(room, replaceCurrentRound(match, { ...round, answers: others, skip_votes })), player));
  }
  const timePerRound = match.config.time_per_round;
  const answer: Answer = {
    player_uuid: player,
    answer_text: text,
    submitted_at: now,
    response_time: round.timer_started_at === null ? timePerRound : minDuration(elapsed(round.timer_started_at, now), timePerRound),
    is_correct: false,
    is_near_miss: false,
    points_earned: 0,
  };
  return ok(touchPlayer(withMatch(room, replaceCurrentRound(match, { ...round, answers: [...others, answer] })), player));
};

const minDuration = <D extends number>(a: D, b: D): D => (a <= b ? a : b);

// R-120: maioria = floor(N/2) + 1, com N = participantes presentes.
export const skipVotesNeeded = (room: Room): number => {
  const match = room.match;
  return match === null ? 1 : Math.floor(presentParticipants(room, match).length / 2) + 1;
};

// R-120 e I-R-3: só vota quem já respondeu, uma vez. Solo não tem pular (R-503).
export const voteSkip = (room: Room, player: PlayerUuid): Result<Room, DomainError> => {
  const accepting = acceptingRound(room, player);
  if (!accepting.ok) return accepting.error === "round_not_accepting_answers" ? err("round_not_accepting_skip") : accepting;
  const { match, round } = accepting.value;
  if (match.config.game_mode === "solo") return err("round_not_accepting_skip");
  if (round.skip_votes.includes(player)) return err("player_already_voted");
  if (!round.answers.some((a) => a.player_uuid === player)) return err("player_not_answered_yet");
  const skip_votes = [...round.skip_votes, player];
  return ok(touchPlayer(withMatch(room, replaceCurrentRound(match, { ...round, skip_votes })), player));
};

// Por que a rodada deve terminar agora, ou null. A orquestração chama a cada resposta, voto e tique do timer.
export const shouldEndRound = (room: Room, now: Timestamp): RoundEndReason | null => {
  const match = room.match;
  const round = match === null ? undefined : currentRound(match);
  if (match === null || round?.state !== "timer_running" || round.timer_started_at === null) return null;
  if (elapsed(round.timer_started_at, now) >= match.config.time_per_round) return "timer_expired";
  if (match.config.game_mode === "solo") return null;
  const present = presentParticipants(room, match);
  const answered = new Set(round.answers.map((a) => a.player_uuid));
  const votes = round.skip_votes.filter((id) => present.includes(id)).length;
  const allAnswered = present.length > 0 && present.every((id) => answered.has(id));
  return allAnswered && votes >= skipVotesNeeded(room) ? "majority_skip" : null;
};

// timer_running → reveal: avalia as respostas, pontua (R-201, R-202) e atualiza streaks (R-203).
export const endRound = (room: Room, reason: RoundEndReason): Result<Room, DomainError> => {
  const match = activeMatch(room);
  if (!match.ok) return match;
  const m = match.value;
  const round = currentRound(m);
  if (m.state !== "in_progress" || round?.state !== "timer_running") return err("illegal_state_transition");
  const { answer_type, scoring_rule, time_per_round } = m.config;
  const answers = round.answers.map((a): Answer => {
    const evaluation = evaluateAnswer(a.answer_text, round.song, answer_type);
    return {
      ...a,
      is_correct: evaluation.matched,
      is_near_miss: evaluation.near_miss,
      points_earned: calculatePoints(scoring_rule, evaluation.matched, a.response_time, time_per_round),
    };
  });
  const correct = new Set(answers.filter((a) => a.is_correct).map((a) => a.player_uuid));
  const participants = m.participants.map((p) => {
    const current_streak = correct.has(p.player_uuid) ? p.current_streak + 1 : 0;
    return { ...p, current_streak, best_streak: Math.max(p.best_streak, current_streak) };
  });
  const scores = { ...m.scores };
  for (const a of answers) scores[a.player_uuid] = (scores[a.player_uuid] ?? 0) + a.points_earned;
  const revealed: Round = { ...round, state: "reveal", answers, end_reason: reason };
  return ok(withMatch(room, { ...replaceCurrentRound(m, revealed), participants, scores }));
};

// Última rodada revelada → Match completed, Room finished.
export const endMatch = (room: Room, now: Timestamp): Result<Room, DomainError> => {
  const match = activeMatch(room);
  if (!match.ok) return match;
  const m = match.value;
  const round = currentRound(m);
  if (m.state !== "in_progress" || hasNextRound(m) || (round !== undefined && round.state !== "reveal")) {
    return err("illegal_state_transition");
  }
  return ok({ ...room, state: "finished", match: { ...m, state: "completed", current_round_index: null, ended_at: now } });
};

// completed → persisted: a escrita única no Postgres terminou.
export const markPersisted = (room: Room): Result<Room, DomainError> =>
  room.match?.state === "completed"
    ? ok(withMatch(room, { ...room.match, state: "persisted" }))
    : err("illegal_state_transition");
