// Fixtures dos testes da Playlist Integration: respostas das APIs no formato que elas devolvem.

// Faixa da API da Deezer (aferida em 2026-10-26).
export const deezerTrack = (id: number, title: string, artist: string, extra: Record<string, unknown> = {}) => ({
  id,
  readable: true,
  title,
  isrc: `BRXXX26000${String(id).padStart(2, "0")}`,
  artist: { name: artist },
  album: { title: `${title} (Álbum)`, cover_medium: `https://cdn-images.dzcdn.net/${id}.jpg` },
  ...extra,
});
