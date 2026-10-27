CREATE TABLE "solo_known_songs" (
	"player_uuid" uuid,
	"playlist_id" uuid,
	"song_key" text,
	CONSTRAINT "solo_known_songs_pkey" PRIMARY KEY("player_uuid","playlist_id","song_key")
);
--> statement-breakpoint
CREATE TABLE "solo_personal_bests" (
	"player_uuid" uuid,
	"playlist_id" uuid,
	"answer_type" text,
	"time_per_round_ms" integer,
	"avg_points_per_song" double precision NOT NULL,
	"max_streak" integer NOT NULL,
	"avg_response_time_ms" double precision,
	"known_songs" integer NOT NULL,
	"match_id" uuid NOT NULL,
	"achieved_at" timestamp with time zone NOT NULL,
	CONSTRAINT "solo_personal_bests_pkey" PRIMARY KEY("player_uuid","playlist_id","answer_type","time_per_round_ms")
);
--> statement-breakpoint
CREATE TABLE "solo_player_stats" (
	"player_uuid" uuid PRIMARY KEY,
	"max_streak" integer NOT NULL,
	"fastest_correct_ms" integer,
	"solo_matches_completed" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solo_playlist_stats" (
	"player_uuid" uuid,
	"playlist_id" uuid,
	"max_streak" integer NOT NULL,
	"response_time_total_ms" double precision NOT NULL,
	"answers" integer NOT NULL,
	"last_played_at" timestamp with time zone NOT NULL,
	CONSTRAINT "solo_playlist_stats_pkey" PRIMARY KEY("player_uuid","playlist_id")
);
