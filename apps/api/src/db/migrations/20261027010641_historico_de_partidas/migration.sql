CREATE TABLE "match_rounds" (
	"match_id" uuid,
	"round_index" integer,
	"isrc" text,
	CONSTRAINT "match_rounds_pkey" PRIMARY KEY("match_id","round_index")
);
--> statement-breakpoint
CREATE TABLE "match_scores" (
	"match_id" uuid,
	"player_uuid" uuid,
	"total_points" integer NOT NULL,
	CONSTRAINT "match_scores_pkey" PRIMARY KEY("match_id","player_uuid")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"match_id" uuid PRIMARY KEY,
	"room_id" uuid NOT NULL,
	"config" jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_answers" (
	"match_id" uuid,
	"round_index" integer,
	"player_uuid" uuid,
	"is_correct" boolean NOT NULL,
	"is_near_miss" boolean NOT NULL,
	"points" integer NOT NULL,
	"response_time_ms" integer,
	CONSTRAINT "round_answers_pkey" PRIMARY KEY("match_id","round_index","player_uuid")
);
--> statement-breakpoint
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_match_id_matches_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_match_id_matches_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "round_answers" ADD CONSTRAINT "round_answers_EXaTiTHVF8vw_fkey" FOREIGN KEY ("match_id","round_index") REFERENCES "match_rounds"("match_id","round_index") ON DELETE CASCADE;