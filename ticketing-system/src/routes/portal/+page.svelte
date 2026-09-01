<script lang="ts">
	import { STATUS_LABEL, formatRelative } from '$lib/portal/ticketDisplay';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const tickets = $derived(
		data.tickets.map((t) => ({
			id: t.token ?? t.id,
			title: t.title,
			status: STATUS_LABEL[t.status],
			lastUpdated: formatRelative(t.updated_at)
		}))
	);

	function getStatusBadgeClass(status: string) {
		switch (status) {
			case 'In Development':
			case 'In Progress':
				return 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)]/60';
			case 'Awaiting Client':
			case 'Awaiting Client Approval':
			case 'Awaiting Your Response':
				return 'bg-[#FFF4E5] text-[#ED6C02] border border-[#FFE0B2] font-semibold';
			case 'Resolved':
				return 'bg-[#EDF7ED] text-[#2E7D32] border border-[#C8E6C9] font-semibold';
			default:
				return 'bg-[var(--color-primary-fixed)] text-[var(--color-on-primary-fixed)]';
		}
	}
</script>

<svelte:head>
	<title>Support Center - Nexus Client Portal</title>
</svelte:head>

<div class="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:px-10 md:py-10 space-y-8">
	<!-- Breadcrumb Navigation -->
	<nav class="flex items-center gap-2 text-body-sm text-[var(--color-outline)]" aria-label="Breadcrumb">
		<span class="hover:text-[var(--color-primary)] transition-colors cursor-pointer">Acme Corporation</span>
		<span class="material-symbols-outlined text-[16px]">chevron_right</span>
		<span class="hover:text-[var(--color-primary)] transition-colors cursor-pointer">Sales Dashboard</span>
		<span class="material-symbols-outlined text-[16px]">chevron_right</span>
		<span class="text-[var(--color-on-surface-variant)] font-semibold">Production</span>
	</nav>

	<!-- Welcome Hero -->
	<section class="space-y-1.5">
		<h1 class="text-3xl font-bold tracking-tight text-[var(--color-on-surface)] sm:text-4xl">
			How can we help you today?
		</h1>
		<p class="text-body-md text-[var(--color-on-surface-variant)]">
			Report an issue, request an enhancement, or track an existing request.
		</p>
	</section>

	<!-- Pending Approval Banner (client_admin only) -->
	{#if data.pendingApprovalTickets && data.pendingApprovalTickets.length > 0}
		<section class="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-5 shadow-xs space-y-3">
			<h2 class="text-base font-bold text-[var(--color-on-surface)] flex items-center gap-1.5">
				<span class="material-symbols-outlined text-[20px] text-amber-600">hourglass_top</span>
				<span>{data.pendingApprovalTickets.length} ticket{data.pendingApprovalTickets.length === 1 ? '' : 's'} waiting on your approval</span>
			</h2>
			<div class="space-y-2">
				{#each data.pendingApprovalTickets as t}
					<a
						href="/portal/my-tickets/{t.token}"
						class="flex items-center justify-between rounded-lg bg-white border border-amber-200 px-3.5 py-2.5 hover:border-amber-400 transition-colors"
					>
						<div class="min-w-0">
							<span class="font-mono font-semibold text-[var(--color-primary)] mr-2">{t.token}</span>
							<span class="text-body-sm text-[var(--color-on-surface)]">{t.title}</span>
						</div>
						<span class="text-[11px] text-[var(--color-on-surface-variant)] whitespace-nowrap ml-3">
							by {t.raiser?.full_name ?? 'Unknown'}
						</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Primary Action Cards (Raise a Ticket & My Tickets) -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Card 1: Raise a Ticket -->
		<div
			class="flex flex-col justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xs hover:shadow-md transition-all group"
		>
			<div>
				<div class="flex items-start justify-between mb-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-container-low)] text-[var(--color-primary)] group-hover:scale-105 transition-transform"
					>
						<span class="material-symbols-outlined text-2xl">add_circle</span>
					</div>
				</div>
				<h2 class="text-xl font-bold text-[var(--color-on-surface)] mb-2">Raise a Ticket</h2>
				<p class="text-body-md text-[var(--color-on-surface-variant)] mb-6 min-h-[48px]">
					Report an issue, request a change, or tell us about something that needs attention.
				</p>
			</div>

			<a
				href="/portal/submit"
				class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-5 py-2.5 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors w-fit shadow-2xs"
			>
				<span>Create Ticket</span>
				<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
			</a>
		</div>

		<!-- Card 2: My Tickets -->
		<div
			class="flex flex-col justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xs hover:shadow-md transition-all group"
		>
			<div>
				<div class="flex items-start justify-between mb-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] group-hover:scale-105 transition-transform"
					>
						<span class="material-symbols-outlined text-2xl">confirmation_number</span>
					</div>
				</div>
				<h2 class="text-xl font-bold text-[var(--color-on-surface)] mb-2">My Tickets</h2>
				<p class="text-body-md text-[var(--color-on-surface-variant)] mb-6 min-h-[48px]">
					View your existing issues and track real-time engineering progress.
				</p>
			</div>

			<a
				href="/portal/my-tickets"
				class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-5 py-2.5 text-label-md font-semibold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors w-fit"
			>
				<span>View Tickets</span>
				<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
			</a>
		</div>
	</div>

	<!-- Two Column Layout: Quick Actions & Recent Tickets Table -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
		<!-- Left Column: Quick Request Types & Attention Needed -->
		<div class="lg:col-span-1 flex flex-col gap-6">
			<!-- Quick Request Types -->
			<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs">
				<h3 class="text-lg font-bold text-[var(--color-on-surface)] mb-4">
					What would you like to do?
				</h3>
				<div class="flex flex-col gap-2.5">
					<a
						href="/portal/submit?type=issue"
						class="flex items-center gap-3.5 rounded-lg border border-[var(--color-border-subtle)]/40 bg-[var(--color-surface-container-low)]/70 p-3 hover:bg-[var(--color-primary-fixed)]/40 hover:border-[var(--color-primary)]/40 transition-all text-left group"
					>
						<span class="material-symbols-outlined text-[var(--color-primary)] group-hover:scale-110 transition-transform">
							report
						</span>
						<span class="text-label-md font-semibold text-[var(--color-on-surface)]">
							Report an Issue
						</span>
					</a>

					<a
						href="/portal/submit?type=enhancement"
						class="flex items-center gap-3.5 rounded-lg border border-[var(--color-border-subtle)]/40 bg-[var(--color-surface-container-low)]/70 p-3 hover:bg-[var(--color-primary-fixed)]/40 hover:border-[var(--color-primary)]/40 transition-all text-left group"
					>
						<span class="material-symbols-outlined text-[var(--color-primary)] group-hover:scale-110 transition-transform">
							upgrade
						</span>
						<span class="text-label-md font-semibold text-[var(--color-on-surface)]">
							Request an Enhancement
						</span>
					</a>

					<a
						href="/portal/submit?type=question"
						class="flex items-center gap-3.5 rounded-lg border border-[var(--color-border-subtle)]/40 bg-[var(--color-surface-container-low)]/70 p-3 hover:bg-[var(--color-primary-fixed)]/40 hover:border-[var(--color-primary)]/40 transition-all text-left group"
					>
						<span class="material-symbols-outlined text-[var(--color-primary)] group-hover:scale-110 transition-transform">
							help
						</span>
						<span class="text-label-md font-semibold text-[var(--color-on-surface)]">
							Ask a Question
						</span>
					</a>
				</div>
			</div>

			<!-- Attention Needed Card -->
			<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs">
				<h3 class="text-lg font-bold text-[var(--color-on-surface)] mb-3">
					Your Attention Needed
				</h3>
				<div class="flex items-center gap-3 rounded-lg border border-[#C8E6C9] bg-[#EDF7ED] p-4 text-[#1E4620]">
					<span class="material-symbols-outlined text-[#2E7D32] text-2xl">check_circle</span>
					<span class="text-body-md font-medium">You're all caught up</span>
				</div>
			</div>
		</div>

		<!-- Right Column: Recent Tickets Table -->
		<div class="lg:col-span-2">
			<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] shadow-xs overflow-hidden">
				<div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] p-5">
					<h3 class="text-lg font-bold text-[var(--color-on-surface)]">Recent Tickets</h3>
					<a
						href="/portal/my-tickets"
						class="flex items-center gap-1 text-label-md font-semibold text-[var(--color-primary)] hover:underline"
					>
						<span>View All</span>
						<span class="material-symbols-outlined text-[16px]">arrow_forward</span>
					</a>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left">
						<thead>
							<tr class="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)]/50">
								<th class="p-4 text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)]">
									Ticket ID
								</th>
								<th class="p-4 text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)]">
									Summary
								</th>
								<th class="p-4 text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)]">
									Status
								</th>
								<th class="p-4 text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)]">
									Last Updated
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[var(--color-border-subtle)] text-body-sm">
							{#each tickets as ticket}
								<tr
									class="hover:bg-[var(--color-surface-container-low)]/60 transition-colors cursor-pointer group"
									onclick={() => (window.location.href = `/portal/my-tickets/${ticket.id}`)}
								>
									<td class="p-4 font-semibold text-[var(--color-primary)] group-hover:underline">
										{ticket.id}
									</td>
									<td class="p-4 text-[var(--color-on-surface)] font-medium">
										{ticket.title}
									</td>
									<td class="p-4">
										<span
											class="inline-block rounded px-2.5 py-0.5 text-label-sm uppercase tracking-wider {getStatusBadgeClass(
												ticket.status
											)}"
										>
											{ticket.status}
										</span>
									</td>
									<td class="p-4 text-[var(--color-on-surface-variant)] text-body-sm whitespace-nowrap">
										{ticket.lastUpdated}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
