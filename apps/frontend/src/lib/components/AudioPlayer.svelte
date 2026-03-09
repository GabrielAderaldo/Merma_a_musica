<script lang="ts">
	let { url, playing = true }: { url: string; playing?: boolean } = $props();

	let audio: HTMLAudioElement | null = $state(null);
	let progress = $state(0);
	let duration = $state(0);
	let isPlaying = $state(false);

	$effect(() => {
		if (audio && url) {
			audio.src = url;
			if (playing) {
				audio.play().catch(() => {});
			}
		}
	});

	$effect(() => {
		if (audio && !playing) {
			audio.pause();
		} else if (audio && playing && audio.paused) {
			audio.play().catch(() => {});
		}
	});

	function onTimeUpdate() {
		if (audio) {
			progress = audio.currentTime;
			duration = audio.duration || 0;
		}
	}

	function onPlay() {
		isPlaying = true;
	}

	function onPause() {
		isPlaying = false;
	}

	let progressPercent = $derived(duration > 0 ? (progress / duration) * 100 : 0);
</script>

<div class="space-y-3">
	<!-- Visualizer -->
	<div class="flex items-center justify-center gap-1 h-16">
		{#each Array(20) as _, i}
			{@const barActive = isPlaying && i / 20 <= progressPercent / 100 + 0.1}
			<div
				class="w-1.5 rounded-full transition-all duration-300
					{barActive ? 'bg-primary' : 'bg-bg-input'}"
				style="height: {barActive ? 20 + Math.sin((i + progress * 3) * 0.5) * 24 : 8}px"
			></div>
		{/each}
	</div>

	<!-- Progress bar -->
	<div class="w-full bg-bg-input rounded-full h-1.5">
		<div
			class="h-1.5 rounded-full bg-primary transition-all duration-200"
			style="width: {progressPercent}%"
		></div>
	</div>

	<audio
		bind:this={audio}
		ontimeupdate={onTimeUpdate}
		onplay={onPlay}
		onpause={onPause}
		preload="auto"
	></audio>
</div>
