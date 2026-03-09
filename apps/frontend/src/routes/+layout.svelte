<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<div class="min-h-screen flex flex-col">
	<header class="py-4 px-6 flex items-center justify-center border-b border-white/10">
		<a href="/" class="text-2xl font-bold text-primary-light hover:text-primary transition-colors no-underline">
			Merma, a Musica!
		</a>
	</header>

	<main class="flex-1 flex items-center justify-center p-4">
		{@render children()}
	</main>
</div>
