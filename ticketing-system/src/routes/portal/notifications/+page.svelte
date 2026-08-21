<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const EVENT_LABEL: Record<string, string> = {
		ticket_raised: 'Ticket raised',
		poc_triaged: 'Our team triaged your ticket',
		estimate_submitted: 'Estimate ready for your approval',
		estimate_approved: 'Estimate approved',
		estimate_rejected: 'Estimate sent back for revision',
		development_completed: 'Development completed',
		delivered: 'Delivered',
		closed: 'Resolved'
	};
</script>

<svelte:head>
	<title>Notifications - Nexus Client Portal</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-10 space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-[var(--color-on-surface)]">Notifications</h1>
		<p class="text-body-sm text-[var(--color-on-surface-variant)]">Updates on tickets you've raised.</p>
	</div>

	{#if data.notifications.length === 0}
		<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-8 text-center text-body-sm text-[var(--color-outline)]">
			No notifications yet.
		</div>
	{:else}
		<div class="divide-y divide-[var(--color-border-subtle)] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] shadow-xs">
			{#each data.notifications as n}
				{@const ticket = Array.isArray(n.ticket) ? n.ticket[0] : n.ticket}
				<div class="flex items-start gap-3 p-4">
					<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)] mt-0.5">notifications</span>
					<div class="min-w-0 flex-1">
						<p class="text-body-sm text-[var(--color-on-surface)]">
							<span class="font-mono font-semibold text-[var(--color-primary)]">{ticket?.token ?? ''}</span>
							<span class="ml-1">{EVENT_LABEL[n.event] ?? n.event}</span>
						</p>
						<p class="text-body-xs text-[var(--color-on-surface-variant)] truncate">{ticket?.title ?? ''}</p>
					</div>
					<span class="text-[11px] text-[var(--color-outline)] whitespace-nowrap">
						{new Date(n.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
