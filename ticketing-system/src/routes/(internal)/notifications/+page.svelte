<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const EVENT_LABEL: Record<string, string> = {
		ticket_raised: 'Ticket raised',
		poc_triaged: 'PoC triaged',
		estimate_submitted: 'Estimate submitted for approval',
		estimate_approved: 'Estimate approved',
		estimate_rejected: 'Estimate rejected',
		development_completed: 'Development completed',
		delivered: 'Delivered',
		closed: 'Closed'
	};
</script>

<svelte:head>
	<title>Notifications - Resolv - Ticketing & Support System</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-8 space-y-6">
	<div>
		<h1 class="text-title-lg font-bold text-[var(--color-on-surface)]">Notifications</h1>
		<p class="text-body-sm text-[var(--color-on-surface-variant)]">
			Lifecycle events dispatched to your account. This is the in-app record — email delivery is not yet wired up.
		</p>
	</div>

	{#if data.notifications.length === 0}
		<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-8 text-center text-body-sm text-[var(--color-outline)]">
			No notifications yet.
		</div>
	{:else}
		<div class="divide-y divide-[var(--color-outline-variant)]/30 rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)]">
			{#each data.notifications as n}
				{@const ticket = Array.isArray(n.ticket) ? n.ticket[0] : n.ticket}
				<div class="flex items-start gap-3 p-4">
					<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)] mt-0.5">notifications</span>
					<div class="min-w-0 flex-1">
						<p class="text-body-sm text-[var(--color-on-surface)]">
							<span class="font-mono font-semibold text-[var(--color-primary)]">{ticket?.token ?? ''}</span>
							<span class="ml-1">{EVENT_LABEL[n.event] ?? n.event}</span>
						</p>
						<p class="text-body-xs text-[var(--color-on-surface-variant)] truncate">{n.body}</p>
					</div>
					<span class="text-[11px] text-[var(--color-outline)] whitespace-nowrap">
						{new Date(n.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
