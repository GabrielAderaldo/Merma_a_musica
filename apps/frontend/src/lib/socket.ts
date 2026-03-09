import { Socket } from 'phoenix';
import type { Channel } from 'phoenix';
import type { RoomState, Song } from './types';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/socket';

let socket: Socket | null = null;
let channel: Channel | null = null;

export function connectSocket(playerId: string, playerName: string): Socket {
	if (socket?.isConnected()) return socket;

	socket = new Socket(SOCKET_URL, {
		params: { player_id: playerId, player_name: playerName }
	});

	socket.connect();
	return socket;
}

export function disconnectSocket() {
	if (channel) {
		channel.leave();
		channel = null;
	}
	if (socket) {
		socket.disconnect();
		socket = null;
	}
}

export function getChannel(): Channel | null {
	return channel;
}

interface RoomCallbacks {
	onJoin?: (state: RoomState) => void;
	onError?: (reason: string) => void;
	onPlayerJoined?: (player: { id: string; name: string }) => void;
	onPlayerLeft?: (data: { player_id: string }) => void;
	onPlayerReady?: (data: { player_id: string }) => void;
	onPlayerUnready?: (data: { player_id: string }) => void;
	onGameStarted?: (data: { round: { song: Song; round_index: number; total_rounds: number } }) => void;
	onRoundStarted?: (data: { round: { song: Song; round_index: number; total_rounds: number } }) => void;
	onAnswerResult?: (data: { player_id: string; is_correct: boolean; points: number }) => void;
	onRoundEnded?: (data: { scores: Record<string, number> }) => void;
	onGameEnded?: (data: { final_scores: Record<string, number>; winner_id: string }) => void;
}

export function joinRoom(
	inviteCode: string,
	playlist: Song[],
	callbacks: RoomCallbacks
): Channel {
	if (!socket) throw new Error('Socket not connected');

	channel = socket.channel(`room:${inviteCode}`, { playlist });

	channel
		.join()
		.receive('ok', () => {
			// room_state is sent separately via push after join
		})
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		.receive('error', (resp: any) => {
			callbacks.onError?.(resp.reason);
		});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const on = (event: string, cb: (msg: any) => void) => channel!.on(event, cb);
	on('room_state', (msg) => callbacks.onJoin?.(msg));
	on('player_joined', (msg) => callbacks.onPlayerJoined?.(msg));
	on('player_left', (msg) => callbacks.onPlayerLeft?.(msg));
	on('player_ready', (msg) => callbacks.onPlayerReady?.(msg));
	on('player_unready', (msg) => callbacks.onPlayerUnready?.(msg));
	on('game_started', (msg) => callbacks.onGameStarted?.(msg));
	on('round_started', (msg) => callbacks.onRoundStarted?.(msg));
	on('answer_result', (msg) => callbacks.onAnswerResult?.(msg));
	on('round_ended', (msg) => callbacks.onRoundEnded?.(msg));
	on('game_ended', (msg) => callbacks.onGameEnded?.(msg));

	return channel;
}

export function markReady() {
	channel?.push('mark_ready', {});
}

export function markUnready() {
	channel?.push('mark_unready', {});
}

export function startGame() {
	channel?.push('start_game', {});
}

export function submitAnswer(text: string, time: number) {
	channel?.push('submit_answer', { text, time });
}
