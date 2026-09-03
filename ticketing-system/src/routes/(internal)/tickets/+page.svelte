<script lang="ts">
	import CreateTicketModal from '$lib/components/internal/tickets/CreateTicketModal.svelte';
	import TicketDetailModal from '$lib/components/internal/tickets/TicketDetailModal.svelte';
	import { STATUS_LABEL, CATEGORY_LABEL, PRIORITY_LABEL } from '$lib/portal/ticketDisplay';

	interface ProfileItem {
		id: string;
		full_name: string | null;
		email: string;
		role: string;
	}

	interface TicketEvent {
		id: string;
		from_status: string | null;
		to_status: string;
		notes: string | null;
		created_at: string;
		actor?: { full_name?: string | null; email?: string } | null;
	}

	interface TicketItem {
		id: string;
		token: string | null;
		title: string;
		description: string | null;
		category: 'bug' | 'enhancement' | 'kt' | 'training';
		priority: 'low' | 'medium' | 'high' | 'critical';
		status: 'raised' | 'poc_triage' | 'requirement_estimation' | 'client_approval' | 'development' | 'delivery' | 'closed';
		target_date?: string | null;
		estimated_hours?: number | null;
		actual_hours?: number | null;
		client_id: string;
		project_id: string;
		raised_by?: string | null;
		poc_id?: string | null;
		specialist_id?: string | null;
		delivery_lead_id?: string | null;
		client?: { id: string; name: string; code: string } | null;
		project?: { id: string; name: string; code: string } | null;
		raised_by_profile?: ProfileItem | null;
		poc_profile?: ProfileItem | null;
		specialist_profile?: ProfileItem | null;
		delivery_lead_profile?: ProfileItem | null;
		events?: TicketEvent[];
		dependencies?: { id: string; depends_on: { id: string; token: string; title: string; status: string } }[];
		dependencyNotes?: { id: string; kind: 'person' | 'module'; label: string; detail: string | null }[];
		watchers?: { id: string; email: string; full_name: string | null }[];
		attachments?: { id: string; file_name: string; file_size_bytes: number | null; mime_type: string | null }[];
		messages?: { id: string; content: string; created_at: string; author: { full_name: string | null; role: string } | null }[];
		created_at: string;
	}

	let { data } = $props();

	let searchQuery = $state('');
	let selectedStatusFilter = $state('all');
	let selectedCategoryFilter = $state('all');
	let selectedPriorityFilter = $state('all');
	let selectedClientFilter = $state('all');
	let viewMode = $state<'table' | 'grid' | 'kanban'>('kanban');

	let isCreateModalOpen = $state(false);
	let isDetailModalOpen = $state(false);
	let selectedTicketId = $state<string | null>(null);

	const tickets = $derived<TicketItem[]>(data.tickets || []);
	const selectedTicket = $derived<TicketItem | null>(
		selectedTicketId ? (tickets.find((t) => t.id === selectedTicketId) ?? null) : null
	);
	const clients = $derived(data.clients || []);
	const projects = $derived(data.projects || []);
	const internalStaff = $derived(data.internalStaff || []);

	const filteredTickets = $derived(
		tickets.filter((t) => {
			const matchesSearch =
				(t.token && t.token.toLowerCase().includes(searchQuery.toLowerCase())) ||
				t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(t.client?.name && t.client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
				(t.project?.code && t.project.code.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesStatus = selectedStatusFilter === 'all' || t.status === selectedStatusFilter;
			const matchesCategory = selectedCategoryFilter === 'all' || t.category === selectedCategoryFilter;
			const matchesPriority = selectedPriorityFilter === 'all' || t.priority === selectedPriorityFilter;
			const matchesClient = selectedClientFilter === 'all' || t.client_id === selectedClientFilter;

			return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesClient;
		})
	);

	// KPI Stats
	const totalTickets = $derived(tickets.length);
	const raisedCount = $derived(tickets.filter((t) => t.status === 'raised' || t.status === 'poc_triage').length);
	const inEstimationCount = $derived(tickets.filter((t) => t.status === 'requirement_estimation' || t.status === 'client_approval').length);
	const inDevCount = $derived(tickets.filter((t) => t.status === 'development').length);
	const deliveredClosedCount = $derived(tickets.filter((t) => t.status === 'delivery' || t.status === 'closed').length);

	const triagePct = $derived(totalTickets > 0 ? Math.round((raisedCount / totalTickets) * 100) : 0);
	const estPct = $derived(totalTickets > 0 ? Math.round((inEstimationCount / totalTickets) * 100) : 0);
	const devPct = $derived(totalTickets > 0 ? Math.round((inDevCount / totalTickets) * 100) : 0);
	const delPct = $derived(totalTickets > 0 ? Math.round((deliveredClosedCount / totalTickets) * 100) : 0);

	const isAllActive = $derived(selectedStatusFilter === 'all');
	const isTriageActive = $derived(selectedStatusFilter === 'raised' || selectedStatusFilter === 'poc_triage');
	const isEstActive = $derived(selectedStatusFilter === 'requirement_estimation' || selectedStatusFilter === 'client_approval');
	const isDevActive = $derived(selectedStatusFilter === 'development');
	const isDeliveredActive = $derived(selectedStatusFilter === 'delivery' || selectedStatusFilter === 'closed');

	const kanbanStages = [
		{ key: 'raised', label: 'Raised (Incoming)', icon: 'flag', border: 'border-t-blue-500', bg: 'bg-blue-50/40 text-blue-800' },
		{ key: 'poc_triage', label: 'PoC Triage', icon: 'assignment', border: 'border-t-indigo-500', bg: 'bg-indigo-50/40 text-indigo-800' },
		{ key: 'requirement_estimation', label: 'Estimating', icon: 'schedule', border: 'border-t-amber-500', bg: 'bg-amber-50/40 text-amber-800' },
		{ key: 'client_approval', label: 'Client Approval', icon: 'thumb_up', border: 'border-t-orange-500', bg: 'bg-orange-50/40 text-orange-800' },
		{ key: 'development', label: 'In Development', icon: 'code', border: 'border-t-emerald-500', bg: 'bg-emerald-50/40 text-emerald-800' },
		{ key: 'delivery', label: 'Delivery & QA', icon: 'local_shipping', border: 'border-t-purple-500', bg: 'bg-purple-50/40 text-purple-800' },
		{ key: 'closed', label: 'Closed / Verified', icon: 'check_circle', border: 'border-t-gray-600', bg: 'bg-gray-100 text-gray-800' }
	];

	function getPriorityBadge(priority: string) {
		switch (priority) {
			case 'critical':
				return {
					class: 'bg-red-50 text-red-700 border-red-200/80 shadow-2xs',
					dot: 'bg-red-500 animate-pulse'
				};
			case 'high':
				return {
					class: 'bg-amber-50 text-amber-700 border-amber-200/80',
					dot: 'bg-amber-500'
				};
			case 'medium':
				return {
					class: 'bg-blue-50 text-blue-700 border-blue-200/80',
					dot: 'bg-blue-500'
				};
			default:
				return {
					class: 'bg-slate-100 text-slate-700 border-slate-200/80',
					dot: 'bg-slate-400'
				};
		}
	}

	function getCategoryInfo(category: string) {
		switch (category) {
			case 'bug':
				return {
					label: 'Bug Defect',
					icon: 'pest_control',
					class: 'bg-rose-50 text-rose-700 border-rose-200/80'
				};
			case 'enhancement':
				return {
					label: 'Enhancement',
					icon: 'rocket_launch',
					class: 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
				};
			case 'kt':
				return {
					label: 'KT Request',
					icon: 'menu_book',
					class: 'bg-purple-50 text-purple-700 border-purple-200/80'
				};
			default:
				return {
					label: 'Training',
					icon: 'school',
					class: 'bg-cyan-50 text-cyan-700 border-cyan-200/80'
				};
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'raised':
				return 'bg-blue-50 text-blue-700 border-blue-200';
			case 'poc_triage':
				return 'bg-indigo-50 text-indigo-700 border-indigo-200';
			case 'requirement_estimation':
				return 'bg-amber-50 text-amber-700 border-amber-200';
			case 'client_approval':
				return 'bg-orange-50 text-orange-700 border-orange-200';
			case 'development':
				return 'bg-emerald-50 text-emerald-700 border-emerald-200';
			case 'delivery':
				return 'bg-purple-50 text-purple-700 border-purple-200';
			case 'closed':
				return 'bg-gray-100 text-gray-700 border-gray-300';
			default:
				return 'bg-gray-100 text-gray-700 border-gray-200';
		}
	}
</script>

<svelte:head>
	<title>Tickets - Resolv - Ticketing & Support System</title>
</svelte:head>

<div class="space-y-6 md:space-y-8 min-w-0 w-full">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<span class="rounded-md bg-indigo-100 px-2.5 py-0.5 text-label-xs font-bold text-indigo-800 uppercase tracking-wide">
					Lifecycle Pipeline
				</span>
			</div>
			<h1 class="text-headline-md font-bold text-[var(--color-on-surface)] mt-1">
				Tickets & Service Requests
			</h1>
			<p class="text-body-md mt-1 text-[var(--color-on-surface-variant)]">
				Manage SLA response times, technical effort estimation, and multi-stage delivery across all clients.
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="nexus-primary-button h-10 px-4 shadow-sm cursor-pointer hover:shadow-md transition-all"
				onclick={() => (isCreateModalOpen = true)}
			>
				<span class="material-symbols-outlined text-[18px]">add_task</span>
				<span>New Ticket</span>
			</button>
		</div>
	</div>

	<!-- KPI Banner Grid (Refined Proportions, Padding & Responsive Width) -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 md:gap-5">
		<!-- KPI 1: All Tickets -->
		<button
			type="button"
			class="nexus-card group relative text-left p-5 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer border rounded-2xl bg-[var(--color-surface-container-lowest)] flex flex-col justify-between min-w-0 w-full {isAllActive ? 'ring-2 ring-[var(--color-primary)] border-transparent shadow-sm bg-blue-50/20' : 'border-[var(--color-outline-variant)]/60'}"
			onclick={() => (selectedStatusFilter = 'all')}
		>
			<div class="flex items-center justify-between gap-3 w-full">
				<div class="min-w-0 flex-1">
					<p class="text-label-sm font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)] truncate">
						All Tickets
					</p>
					<p class="text-display-md mt-1 text-[var(--color-on-surface)] font-bold tracking-tight group-hover:text-[var(--color-primary)] transition-colors">
						{totalTickets}
					</p>
				</div>
				<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-primary)] group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-[24px]">confirmation_number</span>
				</div>
			</div>

			<div class="mt-4 pt-3 border-t border-[var(--color-outline-variant)]/30 w-full">
				<div class="flex items-center justify-between text-body-xs font-medium text-[var(--color-on-surface-variant)]">
					<span>Total Pipeline</span>
					<span class="font-bold text-[var(--color-primary)]">100%</span>
				</div>
				<div class="mt-1.5 h-1.5 w-full rounded-full bg-blue-100/60 overflow-hidden">
					<div class="h-full rounded-full bg-[var(--color-primary)] w-full"></div>
				</div>
			</div>
		</button>

		<!-- KPI 2: Raised / Triage -->
		<button
			type="button"
			class="nexus-card group relative text-left p-5 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer border rounded-2xl bg-[var(--color-surface-container-lowest)] flex flex-col justify-between min-w-0 w-full {isTriageActive ? 'ring-2 ring-indigo-600 border-transparent shadow-sm bg-indigo-50/20' : 'border-[var(--color-outline-variant)]/60'}"
			onclick={() => (selectedStatusFilter = selectedStatusFilter === 'raised' ? 'poc_triage' : 'raised')}
		>
			<div class="flex items-center justify-between gap-3 w-full">
				<div class="min-w-0 flex-1">
					<p class="text-label-sm font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)] truncate">
						Raised / Triage
					</p>
					<p class="text-display-md mt-1 text-[var(--color-on-surface)] font-bold tracking-tight group-hover:text-indigo-700 transition-colors">
						{raisedCount}
					</p>
				</div>
				<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-[24px]">assignment_late</span>
				</div>
			</div>

			<div class="mt-4 pt-3 border-t border-[var(--color-outline-variant)]/30 w-full">
				<div class="flex items-center justify-between text-body-xs font-medium text-indigo-700">
					<span>Needs Response</span>
					<span class="font-bold">{triagePct}%</span>
				</div>
				<div class="mt-1.5 h-1.5 w-full rounded-full bg-indigo-100/60 overflow-hidden">
					<div class="h-full rounded-full bg-indigo-600 transition-all" style="width: {triagePct}%"></div>
				</div>
			</div>
		</button>

		<!-- KPI 3: Estimating & Approval -->
		<button
			type="button"
			class="nexus-card group relative text-left p-5 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer border rounded-2xl bg-[var(--color-surface-container-lowest)] flex flex-col justify-between min-w-0 w-full {isEstActive ? 'ring-2 ring-amber-600 border-transparent shadow-sm bg-amber-50/20' : 'border-[var(--color-outline-variant)]/60'}"
			onclick={() => (selectedStatusFilter = selectedStatusFilter === 'requirement_estimation' ? 'client_approval' : 'requirement_estimation')}
		>
			<div class="flex items-center justify-between gap-3 w-full">
				<div class="min-w-0 flex-1">
					<p class="text-label-sm font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)] truncate">
						Estimating & Review
					</p>
					<p class="text-display-md mt-1 text-[var(--color-on-surface)] font-bold tracking-tight group-hover:text-amber-700 transition-colors">
						{inEstimationCount}
					</p>
				</div>
				<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-[24px]">schedule</span>
				</div>
			</div>

			<div class="mt-4 pt-3 border-t border-[var(--color-outline-variant)]/30 w-full">
				<div class="flex items-center justify-between text-body-xs font-medium text-amber-700">
					<span>Scoping & Sign-off</span>
					<span class="font-bold">{estPct}%</span>
				</div>
				<div class="mt-1.5 h-1.5 w-full rounded-full bg-amber-100/60 overflow-hidden">
					<div class="h-full rounded-full bg-amber-600 transition-all" style="width: {estPct}%"></div>
				</div>
			</div>
		</button>

		<!-- KPI 4: In Development -->
		<button
			type="button"
			class="nexus-card group relative text-left p-5 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer border rounded-2xl bg-[var(--color-surface-container-lowest)] flex flex-col justify-between min-w-0 w-full {isDevActive ? 'ring-2 ring-emerald-600 border-transparent shadow-sm bg-emerald-50/20' : 'border-[var(--color-outline-variant)]/60'}"
			onclick={() => (selectedStatusFilter = isDevActive ? 'all' : 'development')}
		>
			<div class="flex items-center justify-between gap-3 w-full">
				<div class="min-w-0 flex-1">
					<p class="text-label-sm font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)] truncate">
						In Development
					</p>
					<p class="text-display-md mt-1 text-[var(--color-on-surface)] font-bold tracking-tight group-hover:text-emerald-700 transition-colors">
						{inDevCount}
					</p>
				</div>
				<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-[24px]">engineering</span>
				</div>
			</div>

			<div class="mt-4 pt-3 border-t border-[var(--color-outline-variant)]/30 w-full">
				<div class="flex items-center justify-between text-body-xs font-medium text-emerald-700">
					<span>Active Engineering</span>
					<span class="font-bold">{devPct}%</span>
				</div>
				<div class="mt-1.5 h-1.5 w-full rounded-full bg-emerald-100/60 overflow-hidden">
					<div class="h-full rounded-full bg-emerald-600 transition-all" style="width: {devPct}%"></div>
				</div>
			</div>
		</button>

		<!-- KPI 5: Delivered & Closed -->
		<button
			type="button"
			class="nexus-card group relative text-left p-5 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer border rounded-2xl bg-[var(--color-surface-container-lowest)] flex flex-col justify-between min-w-0 w-full {isDeliveredActive ? 'ring-2 ring-purple-600 border-transparent shadow-sm bg-purple-50/20' : 'border-[var(--color-outline-variant)]/60'}"
			onclick={() => (selectedStatusFilter = selectedStatusFilter === 'delivery' ? 'closed' : 'delivery')}
		>
			<div class="flex items-center justify-between gap-3 w-full">
				<div class="min-w-0 flex-1">
					<p class="text-label-sm font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)] truncate">
						Delivered & Closed
					</p>
					<p class="text-display-md mt-1 text-[var(--color-on-surface)] font-bold tracking-tight group-hover:text-purple-700 transition-colors">
						{deliveredClosedCount}
					</p>
				</div>
				<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 group-hover:scale-105 transition-transform">
					<span class="material-symbols-outlined text-[24px]">verified</span>
				</div>
			</div>

			<div class="mt-4 pt-3 border-t border-[var(--color-outline-variant)]/30 w-full">
				<div class="flex items-center justify-between text-body-xs font-medium text-purple-700">
					<span>Completed Work</span>
					<span class="font-bold">{delPct}%</span>
				</div>
				<div class="mt-1.5 h-1.5 w-full rounded-full bg-purple-100/60 overflow-hidden">
					<div class="h-full rounded-full bg-purple-600 transition-all" style="width: {delPct}%"></div>
				</div>
			</div>
		</button>
	</div>

	<!-- Controls & Filters Toolbar -->
	<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<!-- Search & Filter Selects -->
		<div class="flex flex-wrap flex-1 items-center gap-2.5">
			<div class="relative min-w-[240px] flex-1 max-w-sm">
				<span class="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-[var(--color-outline)]">
					search
				</span>
				<input
					type="text"
					placeholder="Search token, title, client, project..."
					bind:value={searchQuery}
					class="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] pl-10 pr-4 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
				/>
			</div>

			<!-- Status Filter -->
			<select
				bind:value={selectedStatusFilter}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			>
				<option value="all">All Stages</option>
				<option value="raised">1. Raised</option>
				<option value="poc_triage">2. PoC Triage</option>
				<option value="requirement_estimation">3. Estimating</option>
				<option value="client_approval">4. Client Approval</option>
				<option value="development">5. In Development</option>
				<option value="delivery">6. Delivery & QA</option>
				<option value="closed">7. Closed</option>
			</select>

			<!-- Category Filter -->
			<select
				bind:value={selectedCategoryFilter}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			>
				<option value="all">All Categories</option>
				<option value="bug">Bugs</option>
				<option value="enhancement">Enhancements</option>
				<option value="kt">KT Requests</option>
				<option value="training">Training</option>
			</select>

			<!-- Priority Filter -->
			<select
				bind:value={selectedPriorityFilter}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			>
				<option value="all">All Priorities</option>
				<option value="critical">Critical</option>
				<option value="high">High</option>
				<option value="medium">Medium</option>
				<option value="low">Low</option>
			</select>

			<!-- Client Filter -->
			<select
				bind:value={selectedClientFilter}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			>
				<option value="all">All Clients</option>
				{#each clients as client}
					<option value={client.id}>{client.name} ({client.code})</option>
				{/each}
			</select>
		</div>

		<!-- View Switcher (Grid / Table / Kanban) -->
		<div class="flex items-center rounded-lg border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container)] p-1 text-label-xs font-medium self-start lg:self-auto shadow-2xs">
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer {viewMode === 'grid' ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] font-bold shadow-xs' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}"
				onclick={() => (viewMode = 'grid')}
				title="Grid Card View"
			>
				<span class="material-symbols-outlined text-[16px]">grid_view</span>
				<span>Cards</span>
			</button>
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer {viewMode === 'table' ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] font-bold shadow-xs' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}"
				onclick={() => (viewMode = 'table')}
				title="Table View"
			>
				<span class="material-symbols-outlined text-[16px]">table_rows</span>
				<span>Table</span>
			</button>
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer {viewMode === 'kanban' ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] font-bold shadow-xs' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}"
				onclick={() => (viewMode = 'kanban')}
				title="Kanban Board View"
			>
				<span class="material-symbols-outlined text-[16px]">view_kanban</span>
				<span>Kanban</span>
			</button>
		</div>
	</div>

	<!-- Main Content Area -->
	{#if viewMode === 'grid'}
		<!-- Refined Card Grid View -->
		{#if filteredTickets.length === 0}
			<div class="rounded-2xl border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]/50 p-12 text-center">
				<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-primary)]">
					<span class="material-symbols-outlined text-[32px]">inbox</span>
				</div>
				<h3 class="mt-4 text-title-md font-bold text-[var(--color-on-surface)]">No tickets match your filters</h3>
				<p class="mt-1 text-body-sm text-[var(--color-on-surface-variant)]">
					Try clearing or adjusting search filters to find what you're looking for.
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
				{#each filteredTickets as ticket}
					{@const priorityInfo = getPriorityBadge(ticket.priority)}
					{@const categoryInfo = getCategoryInfo(ticket.category)}
					{@const statusBadge = getStatusBadge(ticket.status)}
					{@const hoursLogged = ticket.actual_hours ?? 0}
					{@const hoursEst = ticket.estimated_hours ?? 0}
					{@const progressPct = hoursEst > 0 ? Math.min(100, Math.round((hoursLogged / hoursEst) * 100)) : 0}

					<div
						class="nexus-card group relative flex flex-col justify-between p-5 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg rounded-2xl bg-[var(--color-surface-container-lowest)] cursor-pointer"
						role="button"
						tabindex="0"
						onclick={() => {
							selectedTicketId = ticket.id;
							isDetailModalOpen = true;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								selectedTicketId = ticket.id;
								isDetailModalOpen = true;
							}
						}}
					>
						<div>
							<!-- Card Top Metadata: Token + Badges -->
							<div class="flex items-start justify-between gap-2">
								<div class="flex flex-wrap items-center gap-1.5">
									<!-- Monospace Token -->
									<span class="inline-flex items-center rounded-lg bg-indigo-50/80 px-2.5 py-1 font-mono text-xs font-bold text-indigo-700 border border-indigo-200/60 shadow-2xs">
										{ticket.token || 'TICKET'}
									</span>

									<!-- Priority Pill with glowing dot -->
									<span class="inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.8 text-[11px] font-semibold {priorityInfo.class}">
										<span class="h-1.5 w-1.5 rounded-full {priorityInfo.dot}"></span>
										<span>{PRIORITY_LABEL[ticket.priority]}</span>
									</span>
								</div>

								<!-- Category Pill with Icon -->
								<span class="inline-flex items-center gap-1 rounded-lg border px-2 py-0.8 text-[11px] font-semibold {categoryInfo.class}">
									<span class="material-symbols-outlined text-[13px]">{categoryInfo.icon}</span>
									<span>{categoryInfo.label}</span>
								</span>
							</div>

							<!-- Title -->
							<h3 class="mt-3.5 text-title-sm font-bold text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 leading-snug">
								{ticket.title}
							</h3>

							<!-- Description snippet -->
							{#if ticket.description}
								<p class="mt-1.5 text-body-xs text-[var(--color-on-surface-variant)] line-clamp-2">
									{ticket.description}
								</p>
							{/if}

							<!-- Client Organization & Workspace Tag -->
							<div class="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--color-outline-variant)]/30">
								<div class="flex items-center gap-1.5 rounded-md bg-[var(--color-surface-container-high)]/70 px-2 py-1 text-[11px] font-medium text-[var(--color-on-surface)]">
									<span class="material-symbols-outlined text-[14px] text-[var(--color-outline)]">apartment</span>
									<span class="truncate max-w-[140px]">{ticket.client?.name ?? 'Client'}</span>
								</div>

								<div class="flex items-center gap-1 rounded-md bg-blue-50/80 px-2 py-1 text-[11px] font-mono font-bold text-[var(--color-primary)]">
									<span class="material-symbols-outlined text-[13px]">folder</span>
									<span>{ticket.project?.code ?? 'PROJ'}</span>
								</div>
							</div>

							<!-- Hours Progress Tracker -->
							{#if hoursEst > 0 || hoursLogged > 0}
								<div class="mt-3 space-y-1.5 rounded-xl bg-[var(--color-surface-container-low)]/80 p-2.5">
									<div class="flex items-center justify-between text-[11px]">
										<span class="font-medium text-[var(--color-on-surface-variant)] flex items-center gap-1">
											<span class="material-symbols-outlined text-[13px] text-amber-600">timer</span>
											<span>Logged: <strong>{hoursLogged}h</strong> / {hoursEst}h est.</span>
										</span>
										<span class="font-bold text-[var(--color-primary)]">{progressPct}%</span>
									</div>
									<div class="h-1.5 w-full rounded-full bg-[var(--color-outline-variant)]/40 overflow-hidden">
										<div
											class="h-full rounded-full bg-[var(--color-primary)] transition-all"
											style="width: {progressPct}%"
										></div>
									</div>
								</div>
							{/if}
						</div>

						<!-- Card Footer: Status & Lifecycle Action -->
						<div class="mt-4 pt-3 border-t border-[var(--color-outline-variant)]/40 flex items-center justify-between">
							<span class="inline-flex items-center gap-1 rounded-md border px-2.5 py-0.8 text-label-xs font-bold {statusBadge}">
								<span>{STATUS_LABEL[ticket.status]}</span>
							</span>

							<div class="flex items-center gap-1.5 text-label-xs font-semibold text-[var(--color-primary)] group-hover:translate-x-0.5 transition-transform">
								<span>Manage &rarr;</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else if viewMode === 'table'}
		<!-- Table View -->
		<div class="overflow-hidden rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] shadow-xs">
			<table class="w-full text-left text-body-sm">
				<thead class="border-b border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					<tr>
						<th class="px-5 py-3.5">Ticket</th>
						<th class="px-5 py-3.5">Category</th>
						<th class="px-5 py-3.5">Priority</th>
						<th class="px-5 py-3.5">Client & Workspace</th>
						<th class="px-5 py-3.5">Lifecycle Stage</th>
						<th class="px-5 py-3.5">Effort (Est / Act)</th>
						<th class="px-5 py-3.5 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-outline-variant)]/30">
					{#each filteredTickets as ticket}
						{@const priorityInfo = getPriorityBadge(ticket.priority)}
						{@const categoryInfo = getCategoryInfo(ticket.category)}
						<tr class="hover:bg-[var(--color-surface-container-low)]/60 transition-colors group">
							<!-- Token & Title -->
							<td class="px-5 py-4 max-w-xs">
								<button
									type="button"
									class="text-left cursor-pointer"
									onclick={() => {
										selectedTicketId = ticket.id;
										isDetailModalOpen = true;
									}}
								>
									<span class="inline-flex items-center gap-1.5">
										<span class="font-mono text-label-xs font-bold text-[var(--color-primary)] group-hover:underline">
											{ticket.token || 'TICKET'}
										</span>
										{#if ticket.dependencyNotes?.length}
											<span
												class="inline-flex items-center gap-0.5 rounded-md border border-[var(--color-outline-variant)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-on-surface-variant)]"
												title="{ticket.dependencyNotes.length} reported dependenc{ticket.dependencyNotes.length === 1 ? 'y' : 'ies'}"
											>
												<span class="material-symbols-outlined text-[12px]">hub</span>
												{ticket.dependencyNotes.length}
											</span>
										{/if}
									</span>
									<p class="font-semibold text-body-sm text-[var(--color-on-surface)] truncate mt-0.5 group-hover:text-[var(--color-primary)] transition-colors">
										{ticket.title}
									</p>
								</button>
							</td>

							<!-- Category -->
							<td class="px-5 py-4">
								<span class="inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-label-xs font-semibold {categoryInfo.class}">
									<span class="material-symbols-outlined text-[13px]">{categoryInfo.icon}</span>
									<span>{categoryInfo.label}</span>
								</span>
							</td>

							<!-- Priority -->
							<td class="px-5 py-4">
								<span class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-label-xs font-semibold {priorityInfo.class}">
									<span class="h-1.5 w-1.5 rounded-full {priorityInfo.dot}"></span>
									<span>{PRIORITY_LABEL[ticket.priority]}</span>
								</span>
							</td>

							<!-- Client & Project -->
							<td class="px-5 py-4">
								<div>
									<p class="font-medium text-[var(--color-on-surface)]">{ticket.client?.name ?? 'Client'}</p>
									<span class="font-mono text-[11px] font-bold text-[var(--color-primary)]">
										{ticket.project?.code ?? ''}
									</span>
								</div>
							</td>

							<!-- Status -->
							<td class="px-5 py-4">
								<span class="inline-flex rounded-md border px-2.5 py-1 text-label-xs font-bold {getStatusBadge(ticket.status)}">
									{STATUS_LABEL[ticket.status] ?? ticket.status}
								</span>
							</td>

							<!-- Hours -->
							<td class="px-5 py-4 text-body-xs font-mono">
								{#if ticket.estimated_hours !== null || ticket.actual_hours !== null}
									<span class="font-bold text-[var(--color-on-surface)]">{ticket.estimated_hours ?? '-'}h</span>
									<span class="text-[var(--color-outline)]"> / </span>
									<span class="text-amber-700 font-semibold">{ticket.actual_hours ?? 0}h</span>
								{:else}
									<span class="text-[var(--color-outline)]">-</span>
								{/if}
							</td>

							<!-- Actions -->
							<td class="px-5 py-4 text-right">
								<button
									type="button"
									class="nexus-secondary-button h-8 px-2.5 text-label-xs font-semibold cursor-pointer hover:border-[var(--color-primary)]"
									onclick={() => {
										selectedTicketId = ticket.id;
										isDetailModalOpen = true;
									}}
								>
									Manage
								</button>
							</td>
						</tr>
					{/each}

					{#if filteredTickets.length === 0}
						<tr>
							<td colspan="7" class="px-5 py-12 text-center text-[var(--color-on-surface-variant)]">
								<span class="material-symbols-outlined text-[36px] text-[var(--color-outline)]">inbox</span>
								<p class="mt-2 text-body-sm">No tickets match the selected filters.</p>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

	{:else}
		<!-- Refined Kanban Board View -->
		<div class="w-full min-w-0 overflow-x-auto pb-4 pt-1 rounded-2xl">
			<div class="flex gap-4 min-w-max pb-2">
				{#each kanbanStages as stage}
					{@const stageTickets = filteredTickets.filter((t) => t.status === stage.key)}
					<div class="w-[310px] shrink-0 rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-low)]/40 p-4 flex flex-col border-t-4 {stage.border} shadow-2xs">
						<!-- Column Header -->
						<div class="flex items-center justify-between pb-3.5 border-b border-[var(--color-outline-variant)]/40 mb-3.5">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)]">{stage.icon}</span>
								<span class="text-label-sm font-bold text-[var(--color-on-surface)]">
									{stage.label}
								</span>
							</div>
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-container-high)] text-label-xs font-bold text-[var(--color-on-surface-variant)]">
								{stageTickets.length}
							</span>
						</div>

						<!-- Cards List -->
						<div class="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-360px)] pr-1">
							{#each stageTickets as ticket}
								{@const priorityInfo = getPriorityBadge(ticket.priority)}
								{@const categoryInfo = getCategoryInfo(ticket.category)}

								<div
									class="w-full text-left rounded-xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-4 shadow-xs hover:border-[var(--color-primary)] hover:shadow-md transition-all cursor-pointer group"
									role="button"
									tabindex="0"
									onclick={() => {
										selectedTicketId = ticket.id;
										isDetailModalOpen = true;
									}}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											selectedTicketId = ticket.id;
											isDetailModalOpen = true;
										}
									}}
								>
									<!-- Token & Priority -->
									<div class="flex items-center justify-between text-[11px]">
										<span class="font-mono font-bold text-[var(--color-primary)]">
											{ticket.token || 'TICKET'}
										</span>
										<span class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold border {priorityInfo.class}">
											<span class="h-1.5 w-1.5 rounded-full {priorityInfo.dot}"></span>
											<span>{PRIORITY_LABEL[ticket.priority]}</span>
										</span>
									</div>

									<!-- Title -->
									<h4 class="mt-2 text-body-sm font-bold text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 leading-snug">
										{ticket.title}
									</h4>

									<!-- Category & Workspace Pills -->
									<div class="mt-3 flex flex-wrap items-center gap-1.5">
										<span class="inline-flex items-center gap-1 rounded bg-[var(--color-surface-container)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-on-surface-variant)]">
											<span class="material-symbols-outlined text-[12px]">{categoryInfo.icon}</span>
											<span>{categoryInfo.label}</span>
										</span>

										<span class="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--color-primary)]">
											{ticket.project?.code ?? ''}
										</span>
									</div>

									<!-- Hours & Client Footer -->
									<div class="mt-3 pt-2.5 border-t border-[var(--color-outline-variant)]/40 flex items-center justify-between text-[11px] text-[var(--color-outline)]">
										<span class="font-medium text-[var(--color-on-surface-variant)] truncate max-w-[120px]">
											{ticket.client?.name ?? 'Client'}
										</span>

										{#if ticket.estimated_hours !== null || ticket.actual_hours !== null}
											<span class="font-mono text-[11px] text-[var(--color-on-surface)] font-semibold flex items-center gap-1">
												<span class="material-symbols-outlined text-[13px] text-amber-600">timer</span>
												<span>{ticket.actual_hours ?? 0}h / {ticket.estimated_hours ?? '-'}h</span>
											</span>
										{/if}
									</div>
								</div>
							{/each}

							{#if stageTickets.length === 0}
								<div class="rounded-xl border border-dashed border-[var(--color-outline-variant)]/50 p-6 text-center text-[var(--color-outline)] text-[12px]">
									No tickets in this stage
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Create Ticket Modal -->
	<CreateTicketModal
		bind:open={isCreateModalOpen}
		{clients}
		{projects}
	/>

	<!-- Ticket Detail Modal -->
	<TicketDetailModal
		bind:open={isDetailModalOpen}
		ticket={selectedTicket}
		{internalStaff}
		currentUserRole={data.profile?.role}
		projectTickets={selectedTicket
			? tickets.filter((t) => t.project_id === selectedTicket!.project_id && t.id !== selectedTicket!.id)
			: []}
	/>
</div>
