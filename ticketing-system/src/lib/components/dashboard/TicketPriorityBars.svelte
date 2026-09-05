<script lang="ts">
	interface PriorityItem {
		label: string;
		count: number;
		colorVar: string;
		percentage: number;
	}

	let { priorities: incomingPriorities = [] }: { priorities?: PriorityItem[] } = $props();

	const fallbackPriorities: PriorityItem[] = [
		{ label: 'P0 – Critical', count: 0, colorVar: 'var(--color-error)', percentage: 0 },
		{ label: 'P1 – High', count: 0, colorVar: 'var(--color-primary-container)', percentage: 0 },
		{ label: 'P2 – Medium', count: 0, colorVar: 'var(--color-primary-fixed-dim)', percentage: 0 },
		{ label: 'P3 – Low', count: 0, colorVar: 'var(--color-surface-container-highest)', percentage: 0 }
	];

	const displayPriorities = $derived(incomingPriorities.length > 0 ? incomingPriorities : fallbackPriorities);
	const totalEvaluated = $derived(displayPriorities.reduce((sum, p) => sum + p.count, 0));

	let hoveredPriority = $state<string | null>(null);
</script>

<div class="nexus-card flex flex-col p-5 sm:p-6">
	<!-- Header -->
	<h2 class="text-title-lg mb-4 border-b border-[var(--color-outline-variant)]/30 pb-3 font-semibold text-[var(--color-on-surface)]">
		Tickets by Priority
	</h2>

	<!-- Bar Chart Area -->
	<div class="flex min-h-[190px] flex-1 items-end gap-3 sm:gap-4 px-2 pt-4">
		{#each displayPriorities as p}
			{@const isHovered = hoveredPriority === p.label}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="group flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
				onmouseenter={() => (hoveredPriority = p.label)}
				onmouseleave={() => (hoveredPriority = null)}
			>
				<!-- Value Tag (visible or emphasized on hover) -->
				<span
					class="text-label-sm font-semibold mb-1.5 transition-all duration-150 {isHovered
						? 'text-[var(--color-on-surface)] scale-110 opacity-100 font-bold'
						: 'text-[var(--color-on-surface-variant)] opacity-70 group-hover:opacity-100'}"
				>
					{p.count}
				</span>

				<!-- Bar Container -->
				<div class="w-full bg-[var(--color-surface-container-high)]/50 rounded-t-md overflow-hidden flex items-end h-[130px]">
					<div
						class="w-full rounded-t-md transition-all duration-300 group-hover:brightness-110"
						style="height: {p.percentage}%; background-color: {p.colorVar};"
					></div>
				</div>

				<!-- Label -->
				<span
					class="text-label-sm mt-2.5 truncate w-full text-center font-medium {isHovered
						? 'text-[var(--color-on-surface)] font-bold'
						: 'text-[var(--color-on-surface-variant)]'}"
				>
					{p.label}
				</span>
			</div>
		{/each}
	</div>

	<!-- Summary Footer -->
	<div class="mt-4 flex items-center justify-between border-t border-[var(--color-outline-variant)]/20 pt-2.5 text-label-sm text-[var(--color-on-surface-variant)]">
		<span>4 Priority Levels</span>
		<span class="font-semibold text-[var(--color-on-surface)]">{totalEvaluated} Total Evaluated</span>
	</div>
</div>
