<script lang="ts">
	interface ActivityItem {
		id: string;
		icon: string;
		iconBg: string;
		iconColor: string;
		titleHtml: string;
		timestamp: string;
	}

	let { activities = [] }: { activities?: ActivityItem[] } = $props();
</script>

<div class="nexus-card flex flex-col p-5 sm:p-6">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between border-b border-[var(--color-outline-variant)]/30 pb-3">
		<h2 class="text-title-lg font-semibold text-[var(--color-on-surface)]">
			Recent Activity
		</h2>
		<a
			href="/reports"
			class="text-label-md font-medium text-[var(--color-primary)] hover:underline"
		>
			View All
		</a>
	</div>

	<!-- Activity Feed Items -->
	<div class="flex-1 space-y-4 overflow-y-auto pr-1">
		{#if activities.length === 0}
			<div class="flex flex-col items-center justify-center py-8 text-center text-body-xs text-[var(--color-on-surface-variant)]">
				<span class="material-symbols-outlined text-[24px] mb-1 opacity-50">history</span>
				<span>No recent activity recorded yet</span>
			</div>
		{:else}
			{#each activities as item}
				<div class="flex items-start gap-3 rounded-lg p-1.5 transition-colors hover:bg-[var(--color-surface-container-low)]">
					<div
						class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full {item.iconBg} {item.iconColor}"
					>
						<span class="material-symbols-outlined text-[16px]">{item.icon}</span>
					</div>

					<div class="min-w-0 flex-1">
						<p class="text-body-sm leading-snug text-[var(--color-on-surface)]">
							{@html item.titleHtml}
						</p>
						<p class="text-label-sm mt-0.5 text-[var(--color-on-surface-variant)]">
							{item.timestamp}
						</p>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
