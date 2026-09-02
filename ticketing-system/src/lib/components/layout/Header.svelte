<script lang="ts">
	import { roleLabel } from '$lib/portal/ticketDisplay';

	let {
		profile,
		onMenuClick
	}: {
		profile?: { id: string; full_name: string | null; email: string; role: string } | null;
		onMenuClick?: () => void;
	} = $props();

	let userMenuOpen = $state(false);

	const displayName = $derived(profile?.full_name || profile?.email?.split('@')[0] || 'Super Admin');
	const displayRole = $derived(profile?.role ? roleLabel(profile.role) : 'Super Admin');
	const initials = $derived(
		(profile?.full_name || profile?.email || 'SA')
			.split(' ')
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
</script>

<svelte:window
	onclick={(e) => {
		const target = e.target as HTMLElement;
		if (!target.closest('#user-profile-menu-container')) {
			userMenuOpen = false;
		}
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') userMenuOpen = false;
	}}
/>

<header
	class="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[var(--color-outline-variant)]/60 bg-[var(--color-surface)] px-4 sm:px-6 md:px-8"
>
	<!-- Left section: mobile hamburger & title -->
	<div class="flex items-center gap-3">
		<button
			type="button"
			class="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] md:hidden"
			aria-label="Open navigation"
			onclick={onMenuClick}
		>
			<span class="material-symbols-outlined">menu</span>
		</button>

		<div class="hidden items-center gap-2.5 text-title-lg font-bold text-[var(--color-on-surface)] sm:flex">
			<!-- <img src="/logo.png" alt="Resolv Logo" class="h-7 w-7 rounded-md bg-white object-contain p-0.5 shadow-2xs border border-[var(--color-outline-variant)]/40" /> -->
			<span>Ticketing & Support System</span>
		</div>
	</div>

	<!-- Center section: Search Bar -->
	<div class="mx-4 hidden max-w-md flex-1 sm:block md:mx-8">
		<div class="relative">
			<span class="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-[var(--color-outline)]">
				search
			</span>
			<input
				type="text"
				placeholder="Search tickets, clients..."
				class="h-10 w-full rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] pr-4 pl-10 text-body-sm text-[var(--color-on-surface)] transition-all placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary-container)] focus:ring-1 focus:ring-[var(--color-primary-container)] focus:outline-none"
			/>
		</div>
	</div>

	<!-- Right section: actions & user profile -->
	<div class="flex items-center gap-2 sm:gap-4">
		<!-- Mobile Search Icon -->
		<button
			type="button"
			class="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] sm:hidden"
			aria-label="Search"
		>
			<span class="material-symbols-outlined text-[20px]">search</span>
		</button>

		<!-- Notifications -->
		<button
			type="button"
			class="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]"
			aria-label="Notifications"
		>
			<span class="material-symbols-outlined text-[20px]">notifications</span>
			<span class="absolute top-2 right-2 h-2 w-2 rounded-full border border-[var(--color-surface)] bg-[var(--color-error)]"></span>
		</button>

		<div class="hidden h-7 w-px bg-[var(--color-outline-variant)]/60 sm:block"></div>

		<!-- User profile dropdown container -->
		<div id="user-profile-menu-container" class="relative">
			<button
				type="button"
				class="flex cursor-pointer items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-[var(--color-surface-container-low)]"
				onclick={() => (userMenuOpen = !userMenuOpen)}
				aria-expanded={userMenuOpen}
				aria-haspopup="true"
			>
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-label-md font-semibold text-white shadow-sm"
				>
					{initials}
				</div>

				<div class="hidden text-left lg:block">
					<div class="text-label-md font-medium text-[var(--color-on-surface)]">
						{displayName}
					</div>
					<div class="text-label-sm text-[var(--color-on-surface-variant)]">
						{displayRole}
					</div>
				</div>

				<span class="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform duration-200 {userMenuOpen ? 'rotate-180' : ''}">
					arrow_drop_down
				</span>
			</button>

			<!-- Profile & Logout Dropdown Menu -->
			{#if userMenuOpen}
				<div
					class="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-2 shadow-lg shadow-black/10 transition-all z-50 animate-in fade-in zoom-in-95 duration-100"
				>
					<div class="border-b border-[var(--color-outline-variant)]/40 px-3 py-2.5">
						<p class="text-label-md font-semibold text-[var(--color-on-surface)] truncate">{displayName}</p>
						<p class="text-body-xs text-[var(--color-on-surface-variant)] truncate">{profile?.email || 'admin@companyx.com'}</p>
						<span class="mt-1 inline-block rounded bg-[var(--color-primary-fixed)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-on-primary-fixed)] uppercase">
							{displayRole}
						</span>
					</div>

					<div class="py-1">
						<a
							href="/portal"
							class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-body-sm text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]"
							onclick={() => (userMenuOpen = false)}
						>
							<span class="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">open_in_new</span>
							<span>Client Portal View</span>
						</a>

						<a
							href="/settings"
							class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-body-sm text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)]"
							onclick={() => (userMenuOpen = false)}
						>
							<span class="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">settings</span>
							<span>Settings</span>
						</a>
					</div>

					<div class="border-t border-[var(--color-outline-variant)]/40 pt-1">
						<form method="POST" action="/logout">
							<button
								type="submit"
								class="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-body-sm font-medium text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-container)]/30"
							>
								<span class="material-symbols-outlined text-[18px]">logout</span>
								<span>Sign out</span>
							</button>
						</form>
					</div>
				</div>
			{/if}
		</div>

		<!-- Direct quick logout icon button -->
		<form method="POST" action="/logout" class="hidden sm:block">
			<button
				type="submit"
				class="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-error)] cursor-pointer"
				title="Sign out"
				aria-label="Sign out"
			>
				<span class="material-symbols-outlined text-[20px]">logout</span>
			</button>
		</form>
	</div>
</header>