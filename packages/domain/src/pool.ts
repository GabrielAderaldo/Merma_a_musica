// Seleção de músicas da partida (R-301 a R-307, R-502).
import type { Platform } from "@merma/schema";
import { normalize } from "./answer.ts";
import type { Isrc, PlayerUuid } from "./brand.ts";
import { createRng, shuffle } from "./random.ts";
import { err, ok, type Result } from "./result.ts";

export type Song = Readonly<{
  isrc: Isrc | null;
  name: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
  contributed_by: PlayerUuid;
  source_platform: Platform;
}>;

// Músicas tocáveis da playlist escolhida por um jogador.
export type PlayerSongs = Readonly<{ player_uuid: PlayerUuid; songs: readonly Song[] }>;

// `ordered` são as rodadas, na ordem; `reserve` substitui música sem áudio (R-307).
export type Pool = Readonly<{ ordered: readonly Song[]; reserve: readonly Song[] }>;

export type SongRange = Readonly<{ min: number; max: number }>;

// R-302: jogadores sem playlist contam no range.
export const multiplayerSongRange = (playerCount: number): SongRange => ({
  min: Math.max(1, playerCount),
  max: Math.max(1, playerCount) * 5,
});

// R-502: de 5 a 50, limitado às músicas tocáveis; com menos de 5, de 1 ao tamanho da playlist.
export const SOLO_DEFAULT_TOTAL_SONGS = 10;
export const soloSongRange = (playableSongs: number): SongRange =>
  playableSongs < 5 ? { min: 1, max: Math.max(1, playableSongs) } : { min: 5, max: Math.min(50, playableSongs) };

// R-304: mesma música = mesmo ISRC; sem ISRC, mesmo (nome, artista) normalizados.
export const songKey = (song: Song): string =>
  song.isrc ?? `${normalize(song.name)}\u0000${normalize(song.artist)}`;

// R-303: divisão igual entre quem tem playlist; a sobra vai uma a uma, em ordem aleatória.
export const splitQuota = (total: number, owners: readonly PlayerUuid[], seed: string): ReadonlyMap<PlayerUuid, number> => {
  const base = Math.floor(total / owners.length);
  const extra = new Set(shuffle(owners, createRng(`${seed}:quota`)).slice(0, total % owners.length));
  return new Map(owners.map((owner) => [owner, base + (extra.has(owner) ? 1 : 0)]));
};

// R-303, R-304 e R-306. Se a playlist de alguém não tem músicas suficientes, o que falta sai das dos outros.
export const distributePool = (
  playlists: readonly PlayerSongs[],
  total: number,
  allowRepeats: boolean,
  seed: string,
): Result<Pool, "no_playlists_imported" | "not_enough_unique_songs"> => {
  const withSongs = playlists.filter((p) => p.songs.length > 0);
  if (withSongs.length === 0) return err("no_playlists_imported");

  const rng = createRng(`${seed}:songs`);
  const quota = splitQuota(total, withSongs.map((p) => p.player_uuid), seed);
  // Cada playlist embaralhada, como fila de candidatas.
  const queues = new Map(withSongs.map((p) => [p.player_uuid, [...shuffle(p.songs, rng)]]));
  const picked: Song[] = [];
  const used = new Set<string>();

  // Sem repetição, a chave é global (R-304); com repetição, só não repete dentro da mesma playlist.
  const scoped = (song: Song) => (allowRepeats ? `${song.contributed_by}\u0000${songKey(song)}` : songKey(song));
  const take = (owner: PlayerUuid): boolean => {
    const queue = queues.get(owner) ?? [];
    for (let song = queue.shift(); song !== undefined; song = queue.shift()) {
      if (used.has(scoped(song))) continue;
      used.add(scoped(song));
      picked.push(song);
      return true;
    }
    return false;
  };

  let missing = 0;
  for (const p of withSongs) {
    for (let i = 0; i < (quota.get(p.player_uuid) ?? 0); i++) if (!take(p.player_uuid)) missing++;
  }
  // Completa o que faltou com as outras playlists, uma música de cada por vez.
  const owners = shuffle(withSongs.map((p) => p.player_uuid), rng);
  while (missing > 0) {
    let progress = false;
    for (const owner of owners) {
      if (missing > 0 && take(owner)) {
        missing--;
        progress = true;
      }
    }
    if (!progress) return err("not_enough_unique_songs");
  }

  // O que sobrou nas filas, sem nada que já esteja na partida nem repetido entre si.
  const reserve: Song[] = [];
  for (const song of withSongs.flatMap((p) => queues.get(p.player_uuid) ?? [])) {
    if (used.has(scoped(song))) continue;
    used.add(scoped(song));
    reserve.push(song);
  }
  return ok({ ordered: shuffle(picked, rng), reserve: shuffle(reserve, rng) });
};
