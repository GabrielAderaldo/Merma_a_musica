<script lang="ts">
	import { roomConfig } from '$lib/stores';
	import type { RoomConfig } from '$lib/types';

	let config = $state<RoomConfig>({
		time_per_round: 15,
		total_songs: 4,
		answer_type: 'song_name',
		scoring_rule: 'speed_bonus'
	});

	let expanded = $state(false);

	$effect(() => {
		roomConfig.set(config);
	});
</script>

<div class="space-y-2">
	<button
		onclick={() => (expanded = !expanded)}
		class="flex items-center justify-between w-full text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
	>
		<span class="font-medium">Configuracao da partida</span>
		<span class="text-xs">{expanded ? '▲' : '▼'}</span>
	</button>

	{#if expanded}
		<div class="space-y-4 bg-bg-input rounded-xl p-4 border border-white/5">
			<!-- Tempo por rodada -->
			<div class="space-y-1">
				<div class="flex justify-between text-sm">
					<label for="time">Tempo por rodada</label>
					<span class="text-secondary font-mono">{config.time_per_round}s</span>
				</div>
				<input
					id="time"
					type="range"
					min="5"
					max="30"
					step="5"
					bind:value={config.time_per_round}
					class="w-full accent-primary"
				/>
				<div class="flex justify-between text-xs text-text-muted">
					<span>5s</span>
					<span>30s</span>
				</div>
			</div>

			<!-- Total de musicas -->
			<div class="space-y-1">
				<div class="flex justify-between text-sm">
					<label for="songs">Total de musicas</label>
					<span class="text-secondary font-mono">{config.total_songs}</span>
				</div>
				<input
					id="songs"
					type="range"
					min="2"
					max="20"
					step="1"
					bind:value={config.total_songs}
					class="w-full accent-primary"
				/>
				<div class="flex justify-between text-xs text-text-muted">
					<span>2</span>
					<span>20</span>
				</div>
			</div>

			<!-- Tipo de resposta -->
			<div class="space-y-2">
				<span class="text-sm">Tipo de resposta</span>
				<div class="grid grid-cols-3 gap-1">
					{#each [
						{ value: 'song_name', label: 'Musica' },
						{ value: 'artist_name', label: 'Artista' },
						{ value: 'both', label: 'Ambos' }
					] as opt}
						<button
							onclick={() => (config.answer_type = opt.value as RoomConfig['answer_type'])}
							class="py-2 text-xs rounded-lg border transition-colors cursor-pointer
								{config.answer_type === opt.value
								? 'bg-primary border-primary text-white'
								: 'bg-transparent border-white/10 text-text-muted hover:border-white/30'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Regra de pontuacao -->
			<div class="space-y-2">
				<span class="text-sm">Pontuacao</span>
				<div class="grid grid-cols-2 gap-1">
					{#each [
						{ value: 'simple', label: 'Simples', desc: '100 pts por acerto' },
						{ value: 'speed_bonus', label: 'Velocidade', desc: 'Bonus por rapidez' }
					] as opt}
						<button
							onclick={() => (config.scoring_rule = opt.value as RoomConfig['scoring_rule'])}
							class="py-2 px-3 text-xs rounded-lg border transition-colors cursor-pointer text-left
								{config.scoring_rule === opt.value
								? 'bg-primary border-primary text-white'
								: 'bg-transparent border-white/10 text-text-muted hover:border-white/30'}"
						>
							<div class="font-medium">{opt.label}</div>
							<div class="opacity-70 text-[10px]">{opt.desc}</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
