<script lang="ts">
	import ClientCard from '$lib/components/internal/clients/ClientCard.svelte';
	import ClientDetailView from '$lib/components/internal/clients/ClientDetailView.svelte';
	import CreateClientModal from '$lib/components/internal/clients/CreateClientModal.svelte';

	let { data } = $props();

	let searchQuery = $state('');
	let selectedClientId = $state<string | null>(null);
	let viewMode = $state<'grid' | 'table'>('grid');
	let isCreateModalOpen = $state(false);

	const clients = $derived(data.clients || []);

	const filteredClients = $derived(
		clients.filter(
			(c: { name: string; code: string }) =>
				c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				c.code.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	const selectedClient = $derived(
		selectedClientId ? clients.find((c: { id: string }) => c.id === selectedClientId) || null : null
	);

	// Aggregated Global Stats
	const totalClients = $derived(clients.length);
	const totalProjects = $derived(
		clients.reduce((acc: number, c: { projects?: unknown[] }) => acc + (c.projects?.length || 0), 0)
	);
	const totalUsedSeats = $derived(
		clients.reduce((acc: number, c: { members?: unknown[] }) => acc + (c.members?.length || 0), 0)
	);
	const totalSeatQuota = $derived(
		clients.reduce((acc: number, c: { seat_quota?: number | null }) => acc + (c.seat_quota || 0), 0) as number
	);
	const totalActiveTickets = $derived(
		clients.reduce(
			(acc: number, c: { tickets?: { status: string }[] }) =>
				acc +
				(c.tickets?.filter((t) => t.status !== 'closed' && t.status !== 'delivered').length || 0),
			0
		)
	);
</script>

<svelte:head>
	<title>Client Directory - Nexus Service Desk</title>
</svelte:head>

<div class="space-y-6 md:space-y-8">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<span class="rounded-md bg-[var(--color-primary-fixed)] px-2 py-0.5 text-label-xs font-bold text-[var(--color-on-primary-fixed)] uppercase tracking-wide">
					Account Directory
				</span>
			</div>
			<h1 class="text-headline-md font-bold text-[var(--color-on-surface)] mt-1">
				Client Organizations
			</h1>
			<p class="text-body-md mt-1 text-[var(--color-on-surface-variant)]">
				Manage enterprise client accounts, allocated seats, linked projects, and live ticket funnels.
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="nexus-primary-button h-10 px-4 shadow-sm cursor-pointer"
				onclick={() => (isCreateModalOpen = true)}
			>
				<span class="material-symbols-outlined text-[18px]">add_business</span>
				<span>New Client</span>
			</button>
		</div>
	</div>

	<!-- Top Stats KPI Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
		<!-- KPI 1 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Total Clients
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{totalClients}
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-secondary)]">
					<span class="material-symbols-outlined text-[14px]">check</span>
					<span>Active enterprises</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-primary)]">
				<span class="material-symbols-outlined text-[24px]">apartment</span>
			</div>
		</div>

		<!-- KPI 2 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Linked Projects
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{totalProjects}
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-outline)]">
					<span>Across all clients</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
				<span class="material-symbols-outlined text-[24px]">folder_special</span>
			</div>
		</div>

		<!-- KPI 3 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Seat Allocation
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{totalUsedSeats} <span class="text-base font-normal text-[var(--color-outline)]">/ {totalSeatQuota}</span>
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-secondary)]">
					<span class="material-symbols-outlined text-[14px]">badge</span>
					<span>{Math.round((totalUsedSeats / (totalSeatQuota || 1)) * 100)}% utilization</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
				<span class="material-symbols-outlined text-[24px]">group</span>
			</div>
		</div>

		<!-- KPI 4 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Active Tickets
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{totalActiveTickets}
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-amber-700">
					<span class="material-symbols-outlined text-[14px]">pending_actions</span>
					<span>In delivery pipeline</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
				<span class="material-symbols-outlined text-[24px]">confirmation_number</span>
			</div>
		</div>
	</div>

	<!-- Main Content: Detailed Client View OR Client Directory Grid -->
	{#if selectedClient}
		<!-- Selected Client Detail View -->
		<div class="space-y-4">
			<!-- Quick client selector strip -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 overflow-x-auto pb-1">
					<span class="text-label-xs font-semibold uppercase text-[var(--color-outline)] mr-1">
						Quick Switch:
					</span>
					{#each clients as c}
						<button
							type="button"
							class="rounded-lg px-3 py-1 text-label-xs font-medium transition-all {c.id === selectedClient.id
								? 'bg-[var(--color-primary-container)] text-white shadow-xs'
								: 'bg-white border border-[var(--color-border-subtle)] text-[var(--color-on-surface-variant)] hover:bg-gray-50'}"
							onclick={() => (selectedClientId = c.id)}
						>
							<span class="font-mono font-bold mr-1">{c.code}</span> {c.name}
						</button>
					{/each}
				</div>

				<button
					type="button"
					class="text-label-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
					onclick={() => (selectedClientId = null)}
				>
					<span class="material-symbols-outlined text-[16px]">grid_view</span>
					<span>All Clients</span>
				</button>
			</div>

			<ClientDetailView client={selectedClient} onClose={() => (selectedClientId = null)} />
		</div>
	{:else}
		<!-- Client Directory Header Controls -->
		<div class="nexus-card p-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<!-- Search input -->
				<div class="relative flex-1 max-w-md">
					<span class="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-[var(--color-outline)]">
						search
					</span>
					<input
						type="text"
						placeholder="Search by client name or code (e.g. Acme, GLOB, TECHCO)..."
						bind:value={searchQuery}
						class="h-10 w-full rounded-lg border border-[var(--color-border-subtle)] bg-white pl-10 pr-4 text-body-sm focus:border-[var(--color-primary)] focus:outline-none"
					/>
				</div>

				<!-- View Mode Toggle -->
				<div class="flex items-center gap-2">
					<div class="flex rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] p-0.5">
						<button
							type="button"
							class="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-on-surface)] transition-colors {viewMode === 'grid'
								? 'bg-white shadow-xs text-[var(--color-primary)]'
								: 'text-[var(--color-outline)] hover:text-[var(--color-on-surface)]'}"
							onclick={() => (viewMode = 'grid')}
							title="Grid View"
						>
							<span class="material-symbols-outlined text-[18px]">grid_view</span>
						</button>
						<button
							type="button"
							class="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-on-surface)] transition-colors {viewMode === 'table'
								? 'bg-white shadow-xs text-[var(--color-primary)]'
								: 'text-[var(--color-outline)] hover:text-[var(--color-on-surface)]'}"
							onclick={() => (viewMode = 'table')}
							title="Table View"
						>
							<span class="material-symbols-outlined text-[18px]">table_rows</span>
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Client List or Grid -->
		{#if filteredClients.length === 0}
			<div class="nexus-card p-12 text-center">
				<span class="material-symbols-outlined text-[48px] text-[var(--color-outline)]">
					search_off
				</span>
				<h3 class="mt-2 text-title-lg font-bold text-[var(--color-on-surface)]">
					No clients found
				</h3>
				<p class="mt-1 text-body-sm text-[var(--color-on-surface-variant)]">
					No client accounts matched "{searchQuery}".
				</p>
				<button
					type="button"
					class="nexus-secondary-button mt-4 h-9 px-3.5 text-label-md"
					onclick={() => (searchQuery = '')}
				>
					Clear Search
				</button>
			</div>
		{:else if viewMode === 'grid'}
			<!-- Grid Mode -->
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredClients as client (client.id)}
					<ClientCard
						{client}
						isSelected={selectedClientId === client.id}
						onSelect={(c) => (selectedClientId = c.id)}
					/>
				{/each}
			</div>
		{:else}
			<!-- Table Mode -->
			<div class="nexus-card overflow-hidden">
				<table class="w-full text-left text-body-sm">
					<thead class="bg-[var(--color-surface-container-low)] text-label-xs font-semibold uppercase text-[var(--color-on-surface-variant)]">
						<tr>
							<th class="px-5 py-3">Client Organization</th>
							<th class="px-5 py-3">Code</th>
							<th class="px-5 py-3">Seat Quota</th>
							<th class="px-5 py-3">Projects</th>
							<th class="px-5 py-3">Active Tickets</th>
							<th class="px-5 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-border-subtle)]/60">
						{#each filteredClients as client}
							{@const usedSeats = client.members?.length || 0}
							{@const activeTickets = client.tickets?.filter((t: { status: string }) => t.status !== 'closed' && t.status !== 'delivered').length || 0}
							<tr
								class="hover:bg-[var(--color-surface-container-low)]/50 transition-colors cursor-pointer"
								onclick={() => (selectedClientId = client.id)}
							>
								<td class="px-5 py-4">
									<div class="flex items-center gap-3">
										<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-bold text-xs">
											{client.code.slice(0, 2)}
										</div>
										<div>
											<span class="font-bold text-[var(--color-on-surface)] block hover:text-[var(--color-primary)]">
												{client.name}
											</span>
											<span class="text-[11px] font-mono text-[var(--color-outline)]">
												{client.id}
											</span>
										</div>
									</div>
								</td>
								<td class="px-5 py-4">
									<span class="inline-flex rounded-md bg-[var(--color-surface-container-high)] px-2 py-0.5 text-label-xs font-mono font-bold text-[var(--color-on-surface)]">
										{client.code}
									</span>
								</td>
								<td class="px-5 py-4 text-[var(--color-on-surface-variant)]">
									{#if client.seat_quota === null || client.seat_quota === undefined || client.seat_quota <= 0}
										<span class="font-semibold text-[var(--color-on-surface)]">{usedSeats}</span> / <span class="font-bold text-emerald-700">∞</span> seats
									{:else}
										<span class="font-semibold text-[var(--color-on-surface)]">{usedSeats}</span> / {client.seat_quota} seats
									{/if}
								</td>
								<td class="px-5 py-4 text-[var(--color-on-surface-variant)]">
									{client.projects?.length || 0} projects
								</td>
								<td class="px-5 py-4">
									{#if activeTickets > 0}
										<span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
											<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
											{activeTickets} active
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 text-emerald-700 text-[12px] font-medium">
											<span class="material-symbols-outlined text-[14px]">check</span>
											0 active
										</span>
									{/if}
								</td>
								<td class="px-5 py-4 text-right">
									<button
										type="button"
										class="text-label-xs font-semibold text-[var(--color-primary)] hover:underline"
										onclick={(e) => {
											e.stopPropagation();
											selectedClientId = client.id;
										}}
									>
										View Details &rarr;
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}

	<!-- Create Client Modal -->
	<CreateClientModal
		bind:open={isCreateModalOpen}
		onClientCreated={(newId) => {
			selectedClientId = newId;
		}}
	/>
</div>
