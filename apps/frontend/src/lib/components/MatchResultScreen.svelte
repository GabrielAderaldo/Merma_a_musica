<script lang="ts">
	import type { Player, MatchResult } from '$lib/types';

	let {
		result,
		players,
		currentPlayerId,
		isHost,
		onPlayAgain,
		onLeave
	}: {
		result: MatchResult;
		players: Player[];
		currentPlayerId: string;
		isHost: boolean;
		onPlayAgain: () => void;
		onLeave: () => void;
	} = $props();

	let sorted = $derived(
		Object.entries(result.final_scores)
			.sort(([, a], [, b]) => b - a)
			.map(([id, score], i) => ({
				rank: i + 1,
				player: players.find((p) => p.id === id),
				playerId: id,
				score,
				isWinner: id === result.winner_id,
				isMe: id === currentPlayerId
			}))
	);

	let winnerName = $derived(
		players.find((p) => p.id === result.winner_id)?.name ?? 'Desconhecido'
	);

	let iWon = $derived(result.winner_id === currentPlayerId);
</script>

<div class="bg-bg-card rounded-2xl p-6 space-y-6">
	<!-- Header -->
	<div class="text-center space-y-3">
		<div class="text-6xl animate-[bounceIn_0.5s_ease-out]">
			{iWon ? '🎉' : '🏆'}
		</div>
		<h2 class="text-2xl font-bold">Fim de jogo!</h2>
		<p class="text-lg font-semibold {iWon ? 'text-secondary' : 'text-primary-light'}">
			{iWon ? 'Voce venceu!' : `${winnerName} venceu!`}
		</p>
	</div>

	<!-- Podium (top 3) -->
	{#if sorted.length >= 3}
		<div class="flex items-end justify-center gap-2 py-4">
			<!-- 2nd place -->
			<div class="text-center">
				<div class="text-2xl mb-1">🥈</div>
				<div class="bg-bg-input rounded-t-xl px-4 py-6 min-w-[80px]">
					<p class="text-sm font-medium truncate max-w-[80px]">{sorted[1].player?.name}</p>
					<p class="text-xs text-text-muted font-mono">{sorted[1].score}</p>
				</div>
			</div>
			<!-- 1st place -->
			<div class="text-center">
				<div class="text-3xl mb-1">🥇</div>
				<div class="bg-secondary/10 border border-secondary/30 rounded-t-xl px-4 py-10 min-w-[90px]">
					<p class="text-sm font-bold truncate max-w-[90px]">{sorted[0].player?.name}</p>
					<p class="text-secondary font-mono font-bold">{sorted[0].score}</p>
				</div>
			</div>
			<!-- 3rd place -->
			<div class="text-center">
				<div class="text-2xl mb-1">🥉</div>
				<div class="bg-bg-input rounded-t-xl px-4 py-4 min-w-[80px]">
					<p class="text-sm font-medium truncate max-w-[80px]">{sorted[2].player?.name}</p>
					<p class="text-xs text-text-muted font-mono">{sorted[2].score}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Full ranking -->
	<div class="space-y-2">
		{#each sorted as entry}
			<div
				class="flex justify-between items-center rounded-xl px-4 py-3 transition-colors
					{entry.isWinner ? 'bg-secondary/10 border border-secondary/30' : 'bg-bg-input'}
					{entry.isMe ? 'ring-1 ring-primary/50' : ''}"
			>
				<div class="flex items-center gap-3">
					<span class="text-lg font-bold text-text-muted w-8">#{entry.rank}</span>
					<span class="font-medium">
						{entry.player?.name || entry.playerId}
						{#if entry.isMe}
							<span class="text-xs text-text-muted ml-1">(voce)</span>
						{/if}
					</span>
				</div>
				<span class="font-mono text-lg {entry.isWinner ? 'text-secondary font-bold' : 'text-text-muted'}">
					{entry.score} pts
				</span>
			</div>
		{/each}
	</div>

	<!-- Actions -->
	<div class="space-y-3 pt-2">
		{#if isHost}
			<button
				onclick={onPlayAgain}
				class="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl
					transition-colors cursor-pointer"
			>
				Jogar novamente
			</button>
		{/if}
		<button
			onclick={onLeave}
			class="w-full py-2 text-text-muted hover:text-error text-sm transition-colors cursor-pointer"
		>
			Sair
		</button>
	</div>
</div>

<style>
	@keyframes bounceIn {
		0% {
			opacity: 0;
			transform: scale(0.3);
		}
		50% {
			transform: scale(1.1);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
