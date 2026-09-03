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

	<div class="space-y-3">
		{#each stages as stage}
			<div class="flex items-center gap-3">
				<span class="w-40 shrink-0 truncate text-body-xs font-medium text-[var(--color-on-surface-variant)]" title={stage.label}>
					{stage.label}
				</span>
				<div class="h-2 flex-1 rounded-full bg-[var(--color-surface-container)]">
					<div
						class="h-2 rounded-full transition-all duration-300 {stage.label === 'Rejected'
							? 'bg-[var(--color-error)]'
							: 'bg-[var(--color-primary-container)]'}"
						style="width: {(stage.count / maxCount) * 100}%"
					></div>
				</div>
				<span class="w-8 shrink-0 text-right font-mono text-body-xs font-semibold tabular-nums text-[var(--color-on-surface)]">
					{stage.count}
				</span>
			</div>
		{/each}
	</div>
</div>
