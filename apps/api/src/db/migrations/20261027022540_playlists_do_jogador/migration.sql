CREATE TABLE "connected_accounts" (
	"player_uuid" uuid,
	"platform" text,
	"external_user_id" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"connected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "connected_accounts_pkey" PRIMARY KEY("player_uuid","platform")
);
--> statement-breakpoint
CREATE TABLE "playlist_songs" (
	"playlist_id" uuid,
	"position" integer,
	"deezer_id" text NOT NULL,
	"isrc" text,
	"name" text NOT NULL,
	"artist" text NOT NULL,
	"album" text,
	"cover_url" text,
	CONSTRAINT "playlist_songs_pkey" PRIMARY KEY("playlist_id","position")
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"playlist_id" uuid PRIMARY KEY,
	"player_uuid" uuid NOT NULL,
	"platform" text NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"cover_url" text,
	"imported_at" timestamp with time zone NOT NULL,
	CONSTRAINT "playlists_player_uuid_platform_external_id_unique" UNIQUE("player_uuid","platform","external_id")
);
--> statement-breakpoint
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_playlist_id_playlists_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("playlist_id") ON DELETE CASCADE;