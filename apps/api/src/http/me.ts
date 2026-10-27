// Direitos do titular (docs/privacy.md, art. 18): exportar e apagar os próprios dados, por endpoint e na hora. A
// identidade é a da sessão, como em toda rota (ADR-0013.R1).
import { createRoute, z } from "@hono/zod-openapi";
import { ErrorResponse, MeExportResponse } from "@merma/schema";
import type { ProgressionStore } from "../progression/solo.ts";
import type { PlaylistIntegration } from "../playlist/system.ts";
import type { MatchRepository } from "../room/ports.ts";
import type { OpenApiApp } from "./app.ts";
import type { Logger } from "./logger.ts";
import { toWirePlaylist } from "./playlists.ts";
import { replaceIdentity } from "./session.ts";
import { toWireSolo } from "./solo.ts";

const json = <S extends z.ZodType>(schema: S, description: string) => ({
  description,
  content: { "application/json": { schema } },
});
const unavailable = json(ErrorResponse, "Postgres fora do ar; a exclusão pode ser repetida");

const exportRoute = createRoute({
  method: "get",
  path: "/api/v1/me/export",
  responses: { 200: json(MeExportResponse, "Tudo o que o servidor guarda do jogador"), 503: unavailable },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/api/v1/me",
  responses: {
    204: { description: "Dados apagados; o histórico fica anonimizado e a resposta traz uma sessão nova" },
    403: json(ErrorResponse, "Origin fora da allowlist (S-04)"),
    503: unavailable,
  },
});

export type MeRouteDeps = Readonly<{
  playlists: Pick<PlaylistIntegration, "store" | "accounts" | "jobs" | "spotify">;
  progression: ProgressionStore;
  matches: MatchRepository;
  secret: string;
  now: () => number;
  logger: Logger;
}>;

const STORE_DOWN = { code: "internal_error" as const, message: "Tente de novo." };
const iso = (ms: number) => new Date(ms).toISOString();
const seconds = (ms: number | null) => (ms === null ? null : ms / 1000);

export const meRoutes = (app: OpenApiApp, deps: MeRouteDeps) =>
  app
    .openapi(exportRoute, async (c) => {
      const player = c.get("session").player_uuid;
      const [accounts, playlists, progress, known, history] = await Promise.all([
        deps.playlists.accounts.list(player),
        deps.playlists.store.exportAll(player),
        deps.progression.progress(player),
        deps.progression.knownSongs(player),
        deps.matches.history(player),
      ]);
      if (!accounts.ok || !playlists.ok || !progress.ok || !known.ok || !history.ok) return c.json(STORE_DOWN, 503);
      deps.logger.info("data_export_requested", { player_uuid: player });
      const body: z.infer<typeof MeExportResponse> = {
        player_uuid: player,
        exported_at: iso(deps.now()),
        connected_accounts: accounts.value.map((a) => ({ platform: a.platform, external_user_id: a.external_user_id, connected_at: iso(a.connected_at) })),
        playlists: playlists.value.map((p) => ({ ...toWirePlaylist(p), songs: [...p.songs] })),
        solo: { ...toWireSolo(progress.value), known_songs: known.value.map((k) => ({ playlist_id: k.playlist_id, song_keys: [...k.song_keys] })) },
        matches: history.value.map((m) => ({
          match_id: m.match_id,
          config: { ...m.config, time_per_round: Math.round(m.config.time_per_round / 1000) },
          started_at: iso(m.started_at),
          ended_at: iso(m.ended_at),
          total_points: m.total_points,
          rounds: m.rounds.map((r) => ({ ...r, response_time: seconds(r.response_time) })),
        })),
      };
      return c.json(body, 200, { "Cache-Control": "no-store, private", "Content-Disposition": 'attachment; filename="merma-meus-dados.json"' });
    })
    .openapi(deleteRoute, async (c) => {
      const player = c.get("session").player_uuid;
      // Tokens primeiro (o dado mais sensível), depois o resto. Cada passo é idempotente: se um falhar, o jogador
      // repete o pedido e o que já saiu não volta.
      deps.playlists.jobs.forget(player);
      const steps = [
        () => deps.playlists.accounts.delete(player, "spotify"),
        async () => (deps.playlists.spotify === null ? { ok: true as const, value: undefined } : deps.playlists.spotify.accounts.disconnect(player)),
        () => deps.playlists.store.deleteAll(player),
        () => deps.progression.deleteAll(player),
        () => deps.matches.anonymize(player),
      ];
      for (const step of steps) {
        const done = await step();
        if (!done.ok) {
          deps.logger.error("account_delete_failed", { player_uuid: player });
          return c.json(STORE_DOWN, 503);
        }
      }
      deps.logger.info("account_deleted", { player_uuid: player });
      if (!(await replaceIdentity(c, { secret: deps.secret, now: deps.now }))) return c.json(STORE_DOWN, 503);
      return c.body(null, 204);
    });
