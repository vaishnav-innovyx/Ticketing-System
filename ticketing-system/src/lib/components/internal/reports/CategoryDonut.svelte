<script lang="ts">
	interface Segment {
		label: string;
		count: number;
		color: string;
	}

	let { segments, title = 'Category Distribution' }: { segments: Segment[]; title?: string } = $props();

	let total = $derived(segments.reduce((acc, s) => acc + s.count, 0));
	let hoveredSegment = $state<Segment | null>(null);

	const size = 180;
	const strokeWidth = 24;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;

	let computedArcs = $derived.by(() => {
		if (total === 0) return [];
		let accumulated = 0;
		return segments.map((seg) => {
			const ratio = seg.count / total;
			const dashLength = ratio * circumference;
			const offset = -accumulated;
			accumulated += dashLength;
			return {
				...seg,
				ratio,
				dashArray: `${dashLength} ${circumference - dashLength}`,
				dashOffset: offset
			};
		});
	});
</script>

<div class="nexus-card flex flex-col p-5 sm:p-6">
	<h2 class="text-title-lg mb-4 border-b border-[var(--color-outline-variant)]/30 pb-3 font-semibold text-[var(--color-on-surface)]">
		{title}
	</h2>

	<div class="relative flex min-h-[190px] flex-1 items-center justify-center">
		{#if total === 0}
			<p class="text-body-sm text-[var(--color-on-surface-variant)]">No tickets in the current filter.</p>
		{:else}
			<svg width={size} height={size} viewBox="0 0 {size} {size}" class="rotate-[-90deg] transform">
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="transparent"
					stroke="var(--color-surface-container-high)"
					stroke-width={strokeWidth}
				/>

				{#each computedArcs as arc}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="transparent"
						stroke={arc.color}
						stroke-width={hoveredSegment?.label === arc.label ? strokeWidth + 3 : strokeWidth}
						stroke-dasharray={arc.dashArray}
						stroke-dashoffset={arc.dashOffset}
						class="cursor-pointer transition-all duration-200"
						onmouseenter={() => (hoveredSegment = arc)}
						onmouseleave={() => (hoveredSegment = null)}
					/>
				{/each}
			</svg>

			<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
				<span class="text-display-lg leading-none font-bold text-[var(--color-on-surface)]">
					{hoveredSegment ? hoveredSegment.count : total}
				</span>
				<span class="text-label-sm mt-1 uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					{hoveredSegment ? hoveredSegment.label : 'Total'}
				</span>
			</div>
		{/if}
	</div>

	{#if total > 0}
		<div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-[var(--color-outline-variant)]/20 pt-2">
			{#each segments as seg}
				<div
					class="flex items-center justify-between gap-2 rounded-md p-1 transition-colors hover:bg-[var(--color-surface-container-low)]"
					onmouseenter={() => (hoveredSegment = seg)}
					onmouseleave={() => (hoveredSegment = null)}
					role="presentation"
				>
					<div class="flex items-center gap-2">
						<span class="h-2.5 w-2.5 rounded-full" style="background-color: {seg.color};"></span>
						<span class="text-label-md text-[var(--color-on-surface-variant)]">
							{seg.label}
						</span>
					</div>
					<span class="text-label-md font-semibold text-[var(--color-on-surface)]">
						{seg.count}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
