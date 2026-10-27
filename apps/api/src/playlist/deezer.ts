// API pública da Deezer, sem login (ADR-0024): playlist pública por link, faixa por ISRC e busca. É também a
// resolução de toda música importada (R-010).
import { z } from "zod";
import { type Fetch, type HttpError, requestJson } from "./http.ts";
import { err, ok, type Result } from "./result.ts";
import type { Candidate, SourceError, SourcePlaylist, StoredSong } from "./types.ts";

const API = "https://api.deezer.com";
const PAGE = 100;

// Link de playlist: deezer.com/playlist/{id} ou deezer.com/{idioma}/playlist/{id}. O link curto (link.deezer.com)
// ainda não entra: o ADR-0024.R3 não lista o host dele.
export const parseDeezerLink = (url: URL): string | null => {
  if (url.hostname !== "www.deezer.com" && url.hostname !== "deezer.com") return null;
  return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?playlist\/(\d{1,20})\/?$/.exec(url.pathname)?.[1] ?? null;
};

// A Deezer responde 200 com { error } quando não acha (código 800) ou recusa.
const DeezerError = z.object({ error: z.object({ code: z.number() }) });
const Track = z.object({
  id: z.number(),
  readable: z.boolean().optional(),
  title: z.string(),
  isrc: z.string().optional(),
  artist: z.object({ name: z.string() }),
  album: z.object({ title: z.string(), cover_medium: z.string().nullish() }).optional(),
  // URL assinada e com prazo do MP3 de 30s: pedida de novo a cada rodada, nunca guardada (ADR-0004).
  preview: z.string().optional(),
});
type Track = z.infer<typeof Track>;
const Playlist = z.object({ title: z.string(), public: z.boolean(), picture_medium: z.string().nullish() });
const Tracks = z.object({ data: z.array(Track), next: z.string().optional() });
const Search = z.object({ data: z.array(Track) });

const song = (t: Track): StoredSong => ({
  deezer_id: String(t.id),
  isrc: t.isrc ?? null,
  name: t.title,
  artist: t.artist.name,
  album: t.album?.title ?? null,
  cover_url: t.album?.cover_medium ?? null,
});

// ADR-0004.R4: 50 requisições a cada 5s por IP. A fila espera, não descarta. Um por processo.
export class DeezerThrottle {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #now: () => number;
  readonly #sleep: (ms: number) => Promise<void>;
  readonly #sent: number[] = [];
  #tail: Promise<void> = Promise.resolve();

  constructor(opts: { limit?: number; windowMs?: number; now?: () => number; sleep?: (ms: number) => Promise<void> } = {}) {
    this.#limit = opts.limit ?? 50;
    this.#windowMs = opts.windowMs ?? 5_000;
    this.#now = opts.now ?? Date.now;
    this.#sleep = opts.sleep ?? ((ms) => Bun.sleep(ms));
  }

  // Resolve quando a requisição pode sair. As chamadas saem na ordem em que chegaram.
  acquire(): Promise<void> {
    const turn = this.#tail.then(async () => {
      while (this.#sent.length > 0 && this.#now() - (this.#sent[0] ?? 0) >= this.#windowMs) this.#sent.shift();
      if (this.#sent.length >= this.#limit) {
        await this.#sleep(this.#windowMs - (this.#now() - (this.#sent[0] ?? 0)));
        this.#sent.shift();
      }
      this.#sent.push(this.#now());
    });
    this.#tail = turn;
    return turn;
  }
}

export type DeezerClient = Readonly<{
  playlist(id: string): Promise<Result<SourcePlaylist, SourceError>>;
  byIsrc(isrc: string): Promise<Result<StoredSong | null, "provider_unavailable">>;
  search(query: string): Promise<Result<readonly StoredSong[], "provider_unavailable">>;
  // URL do preview da faixa. null: a faixa sumiu, não toca na região ou não tem preview.
  preview(id: string): Promise<Result<string | null, "provider_unavailable">>;
}>;

export const deezerClient = (deps: { fetch: Fetch; throttle: DeezerThrottle; maxSongs: number }): DeezerClient => {
  const get = async <S extends z.ZodType>(path: string, schema: S): Promise<Result<z.infer<S> | null, HttpError>> => {
    await deps.throttle.acquire();
    const res = await requestJson(deps.fetch, `${API}${path}`, z.unknown());
    if (!res.ok) return res;
    const refused = DeezerError.safeParse(res.value);
    if (refused.success) return refused.data.error.code === 800 ? ok(null) : err("provider_unavailable");
    const parsed = schema.safeParse(res.value);
    return parsed.success ? ok(parsed.data) : err("provider_unavailable");
  };

  return {
    playlist: async (id) => {
      const meta = await get(`/playlist/${id}`, Playlist);
      if (!meta.ok) return err("provider_unavailable");
      // Playlist privada vale como inexistente: sem login, não há como lê-la (R-002).
      if (meta.value === null || !meta.value.public) return err("playlist_not_found");
      const candidates: Candidate[] = [];
      for (let index = 0; candidates.length < deps.maxSongs; index += PAGE) {
        const page = await get(`/playlist/${id}/tracks?index=${index}&limit=${PAGE}`, Tracks);
        if (!page.ok || page.value === null) return err("provider_unavailable");
        // readable: false é faixa que a Deezer não toca na região, então não tem áudio (R-010).
        for (const t of page.value.data) if (t.readable !== false) candidates.push({ kind: "found", song: song(t) });
        if (page.value.next === undefined || page.value.data.length === 0) break;
      }
      return ok({
        platform: "deezer",
        external_id: id,
        name: meta.value.title,
        cover_url: meta.value.picture_medium ?? null,
        candidates: candidates.slice(0, deps.maxSongs),
      });
    },
    // O endpoint track/isrc: funciona, mas não é documentado (ADR-0004).
    byIsrc: async (isrc) => {
      const res = await get(`/track/isrc:${encodeURIComponent(isrc)}`, Track);
      if (!res.ok) return err("provider_unavailable");
      return ok(res.value === null || res.value.readable === false ? null : song(res.value));
    },
    // Busca em texto livre: a sintaxe artist:"…" track:"…" falha com acento (aferido em 2026-10-26).
    search: async (query) => {
      const res = await get(`/search?limit=5&q=${encodeURIComponent(query)}`, Search);
      if (!res.ok) return err("provider_unavailable");
      return ok((res.value?.data ?? []).filter((t) => t.readable !== false).map(song));
    },
    preview: async (id) => {
      if (!/^\d{1,20}$/.test(id)) return ok(null);
      const res = await get(`/track/${id}`, Track);
      if (!res.ok) return err("provider_unavailable");
      const track = res.value;
      return ok(track === null || track.readable === false || !track.preview ? null : track.preview);
    },
  };
};
