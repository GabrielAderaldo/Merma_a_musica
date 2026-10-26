// Sala e lobby: entrar, sair, ready, AFK, host, playlist e configuração (R-004 a R-009, R-401, R-501 a R-503, R-601 a R-603).
import type { ConnectionStatus, Phase, Platform } from "@merma/schema";
import { MAX_PLAYERS } from "@merma/schema";
import { seconds, type InviteCode, type MatchId, type PlayerUuid, type RoomId, type Timestamp } from "./brand.ts";
import {
  distributePool,
  multiplayerSongRange,
  SOLO_DEFAULT_TOTAL_SONGS,
  soloSongRange,
  type PlayerSongs,
  type SongRange,
} from "./pool.ts";
import { err, ok, type Result } from "./result.ts";
import type { DomainError, MatchConfiguration, PlaylistSelection, Room, RoomPlayer } from "./types.ts";

// R-401 e I-C-1.
export const MIN_TIME_PER_ROUND = seconds(10);
export const MAX_TIME_PER_ROUND = seconds(60);

const DEFAULT_CONFIG: MatchConfiguration = {
  time_per_round: seconds(30),
  total_songs: multiplayerSongRange(1).max,
  answer_type: "both",
  allow_repeats: false,
  scoring_rule: "speed_bonus",
  game_mode: "multiplayer",
};

export const findPlayer = (room: Room, player: PlayerUuid): RoomPlayer | undefined =>
  room.players.find((p) => p.player_uuid === player);

const updatePlayer = (
  room: Room,
  player: PlayerUuid,
  change: (p: RoomPlayer) => RoomPlayer,
): Result<Room, "player_not_in_room"> =>
  findPlayer(room, player) === undefined
    ? err("player_not_in_room")
    : ok({ ...room, players: room.players.map((p) => (p.player_uuid === player ? change(p) : p)) });

// R-008: o host é sempre ready, inclusive quem herda o papel.
const withHost = (room: Room, host: PlayerUuid | null): Room => ({
  ...room,
  host_uuid: host,
  players: room.players.map((p) => (p.player_uuid === host ? { ...p, ready: true } : p)),
});

// R-601: qualquer interação tira o AFK.
const touch = (p: RoomPlayer): RoomPlayer => ({ ...p, afk: false });

// R-302 (multiplayer) ou R-502 (solo, pela playlist do único jogador).
export const songRange = (room: Room): SongRange => {
  if (room.config.game_mode === "multiplayer") return multiplayerSongRange(room.players.length);
  const host = room.host_uuid === null ? undefined : findPlayer(room, room.host_uuid);
  return soloSongRange(host?.playlist?.playable_songs ?? 50);
};

const clamp = (n: number, range: SongRange) => Math.min(range.max, Math.max(range.min, n));

// Mantém total_songs no range quando ele muda; sem configuração do host, acompanha o default (R-302, R-502).
const fitTotalSongs = (room: Room): Room => {
  const range = songRange(room);
  const fallback = room.config.game_mode === "solo" ? SOLO_DEFAULT_TOTAL_SONGS : range.max;
  const total = clamp(room.total_songs_customized ? room.config.total_songs : fallback, range);
  return { ...room, config: { ...room.config, total_songs: total } };
};

export const createRoom = (room_id: RoomId, invite_code: InviteCode): Room => ({
  room_id,
  invite_code,
  state: "empty",
  host_uuid: null,
  players: [],
  config: DEFAULT_CONFIG,
  total_songs_customized: false,
  match: null,
});

export type JoiningPlayer = Readonly<{ player_uuid: PlayerUuid; nickname: string; platform: Platform | null }>;

