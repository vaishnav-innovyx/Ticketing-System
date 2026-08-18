<script lang="ts">
	import ClientHeader from './ClientHeader.svelte';
	import ClientFooter from './ClientFooter.svelte';

	let { children }: { children: import('svelte').Snippet } = $props();
	let mobileNavOpen = $state(false);
</script>

<div class="flex min-h-screen flex-col bg-[var(--color-surface)]">
	<ClientHeader onMenuClick={() => (mobileNavOpen = !mobileNavOpen)} />

	<!-- Mobile Dropdown Menu -->
	{#if mobileNavOpen}
		<div class="border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] p-4 md:hidden">
			<nav class="flex flex-col space-y-2">
				<a
					href="/portal"
					class="rounded-lg p-2 text-label-lg font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
					onclick={() => (mobileNavOpen = false)}
				>
					Help Center
				</a>
				<a
					href="/portal/my-tickets"
					class="rounded-lg p-2 text-label-lg font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
					onclick={() => (mobileNavOpen = false)}
				>
					My Tickets
				</a>
				<a
					href="/portal/submit"
					class="rounded-lg p-2 text-label-lg font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
					onclick={() => (mobileNavOpen = false)}
				>
					Submit a Ticket
				</a>
				<a
					href="/dashboard"
					class="rounded-lg p-2 text-label-lg font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)]"
					onclick={() => (mobileNavOpen = false)}
				>
					Switch to Staff Workspace &rarr;
				</a>
			</nav>
		</div>
	{/if}

	<main class="flex-1">
		{@render children()}
	</main>

	<ClientFooter />
</div>
