// Fixtures dos testes da engine. Não é exportado pelo index.
import { expect } from "bun:test";
import {
  Duration,
  InviteCode,
  MatchId,
  PlayerUuid,
  PlaylistId,
  RoomId,
  RoundId,
  Timestamp,
  type Isrc,
} from "./brand.ts";
import type { PlayerSongs, Song } from "./pool.ts";
import type { Result } from "./result.ts";
import { createRoom, joinRoom, selectPlaylist } from "./room.ts";
import type { Room } from "./types.ts";

export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) expect.unreachable(`esperava ok, veio err(${String(r.error)})`);
  return r.value;
};

export const defined = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) expect.unreachable(`esperava ${what}`);
  return value;
};

const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
export const player = (n: number): PlayerUuid => unwrap(PlayerUuid(uuid(n)));
export const roundId = (n: number): RoundId => unwrap(RoundId(uuid(1000 + n)));
export const matchId = unwrap(MatchId(uuid(9000)));
export const playlistId = (n: number): PlaylistId => unwrap(PlaylistId(uuid(5000 + n)));
export const at = (ms: number): Timestamp => unwrap(Timestamp(ms));
export const ms = (n: number): Duration => unwrap(Duration(n));

export const song = (owner: PlayerUuid, name: string, artist = "Artista", isrc: Isrc | null = null): Song => ({
  isrc,
  name,
  artist,
  album: null,
  cover_url: null,
  contributed_by: owner,
  source_platform: "deezer",
});

// `count` músicas distintas do jogador, com nomes únicos.
export const songsOf = (owner: PlayerUuid, count: number, prefix = owner.slice(-4)): PlayerSongs => ({
  player_uuid: owner,
  songs: Array.from({ length: count }, (_, i) => song(owner, `Musica ${prefix} ${i}`, `Artista ${prefix}`)),
});

export const T0 = at(1_000_000);

// Sala em lobby com `n` jogadores (o 1º é host), todos com playlist de `songsEach` músicas.
export const lobbyWith = (n: number, songsEach = 50): Room => {
  let room = createRoom(unwrap(RoomId(uuid(7000))), unwrap(InviteCode("ABC123")));
  for (let i = 1; i <= n; i++) {
    room = unwrap(joinRoom(room, { player_uuid: player(i), nickname: `P${i}`, platform: null }, at(T0 + i)));
    room = unwrap(
      selectPlaylist(room, player(i), { playlist_id: playlistId(i), platform: "deezer", playable_songs: songsEach }),
    );
  }
  return room;
};
