<script lang="ts">
	import { STATUS_LABEL, CATEGORY_LABEL, PRIORITY_LABEL, formatRelative } from '$lib/portal/ticketDisplay';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let statusFilter = $state('All');
	let typeFilter = $state('All');
	let appFilter = $state('All');

	const tickets = $derived(
		data.tickets.map((t) => ({
			id: t.token ?? t.id,
			title: t.title,
			description: t.description ?? '',
			status: t.status === 'client_approval' && t.client_approved_at ? 'Approved — Starting Soon' : STATUS_LABEL[t.status],
			category: CATEGORY_LABEL[t.category],
			priority: PRIORITY_LABEL[t.priority],
			application: t.projects?.name ?? '',
			lastUpdated: formatRelative(t.updated_at),
			isPendingApproval: t.requires_admin_approval && !t.admin_approved_at && !t.admin_rejected_at,
			isRejected: !!t.admin_rejected_at
		}))
	);

	const applicationOptions = $derived([...new Set(tickets.map((t) => t.application))]);

	const totalCount = $derived(tickets.length);
	const openCount = $derived(tickets.filter((t) => t.status !== 'Resolved').length);
	const awaitingCount = $derived(
		tickets.filter((t) => t.status === 'Awaiting Your Response' || t.status === 'Awaiting Client').length
	);
	const resolvedCount = $derived(tickets.filter((t) => t.status === 'Resolved').length);

	const filteredTickets = $derived(
		tickets.filter((t) => {
			const matchesSearch =
				!searchQuery ||
				t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				t.description.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesStatus =
				statusFilter === 'All' ||
				(statusFilter === 'Open' && t.status !== 'Resolved') ||
				(statusFilter === 'Resolved' && t.status === 'Resolved') ||
				(statusFilter === 'Awaiting Response' &&
					(t.status === 'Awaiting Your Response' || t.status === 'Awaiting Client'));

			const matchesType = typeFilter === 'All' || t.category === typeFilter;
			const matchesApp = appFilter === 'All' || t.application === appFilter;

			return matchesSearch && matchesStatus && matchesType && matchesApp;
		})
	);

	function clearFilters() {
		searchQuery = '';
		statusFilter = 'All';
		typeFilter = 'All';
		appFilter = 'All';
	}
</script>

<svelte:head>
	<title>My Tickets - Nexus Client Portal</title>
</svelte:head>