// R-004: quem entra numa sala sem host (o criador, logo depois de criá-la) vira host. R-005: até 20.
// Quem já está na sala está reconectando (R-602): volta a connected com as respostas preservadas.
export const joinRoom = (room: Room, joining: JoiningPlayer, now: Timestamp): Result<Room, DomainError> => {
  if (room.state === "terminated") return err("room_not_found");
  if (findPlayer(room, joining.player_uuid) !== undefined) {
    return updatePlayer(room, joining.player_uuid, (p) => ({
      ...touch(p),
      nickname: joining.nickname,
      platform: joining.platform,
      connection_status: "connected",
      connected_since: now,
    }));
  }
  if (room.players.length >= MAX_PLAYERS) return err("room_full");
  const player: RoomPlayer = {
    ...joining,
    ready: false,
    afk: false,
    connection_status: "connected",
    connected_since: now,
    playlist: null,
  };
  const joined: Room = {
    ...room,
    state: room.state === "empty" ? "lobby" : room.state,
    players: [...room.players, player],
  };
  return ok(fitTotalSongs(withHost(joined, room.host_uuid ?? joining.player_uuid)));
};

// R-603: o conectado há mais tempo, sem contar o host atual.
const nextHost = (room: Room): PlayerUuid | null => {
  const candidates = room.players
    .filter((p) => p.player_uuid !== room.host_uuid && p.connection_status === "connected")
    .toSorted((a, b) => a.connected_since - b.connected_since);
  return candidates[0]?.player_uuid ?? null;
};

// Sair voluntariamente ou por timeout de reconexão (R-602). Host que sai passa o papel adiante.
export const leaveRoom = (room: Room, player: PlayerUuid, now: Timestamp): Result<Room, DomainError> => {
  if (findPlayer(room, player) === undefined) return err("player_not_in_room");
  const players = room.players.filter((p) => p.player_uuid !== player);
  const remaining: Room = { ...room, players };
  const host_uuid =
    room.host_uuid !== player ? room.host_uuid : (nextHost(remaining) ?? players[0]?.player_uuid ?? null);
  if (players.length > 0) return ok(fitTotalSongs(withHost(remaining, host_uuid)));
  // Último a sair: lobby vira empty; partida em andamento termina com o placar que tiver.
  if (room.state === "in_match" && room.match !== null) {
    const match = { ...room.match, state: "completed" as const, current_round_index: null, ended_at: now };
    return ok({ ...remaining, host_uuid: null, state: "finished", match });
  }
  return ok(fitTotalSongs({ ...remaining, host_uuid: null, state: room.state === "lobby" ? "empty" : room.state }));
};

export const setConnectionStatus = (
  room: Room,
  player: PlayerUuid,
  status: ConnectionStatus,
  now: Timestamp,
): Result<Room, DomainError> =>
  updatePlayer(room, player, (p) => ({
    ...p,
    connection_status: status,
    connected_since: status === "connected" && p.connection_status !== "connected" ? now : p.connected_since,
  }));

// R-603: chamado pela orquestração depois de 60s com o host fora. Se ele voltou, continua host.
export const transferHost = (room: Room): Result<Room, DomainError> => {
  const host = room.host_uuid === null ? undefined : findPlayer(room, room.host_uuid);
  if (host?.connection_status === "connected") return err("host_still_connected");
  const next = nextHost(room);
  return next === null ? err("no_eligible_host") : ok(withHost(room, next));
};

// R-008 e I-H-1: o host é sempre ready, e não muda isso nem para true.
export const setReady = (room: Room, player: PlayerUuid, ready: boolean): Result<Room, DomainError> =>
  room.host_uuid === player ? err("host_is_always_ready") : updatePlayer(room, player, (p) => ({ ...touch(p), ready }));

export const setAfk = (room: Room, player: PlayerUuid, afk: boolean): Result<Room, DomainError> =>
  updatePlayer(room, player, (p) => ({ ...p, afk }));

export const setPlatform = (room: Room, player: PlayerUuid, platform: Platform | null): Result<Room, DomainError> =>
  updatePlayer(room, player, (p) => ({ ...touch(p), platform }));

export const selectPlaylist = (
  room: Room,
  player: PlayerUuid,
  playlist: PlaylistSelection,
): Result<Room, DomainError> => {
  const updated = updatePlayer(room, player, (p) => ({ ...touch(p), playlist }));
  return updated.ok ? ok(fitTotalSongs(updated.value)) : updated;
};

