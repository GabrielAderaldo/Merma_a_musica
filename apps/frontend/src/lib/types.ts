export interface Player {
	id: string;
	name: string;
	ready: boolean;
	connection_status: 'connected' | 'disconnected' | 'reconnecting';
	score?: number;
}

export interface RoomState {
	invite_code: string;
	host_id: string;
	status: 'lobby' | 'in_game' | 'finished';
	players: Player[];
	current_round?: number;
	total_rounds?: number;
}

export interface Song {
	id: string;
	name: string;
	artist: string;
	preview_url: string;
}

export interface Playlist {
	id: string;
	name: string;
	total: number;
}

export interface RoomConfig {
	time_per_round: number;
	total_songs: number;
	answer_type: 'song_name' | 'artist_name' | 'both';
	scoring_rule: 'simple' | 'speed_bonus';
}

export interface RoundInfo {
	round_index: number;
	song: Song;
	total_rounds: number;
}

export interface AnswerFeedback {
	player_id: string;
	is_correct: boolean;
	points: number;
}

export interface RoundResult {
	scores: Record<string, number>;
}

export interface MatchResult {
	final_scores: Record<string, number>;
	winner_id: string;
}

export const DEFAULT_CONFIG: RoomConfig = {
	time_per_round: 15,
	total_songs: 4,
	answer_type: 'song_name',
	scoring_rule: 'speed_bonus'
};

export const PLATFORM_LABELS: Record<string, string> = {
	spotify: 'Spotify',
	deezer: 'Deezer',
	youtube_music: 'YouTube Music'
};
