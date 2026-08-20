<script lang="ts">
	import { page } from '$app/state';

	let {
		onMenuClick,
		profile
	}: {
		onMenuClick?: () => void;
		profile?: { full_name: string | null; email: string; clients: { name: string } | null };
	} = $props();

	const displayName = $derived(profile?.full_name || profile?.email || '');
	const companyName = $derived(profile?.clients?.name || '');
	const initials = $derived(
		displayName
			.split(' ')
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);

	const navItems = [
		{ label: 'Support Center', href: '/portal' },
		{ label: 'My Tickets', href: '/portal/my-tickets' },
		{ label: 'Raise a Ticket', href: '/portal/submit' }
	];
</script>

<header
	class="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]/95 px-4 backdrop-blur-md sm:px-6 md:px-10"
>
	<!-- Left: Brand Logo & Title -->
	<div class="flex items-center gap-6">
		<a href="/portal" class="flex items-center gap-2.5 transition-opacity hover:opacity-90">
			<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-container)] text-white shadow-2xs">
				<span class="material-symbols-outlined text-[22px]">support_agent</span>
			</div>
			<div>
				<div class="text-[16px] font-bold tracking-tight text-[var(--color-primary)]">
					Nexus Support
				</div>
				<div class="text-[10px] font-semibold tracking-wider text-[var(--color-on-surface-variant)] uppercase">
					Client Portal
				</div>
			</div>
		</a>

		<!-- Desktop Navigation Links -->
		<nav class="hidden items-center gap-1 md:flex" aria-label="Client Portal Navigation">
			{#each navItems as item}
				{@const isActive =
					item.href === '/portal'
						? page.url.pathname === '/portal'
						: page.url.pathname.startsWith(item.href)}
				<a
					href={item.href}
					class="rounded-lg px-3.5 py-1.5 text-label-md font-medium transition-colors {isActive
						? 'bg-[var(--color-surface-container)] text-[var(--color-primary)] font-semibold'
						: 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</div>

	<!-- Right Section: Staff switcher, Notification bell, Client Avatar -->
	<div class="flex items-center gap-3">
		<!-- Switch to Staff Workspace link -->
		<a
			href="/dashboard"
			class="hidden items-center gap-1.5 rounded-full border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 py-1 text-label-sm font-medium text-[var(--color-on-surface-variant)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] lg:flex"
		>
			<span class="material-symbols-outlined text-[16px]">admin_panel_settings</span>
			<span>Staff View</span>
		</a>

		<!-- Notifications -->
		<button
			type="button"
			class="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] relative cursor-pointer"
			aria-label="Notifications"
		>
			<span class="material-symbols-outlined text-[20px]">notifications</span>
			<span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--color-error)]"></span>
		</button>

		<div class="hidden h-6 w-px bg-[var(--color-outline-variant)] sm:block"></div>

		<!-- Client User Profile -->
		<div class="flex items-center gap-3">
			<div class="hidden text-right sm:block">
				<p class="text-label-md font-semibold text-[var(--color-on-surface)]">{companyName}</p>
				<p class="text-body-sm text-[var(--color-on-surface-variant)]">{displayName}</p>
			</div>
			<div
				class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[12px] font-bold text-[var(--color-on-surface-variant)] shadow-2xs"
			>
				{initials}
			</div>
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-error)] cursor-pointer"
					aria-label="Sign out"
					title="Sign out"
				>
					<span class="material-symbols-outlined text-[20px]">logout</span>
				</button>
			</form>
		</div>

		<!-- Mobile menu toggle button -->
		{#if onMenuClick}
			<button
				type="button"
				class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] md:hidden"
				onclick={onMenuClick}
				aria-label="Toggle navigation"
			>
				<span class="material-symbols-outlined">menu</span>
			</button>
		{/if}
	</div>
</header>
