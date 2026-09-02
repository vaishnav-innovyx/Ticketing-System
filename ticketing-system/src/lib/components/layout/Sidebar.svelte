<script lang="ts">
	import SidebarItem from './SidebarItem.svelte';

	let {
		profile,
		unreadMessageCount = 0,
		onClose
	}: {
		profile?: { id: string; full_name: string | null; email: string; role: string } | null;
		unreadMessageCount?: number;
		onClose?: () => void;
	} = $props();

	const navigation = $derived([
		{
			label: 'Dashboard',
			href: '/',
			icon: 'dashboard'
		},
		{
			label: 'Tickets',
			href: '/tickets',
			icon: 'confirmation_number',
			badge: 24
		},
		{
			label: 'Communication',
			href: '/communications',
			icon: 'forum',
			badge: unreadMessageCount > 0 ? unreadMessageCount : undefined
		},
		{
			label: 'Clients',
			href: '/clients',
			icon: 'group'
		},
		{
			label: 'Projects',
			href: '/projects',
			icon: 'folder_special'
		},
		{
			label: 'Estimates',
			href: '/estimates',
			icon: 'request_quote'
		},
		{
			label: 'Team',
			href: '/team',
			icon: 'badge'
		},
		{
			label: 'Notifications',
			href: '/notifications',
			icon: 'notifications'
		},
		{
			label: 'Reports',
			href: '/reports',
			icon: 'bar_chart'
		}
	]);
</script>

<aside
	class="flex h-screen w-[260px] flex-col border-r border-[var(--color-outline-variant)]/20 bg-[var(--color-inverse-surface)] py-4 text-white select-none"
>
	<!-- Brand Header -->
	<div class="mb-6 flex h-12 items-center justify-between px-5">
		<div class="flex items-center gap-2.5">
			<img
				src="/logo.png"
				alt="Resolv Logo"
				class="h-8 w-8 rounded-lg bg-white object-contain p-0.5 shadow shrink-0"
			/>
			<div>
				<div class="text-[13px] font-bold tracking-tight text-white uppercase">
					Resolv Desk
				</div>
				<div class="text-[10px] tracking-wider text-[var(--color-sidebar-muted)] uppercase">
					Support Portal
				</div>
			</div>
		</div>

		{#if onClose}
			<button
				type="button"
				class="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-sidebar-muted)] hover:bg-white/10 hover:text-white md:hidden"
				onclick={onClose}
				aria-label="Close sidebar"
			>
				<span class="material-symbols-outlined text-[20px]">close</span>
			</button>
		{/if}
	</div>

	<!-- Navigation Section -->
	<nav class="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main Navigation">
		<div class="mb-2 px-3 text-[11px] font-semibold tracking-wider text-[var(--color-sidebar-muted)] uppercase">
			Workspace
		</div>

		{#each navigation as item}
			<SidebarItem
				label={item.label}
				href={item.href}
				icon={item.icon}
				badge={item.badge}
				onNavigate={onClose}
			/>
		{/each}
	</nav>

	<!-- Bottom Section: Settings, Client Portal & Sign Out -->
	<div class="mt-auto space-y-1 border-t border-white/10 px-3 pt-3">
		<a
			href="/portal"
			class="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--color-primary-fixed)] transition-colors hover:bg-white/10 hover:text-white"
			onclick={onClose}
		>
			<span class="material-symbols-outlined text-[20px]">open_in_new</span>
			<span>Client Portal View</span>
		</a>
		<SidebarItem
			label="Settings"
			href="/settings"
			icon="settings"
			onNavigate={onClose}
		/>

		<form method="POST" action="/logout" class="w-full pt-1">
			<button
				type="submit"
				class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
			>
				<span class="material-symbols-outlined text-[20px]">logout</span>
				<span>Sign Out</span>
			</button>
		</form>
	</div>
</aside>