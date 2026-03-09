<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import {
		player,
		room,
		players,
		isHost,
		allReady,
		roomStatus,
		roomConfig,
		currentRound,
		scores,
		matchResult,
		connectionError,
		isConnected,
		myPlaylist,
		lastFeedback,
		allSongs
	} from '$lib/stores';
	import {
		connectSocket,
		joinRoom,
		disconnectSocket,
		markReady,
		startGame,
		submitAnswer
	} from '$lib/socket';
	import type { Player, RoomState, Song, AnswerFeedback } from '$lib/types';

	import PlaylistSelector from '$lib/components/PlaylistSelector.svelte';
	import RoomConfigPanel from '$lib/components/RoomConfigPanel.svelte';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';
	import Autocomplete from '$lib/components/Autocomplete.svelte';
	import AnswerFeedbackComp from '$lib/components/AnswerFeedback.svelte';
	import MatchResultScreen from '$lib/components/MatchResultScreen.svelte';

	let code = $derived(page.params.code ?? '');

	// Lobby state
	let myReady = $state(false);

	// Game state
	let answerText = $state('');
	let answerSent = $state(false);
	let roundTimer = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let audioPlaying = $state(true);
	let showRoundTransition = $state(false);
	let roundEndInfo = $state<{ correctAnswer: string } | null>(null);

	// Derived stores
	let currentPlayer = $derived($player);
	let currentRoom = $derived($room);
	let currentPlayers = $derived($players);
	let amHost = $derived($isHost);
	let everyoneReady = $derived($allReady);
	let status = $derived($roomStatus);
	let round = $derived($currentRound);
	let currentScores = $derived($scores);
	let result = $derived($matchResult);
	let error = $derived($connectionError);
	let connected = $derived($isConnected);
	let feedback = $derived($lastFeedback);
	let config = $derived($roomConfig);
	let playlist = $derived($myPlaylist);
	let autocompleSongs = $derived($allSongs);

	let roundTimeLimit = $derived(config.time_per_round);

	onMount(() => {
		const p = player.restore();
		if (!p) {
			goto('/');
			return;
		}

		connectSocket(p.id, p.name);

		joinRoom(code, playlist, {
			onJoin(state: RoomState) {
				room.set(state);
				isConnected.set(true);
				connectionError.set(null);

				const me = state.players.find((pl: Player) => pl.id === p.id);
				if (me) myReady = me.ready;
			},
			onError(reason: string) {
				connectionError.set(reason);
			},
			onPlayerJoined(data) {
				room.update((r) => {
					if (!r) return r;
					const exists = r.players.some((pl: Player) => pl.id === data.id);
					if (!exists) {
						r.players = [
							...r.players,
							{ id: data.id, name: data.name, ready: false, connection_status: 'connected' }
						];
					}
					return { ...r };
				});
			},
			onPlayerLeft(data) {
				room.update((r) => {
					if (!r) return r;
					r.players = r.players.map((pl: Player) =>
						pl.id === data.player_id
							? { ...pl, connection_status: 'disconnected' as const }
							: pl
					);
					return { ...r };
				});
			},
			onPlayerReady(data) {
				room.update((r) => {
					if (!r) return r;
					r.players = r.players.map((pl: Player) =>
						pl.id === data.player_id ? { ...pl, ready: true } : pl
					);
					return { ...r };
				});
			},
			onGameStarted(data) {
				room.update((r) => (r ? { ...r, status: 'in_game' } : r));
				// Se o servidor enviar a lista de todas as músicas para autocomplete
				if (data.round && 'all_songs' in data) {
					allSongs.set((data as Record<string, unknown>).all_songs as Song[]);
				}
				startRoundUI(data.round);
			},
			onRoundStarted(data) {
				startRoundUI(data.round);
			},
			onAnswerResult(data) {
				const fb: AnswerFeedback = {
					player_id: data.player_id,
					is_correct: data.is_correct,
					points: data.points
				};
				// Mostra feedback se for a minha resposta
				if (data.player_id === p.id) {
					lastFeedback.set(fb);
				}
				scores.update((s) => ({
					...s,
					[data.player_id]: (s[data.player_id] || 0) + data.points
				}));
			},
			onRoundEnded(data) {
				scores.set(data.scores);
				stopTimer();
				audioPlaying = false;
				// Mostra a resposta correta por um instante
				if (round) {
					roundEndInfo = { correctAnswer: round.song.name };
				}
				// Transição entre rodadas
				showRoundTransition = true;
				setTimeout(() => {
					showRoundTransition = false;
					roundEndInfo = null;
					lastFeedback.set(null);
				}, 3000);
			},
			onGameEnded(data) {
				matchResult.set({ final_scores: data.final_scores, winner_id: data.winner_id });
				room.update((r) => (r ? { ...r, status: 'finished' } : r));
				stopTimer();
				audioPlaying = false;
			}
		});
	});

	onDestroy(() => {
		disconnectSocket();
		stopTimer();
	});

	function handleMarkReady() {
		markReady();
		myReady = true;
	}

	function handleStartGame() {
		startGame();
	}

	function handleSubmitAnswer() {
		if (!answerText.trim() || answerSent) return;
		const elapsed = roundTimer * 1000;
		submitAnswer(answerText.trim(), elapsed);
		answerSent = true;
	}

	function startRoundUI(roundData: { song: Song; round_index: number; total_rounds: number }) {
		currentRound.set({
			round_index: roundData.round_index,
			song: roundData.song,
			total_rounds: roundData.total_rounds
		});
		answerText = '';
		answerSent = false;
		roundTimer = 0;
		audioPlaying = true;
		lastFeedback.set(null);
		roundEndInfo = null;
		showRoundTransition = false;
		startTimer();
	}

	function startTimer() {
		stopTimer();
		timerInterval = setInterval(() => {
			roundTimer += 1;
			if (roundTimer >= roundTimeLimit) stopTimer();
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function handleLeave() {
		disconnectSocket();
		goto('/');
	}

	function handlePlayAgain() {
		matchResult.set(null);
		currentRound.set(null);
		scores.set({});
		lastFeedback.set(null);
		room.update((r) => (r ? { ...r, status: 'lobby' } : r));
		myReady = false;
	}
</script>

<svelte:head>
	<title>Sala {code} - Merma, a Musica!</title>
</svelte:head>

<div class="w-full max-w-lg mx-auto space-y-6">
	{#if error}
		<!-- Error -->
		<div class="bg-bg-card rounded-2xl p-8 text-center space-y-4">
			<div class="text-4xl">😵</div>
			<p class="text-error text-lg">{error}</p>
			<button
				onclick={() => goto('/')}
				class="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors cursor-pointer"
			>
				Voltar
			</button>
		</div>

	{:else if !connected}
		<!-- Loading -->
		<div class="bg-bg-card rounded-2xl p-8 text-center space-y-3">
			<div class="text-4xl animate-bounce">🎵</div>
			<p class="text-text-muted animate-pulse">Conectando a sala...</p>
		</div>

	{:else if status === 'lobby'}
		<!-- ========== LOBBY ========== -->
		<div class="bg-bg-card rounded-2xl p-6 space-y-6">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold">Sala</h2>
				<div class="flex items-center gap-2">
					<span class="font-mono text-lg tracking-widest text-secondary">{code}</span>
					<button
						onclick={() => navigator.clipboard.writeText(code)}
						class="text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
						title="Copiar codigo"
					>
						copiar
					</button>
				</div>
			</div>

			<!-- Players -->
			<div class="space-y-2">
				<h3 class="text-sm font-medium text-text-muted">
					Jogadores ({currentPlayers.length})
				</h3>
				<ul class="space-y-2">
					{#each currentPlayers as p (p.id)}
						<li
							class="flex items-center justify-between bg-bg-input rounded-xl px-4 py-3
								{p.connection_status === 'disconnected' ? 'opacity-50' : ''}"
						>
							<div class="flex items-center gap-2">
								<span class="font-medium">{p.name}</span>
								{#if currentRoom && p.id === currentRoom.host_id}
									<span class="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
										host
									</span>
								{/if}
								{#if p.id === currentPlayer?.id}
									<span class="text-xs text-text-muted">(voce)</span>
								{/if}
							</div>
							<div>
								{#if p.ready}
									<span class="text-success text-sm font-medium">Pronto</span>
								{:else if p.connection_status === 'disconnected'}
									<span class="text-error text-sm">Offline</span>
								{:else}
									<span class="text-text-muted text-sm">Aguardando...</span>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Playlist Selector -->
			<PlaylistSelector />

			<!-- Config (host only) -->
			{#if amHost}
				<RoomConfigPanel />
			{/if}

			<!-- Actions -->
			<div class="space-y-3">
				{#if !myReady}
					<button
						onclick={handleMarkReady}
						class="w-full py-3 bg-success hover:bg-green-600 text-white font-semibold rounded-xl
							transition-colors cursor-pointer"
					>
						Estou Pronto!
					</button>
				{:else}
					<div class="text-center text-success font-medium py-3">
						Voce esta pronto!
					</div>
				{/if}

				{#if amHost}
					<button
						onclick={handleStartGame}
						disabled={!everyoneReady}
						class="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl
							transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
					>
						{everyoneReady ? 'Iniciar Jogo' : 'Aguardando todos ficarem prontos...'}
					</button>
				{/if}

				<button
					onclick={handleLeave}
					class="w-full py-2 text-text-muted hover:text-error text-sm transition-colors cursor-pointer"
				>
					Sair da sala
				</button>
			</div>
		</div>

	{:else if status === 'in_game' && round}
		<!-- ========== GAME ROUND ========== -->
		<div class="bg-bg-card rounded-2xl p-6 space-y-5">
			<!-- Round header -->
			<div class="flex items-center justify-between">
				<span class="text-sm text-text-muted">
					Rodada {round.round_index + 1} / {round.total_rounds}
				</span>
				<span
					class="text-lg font-mono font-bold
						{roundTimer >= roundTimeLimit - 5 ? 'text-error animate-pulse' : 'text-secondary'}"
				>
					{Math.max(0, roundTimeLimit - roundTimer)}s
				</span>
			</div>

			<!-- Timer bar -->
			<div class="w-full bg-bg-input rounded-full h-2">
				<div
					class="h-2 rounded-full transition-all duration-1000
						{roundTimer >= roundTimeLimit - 5 ? 'bg-error' : 'bg-primary'}"
					style="width: {Math.max(0, ((roundTimeLimit - roundTimer) / roundTimeLimit) * 100)}%"
				></div>
			</div>

			<!-- Audio Player -->
			{#if !showRoundTransition}
				<AudioPlayer url={round.song.preview_url} playing={audioPlaying} />
			{/if}

			<!-- Round end info -->
			{#if roundEndInfo}
				<div class="text-center bg-bg-input rounded-xl px-4 py-3 border border-white/10">
					<p class="text-xs text-text-muted mb-1">A resposta era:</p>
					<p class="text-lg font-bold text-primary-light">{roundEndInfo.correctAnswer}</p>
					<p class="text-sm text-text-muted">{round.song.artist}</p>
				</div>
			{/if}

			<!-- Answer feedback -->
			{#if feedback && feedback.player_id === currentPlayer?.id}
				<AnswerFeedbackComp isCorrect={feedback.is_correct} points={feedback.points} />
			{/if}

			<!-- Answer input -->
			{#if !answerSent && !showRoundTransition}
				<div class="flex gap-2">
					<div class="flex-1">
						<Autocomplete
							bind:value={answerText}
							songs={autocompleSongs}
							answerType={config.answer_type}
							placeholder={config.answer_type === 'artist_name'
								? 'Qual artista?'
								: config.answer_type === 'both'
									? 'Musica ou artista...'
									: 'Qual musica?'}
							onsubmit={handleSubmitAnswer}
						/>
					</div>
					<button
						onclick={handleSubmitAnswer}
						disabled={!answerText.trim()}
						class="px-5 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl
							transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
					>
						Enviar
					</button>
				</div>
			{:else if answerSent && !feedback}
				<div class="text-center py-3 text-text-muted animate-pulse">
					Resposta enviada! Aguardando...
				</div>
			{/if}

			<!-- Live scores -->
			{#if Object.keys(currentScores).length > 0}
				<div class="space-y-2">
					<h3 class="text-sm font-medium text-text-muted">Placar</h3>
					<div class="space-y-1">
						{#each Object.entries(currentScores).sort(([, a], [, b]) => b - a) as [playerId, score]}
							{@const p = currentPlayers.find((pl: Player) => pl.id === playerId)}
							<div
								class="flex justify-between text-sm bg-bg-input rounded-lg px-3 py-2
									{playerId === currentPlayer?.id ? 'ring-1 ring-primary/30' : ''}"
							>
								<span>
									{p?.name || playerId}
									{#if playerId === currentPlayer?.id}
										<span class="text-xs text-text-muted ml-1">(voce)</span>
									{/if}
								</span>
								<span class="font-mono text-secondary">{score}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

	{:else if status === 'finished' && result && currentPlayer}
		<!-- ========== MATCH RESULT ========== -->
		<MatchResultScreen
			{result}
			players={currentPlayers}
			currentPlayerId={currentPlayer.id}
			isHost={amHost}
			onPlayAgain={handlePlayAgain}
			onLeave={handleLeave}
		/>
	{/if}
</div>
