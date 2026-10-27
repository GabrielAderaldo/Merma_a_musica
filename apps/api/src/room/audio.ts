// Adapter do AudioResolver sobre o áudio da Playlist Integration (ADR-0025): a Song da engine vira o AudioSong de
// lá, que não importa a engine (ADR-0023.R1).
import type { PreviewResolver } from "../playlist/audio/resolver.ts";
import type { AudioTokens } from "../playlist/audio/token.ts";
import type { AudioResolver } from "./ports.ts";

export const deezerAudio = (deps: { previews: PreviewResolver; tokens: AudioTokens }): AudioResolver => ({
  resolve: async (_round_id, song) => {
    const mp3 = await deps.previews.resolve({ deezer_id: song.deezer_id ?? null, isrc: song.isrc, name: song.name, artist: song.artist });
    return mp3 === null ? null : { mp3 };
  },
  token: (player_uuid, round_id, expires_at) => deps.tokens.sign({ player_uuid, round_id, expires_at }),
});
