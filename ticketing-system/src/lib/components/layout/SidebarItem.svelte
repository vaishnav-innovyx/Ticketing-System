<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		label: string;
		href: string;
		icon: string;
		badge?: string | number;
		onNavigate?: () => void;
	}

	let { label, href, icon, badge, onNavigate }: Props = $props();

	let isActive = $derived(
		href === '/'
			? page.url.pathname === '/'
			: page.url.pathname.startsWith(href)
	);
</script>

<a
	href={href}
	onclick={onNavigate}
	class="group relative flex h-10 items-center gap-3 rounded-lg px-3 py-2 text-body-sm transition-all duration-150 {isActive
		? 'bg-white/10 font-medium text-white shadow-sm'
		: 'text-[var(--color-sidebar-muted)] hover:bg-white/5 hover:text-white'}"
	aria-current={isActive ? 'page' : undefined}
>
	<!-- Left active indicator bar -->
	{#if isActive}
		<span class="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[var(--color-primary-container)]"></span>
	{/if}

	<span
		class="material-symbols-outlined shrink-0 text-[20px] transition-colors {isActive
			? 'fill text-white'
			: 'text-[var(--color-sidebar-muted)] group-hover:text-white'}"
	>
		{icon}
	</span>

	<span class="flex-1 truncate text-label-md">{label}</span>

	{#if badge}
		<span
			class="rounded-full bg-[var(--color-primary-container)] px-1.5 py-0.5 text-[10px] font-bold text-white"
		>
			{badge}
		</span>
	{/if}
</a>