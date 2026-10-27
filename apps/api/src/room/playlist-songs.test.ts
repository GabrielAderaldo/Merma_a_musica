import { describe, expect, test } from "bun:test";
import { Isrc, PlayerUuid, PlaylistId } from "@merma/domain";
import { MemoryPlaylistStore } from "../playlist/store.ts";
import { playlistSongs } from "./playlist-songs.ts";

const must = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) return expect.unreachable(String(r.error));
  return r.value;
};

describe("SongSource sobre as playlists do jogador", () => {
  const setup = async () => {
    const store = new MemoryPlaylistStore();
    const owner = must(PlayerUuid(crypto.randomUUID()));
    const saved = must(
      await store.save(
        {
          player_uuid: owner,
          platform: "text",
          external_id: null,
          name: "Colada",
          cover_url: null,
          songs: [
            { deezer_id: "1", isrc: "BRXXX2600001", name: "Envolver", artist: "Anitta", album: "A", cover_url: null },
            { deezer_id: "2", isrc: "isrc-quebrado", name: "Infiel", artist: "Marília Mendonça", album: null, cover_url: null },
          ],
          imported_at: 1,
        },
        () => crypto.randomUUID(),
      ),
    );
    return { source: playlistSongs(store), owner, playlist: must(PlaylistId(saved.playlist_id)) };
  };

  test("R-130 e R-010: a música vira Song com o jogador como dono e a origem da playlist; ISRC inválido vira null", async () => {
    const { source, owner, playlist } = await setup();
    const found = must(await source.playlist(owner, playlist));
    expect(found.platform).toBe("text");
    expect(found.playable_songs).toBe(2);
    expect(found.songs).toEqual([
      { isrc: must(Isrc("BRXXX2600001")), name: "Envolver", artist: "Anitta", album: "A", cover_url: null, contributed_by: owner, source_platform: "text" },
      { isrc: null, name: "Infiel", artist: "Marília Mendonça", album: null, cover_url: null, contributed_by: owner, source_platform: "text" },
    ]);
  });

  test("playlist de outro jogador não pode ser escolhida", async () => {
    const { source, playlist } = await setup();
    expect(await source.playlist(must(PlayerUuid(crypto.randomUUID())), playlist)).toEqual({ ok: false, error: "no_playlists_imported" });
  });
});
