import { writable, derived } from 'svelte/store';
import type { Player, RoomState, Song, RoundInfo, MatchResult, AnswerFeedback, RoomConfig } from './types';
import { DEFAULT_CONFIG } from './types';

// --- Identidade do jogador (persistido em sessionStorage) ---

function createPlayerStore() {
	const stored =
		typeof sessionStorage !== 'undefined'
			? JSON.parse(sessionStorage.getItem('player') || 'null')
			: null;

	const { subscribe, set, update } = writable<{ id: string; name: string } | null>(stored);

	return {
		subscribe,
		update,
		login(name: string) {
			const id = crypto.randomUUID();
			const player = { id, name };
			set(player);
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.setItem('player', JSON.stringify(player));
			}
			return player;
		},
		restore() {
			if (typeof sessionStorage !== 'undefined') {
				const data = sessionStorage.getItem('player');
				if (data) {
					const player = JSON.parse(data);
					set(player);
					return player;
				}
			}
			return null;
		},
		clear() {
			set(null);
			if (typeof sessionStorage !== 'undefined') {
				sessionStorage.removeItem('player');
			}
		}
	};
}

export const player = createPlayerStore();

// --- Estado da sala ---

export const room = writable<RoomState | null>(null);

export const players = derived(room, ($room) => $room?.players ?? []);

export const isHost = derived([room, player], ([$room, $player]) => {
	return $room !== null && $player !== null && $room.host_id === $player.id;
});

export const allReady = derived(players, ($players) => {
	return $players.length >= 2 && $players.every((p: Player) => p.ready);
});

export const roomStatus = derived(room, ($room) => $room?.status ?? 'lobby');

// --- Configuração da partida ---

export const roomConfig = writable<RoomConfig>({ ...DEFAULT_CONFIG });

// --- Estado do jogo ---

export const currentRound = writable<RoundInfo | null>(null);

export const scores = writable<Record<string, number>>({});

export const matchResult = writable<MatchResult | null>(null);

export const myPlaylist = writable<Song[]>([]);

export const lastFeedback = writable<AnswerFeedback | null>(null);

// Todas as músicas disponíveis (de todas as playlists dos jogadores) para autocomplete
export const allSongs = writable<Song[]>([]);

// --- Conexão ---

export const connectionError = writable<string | null>(null);

export const isConnected = writable(false);
