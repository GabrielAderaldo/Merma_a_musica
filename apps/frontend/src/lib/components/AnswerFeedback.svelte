<script lang="ts">
	let { isCorrect, points }: { isCorrect: boolean; points: number } = $props();
</script>

<div
	class="flex items-center justify-center gap-3 py-4 rounded-xl border animate-[fadeIn_0.3s_ease-out]
		{isCorrect ? 'bg-success/10 border-success/30' : 'bg-error/10 border-error/30'}"
>
	<span class="text-3xl">{isCorrect ? '✅' : '❌'}</span>
	<div>
		<p class="font-semibold {isCorrect ? 'text-success' : 'text-error'}">
			{isCorrect ? 'Acertou!' : 'Errou!'}
		</p>
		{#if isCorrect && points > 0}
			<p class="text-sm text-secondary">+{points} pontos</p>
		{/if}
	</div>
</div>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
