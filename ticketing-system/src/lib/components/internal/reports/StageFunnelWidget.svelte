<script lang="ts">
	interface Stage {
		label: string;
		count: number;
	}

	let { stages }: { stages: Stage[] } = $props();

	let maxCount = $derived(Math.max(1, ...stages.map((s) => s.count)));
	let total = $derived(stages.reduce((acc, s) => acc + s.count, 0));
</script>

<div class="nexus-card p-5 sm:p-6">
	<div class="mb-4 flex items-center justify-between border-b border-[var(--color-outline-variant)]/30 pb-3">
		<h2 class="text-title-lg font-semibold text-[var(--color-on-surface)]">Pipeline Stage Funnel</h2>
		<span class="text-body-xs text-[var(--color-on-surface-variant)]">{total} ticket{total === 1 ? '' : 's'} in view</span>
	</div>

	<div class="flex items-stretch gap-1.5 overflow-x-auto pb-1 sm:gap-2">
		{#each stages as stage, i}
			<div
				class="flex min-w-[100px] flex-1 flex-col items-center gap-2 rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] px-3 py-4"
			>
				<span class="text-display-sm font-bold text-[var(--color-primary)]">{stage.count}</span>
				<span class="text-center text-label-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
					{stage.label}
				</span>
				<div class="h-1.5 w-full rounded-full bg-[var(--color-surface-container)]">
					<div
						class="h-1.5 rounded-full bg-[var(--color-primary-container)] transition-all duration-300"
						style="width: {(stage.count / maxCount) * 100}%"
					></div>
				</div>
			</div>
			{#if i < stages.length - 1}
				<div class="flex shrink-0 items-center text-[var(--color-on-surface-variant)]">
					<span class="material-symbols-outlined text-[18px]">arrow_forward</span>
				</div>
			{/if}
		{/each}
	</div>
</div>
