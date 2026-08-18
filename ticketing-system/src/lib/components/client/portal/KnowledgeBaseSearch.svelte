<script lang="ts">
	let searchQuery = $state('');

	let popularTopics = [
		'Password reset',
		'VPN configuration',
		'Billing invoice inquiry',
		'Email sync issues',
		'API rate limits'
	];
</script>

<div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-container)] to-[var(--color-surface-container)] p-8 text-white shadow-lg sm:p-12">
	<!-- Decorative background circles -->
	<div class="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-2xl"></div>
	<div class="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-black/10 blur-xl"></div>

	<div class="relative mx-auto max-w-2xl text-center">
		<span class="inline-block rounded-full bg-white/15 px-3.5 py-1 text-label-sm font-semibold tracking-wide text-white uppercase backdrop-blur-xs">
			Customer Support Portal
		</span>
		<h1 class="mt-4 text-display-sm font-extrabold tracking-tight sm:text-display-md text-white">
			How can we help you today?
		</h1>
		<p class="mt-2 text-body-lg text-white/85">
			Search our knowledge base for instant answers or submit a ticket to our team.
		</p>

		<!-- Search Input Bar -->
		<div class="mt-6 flex items-center rounded-xl bg-white p-1.5 shadow-xl">
			<div class="flex flex-1 items-center px-3">
				<span class="material-symbols-outlined text-[24px] text-gray-400">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search articles, guides, common errors..."
					class="w-full border-none bg-transparent px-3 py-2 text-body-md text-gray-900 placeholder:text-gray-400 focus:outline-none"
				/>
			</div>
			<button
				type="button"
				class="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-label-lg font-semibold text-white transition-opacity hover:opacity-90"
			>
				Search
			</button>
		</div>

		<!-- Popular search pills -->
		<div class="mt-4 flex flex-wrap items-center justify-center gap-2 text-label-sm">
			<span class="text-white/70">Popular:</span>
			{#each popularTopics as topic}
				<button
					type="button"
					onclick={() => (searchQuery = topic)}
					class="rounded-full bg-white/15 px-3 py-0.5 text-white transition-colors hover:bg-white/25"
				>
					{topic}
				</button>
			{/each}
		</div>
	</div>
</div>
