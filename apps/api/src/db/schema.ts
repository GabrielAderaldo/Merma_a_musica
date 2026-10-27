// Schema Drizzle do Postgres (ADR-0006): o histórico de partidas (a escrita única em `completed`,
// docs/architecture.md), os recordes do solo (Progression) e as playlists do jogador (Playlist Integration).
// Sem answer_text nem nickname (docs/privacy.md); o schema.test.ts confere.
import type { MatchConfiguration } from "@merma/domain";
import type { AnswerType, Platform } from "@merma/schema";
import {
  boolean,
  doublePrecision,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const instant = () => timestamp({ withTimezone: true, mode: "date" }).notNull();

export const matches = pgTable("matches", {
  match_id: uuid().primaryKey(),
  room_id: uuid().notNull(),
  // Como a engine guarda: time_per_round em ms (Duration).
  config: jsonb().$type<MatchConfiguration>().notNull(),
  started_at: instant(),
  ended_at: instant(),
});

export const matchScores = pgTable(
  "match_scores",
  {
    match_id: uuid()
      .notNull()
      .references(() => matches.match_id, { onDelete: "cascade" }),
    player_uuid: uuid().notNull(),
    total_points: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.match_id, t.player_uuid] })],
);

export const matchRounds = pgTable(
  "match_rounds",
  {
    match_id: uuid()
      .notNull()
      .references(() => matches.match_id, { onDelete: "cascade" }),
    round_index: integer().notNull(),
    isrc: text(),
  },
  (t) => [primaryKey({ columns: [t.match_id, t.round_index] })],
);

// Uma linha por jogador que respondeu na rodada. Quem não respondeu não tem linha.
export const roundAnswers = pgTable(
  "round_answers",
  {
    match_id: uuid().notNull(),
    round_index: integer().notNull(),
    player_uuid: uuid().notNull(),
    is_correct: boolean().notNull(),
    is_near_miss: boolean().notNull(),
    points: integer().notNull(),
    // Milissegundos (Duration); null se não respondeu.
    response_time_ms: integer(),
  },
  (t) => [
    primaryKey({ columns: [t.match_id, t.round_index, t.player_uuid] }),
    foreignKey({ columns: [t.match_id, t.round_index], foreignColumns: [matchRounds.match_id, matchRounds.round_index] }).onDelete(
      "cascade",
    ),
  ],
);

// --- Progression: recordes do solo (R-504 a R-506) ------------------------------------------------------------
// Sem FK para matches: a Progression não depende das tabelas do Orchestrator, e as duas gravações são separadas.

// R-504: um recorde por (player, playlist, answer_type, time_per_round), com os números da partida que o fez.
export const soloPersonalBests = pgTable(
  "solo_personal_bests",
  {
    player_uuid: uuid().notNull(),
    playlist_id: uuid().notNull(),
    answer_type: text().$type<AnswerType>().notNull(),
    time_per_round_ms: integer().notNull(),
    avg_points_per_song: doublePrecision().notNull(),
    max_streak: integer().notNull(),
    avg_response_time_ms: doublePrecision(),
    known_songs: integer().notNull(),
    match_id: uuid().notNull(),
    achieved_at: instant(),
  },
  (t) => [primaryKey({ columns: [t.player_uuid, t.playlist_id, t.answer_type, t.time_per_round_ms] })],
);

// R-505. O tempo médio é soma ÷ respostas de todas as partidas solo na playlist.
export const soloPlaylistStats = pgTable(
  "solo_playlist_stats",
  {
    player_uuid: uuid().notNull(),
    playlist_id: uuid().notNull(),
    max_streak: integer().notNull(),
    response_time_total_ms: doublePrecision().notNull(),
    answers: integer().notNull(),
    last_played_at: instant(),
  },
  (t) => [primaryKey({ columns: [t.player_uuid, t.playlist_id] })],
);

// R-505 e R-506: músicas distintas já acertadas, pela chave de R-304 (ISRC ou nome e artista normalizados).
export const soloKnownSongs = pgTable(
  "solo_known_songs",
  {
    player_uuid: uuid().notNull(),
    playlist_id: uuid().notNull(),
    song_key: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.player_uuid, t.playlist_id, t.song_key] })],
);

// R-506
export const soloPlayerStats = pgTable("solo_player_stats", {
  player_uuid: uuid().primaryKey(),
  max_streak: integer().notNull(),
  fastest_correct_ms: integer(),
  solo_matches_completed: integer().notNull(),
});

// --- Playlist Integration: playlists do jogador e conta do Spotify (R-002, R-010, ADR-0026) ----------------------

// Reimportar a mesma playlist (mesma origem e external_id) troca as músicas e mantém o playlist_id, e com ele os
// recordes. A lista colada tem external_id null e vira sempre uma playlist nova (null não colide no unique).
export const playlists = pgTable(
  "playlists",
  {
    playlist_id: uuid().primaryKey(),
    player_uuid: uuid().notNull(),
    platform: text().$type<Platform>().notNull(),
    external_id: text(),
    name: text().notNull(),
    cover_url: text(),
    imported_at: instant(),
  },
  // O unique começa por player_uuid e serve também à listagem por jogador.
  (t) => [unique().on(t.player_uuid, t.platform, t.external_id)],
);

// As músicas já achadas na Deezer (R-010). Da YouTube API nada fica aqui (ADR-0026.R2).
export const playlistSongs = pgTable(
  "playlist_songs",
  {
    playlist_id: uuid()
      .notNull()
      .references(() => playlists.playlist_id, { onDelete: "cascade" }),
    position: integer().notNull(),
    deezer_id: text().notNull(),
    isrc: text(),
    name: text().notNull(),
    artist: text().notNull(),
    album: text(),
    cover_url: text(),
  },
  (t) => [primaryKey({ columns: [t.playlist_id, t.position] })],
);

// ConnectedAccount: só o Spotify tem login (R-002). O refresh token vai cifrado (ADR-0006.R3).
export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    player_uuid: uuid().notNull(),
    platform: text().$type<"spotify">().notNull(),
    external_user_id: text().notNull(),
    refresh_token_encrypted: text().notNull(),
    connected_at: instant(),
  },
  (t) => [primaryKey({ columns: [t.player_uuid, t.platform] })],
);
