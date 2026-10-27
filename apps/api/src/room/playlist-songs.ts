// Adapter do SongSource sobre o PlaylistStore: a música já achada na Deezer (R-010) vira a Song da engine, com o
// jogador como dono (R-130). O deezer_id vai junto para o áudio (ADR-0025); o fio nunca o leva (ADR-0025.R1).
import { err, Isrc, ok, type PlayerUuid, type Song } from "@merma/domain";
import type { PlaylistStore } from "../playlist/store.ts";
import type { StoredSong } from "../playlist/types.ts";
import type { SongSource } from "./ports.ts";

const toSong = (owner: PlayerUuid, platform: Song["source_platform"], s: StoredSong): Song => {
  const isrc = s.isrc === null ? null : Isrc(s.isrc);
  return {
    // ISRC fora do formato vale como ausente: a música cai na chave (nome, artista) de R-304.
    isrc: isrc?.ok ? isrc.value : null,
    name: s.name,
    artist: s.artist,
    album: s.album,
    cover_url: s.cover_url,
    contributed_by: owner,
    source_platform: platform,
    deezer_id: s.deezer_id,
  };
};

export const playlistSongs = (store: PlaylistStore): SongSource => ({
  playlist: async (player, playlist_id) => {
    const found = await store.songs(player, playlist_id);
    if (!found.ok) return err("source_unavailable");
    if (found.value === null || found.value.songs.length === 0) return err("no_playlists_imported");
    const { platform, songs } = found.value;
    return ok({ platform, playable_songs: songs.length, songs: songs.map((s) => toSong(player, platform, s)) });
  },
});
