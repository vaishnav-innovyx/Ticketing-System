<script lang="ts">
	import { page } from '$app/state';

	let { onMenuClick }: { onMenuClick?: () => void } = $props();

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
				<p class="text-label-md font-semibold text-[var(--color-on-surface)]">Acme Corporation</p>
				<p class="text-body-sm text-[var(--color-on-surface-variant)]">John Mathew</p>
			</div>
			<div class="h-9 w-9 overflow-hidden rounded-full border border-[var(--color-outline-variant)] shadow-2xs">
				<img
					alt="John Mathew"
					class="h-full w-full object-cover"
					src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEAUC65ORPmsT6mXMOkdReMsILShQV97ex_PXYgmVq_kIeN65qT9x4jWaNu8k7nxOuVQfG92OtLJiYE_TI9CEgifKII1bhjCiviRh9b4GUtZpYPI-25e0R4xtzwqU1xVd9oZ_G7VvFQObpCjpeMeuIaEk4WTJ0yZvl9FUBXs77HLsNnwUF8oBLrc4SFYRR-cIR9EguzGkSXQPuYxXdGv0erR2770L7-_8S4C3dcJBlAm6kHLtAhLbADw"
				/>
			</div>
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
