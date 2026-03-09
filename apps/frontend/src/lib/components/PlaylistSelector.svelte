<script lang="ts">
	import { getAuthUrl, getPlaylists, getPlaylistSongs } from '$lib/api';
	import { myPlaylist } from '$lib/stores';
	import { PLATFORM_LABELS } from '$lib/types';
	import type { Playlist, Song } from '$lib/types';

	let step = $state<'platform' | 'auth' | 'playlists' | 'done'>('platform');
	let selectedPlatform = $state('');
	let accessToken = $state('');
	let playlists = $state<Playlist[]>([]);
	let selectedPlaylist = $state<Playlist | null>(null);
	let songs = $state<Song[]>([]);
	let loading = $state(false);
	let error = $state('');

	// Token input para dev/mock (sem OAuth real)
	let tokenInput = $state('');

	const platforms = Object.entries(PLATFORM_LABELS);

	function selectPlatform(platform: string) {
		selectedPlatform = platform;
		step = 'auth';
		error = '';
	}

	async function handleOAuthLogin() {
		loading = true;
		error = '';
		try {
			const { url } = await getAuthUrl(selectedPlatform, 'playlist_select');
			// Em produção: redireciona para OAuth
			// Para dev/mock: mostra input de token
			window.open(url, '_blank', 'width=500,height=700');
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Erro ao obter URL de auth';
		} finally {
			loading = false;
		}
	}

	async function handleTokenSubmit() {
		if (!tokenInput.trim()) return;
		accessToken = tokenInput.trim();
		await loadPlaylists();
	}

	async function loadPlaylists() {
		loading = true;
		error = '';
		try {
			const res = await getPlaylists(selectedPlatform, accessToken);
			playlists = res.playlists;
			step = 'playlists';
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Erro ao carregar playlists';
		} finally {
			loading = false;
		}
	}

	async function selectPlaylistAndLoad(playlist: Playlist) {
		selectedPlaylist = playlist;
		loading = true;
		error = '';
		try {
			const res = await getPlaylistSongs(selectedPlatform, playlist.id, accessToken);
			songs = res.songs;
			myPlaylist.set(songs);
			step = 'done';
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Erro ao carregar musicas';
		} finally {
			loading = false;
		}
	}

	function reset() {
		step = 'platform';
		selectedPlatform = '';
		accessToken = '';
		playlists = [];
		selectedPlaylist = null;
		songs = [];
		tokenInput = '';
		error = '';
		myPlaylist.set([]);
	}
</script>

<div class="space-y-4">
	{#if step === 'platform'}
		<h3 class="text-sm font-medium text-text-muted">Escolha sua plataforma</h3>
		<div class="grid grid-cols-1 gap-2">
			{#each platforms as [key, label]}
				<button
					onclick={() => selectPlatform(key)}
					class="flex items-center gap-3 px-4 py-3 bg-bg-input hover:bg-bg-input/80
						rounded-xl border border-white/10 hover:border-primary/50 transition-colors cursor-pointer text-left"
				>
					<span class="text-lg">
						{#if key === 'spotify'}🟢
						{:else if key === 'deezer'}🟣
						{:else}🔴
						{/if}
					</span>
					<span class="font-medium">{label}</span>
				</button>
			{/each}
		</div>

	{:else if step === 'auth'}
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium text-text-muted">
					Conectar ao {PLATFORM_LABELS[selectedPlatform]}
				</h3>
				<button onclick={reset} class="text-xs text-text-muted hover:text-text transition-colors cursor-pointer">
					trocar
				</button>
			</div>

			<button
				onclick={handleOAuthLogin}
				disabled={loading}
				class="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl
					transition-colors disabled:opacity-50 cursor-pointer"
			>
				{loading ? 'Abrindo...' : `Login com ${PLATFORM_LABELS[selectedPlatform]}`}
			</button>

			<div class="flex items-center gap-3">
				<div class="flex-1 h-px bg-white/10"></div>
				<span class="text-xs text-text-muted">ou cole o token</span>
				<div class="flex-1 h-px bg-white/10"></div>
			</div>

			<div class="flex gap-2">
				<input
					type="text"
					bind:value={tokenInput}
					placeholder="Access token"
					class="flex-1 px-3 py-2 bg-bg-input rounded-lg text-sm text-text placeholder:text-text-muted/50
						border border-white/10 focus:border-primary focus:outline-none transition-colors"
				/>
				<button
					onclick={handleTokenSubmit}
					disabled={!tokenInput.trim() || loading}
					class="px-4 py-2 bg-secondary hover:bg-amber-600 text-black text-sm font-medium rounded-lg
						transition-colors disabled:opacity-50 cursor-pointer"
				>
					OK
				</button>
			</div>
		</div>

	{:else if step === 'playlists'}
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium text-text-muted">
					Suas playlists ({playlists.length})
				</h3>
				<button onclick={reset} class="text-xs text-text-muted hover:text-text transition-colors cursor-pointer">
					trocar
				</button>
			</div>

			{#if playlists.length === 0}
				<p class="text-text-muted text-sm text-center py-4">Nenhuma playlist encontrada</p>
			{:else}
				<div class="max-h-48 overflow-y-auto space-y-1 pr-1">
					{#each playlists as playlist}
						<button
							onclick={() => selectPlaylistAndLoad(playlist)}
							disabled={loading}
							class="w-full flex items-center justify-between px-4 py-3 bg-bg-input hover:bg-bg-input/80
								rounded-xl border border-white/10 hover:border-primary/50 transition-colors cursor-pointer text-left
								disabled:opacity-50"
						>
							<span class="font-medium truncate">{playlist.name}</span>
							<span class="text-xs text-text-muted ml-2 shrink-0">{playlist.total} musicas</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

	{:else if step === 'done'}
		<div class="flex items-center justify-between bg-success/10 border border-success/30 rounded-xl px-4 py-3">
			<div>
				<span class="text-success text-sm font-medium">Playlist selecionada</span>
				<p class="text-text text-sm">{selectedPlaylist?.name} — {songs.length} musicas</p>
			</div>
			<button onclick={reset} class="text-xs text-text-muted hover:text-text transition-colors cursor-pointer">
				trocar
			</button>
		</div>
	{/if}

	{#if error}
		<p class="text-error text-sm">{error}</p>
	{/if}

	{#if loading && step !== 'auth'}
		<div class="text-center py-2">
			<span class="text-text-muted text-sm animate-pulse">Carregando...</span>
		</div>
	{/if}
</div>
