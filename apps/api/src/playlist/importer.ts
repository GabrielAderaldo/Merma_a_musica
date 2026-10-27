// Importação assíncrona da playlist do jogador (R-002, R-010, ADR-0024): lê a fonte, procura cada música na Deezer e
// grava só o que achou. O cliente acompanha por polling; o job vive na memória do processo e some 10 min depois de
// terminar (num restart, o jogador importa de novo).
import type { ErrorCode, ImportPlaylistRequest } from "@merma/schema";
import type { Logger } from "../http/logger.ts";
import type { SpotifyAccounts } from "./accounts.ts";
import { type DeezerClient, parseDeezerLink } from "./deezer.ts";
import { resolveCandidate } from "./resolve.ts";
import { err, ok, type Result } from "./result.ts";
import type { PlaylistStore } from "./store.ts";
import { textPlaylist } from "./text.ts";
import type { SourceError, SourcePlaylist, StoredSong } from "./types.ts";
import { parseYoutubeLink, type YoutubeClient } from "./youtube.ts";

// S-25: 5 importações simultâneas por player_uuid.
export const MAX_CONCURRENT_IMPORTS = 5;
const KEEP_FINISHED_MS = 10 * 60_000;

export type ImportJob = {
  job_id: string;
  player_uuid: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  progress: { done: number; total: number };
  playlist_id: string | null;
  not_found: string[];
  error_code: ErrorCode | null;
  finished_at: number | null;
};

export type StartError = "invalid_playlist_link" | "provider_unavailable" | "platform_not_connected" | "rate_limited";

export type ImportDeps = Readonly<{
  deezer: DeezerClient;
  youtube: YoutubeClient | null;
  spotify: SpotifyAccounts | null;
  store: PlaylistStore;
  newId: () => string;
  now: () => number;
  logger: Logger;
  maxSongs: number;
}>;

type Load = () => Promise<Result<SourcePlaylist, SourceError>>;

export class ImportJobs {
  readonly #deps: ImportDeps;
  readonly #jobs = new Map<string, ImportJob>();
  readonly #running = new Set<Promise<void>>();

  constructor(deps: ImportDeps) {
    this.#deps = deps;
  }

  async start(player: string, request: ImportPlaylistRequest): Promise<Result<string, StartError>> {
    this.#sweep();
    const active = [...this.#jobs.values()].filter((j) => j.player_uuid === player && j.finished_at === null);
    if (active.length >= MAX_CONCURRENT_IMPORTS) return err("rate_limited");
    const load = await this.#source(player, request);
    if (!load.ok) return load;
    const job: ImportJob = {
      job_id: this.#deps.newId(),
      player_uuid: player,
      status: "queued",
      progress: { done: 0, total: 0 },
      playlist_id: null,
      not_found: [],
      error_code: null,
      finished_at: null,
    };
    this.#jobs.set(job.job_id, job);
    const run = this.#run(job, load.value).finally(() => this.#running.delete(run));
    this.#running.add(run);
    return ok(job.job_id);
  }

  // Job de outro jogador vale como inexistente.
  get(player: string, job_id: string): Readonly<ImportJob> | null {
    this.#sweep();
    const job = this.#jobs.get(job_id);
    return job === undefined || job.player_uuid !== player ? null : job;
  }

  // Espera os jobs em andamento (testes e desligamento).
  async idle(): Promise<void> {
    while (this.#running.size > 0) await Promise.all(this.#running);
  }

  // A validação que dá para fazer antes de aceitar: o link é reconhecido e a fonte está configurada.
  async #source(player: string, request: ImportPlaylistRequest): Promise<Result<Load, StartError>> {
    const { deezer, youtube, spotify, maxSongs } = this.#deps;
    switch (request.source) {
      case "text":
        return ok(async () => ok(textPlaylist(request.name, request.text, maxSongs)));
      case "spotify": {
        if (spotify === null) return err("provider_unavailable");
        const token = await spotify.accessToken(player);
        if (!token.ok) return err(token.error === "platform_not_connected" ? "platform_not_connected" : "provider_unavailable");
        return ok(() => spotify.client.playlist(token.value, request.external_id));
      }
      case "link": {
        const url = URL.parse(request.url);
        if (url === null || url.protocol !== "https:") return err("invalid_playlist_link");
        const deezerId = parseDeezerLink(url);
        if (deezerId !== null) return ok(() => deezer.playlist(deezerId));
        const youtubeId = parseYoutubeLink(url);
        if (youtubeId === null) return err("invalid_playlist_link");
        return youtube === null ? err("provider_unavailable") : ok(() => youtube.playlist(youtubeId));
      }
    }
  }

  async #run(job: ImportJob, load: Load): Promise<void> {
    job.status = "in_progress";
    const source = await load();
    if (!source.ok) return this.#fail(job, source.error);
    job.progress.total = source.value.candidates.length;
    const songs: StoredSong[] = [];
    const seen = new Set<string>();
    for (const candidate of source.value.candidates) {
      const found = await resolveCandidate(this.#deps.deezer, candidate);
      if (!found.ok) return this.#fail(job, found.error);
      if (found.value === null) {
        if (candidate.kind === "lookup") job.not_found.push(candidate.label);
      } else if (!seen.has(found.value.deezer_id)) {
        seen.add(found.value.deezer_id);
        songs.push(found.value);
      }
      job.progress.done++;
    }
    if (songs.length === 0) return this.#fail(job, "no_songs_found");
    const { platform, external_id, name, cover_url } = source.value;
    const saved = await this.#deps.store.save(
      {
        player_uuid: job.player_uuid,
        platform,
        external_id,
        name,
        cover_url: cover_url ?? songs[0]?.cover_url ?? null,
        songs,
        imported_at: this.#deps.now(),
      },
      this.#deps.newId,
    );
    if (!saved.ok) return this.#fail(job, "internal_error");
    job.status = "completed";
    job.playlist_id = saved.value.playlist_id;
    job.finished_at = this.#deps.now();
    this.#deps.logger.info("playlist_imported", {
      player_uuid: job.player_uuid,
      platform,
      songs: songs.length,
      not_found: job.not_found.length,
    });
  }

  #fail(job: ImportJob, error: ErrorCode): void {
    job.status = "failed";
    job.error_code = error;
    job.finished_at = this.#deps.now();
    this.#deps.logger.warn("playlist_import_failed", { player_uuid: job.player_uuid, error });
  }

  #sweep(): void {
    const now = this.#deps.now();
    for (const [id, job] of this.#jobs) if (job.finished_at !== null && now - job.finished_at > KEEP_FINISHED_MS) this.#jobs.delete(id);
  }
}