// R-007, R-401, R-503 e I-C-1 a I-C-3. Os enums já chegam válidos pelo schema do fio.
export const configureMatch = (
  room: Room,
  by: PlayerUuid,
  input: MatchConfiguration,
): Result<Room, DomainError> => {
  if (room.host_uuid !== by) return err("not_host");
  if (room.state !== "lobby") return err("illegal_state_transition");
  if (input.time_per_round < MIN_TIME_PER_ROUND || input.time_per_round > MAX_TIME_PER_ROUND) {
    return err("time_per_round_out_of_range");
  }
  if (input.game_mode === "solo" && room.players.length !== 1) return err("solo_requires_single_player");
  // R-503: no solo a pontuação é sempre speed_bonus, sem avisar.
  const config: MatchConfiguration =
    input.game_mode === "solo" ? { ...input, scoring_rule: "speed_bonus" } : input;
  const configured: Room = { ...room, config, total_songs_customized: true };
  const range = songRange(configured);
  if (config.total_songs < range.min || config.total_songs > range.max) return err("total_songs_out_of_range");
  return ok(configured);
};

export type StartGameInput = Readonly<{
  match_id: MatchId;
  // Músicas tocáveis da playlist de cada jogador que escolheu uma. A engine filtra quem está na sala.
  songs: readonly PlayerSongs[];
  seed: string;
  now: Timestamp;
}>;

// R-009 e I-H-2: só o host, com ≥1 jogador, mesmo com gente unready. R-301: só playlists de quem está presente.
export const startGame = (room: Room, by: PlayerUuid, input: StartGameInput): Result<Room, DomainError> => {
  if (room.host_uuid !== by) return err("not_host");
  if (room.state !== "lobby") return err("illegal_state_transition");
  const { config } = room;
  if (config.game_mode === "solo" && room.players.length !== 1) return err("solo_requires_single_player");
  const present = new Set(room.players.filter((p) => p.playlist !== null).map((p) => p.player_uuid));
  const songs = input.songs.filter((s) => present.has(s.player_uuid));
  const pool = distributePool(songs, config.total_songs, config.allow_repeats, input.seed);
  if (!pool.ok) return pool;
  return ok({
    ...room,
    state: "in_match",
    match: {
      match_id: input.match_id,
      state: "countdown",
      config,
      participants: room.players.map((p) => ({
        player_uuid: p.player_uuid,
        nickname: p.nickname,
        current_streak: 0,
        best_streak: 0,
      })),
      pool: pool.value,
      rounds: [],
      current_round_index: null,
      total_rounds: pool.value.ordered.length,
      scores: Object.fromEntries(room.players.map((p) => [p.player_uuid, 0])),
      started_at: input.now,
      ended_at: null,
    },
  });
};

// R-703: depois dos resultados, volta ao lobby (ou a empty, se todos saíram).
export const returnToLobby = (room: Room): Result<Room, DomainError> => {
  if (room.state !== "finished") return err("illegal_state_transition");
  return ok(fitTotalSongs({ ...room, state: room.players.length > 0 ? "lobby" : "empty", match: null }));
};

// 10 min vazia (a orquestração mede o tempo). `terminated` é absorvente.
export const terminateRoom = (room: Room): Result<Room, DomainError> =>
  room.state === "empty" ? ok({ ...room, state: "terminated" }) : err("illegal_state_transition");

// Tabela "phase derivada" da architecture.md. Sala vazia ou encerrada não tem cliente; mostra o lobby.
export const derivePhase = (room: Room): Phase => {
  if (room.state === "finished") return "results";
  if (room.state !== "in_match" || room.match === null) return "lobby";
  if (room.match.state === "countdown") return "countdown";
  if (room.match.state !== "in_progress") return "results";
  const round = room.match.current_round_index === null ? undefined : room.match.rounds[room.match.current_round_index];
  return round?.state === "reveal" ? "reveal" : "playing";
};
