<script lang="ts">
	interface EffortRow {
		projectCode: string;
		projectName: string;
		estimatedHours: number;
		actualHours: number;
		pct: number | null;
	}

	let { rows }: { rows: EffortRow[] } = $props();

	let maxHours = $derived(Math.max(1, ...rows.flatMap((r) => [r.estimatedHours, r.actualHours])));
</script>

<div class="nexus-card flex flex-col p-5 sm:p-6">
	<h2 class="text-title-lg mb-4 border-b border-[var(--color-outline-variant)]/30 pb-3 font-semibold text-[var(--color-on-surface)]">
		Estimated vs Actual Hours
	</h2>

	{#if rows.length === 0}
		<p class="text-body-sm text-[var(--color-on-surface-variant)]">No projects with logged effort in the current filter.</p>
	{:else}
		<div class="space-y-4">
			{#each rows as row}
				<div>
					<div class="mb-1.5 flex items-center justify-between text-body-xs">
						<span class="font-medium text-[var(--color-on-surface)]">{row.projectName} <span class="font-mono text-[var(--color-on-surface-variant)]">{row.projectCode}</span></span>
						<span class="font-mono tabular-nums {row.pct !== null && row.pct > 20 ? 'font-bold text-[var(--color-error)]' : 'text-[var(--color-on-surface-variant)]'}">
							Est: {row.estimatedHours}h &middot; Actual: {row.actualHours}h{row.pct !== null ? ` (${row.pct > 0 ? '+' : ''}${row.pct.toFixed(1)}%)` : ''}
						</span>
					</div>
					<div class="flex gap-1.5">
						<div class="h-2 flex-1 rounded-full bg-[var(--color-surface-container)]">
							<div
								class="h-2 rounded-full bg-[var(--color-outline-variant)]"
								style="width: {(row.estimatedHours / maxHours) * 100}%"
							></div>
						</div>
						<div class="h-2 flex-1 rounded-full bg-[var(--color-surface-container)]">
							<div
								class="h-2 rounded-full {row.pct !== null && row.pct > 20 ? 'bg-[var(--color-error)]' : 'bg-[var(--color-primary)]'}"
								style="width: {(row.actualHours / maxHours) * 100}%"
							></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
		<div class="mt-4 flex items-center gap-4 border-t border-[var(--color-outline-variant)]/20 pt-3 text-body-xs text-[var(--color-on-surface-variant)]">
			<span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-[var(--color-outline-variant)]"></span> Estimated</span>
			<span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-[var(--color-primary)]"></span> Actual</span>
		</div>
	{/if}
</div>
