// IDs e strings críticas são branded: o compilador não deixa passar um RoomId onde se espera um MatchId.
// Os formatos vêm dos schemas do fio (@merma/schema), para não haver duas definições.
import * as wire from "@merma/schema";
import { err, ok, type Result } from "./result.ts";

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type PlayerUuid = Brand<string, "PlayerUuid">;
export type RoomId = Brand<string, "RoomId">;
export type MatchId = Brand<string, "MatchId">;
export type RoundId = Brand<string, "RoundId">;
export type PlaylistId = Brand<string, "PlaylistId">;
export type InviteCode = Brand<string, "InviteCode">;
export type Isrc = Brand<string, "Isrc">;
// Milissegundos desde o epoch UTC.
export type Timestamp = Brand<number, "Timestamp">;
// Milissegundos.
export type Duration = Brand<number, "Duration">;

const ISRC = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;
const isMillis = (n: number) => Number.isSafeInteger(n) && n >= 0;

// Smart constructors: o único lugar onde `as` é permitido, depois de validar o formato.
export const PlayerUuid = (s: string): Result<PlayerUuid, "invalid_player_uuid"> =>
  wire.PlayerUuid.safeParse(s).success ? ok(s as PlayerUuid) : err("invalid_player_uuid");
export const RoomId = (s: string): Result<RoomId, "invalid_room_id"> =>
  wire.RoomId.safeParse(s).success ? ok(s as RoomId) : err("invalid_room_id");
export const MatchId = (s: string): Result<MatchId, "invalid_match_id"> =>
  wire.MatchId.safeParse(s).success ? ok(s as MatchId) : err("invalid_match_id");
// O fio não tem RoundId; o formato é o mesmo dos outros IDs (UUID).
export const RoundId = (s: string): Result<RoundId, "invalid_round_id"> =>
  wire.RoomId.safeParse(s).success ? ok(s as RoundId) : err("invalid_round_id");
export const PlaylistId = (s: string): Result<PlaylistId, "invalid_playlist_id"> =>
  wire.PlaylistId.safeParse(s).success ? ok(s as PlaylistId) : err("invalid_playlist_id");
// R-004
export const InviteCode = (s: string): Result<InviteCode, "invalid_invite_code"> =>
  wire.InviteCode.safeParse(s).success ? ok(s as InviteCode) : err("invalid_invite_code");
// ISRC (ISO 3901): país, registrante, ano e designação, em maiúsculas.
export const Isrc = (s: string): Result<Isrc, "invalid_isrc"> => (ISRC.test(s) ? ok(s as Isrc) : err("invalid_isrc"));
export const Timestamp = (ms: number): Result<Timestamp, "invalid_timestamp"> =>
  isMillis(ms) ? ok(ms as Timestamp) : err("invalid_timestamp");
export const Duration = (ms: number): Result<Duration, "invalid_duration"> =>
  isMillis(ms) ? ok(ms as Duration) : err("invalid_duration");

// Aritmética de tempo que preserva o brand. Os operandos já são inteiros não negativos.
export const elapsed = (from: Timestamp, to: Timestamp): Duration => Math.max(0, to - from) as Duration;
export const seconds = (s: number): Duration => Math.round(s * 1000) as Duration;
