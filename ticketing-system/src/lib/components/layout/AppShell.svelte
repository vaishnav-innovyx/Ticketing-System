<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import Header from './Header.svelte';

	let {
		profile,
		unreadMessageCount = 0,
		children
	}: {
		profile?: { id: string; full_name: string | null; email: string; role: string } | null;
		unreadMessageCount?: number;
		children: import('svelte').Snippet;
	} = $props();

	let mobileMenuOpen = $state(false);
</script>

<div class="flex min-h-screen bg-[var(--color-surface)]">
	<!-- Desktop Persistent Sidebar -->
	<div class="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-[260px]">
		<Sidebar {profile} {unreadMessageCount} />
	</div>

	<!-- Mobile Sidebar Backdrop Overlay -->
	{#if mobileMenuOpen}
		<button
			type="button"
			class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity md:hidden"
			aria-label="Close navigation"
			onclick={() => (mobileMenuOpen = false)}
		></button>
	{/if}

	<!-- Mobile Drawer Sidebar -->
	<div
		class="fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden {mobileMenuOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
	>
		<Sidebar {profile} {unreadMessageCount} onClose={() => (mobileMenuOpen = false)} />
	</div>

	<!-- Main Content Area -->
	<div class="flex flex-1 flex-col md:pl-[260px]">
		<Header {profile} onMenuClick={() => (mobileMenuOpen = true)} />

		<main class="flex-1 p-4 sm:p-6 md:p-8">
			<div class="mx-auto w-full max-w-[1440px]">
				{@render children()}
			</div>
		</main>
	</div>
</div>