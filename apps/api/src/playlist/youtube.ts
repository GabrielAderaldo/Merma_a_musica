// YouTube Data API v3 só com chave, para playlist pública do YouTube ou do YouTube Music (ADR-0024). Sem ISRC: cada
// vídeo vira uma busca na Deezer pelo título limpo. Do YouTube só ficam o ID e o nome da playlist (ADR-0024.R2).
import { z } from "zod";
import { type Fetch, requestJson } from "./http.ts";
import { err, ok, type Result } from "./result.ts";
import type { Candidate, SourceError, SourcePlaylist } from "./types.ts";

const API = "https://www.googleapis.com/youtube/v3";
const HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);

// O ID vem do parâmetro list, em /playlist?list=… ou num /watch?v=…&list=….
export const parseYoutubeLink = (url: URL): string | null => {
  if (!HOSTS.has(url.hostname)) return null;
  const list = url.searchParams.get("list");
  return list !== null && /^[A-Za-z0-9_-]{10,64}$/.test(list) ? list : null;
};

const Playlists = z.object({ items: z.array(z.object({ snippet: z.object({ title: z.string() }) })) });
const Items = z.object({
  nextPageToken: z.string().optional(),
  items: z.array(z.object({ snippet: z.object({ title: z.string(), videoOwnerChannelTitle: z.string().optional() }) })),
});

// Canal gerado pelo YouTube Music para o artista ("Queen - Topic"): o nome do canal é o artista.
const TOPIC = / - Topic$/;

// Vídeo apagado ou privado vem sem o canal de quem o publicou e fica fora.
export const videoCandidate = (title: string, channel: string | undefined): Candidate | null => {
  if (channel === undefined) return null;
  const artist = TOPIC.test(channel) ? channel.replace(TOPIC, "") : "";
  return { kind: "lookup", label: title, query: `${artist} ${title}`, isrc: null };
};

export const youtubeClient = (deps: { fetch: Fetch; apiKey: string; maxSongs: number }) => ({
  playlist: async (id: string): Promise<Result<SourcePlaylist, SourceError>> => {
    const key = `key=${encodeURIComponent(deps.apiKey)}`;
    const meta = await requestJson(deps.fetch, `${API}/playlists?part=snippet&id=${id}&${key}`, Playlists);
    if (!meta.ok) return err(meta.error === "not_found" ? "playlist_not_found" : "provider_unavailable");
    const snippet = meta.value.items[0]?.snippet;
    // Playlist privada ou inexistente volta com items vazio.
    if (snippet === undefined) return err("playlist_not_found");
    const candidates: Candidate[] = [];
    let page = "";
    while (candidates.length < deps.maxSongs) {
      const url = `${API}/playlistItems?part=snippet&maxResults=50&playlistId=${id}&${key}${page && `&pageToken=${page}`}`;
      const items = await requestJson(deps.fetch, url, Items);
      if (!items.ok) return err("provider_unavailable");
      for (const { snippet: s } of items.value.items) {
        const candidate = videoCandidate(s.title, s.videoOwnerChannelTitle);
        if (candidate !== null) candidates.push(candidate);
      }
      if (items.value.nextPageToken === undefined) break;
      page = encodeURIComponent(items.value.nextPageToken);
    }
    return ok({
      platform: "youtube_music",
      external_id: id,
      name: snippet.title,
      // A miniatura também é dado da YouTube API (ADR-0024.R2): a capa vem da 1ª música achada na Deezer.
      cover_url: null,
      candidates: candidates.slice(0, deps.maxSongs),
    });
  },
});
export type YoutubeClient = ReturnType<typeof youtubeClient>;
