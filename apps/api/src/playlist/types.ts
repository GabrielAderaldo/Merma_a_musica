// Modelo da Playlist Integration. Nada fora deste contexto vê o formato de uma plataforma (anti-corruption layer,
// docs/architecture.md): o que sai daqui já é a música achada na Deezer (R-010).
import type { Platform } from "@merma/schema";

// Uma música da playlist do jogador, como a Deezer a devolveu. O deezer_id fica no servidor (ADR-0025.R1).
export type StoredSong = Readonly<{
  deezer_id: string;
  isrc: string | null;
  name: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
}>;

// O que uma fonte (link, lista ou Spotify) entrega antes da resolução: ou a música já é da Deezer, ou é uma linha a
// procurar nela. `label` é o que o jogador reconhece no aviso de "não encontradas".
export type Candidate = Readonly<
  | { kind: "found"; song: StoredSong }
  | { kind: "lookup"; label: string; query: string; isrc: string | null }
>;

export type SourcePlaylist = Readonly<{
  platform: Platform;
  external_id: string | null;
  name: string;
  cover_url: string | null;
  candidates: readonly Candidate[];
}>;

// Falhas de uma fonte, já no vocabulário do ErrorCode do fio.
export type SourceError = "playlist_not_found" | "provider_unavailable" | "platform_not_connected";
