<script lang="ts">
	import { goto } from '$app/navigation';
	import { player } from '$lib/stores';
	import { createRoom } from '$lib/api';

	let nickname = $state('');
	let joinCode = $state('');
	let error = $state('');
	let loading = $state(false);

	function ensurePlayer() {
		if (!$player) {
			if (!nickname.trim()) {
				error = 'Digite seu apelido';
				return null;
			}
			return player.login(nickname.trim());
		}
		return $player;
	}

	async function handleCreate() {
		const p = ensurePlayer();
		if (!p) return;

		loading = true;
		error = '';
		try {
			const res = await createRoom(p.id, p.name);
			goto(`/room/${res.invite_code}`);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Erro ao criar sala';
		} finally {
			loading = false;
		}
	}

	async function handleJoin() {
		const p = ensurePlayer();
		if (!p) return;

		const code = joinCode.trim().toUpperCase();
		if (!code) {
			error = 'Digite o codigo da sala';
			return;
		}

		goto(`/room/${code}`);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			if (joinCode.trim()) handleJoin();
			else handleCreate();
		}
	}
</script>

<svelte:head>
	<title>Merma, a Musica!</title>
	<meta name="description" content="Quiz musical multiplayer com suas playlists" />
</svelte:head>

<div class="w-full max-w-md mx-auto space-y-8">
	<div class="text-center space-y-2">
		<h1 class="text-4xl font-bold text-primary-light">Merma, a Musica!</h1>
		<p class="text-text-muted">Quiz musical multiplayer com suas playlists</p>
	</div>

	<div class="bg-bg-card rounded-2xl p-6 space-y-6 shadow-xl">
		{#if !$player}
			<div class="space-y-2">
				<label for="nickname" class="block text-sm font-medium text-text-muted">
					Seu apelido
				</label>
				<input
					id="nickname"
					type="text"
					bind:value={nickname}
					onkeydown={handleKeydown}
					placeholder="Ex: DJ Master"
					maxlength="20"
					class="w-full px-4 py-3 bg-bg-input rounded-xl text-text placeholder:text-text-muted/50
						border border-white/10 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
						transition-colors"
				/>
			</div>
		{:else}
			<div class="flex items-center justify-between bg-bg-input rounded-xl px-4 py-3">
				<span class="text-text-muted">Jogando como</span>
				<div class="flex items-center gap-2">
					<span class="font-semibold">{$player.name}</span>
					<button
						onclick={() => player.clear()}
						class="text-xs text-text-muted hover:text-error transition-colors cursor-pointer"
					>
						trocar
					</button>
				</div>
			</div>
		{/if}

		<div class="space-y-3">
			<button
				onclick={handleCreate}
				disabled={loading}
				class="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl
					transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
			>
				{loading ? 'Criando...' : 'Criar Sala'}
			</button>

			<div class="flex items-center gap-3">
				<div class="flex-1 h-px bg-white/10"></div>
				<span class="text-xs text-text-muted uppercase">ou</span>
				<div class="flex-1 h-px bg-white/10"></div>
			</div>

			<div class="flex gap-2">
				<input
					type="text"
					bind:value={joinCode}
					onkeydown={handleKeydown}
					placeholder="Codigo da sala"
					maxlength="6"
					class="flex-1 px-4 py-3 bg-bg-input rounded-xl text-text placeholder:text-text-muted/50
						border border-white/10 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary
						transition-colors uppercase tracking-widest text-center font-mono"
				/>
				<button
					onclick={handleJoin}
					class="px-6 py-3 bg-secondary hover:bg-amber-600 text-black font-semibold rounded-xl
						transition-colors cursor-pointer"
				>
					Entrar
				</button>
			</div>
		</div>

		{#if error}
			<p class="text-error text-sm text-center">{error}</p>
		{/if}
	</div>
</div>
