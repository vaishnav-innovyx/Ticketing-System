<script lang="ts">
	interface ActivityItem {
		id: string;
		icon: string;
		iconBg: string;
		iconColor: string;
		titleHtml: string;
		timestamp: string;
	}

	const activities: ActivityItem[] = [
		{
			id: 'act-1',
			icon: 'check',
			iconBg: 'bg-[var(--color-secondary-container)]/50',
			iconColor: 'text-[var(--color-secondary)]',
			titleHtml:
				'Client approved estimate for <a class="text-[var(--color-primary)] font-medium hover:underline" href="/tickets/TK-1042">TK-1042</a>',
			timestamp: '10 mins ago'
		},
		{
			id: 'act-2',
			icon: 'add',
			iconBg: 'bg-[var(--color-surface-container)]',
			iconColor: 'text-[var(--color-primary-container)]',
			titleHtml:
				'New ticket created by <span class="font-medium text-[var(--color-on-surface)]">Acme Corp</span>',
			timestamp: '45 mins ago'
		},
		{
			id: 'act-3',
			icon: 'person_add',
			iconBg: 'bg-[var(--color-tertiary-fixed)]/40',
			iconColor: 'text-[var(--color-tertiary)]',
			titleHtml:
				'<span class="font-medium text-[var(--color-on-surface)]">Rahul</span> was assigned to <a class="text-[var(--color-primary)] font-medium hover:underline" href="/tickets/TK-1041">TK-1041</a>',
			timestamp: '2 hours ago'
		},
		{
			id: 'act-4',
			icon: 'image',
			iconBg: 'bg-[var(--color-surface-variant)]',
			iconColor: 'text-[var(--color-on-surface-variant)]',
			titleHtml:
				'Client uploaded a screenshot to <a class="text-[var(--color-primary)] font-medium hover:underline" href="/tickets/TK-1039">TK-1039</a>',
			timestamp: '3 hours ago'
		},
		{
			id: 'act-5',
			icon: 'bug_report',
			iconBg: 'bg-[var(--color-inverse-primary)]/30',
			iconColor: 'text-[var(--color-primary)]',
			titleHtml:
				'<a class="text-[var(--color-primary)] font-medium hover:underline" href="/tickets/TK-1038">TK-1038</a> moved to QA',
			timestamp: '4 hours ago'
		}
	];
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
	</div>
</div>