<div class="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:px-10 md:py-10 space-y-8">
	<!-- Breadcrumbs & Header -->
	<div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
		<div>
			<nav class="flex items-center space-x-2 text-label-md text-[var(--color-outline)] mb-2" aria-label="Breadcrumb">
				<a class="hover:text-[var(--color-primary)] transition-colors" href="/portal">Support Center</a>
				<span class="material-symbols-outlined text-[16px]">chevron_right</span>
				<span class="text-[var(--color-on-surface)] font-semibold">My Tickets</span>
			</nav>
			<h1 class="text-3xl font-bold tracking-tight text-[var(--color-on-surface)]">My Tickets</h1>
			<p class="text-body-md text-[var(--color-on-surface-variant)] mt-1">
				View and track your support requests.
			</p>
		</div>

		<a
			href="/portal/submit"
			class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-4 py-2.5 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors shadow-2xs self-start md:self-auto"
		>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>Raise a Ticket</span>
		</a>
	</div>

	<!-- Summary Metrics Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs flex flex-col justify-between">
			<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)]">
				Total Tickets
			</span>
			<span class="text-3xl font-bold text-[var(--color-on-surface)] mt-2">{totalCount}</span>
		</div>

		<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs flex flex-col justify-between">
			<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)]">
				Open
			</span>
			<span class="text-3xl font-bold text-[var(--color-on-surface)] mt-2">{openCount}</span>
		</div>

		<div class="rounded-xl border-2 border-[var(--color-primary)]/40 bg-[var(--color-primary-fixed)]/15 p-5 shadow-xs flex flex-col justify-between relative">
			<div class="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-[var(--color-error)] shadow-xs animate-pulse"></div>
			<span class="text-label-sm font-bold uppercase tracking-wider text-[var(--color-primary)]">
				Awaiting Your Response
			</span>
			<span class="text-3xl font-bold text-[var(--color-on-surface)] mt-2">{awaitingCount}</span>
		</div>

		<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs flex flex-col justify-between">
			<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)]">
				Resolved
			</span>
			<span class="text-3xl font-bold text-[var(--color-on-surface)] mt-2">{resolvedCount}</span>
		</div>
	</div>

	<!-- Filter & Search Toolbar -->
	<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-3 shadow-xs flex flex-col lg:flex-row gap-3 items-center justify-between">
		<div class="relative w-full lg:w-96 flex-shrink-0">
			<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] text-[20px]">
				search
			</span>
			<input
				bind:value={searchQuery}
				type="text"
				placeholder="Search tickets by ID, title, or keyword..."
				class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] py-2 pl-10 pr-4 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
			<select
				bind:value={statusFilter}
				class="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] py-2 pl-3 pr-8 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] cursor-pointer"
			>
				<option value="All">All Statuses</option>
				<option value="Open">Open</option>
				<option value="Awaiting Response">Awaiting Response</option>
				<option value="Resolved">Resolved</option>
			</select>

			<select
				bind:value={typeFilter}
				class="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] py-2 pl-3 pr-8 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] cursor-pointer hidden sm:block"
			>
				<option value="All">All Types</option>
				<option value="Bug">Bug</option>
				<option value="Enhancement">Enhancement</option>
				<option value="KT">KT</option>
				<option value="Training">Training</option>
			</select>

			<select
				bind:value={appFilter}
				class="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] py-2 pl-3 pr-8 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] cursor-pointer hidden md:block"
			>
				<option value="All">All Applications</option>
				{#each applicationOptions as app}
					<option value={app}>{app}</option>
				{/each}
			</select>

			<button
				type="button"
				onclick={clearFilters}
				class="text-label-md font-medium text-[var(--color-on-surface-variant)] px-3 py-2 rounded-lg hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors ml-auto lg:ml-2 cursor-pointer"
			>
				Clear Filters
			</button>
		</div>
	</div>

	<!-- Tickets Data Table -->
	<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] shadow-xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)]/50">
						<th class="py-3.5 px-4 text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)] w-28">
							Ticket
						</th>
						<th class="py-3.5 px-4 text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)] min-w-[280px]">
							Request Type / Summary
						</th>
						<th class="py-3.5 px-4 text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)] whitespace-nowrap">
							Application
						</th>
						<th class="py-3.5 px-4 text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)] whitespace-nowrap">
							Status
						</th>
						<th class="py-3.5 px-4 text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)] text-right whitespace-nowrap">
							Last Updated
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-border-subtle)] text-body-sm">
					{#if filteredTickets.length === 0}
						<tr>
							<td colspan="5" class="py-12 text-center text-[var(--color-on-surface-variant)]">
								<span class="material-symbols-outlined text-4xl text-[var(--color-outline)] mb-2">inbox</span>
								<p class="text-body-md font-medium">No tickets match your filters</p>
								<button onclick={clearFilters} class="mt-2 text-label-md font-semibold text-[var(--color-primary)] hover:underline">
									Reset all filters
								</button>
							</td>
						</tr>
					{:else}
						{#each filteredTickets as ticket}
							<tr
								class="hover:bg-[var(--color-surface-container-low)]/70 transition-colors cursor-pointer group {ticket.status === 'Awaiting Your Response' ? 'bg-[var(--color-primary-fixed)]/10' : ''}"
								onclick={() => (window.location.href = `/portal/my-tickets/${ticket.id}`)}
							>
								<td class="py-4 px-4 font-bold text-[var(--color-primary)] group-hover:underline relative">
									{#if ticket.status === 'Awaiting Your Response'}
										<div class="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]"></div>
									{/if}
									{ticket.id}
								</td>
								<td class="py-4 px-4">
									<div class="font-semibold text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors">
										{ticket.title}
									</div>
									<div class="text-[12px] text-[var(--color-on-surface-variant)] mt-0.5 flex items-center gap-1.5">
										<span class="px-1.5 py-0.2 rounded bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] text-[11px] font-medium">
											{ticket.category}
										</span>
										<span>•</span>
										<span>Priority: {ticket.priority}</span>
									</div>
								</td>
								<td class="py-4 px-4 text-[var(--color-on-surface-variant)] whitespace-nowrap">
									{ticket.application}
								</td>
								<td class="py-4 px-4 whitespace-nowrap">
									{#if ticket.isPendingApproval}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px] uppercase tracking-wider">
											<span class="material-symbols-outlined text-[13px]">hourglass_top</span>
											Pending Approval
										</span>
									{:else if ticket.isRejected}
										<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--color-error-container)] text-[var(--color-on-error-container)] font-bold text-[11px] uppercase tracking-wider">
											<span class="material-symbols-outlined text-[13px]">block</span>
											Rejected
										</span>
									{:else if ticket.status === 'In Development'}
										<span class="inline-flex items-center px-2.5 py-1 rounded bg-[var(--color-primary-fixed)]/40 text-[var(--color-on-primary-fixed-variant)] font-bold text-[11px] uppercase tracking-wider">
											IN DEVELOPMENT
										</span>
									{:else if ticket.status === 'Awaiting Your Response' || ticket.status === 'Awaiting Client'}
										<div class="flex items-center gap-1.5">
											<span class="inline-flex items-center px-2.5 py-1 rounded bg-[#FFF4E5] text-[#ED6C02] border border-[#FFE0B2] font-bold text-[11px] uppercase tracking-wider">
												AWAITING YOUR RESPONSE
											</span>
											<span class="material-symbols-outlined text-[var(--color-error)] text-[16px]">error</span>
										</div>
									{:else if ticket.status === 'Resolved'}
										<span class="inline-flex items-center px-2.5 py-1 rounded bg-[#EDF7ED] text-[#2E7D32] border border-[#C8E6C9] font-bold text-[11px] uppercase tracking-wider">
											RESOLVED
										</span>
									{:else}
										<span class="inline-flex items-center px-2.5 py-1 rounded bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-bold text-[11px] uppercase tracking-wider">
											{ticket.status.toUpperCase()}
										</span>
									{/if}
								</td>
								<td class="py-4 px-4 text-[var(--color-on-surface-variant)] text-right whitespace-nowrap text-body-sm">
									{ticket.lastUpdated}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
