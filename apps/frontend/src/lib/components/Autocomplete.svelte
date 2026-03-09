<script lang="ts">
	import type { Song } from '$lib/types';

	let {
		value = $bindable(''),
		songs = [],
		answerType = 'song_name',
		placeholder = 'Sua resposta...',
		disabled = false,
		onsubmit
	}: {
		value: string;
		songs: Song[];
		answerType: string;
		placeholder?: string;
		disabled?: boolean;
		onsubmit?: () => void;
	} = $props();

	let showSuggestions = $state(false);
	let selectedIndex = $state(-1);
	let inputElement: HTMLInputElement | null = $state(null);

	let suggestions = $derived.by(() => {
		if (!value.trim() || value.length < 2) return [];

		const query = value.toLowerCase();
		const seen = new Set<string>();
		const results: string[] = [];

		for (const song of songs) {
			let candidates: string[] = [];
			if (answerType === 'artist_name') {
				candidates = [song.artist];
			} else if (answerType === 'both') {
				candidates = [song.name, song.artist];
			} else {
				candidates = [song.name];
			}

			for (const c of candidates) {
				const lower = c.toLowerCase();
				if (lower.includes(query) && !seen.has(lower)) {
					seen.add(lower);
					results.push(c);
				}
			}
			if (results.length >= 8) break;
		}

		return results;
	});

	function selectSuggestion(suggestion: string) {
		value = suggestion;
		showSuggestions = false;
		selectedIndex = -1;
		inputElement?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (suggestions.length > 0) {
				showSuggestions = true;
				selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
		} else if (e.key === 'Enter') {
			if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
				selectSuggestion(suggestions[selectedIndex]);
			} else {
				onsubmit?.();
			}
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			selectedIndex = -1;
		}
	}

	function handleInput() {
		showSuggestions = value.length >= 2;
		selectedIndex = -1;
	}

	function handleBlur() {
		// Delay to allow click on suggestion
		setTimeout(() => {
			showSuggestions = false;
		}, 200);
	}
</script>

<div class="relative">
	<input
		bind:this={inputElement}
		bind:value
		oninput={handleInput}
		onkeydown={handleKeydown}
		onblur={handleBlur}
		onfocus={() => { if (value.length >= 2) showSuggestions = true; }}
		{placeholder}
		{disabled}
		class="w-full px-4 py-3 bg-bg-input rounded-xl text-text placeholder:text-text-muted/50
			border border-white/10 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
			transition-colors"
	/>

	{#if showSuggestions && suggestions.length > 0}
		<ul class="absolute z-10 w-full mt-1 bg-bg-card border border-white/10 rounded-xl
			shadow-xl max-h-48 overflow-y-auto">
			{#each suggestions as suggestion, i}
				<li>
					<button
						onmousedown={() => selectSuggestion(suggestion)}
						class="w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer
							{i === selectedIndex ? 'bg-primary/20 text-white' : 'text-text-muted hover:bg-white/5'}"
					>
						{suggestion}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
