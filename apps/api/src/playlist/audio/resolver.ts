// Áudio da rodada (ADR-0025, R-801): a faixa da Deezer, o preview dela e o MP3 já sem ID3. A faixa vem da importação
// (deezer_id); sem ela, do ISRC (cache no Redis, depois a API) e, por fim, da busca com a mesma regra da importação.
// Toda chamada à API passa pelo throttle do DeezerClient (ADR-0025.R4); o CDN do preview não conta nele.
import type { DeezerClient } from "../deezer.ts";
import type { Fetch } from "../http.ts";
import { matches, searchText } from "../resolve.ts";
import type { IsrcCache } from "./cache.ts";
import { stripId3 } from "./id3.ts";

export type AudioSong = Readonly<{ deezer_id: string | null; isrc: string | null; name: string; artist: string }>;

// O preview só sai do CDN da Deezer, por HTTPS.
const PREVIEW_HOST = /(^|\.)dzcdn\.net$/;
const TIMEOUT_MS = 10_000;
// Um preview de 30s tem ~500 KB; acima disso não é o preview.
const MAX_BYTES = 5 * 1024 * 1024;

export type PreviewResolver = Readonly<{
  // null: sem faixa, sem preview ou Deezer fora (5xx ou mais de 10s); a música sai pela reserva (R-307).
  resolve(song: AudioSong): Promise<Uint8Array<ArrayBuffer> | null>;
}>;

export const previewResolver = (deps: { deezer: DeezerClient; cache: IsrcCache; fetch: Fetch }): PreviewResolver => {
  const byIsrc = async (isrc: string): Promise<string | null> => {
    const cached = await deps.cache.get(isrc);
    if (cached.ok && cached.value !== null) return cached.value;
    const found = await deps.deezer.byIsrc(isrc);
    if (!found.ok || found.value === null) return null;
    // Cache fora do ar só custa uma chamada a mais na próxima vez.
    await deps.cache.set(isrc, found.value.deezer_id);
    return found.value.deezer_id;
  };

  const bySearch = async (song: AudioSong): Promise<string | null> => {
    const query = searchText(`${song.name} ${song.artist}`);
    if (query === "") return null;
    const found = await deps.deezer.search(query);
    return found.ok ? (found.value.find((s) => matches(query, s))?.deezer_id ?? null) : null;
  };

  const download = async (url: string): Promise<Uint8Array<ArrayBuffer> | null> => {
    const parsed = URL.parse(url);
    if (parsed === null || parsed.protocol !== "https:" || !PREVIEW_HOST.test(parsed.hostname)) return null;
    try {
      const response = await deps.fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) return null;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > MAX_BYTES) return null;
      const clean = stripId3(bytes);
      return clean.length === 0 ? null : clean;
    } catch {
      return null;
    }
  };

  return {
    resolve: async (song) => {
      const id = song.deezer_id ?? (song.isrc === null ? null : await byIsrc(song.isrc)) ?? (await bySearch(song));
      if (id === null) return null;
      const preview = await deps.deezer.preview(id);
      return preview.ok && preview.value !== null ? download(preview.value) : null;
    },
  };
};
