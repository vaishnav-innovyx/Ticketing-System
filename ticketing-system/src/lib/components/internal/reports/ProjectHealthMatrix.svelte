<script lang="ts">
	interface HealthRow {
		clientCode: string;
		clientName: string;
		projectCode: string;
		projectName: string;
		open: number;
		bugs: number;
		enhancements: number;
		onTrack: boolean;
	}

	let { rows }: { rows: HealthRow[] } = $props();
</script>

<div class="nexus-card flex flex-col p-5 sm:p-6">
	<h2 class="text-title-lg mb-4 border-b border-[var(--color-outline-variant)]/30 pb-3 font-semibold text-[var(--color-on-surface)]">
		Project &amp; Client Health Matrix
	</h2>

	{#if rows.length === 0}
		<p class="text-body-sm text-[var(--color-on-surface-variant)]">No projects in the current filter.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-left text-body-sm">
				<thead class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					<tr class="border-b border-[var(--color-outline-variant)]/40">
						<th class="py-2.5 pr-3">Client</th>
						<th class="py-2.5 pr-3">Project</th>
						<th class="py-2.5 pr-3 text-right">Open</th>
						<th class="py-2.5 pr-3 text-right">Bugs</th>
						<th class="py-2.5 pr-3 text-right">Enh.</th>
						<th class="py-2.5 pr-3 text-right">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-outline-variant)]/20">
					{#each rows as row}
						<tr class="hover:bg-[var(--color-surface-container-low)]/50 transition-colors">
							<td class="py-2.5 pr-3 font-mono text-label-xs font-bold text-[var(--color-primary)]">{row.clientCode}</td>
							<td class="py-2.5 pr-3">
								<span class="font-medium text-[var(--color-on-surface)]">{row.projectName}</span>
								<span class="ml-1.5 font-mono text-label-xs text-[var(--color-on-surface-variant)]">{row.projectCode}</span>
							</td>
							<td class="py-2.5 pr-3 text-right font-mono tabular-nums">{row.open}</td>
							<td class="py-2.5 pr-3 text-right font-mono tabular-nums">{row.bugs}</td>
							<td class="py-2.5 pr-3 text-right font-mono tabular-nums">{row.enhancements}</td>
							<td class="py-2.5 pr-3 text-right">
								<span
									class="inline-flex items-center rounded-md px-2 py-0.5 text-label-xs font-semibold {row.onTrack
										? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]'
										: 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]'}"
								>
									{row.onTrack ? 'On Track' : 'Attention'}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
