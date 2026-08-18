<script lang="ts">
	let {
		id,
		title,
		status,
		category,
		createdAt,
		lastUpdate,
		priority
	}: {
		id: string;
		title: string;
		status: 'Open' | 'In Progress' | 'Awaiting Feedback' | 'Resolved';
		category: string;
		createdAt: string;
		lastUpdate: string;
		priority: 'Low' | 'Medium' | 'High' | 'Urgent';
	} = $props();

	function getStatusClass(st: string) {
		switch (st) {
			case 'Open':
				return 'bg-[var(--color-primary-fixed)] text-[var(--color-on-primary-fixed)] border-[var(--color-primary)]/20';
			case 'In Progress':
				return 'bg-[var(--color-secondary-fixed)] text-[var(--color-on-secondary-fixed)] border-[var(--color-secondary)]/20';
			case 'Awaiting Feedback':
				return 'bg-[var(--color-tertiary-fixed)] text-[var(--color-on-tertiary-fixed)] border-[var(--color-tertiary)]/20';
			case 'Resolved':
				return 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] border-[var(--color-secondary)]/20';
			default:
				return 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]';
		}
	}
</script>

<div class="flex flex-col justify-between gap-4 rounded-xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-5 transition-shadow hover:shadow-sm sm:flex-row sm:items-center">
	<div class="space-y-1.5">
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-label-sm font-bold text-[var(--color-primary)]">
				#{id}
			</span>
			<span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-label-sm font-semibold {getStatusClass(status)}">
				{status}
			</span>
			<span class="rounded-md bg-[var(--color-surface-container)] px-2 py-0.5 text-label-xs font-medium text-[var(--color-on-surface-variant)]">
				{category}
			</span>
		</div>
		<h4 class="text-title-sm font-semibold text-[var(--color-on-surface)]">
			{title}
		</h4>
		<div class="flex items-center gap-3 text-label-sm text-[var(--color-on-surface-variant)]">
			<span>Submitted: {createdAt}</span>
			<span>•</span>
			<span>Updated: {lastUpdate}</span>
		</div>
	</div>

	<div class="flex items-center gap-3">
		<a
			href="/portal/my-tickets"
			class="nexus-secondary-button h-9 px-3.5 text-label-md"
		>
			<span>View Thread</span>
			<span class="material-symbols-outlined text-[16px]">chevron_right</span>
		</a>
	</div>
</div>
