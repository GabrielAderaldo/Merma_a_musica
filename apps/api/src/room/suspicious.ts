// S-26: o padrão "100% de acerto e menos de 1s" vira métrica, sem ação automática no MVP. Decidido em 2026-10-27:
// avaliado no fim da partida, por jogador, com a média do response_time; conta 1 por jogador por partida.
import type { Match, PlayerUuid } from "@merma/domain";

export const SUSPICIOUS_AVG_RESPONSE_MS = 1_000;

export const suspiciousPlayers = (match: Match): PlayerUuid[] => {
  if (match.rounds.length === 0) return [];
  return match.participants
    .map((p) => p.player_uuid)
    .filter((player) => {
      const answers = match.rounds.map((r) => r.answers.find((a) => a.player_uuid === player));
      if (!answers.every((a) => a?.is_correct === true)) return false;
      const total = answers.reduce((sum, a) => sum + (a?.response_time ?? 0), 0);
      return total / answers.length < SUSPICIOUS_AVG_RESPONSE_MS;
    });
};
