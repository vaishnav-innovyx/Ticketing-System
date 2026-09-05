<script lang="ts">
	interface ProjectItem {
		id: string;
		code: string;
		name: string;
		client_id?: string;
		created_at?: string;
	}

	interface MemberItem {
		id: string;
		full_name: string | null;
		email: string;
		role: string;
		client_id?: string | null;
		created_at?: string;
	}

	interface TicketItem {
		id: string;
		title: string;
		description: string | null;
		category: string;
		status: string;
		project_id: string;
		project_code?: string;
		project_name?: string;
		raised_by?: string | null;
		estimated_hours?: number | null;
		actual_hours?: number | null;
		created_at?: string;
	}

	interface ClientData {
		id: string;
		code: string;
		name: string;
		seat_quota: number | null;
		created_at: string;
		updated_at?: string;
		projects: ProjectItem[];
		members: MemberItem[];
		tickets: TicketItem[];
	}

	interface Props {
		client: ClientData;
		onClose?: () => void;
	}

	import { enhance } from '$app/forms';
	import CreateProjectModal from '$lib/components/internal/projects/CreateProjectModal.svelte';
	import CreateUserModal from '$lib/components/internal/users/CreateUserModal.svelte';
	import EditUserModal from '$lib/components/internal/users/EditUserModal.svelte';
	import UserDetailModal from '$lib/components/internal/users/UserDetailModal.svelte';

	let { client, onClose }: Props = $props();

	let activeTab = $state<'overview' | 'projects' | 'members' | 'tickets'>('overview');
	let ticketCategoryFilter = $state<string>('all');
	let projectSearch = $state<string>('');
	let isCreateProjectModalOpen = $state(false);
	let isCreateUserModalOpen = $state(false);
	let isEditUserModalOpen = $state(false);
	let selectedUser = $state<any>(null);
	let isUserDetailModalOpen = $state(false);
	let isDeleteModalOpen = $state(false);
	let isDeleting = $state(false);
	let deleteErrorMessage = $state<string | null>(null);

	const isUnlimited = $derived(client.seat_quota === null || client.seat_quota === undefined || client.seat_quota <= 0);
	const usedSeats = $derived(client.members.length);
	const remainingSeats = $derived(isUnlimited ? Infinity : Math.max(0, (client.seat_quota ?? 0) - usedSeats));
	const seatPercentage = $derived(
		!isUnlimited && client.seat_quota && client.seat_quota > 0
			? Math.min(100, Math.round((usedSeats / client.seat_quota) * 100))
			: 0
	);

	const activeTickets = $derived(
		client.tickets.filter((t) => t.status !== 'closed' && t.status !== 'delivered')
	);
	const closedTickets = $derived(
		client.tickets.filter((t) => t.status === 'closed' || t.status === 'delivered')
	);

	// Status helpers
	function getStatusBadge(status: string) {
		switch (status) {
			case 'raised':
				return { label: 'Raised', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'flag' };
			case 'poc_triage':
				return { label: 'PoC Triage', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'manage_search' };
			case 'requirement_estimation':
				return { label: 'Estimation', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'pending_actions' };
			case 'client_approval':
				return { label: 'Awaiting Approval', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'hourglass_top' };
			case 'development':
				return { label: 'In Development', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: 'code' };
			case 'delivery':
				return { label: 'Delivered / KT', bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'local_shipping' };
			case 'closed':
				return { label: 'Closed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'check_circle' };
			default:
				return { label: status, bg: 'bg-gray-50 text-gray-700 border-gray-200', icon: 'info' };
		}
	}

	function getCategoryBadge(category: string) {
		switch (category) {
			case 'bug':
				return { label: 'Bug', bg: 'bg-red-50 text-red-700 border-red-200' };
			case 'enhancement':
				return { label: 'Enhancement', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
			case 'kt':
				return { label: 'Knowledge Transfer', bg: 'bg-violet-50 text-violet-700 border-violet-200' };
			case 'training':
				return { label: 'Training', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
			default:
				return { label: category, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
		}
	}

	function getRoleBadge(role: string) {
		switch (role) {
			case 'client_admin':
				return { label: 'Client Admin', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
			case 'project_admin':
				return { label: 'Project Admin', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
			case 'client_raiser':
				return { label: 'Ticket Raiser', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
			case 'client_viewer':
				return { label: 'Viewer', bg: 'bg-gray-100 text-gray-800 border-gray-200' };
			default:
				return { label: role, bg: 'bg-gray-100 text-gray-700 border-gray-200' };
		}
	}

	const filteredProjects = $derived(
		client.projects.filter(
			(p) =>
				p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
				p.code.toLowerCase().includes(projectSearch.toLowerCase())
		)
	);

	const filteredTickets = $derived(
		ticketCategoryFilter === 'all'
			? client.tickets
			: client.tickets.filter((t) => t.category === ticketCategoryFilter)
	);

	const avatarColors = [
		'from-blue-600 to-indigo-700 text-white',
		'from-emerald-600 to-teal-700 text-white',
		'from-amber-600 to-orange-700 text-white',
		'from-purple-600 to-pink-700 text-white',
		'from-cyan-600 to-blue-700 text-white'
	];
	const colorIndex = $derived((client.code.charCodeAt(0) + (client.code.charCodeAt(1) || 0)) % avatarColors.length);
	const avatarColor = $derived(avatarColors[colorIndex]);
</script>

<div class="nexus-card overflow-hidden shadow-md">
	<!-- Top Client Banner Header -->
	<div class="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] p-5 sm:p-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-4">
				<div
					class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br {avatarColor} text-xl font-bold shadow"
				>
					{client.code.slice(0, 2).toUpperCase()}
				</div>
				<div>
					<div class="flex flex-wrap items-center gap-2">
						<h2 class="text-headline-sm font-bold text-[var(--color-on-surface)]">
							{client.name}
						</h2>
						<span class="inline-flex items-center rounded-md bg-[var(--color-surface-container-highest)] px-2.5 py-0.5 text-label-xs font-mono font-bold text-[var(--color-on-surface)]">
							{client.code}
						</span>
						<span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-label-xs font-medium text-emerald-700 border border-emerald-200">
							<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
							Active Client
						</span>
					</div>
					<p class="text-body-xs mt-1 text-[var(--color-on-surface-variant)]">
						Client ID: <span class="font-mono text-[11px] text-[var(--color-outline)]">{client.id}</span>
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				{#if onClose}
					<button
						type="button"
						class="nexus-secondary-button h-9 px-3 text-label-md"
						onclick={onClose}
					>
						<span class="material-symbols-outlined text-[18px]">arrow_back</span>
						<span>Back to List</span>
					</button>
				{/if}
				<button
					type="button"
					class="nexus-primary-button h-9 px-3.5 text-label-md"
				>
					<span class="material-symbols-outlined text-[18px]">edit</span>
					<span>Edit Client</span>
				</button>
				<button
					type="button"
					class="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-1.5 text-label-md font-semibold text-red-700 hover:bg-red-100 hover:text-red-800 transition-colors cursor-pointer"
					onclick={() => (isDeleteModalOpen = true)}
				>
					<span class="material-symbols-outlined text-[18px]">delete</span>
					<span>Delete</span>
				</button>
			</div>
		</div>

		<!-- Navigation Tabs -->
		<div class="mt-6 flex flex-wrap gap-2 border-b border-[var(--color-border-subtle)]/50 pt-2 -mb-5 sm:-mb-6">
			<button
				type="button"
				class="flex items-center gap-2 border-b-2 px-4 py-2.5 text-label-md font-medium transition-colors {activeTab === 'overview'
					? 'border-[var(--color-primary)] text-[var(--color-primary)]'
					: 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}"
				onclick={() => (activeTab = 'overview')}
			>
				<span class="material-symbols-outlined text-[18px]">dashboard</span>
				<span>Overview</span>
			</button>

			<button
				type="button"
				class="flex items-center gap-2 border-b-2 px-4 py-2.5 text-label-md font-medium transition-colors {activeTab === 'projects'
					? 'border-[var(--color-primary)] text-[var(--color-primary)]'
					: 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}"
				onclick={() => (activeTab = 'projects')}
			>
				<span class="material-symbols-outlined text-[18px]">folder_special</span>
				<span>Projects ({client.projects.length})</span>
			</button>

			<button
				type="button"
				class="flex items-center gap-2 border-b-2 px-4 py-2.5 text-label-md font-medium transition-colors {activeTab === 'members'
					? 'border-[var(--color-primary)] text-[var(--color-primary)]'
					: 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}"
				onclick={() => (activeTab = 'members')}
			>
				<span class="material-symbols-outlined text-[18px]">group</span>
				<span>Team Members ({client.members.length})</span>
			</button>

			<button
				type="button"
				class="flex items-center gap-2 border-b-2 px-4 py-2.5 text-label-md font-medium transition-colors {activeTab === 'tickets'
					? 'border-[var(--color-primary)] text-[var(--color-primary)]'
					: 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}"
				onclick={() => (activeTab = 'tickets')}
			>
				<span class="material-symbols-outlined text-[18px]">confirmation_number</span>
				<span>Tickets ({client.tickets.length})</span>
			</button>
		</div>
	</div>

	<!-- Tab Content Container -->
	<div class="p-5 sm:p-6">
		{#if activeTab === 'overview'}
			<!-- OVERVIEW TAB -->
			<div class="space-y-6">
				<!-- KPI Quick Stats Grid -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-4">
						<div class="flex items-center justify-between">
							<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								Projects
							</span>
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
								<span class="material-symbols-outlined text-[18px]">folder_special</span>
							</div>
						</div>
						<div class="mt-2 text-headline-sm font-bold text-[var(--color-on-surface)]">
							{client.projects.length}
						</div>
						<p class="text-[12px] text-[var(--color-outline)] mt-0.5">Active workspaces</p>
					</div>

					<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-4">
						<div class="flex items-center justify-between">
							<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								Seat Quota
							</span>
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
								<span class="material-symbols-outlined text-[18px]">badge</span>
							</div>
						</div>
						<div class="mt-2 text-headline-sm font-bold text-[var(--color-on-surface)]">
							{#if isUnlimited}
								{usedSeats} <span class="text-sm font-normal text-emerald-700">/ ∞</span>
							{:else}
								{usedSeats} <span class="text-sm font-normal text-[var(--color-outline)]">/ {client.seat_quota}</span>
							{/if}
						</div>
						<p class="text-[12px] text-[var(--color-outline)] mt-0.5">
							{#if isUnlimited}
								<span class="text-emerald-700 font-medium">Unlimited seats capacity</span>
							{:else}
								{remainingSeats} available seats
							{/if}
						</p>
					</div>

					<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-4">
						<div class="flex items-center justify-between">
							<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								Active Tickets
							</span>
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
								<span class="material-symbols-outlined text-[18px]">pending_actions</span>
							</div>
						</div>
						<div class="mt-2 text-headline-sm font-bold text-[var(--color-on-surface)]">
							{activeTickets.length}
						</div>
						<p class="text-[12px] text-[var(--color-outline)] mt-0.5">In pipeline / review</p>
					</div>

					<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-4">
						<div class="flex items-center justify-between">
							<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								Resolved Tickets
							</span>
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
								<span class="material-symbols-outlined text-[18px]">check_circle</span>
							</div>
						</div>
						<div class="mt-2 text-headline-sm font-bold text-[var(--color-on-surface)]">
							{closedTickets.length}
						</div>
						<p class="text-[12px] text-[var(--color-outline)] mt-0.5">Delivered & closed</p>
					</div>
				</div>

				<!-- Middle Section: Quota Card & Ticket Breakdown -->
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<!-- Seat Allocation Card -->
					<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5">
						<div class="flex items-center justify-between">
							<h4 class="text-title-sm font-bold text-[var(--color-on-surface)]">
								Seat Quota & Utilization
							</h4>
							<span class="font-bold text-[var(--color-primary)]">
								{seatPercentage}% Utilized
							</span>
						</div>
						<p class="text-body-xs mt-1 text-[var(--color-on-surface-variant)]">
							Maximum allocated seats for this client organization under current subscription.
						</p>

						<div class="mt-4 space-y-2">
							<div class="h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
								<div
									class="h-full rounded-full bg-[var(--color-primary-container)] transition-all duration-500"
									style="width: {seatPercentage}%"
								></div>
							</div>
							<div class="flex justify-between text-[12px] text-[var(--color-outline)]">
								<span>{usedSeats} active accounts</span>
								<span>{remainingSeats} seats remaining</span>
							</div>
						</div>

						<div class="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-border-subtle)]/60 text-[13px]">
							<div>
								<span class="text-[var(--color-outline)] block">Contract Status</span>
								<span class="font-semibold text-emerald-700">Enterprise Active</span>
							</div>
							<div>
								<span class="text-[var(--color-outline)] block">Created Date</span>
								<span class="font-medium text-[var(--color-on-surface)]">
									{new Date(client.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
								</span>
							</div>
						</div>
					</div>

					<!-- Ticket Category Distribution -->
					<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5">
						<h4 class="text-title-sm font-bold text-[var(--color-on-surface)]">
							Ticket Volume by Category
						</h4>
						<p class="text-body-xs mt-1 text-[var(--color-on-surface-variant)]">
							Categorization of all tickets submitted by this client.
						</p>

						<div class="mt-4 space-y-3">
							{#each ['bug', 'enhancement', 'kt', 'training'] as cat}
								{@const count = client.tickets.filter((t) => t.category === cat).length}
								{@const pct = client.tickets.length > 0 ? Math.round((count / client.tickets.length) * 100) : 0}
								{@const badge = getCategoryBadge(cat)}
								<div class="flex items-center justify-between text-[13px]">
									<div class="flex items-center gap-2">
										<span class="inline-flex rounded px-2 py-0.5 text-label-xs font-medium border {badge.bg}">
											{badge.label}
										</span>
									</div>
									<div class="flex items-center gap-3">
										<div class="h-2 w-24 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
											<div class="h-full rounded-full bg-[var(--color-primary)]" style="width: {pct}%"></div>
										</div>
										<span class="w-8 text-right font-semibold text-[var(--color-on-surface)]">{count}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Quick Preview of Recent Tickets -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5">
					<div class="flex items-center justify-between mb-4">
						<h4 class="text-title-sm font-bold text-[var(--color-on-surface)]">
							Recent Tickets
						</h4>
						<button
							type="button"
							class="text-label-xs font-semibold text-[var(--color-primary)] hover:underline"
							onclick={() => (activeTab = 'tickets')}
						>
							View All ({client.tickets.length}) &rarr;
						</button>
					</div>

					{#if client.tickets.length === 0}
						<p class="text-body-xs py-4 text-center text-[var(--color-outline)]">No tickets recorded yet for this client.</p>
					{:else}
						<div class="divide-y divide-[var(--color-border-subtle)]/60">
							{#each client.tickets.slice(0, 4) as ticket}
								{@const statusBadge = getStatusBadge(ticket.status)}
								{@const catBadge = getCategoryBadge(ticket.category)}
								<div class="flex items-center justify-between py-3">
									<div class="space-y-1">
										<div class="flex items-center gap-2">
											<span class="text-body-sm font-semibold text-[var(--color-on-surface)]">
												{ticket.title}
											</span>
											<span class="inline-flex rounded px-1.5 py-0.2 text-[11px] font-medium border {catBadge.bg}">
												{catBadge.label}
											</span>
										</div>
										<p class="text-[12px] text-[var(--color-outline)]">
											{ticket.description || 'No description provided'}
										</p>
									</div>

									<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-xs font-medium border {statusBadge.bg}">
										<span class="material-symbols-outlined text-[14px]">{statusBadge.icon}</span>
										{statusBadge.label}
									</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

		{:else if activeTab === 'projects'}
			<!-- PROJECTS TAB -->
			<div class="space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<h3 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							Client Projects
						</h3>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							Workspaces and systems configured for {client.name}.
						</p>
					</div>

					<div class="flex items-center gap-3">
						<div class="relative">
							<span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[var(--color-outline)]">
								search
							</span>
							<input
								type="text"
								placeholder="Search projects..."
								bind:value={projectSearch}
								class="h-9 w-52 rounded-lg border border-[var(--color-border-subtle)] bg-white pl-9 pr-3 text-body-xs focus:border-[var(--color-primary)] focus:outline-none"
							/>
						</div>
						<button
							type="button"
							class="nexus-primary-button h-9 px-3 text-label-md cursor-pointer"
							onclick={() => (isCreateProjectModalOpen = true)}
						>
							<span class="material-symbols-outlined text-[18px]">add</span>
							<span>New Project</span>
						</button>
					</div>
				</div>

				{#if filteredProjects.length === 0}
					<div class="rounded-xl border border-dashed border-[var(--color-border-subtle)] p-8 text-center">
						<span class="material-symbols-outlined text-[36px] text-[var(--color-outline)]">folder_off</span>
						<p class="mt-2 text-body-sm text-[var(--color-on-surface-variant)]">No projects found matching your search.</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each filteredProjects as project}
							{@const projectTicketCount = client.tickets.filter((t) => t.project_id === project.id).length}
							<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 hover:border-[var(--color-primary-container)] transition-all">
								<div class="flex items-start justify-between">
									<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold font-mono text-sm">
										{project.code}
									</div>
									<span class="inline-flex rounded-full bg-[var(--color-surface-container-high)] px-2 py-0.5 text-[11px] font-mono text-[var(--color-on-surface-variant)]">
										{project.code}
									</span>
								</div>

								<h4 class="mt-3 text-title-sm font-bold text-[var(--color-on-surface)]">
									{project.name}
								</h4>
								<p class="text-[12px] font-mono text-[var(--color-outline)] mt-1">
									ID: {project.id.slice(0, 8)}...
								</p>

								<div class="mt-4 flex items-center justify-between border-t border-[var(--color-border-subtle)]/60 pt-3 text-[12px]">
									<span class="text-[var(--color-on-surface-variant)]">
										<strong class="text-[var(--color-on-surface)]">{projectTicketCount}</strong> {projectTicketCount === 1 ? 'ticket' : 'tickets'}
									</span>
									<span class="text-[var(--color-primary)] font-medium hover:underline cursor-pointer">
										View Tickets &rarr;
									</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

		{:else if activeTab === 'members'}
			<!-- TEAM MEMBERS TAB -->
			<div class="space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<h3 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							Client Team & Contacts
						</h3>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							{#if isUnlimited}
								Users registered under {client.name} ({usedSeats} seats utilized, Unlimited quota).
							{:else}
								Users registered under {client.name} ({usedSeats} of {client.seat_quota} seats utilized).
							{/if}
						</p>
					</div>

					<button
						type="button"
						class="nexus-primary-button h-9 px-3 text-label-md cursor-pointer"
						onclick={() => (isCreateUserModalOpen = true)}
					>
						<span class="material-symbols-outlined text-[18px]">person_add</span>
						<span>Invite Member</span>
					</button>
				</div>

				{#if client.members.length === 0}
					<div class="rounded-xl border border-dashed border-[var(--color-border-subtle)] p-8 text-center">
						<span class="material-symbols-outlined text-[36px] text-[var(--color-outline)]">group_off</span>
						<p class="mt-2 text-body-sm text-[var(--color-on-surface-variant)]">No members added yet for this client.</p>
					</div>
				{:else}
					<div class="overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)]">
						<table class="w-full text-left text-body-sm">
							<thead class="bg-[var(--color-surface-container-low)] text-label-xs font-semibold uppercase text-[var(--color-on-surface-variant)]">
								<tr>
									<th class="px-5 py-3">User</th>
									<th class="px-5 py-3">Role</th>
									<th class="px-5 py-3">Assigned Projects</th>
									<th class="px-5 py-3">Status</th>
									<th class="px-5 py-3 text-right">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-[var(--color-border-subtle)]/60">
								{#each client.members as member}
									{@const roleBadge = getRoleBadge(member.role)}
									<tr class="hover:bg-[var(--color-surface-container-low)]/50 transition-colors group">
										<td class="px-5 py-3.5">
											<button
												type="button"
												class="flex items-center gap-3 text-left cursor-pointer"
												onclick={() => {
													selectedUser = {
														...member,
														client: { id: client.id, name: client.name, code: client.code },
														assigned_projects: client.projects
													};
													isUserDetailModalOpen = true;
												}}
											>
												<div class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-white text-xs font-bold shadow-2xs group-hover:scale-105 transition-transform">
													{(member.full_name || member.email).slice(0, 2).toUpperCase()}
												</div>
												<div>
													<div class="font-semibold text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors">
														{member.full_name || 'Unnamed User'}
													</div>
													<div class="text-[12px] text-[var(--color-on-surface-variant)]">
														{member.email}
													</div>
												</div>
											</button>
										</td>
										<td class="px-5 py-3.5">
											<span class="inline-flex rounded-md px-2.5 py-0.5 text-label-xs font-medium border {roleBadge.bg}">
												{roleBadge.label}
											</span>
										</td>
										<td class="px-5 py-3.5">
											<div class="flex flex-wrap items-center gap-1.5 max-w-xs">
												{#each client.projects.slice(0, 2) as project}
													<span class="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700">
														{project.code}
													</span>
												{/each}
												{#if client.projects.length > 2}
													<span class="inline-flex items-center rounded bg-[var(--color-surface-container-high)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
														+{client.projects.length - 2} more
													</span>
												{:else if client.projects.length === 0}
													<span class="text-[12px] text-[var(--color-outline)] italic">None</span>
												{/if}
											</div>
										</td>
										<td class="px-5 py-3.5">
											<span class="inline-flex items-center gap-1 text-emerald-700 text-[12px] font-medium">
												<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
												Active
											</span>
										</td>
										<td class="px-5 py-3.5 text-right">
											<div class="inline-flex items-center gap-1.5">
												<button
													type="button"
													class="nexus-secondary-button h-8 px-2.5 text-label-xs font-semibold cursor-pointer hover:border-[var(--color-primary)]"
													onclick={() => {
														selectedUser = {
															...member,
															client: { id: client.id, name: client.name, code: client.code },
															assigned_projects: client.projects
														};
														isUserDetailModalOpen = true;
													}}
												>
													View Details
												</button>
												<button
													type="button"
													class="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-outline-variant)]/60 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
													title="Edit User"
													onclick={() => {
														selectedUser = {
															...member,
															client: { id: client.id, name: client.name, code: client.code },
															assigned_projects: client.projects
														};
														isEditUserModalOpen = true;
													}}
												>
													<span class="material-symbols-outlined text-[16px]">edit</span>
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

		{:else if activeTab === 'tickets'}
			<!-- TICKETS TAB -->
			<div class="space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<h3 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							Service Tickets & Lifecycle
						</h3>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							All support tickets, bug reports, and enhancements requested by {client.name}.
						</p>
					</div>

					<!-- Filter Pills -->
					<div class="flex flex-wrap items-center gap-2">
						<button
							type="button"
							class="rounded-lg px-3 py-1.5 text-label-xs font-semibold transition-colors {ticketCategoryFilter === 'all'
								? 'bg-[var(--color-primary-container)] text-white'
								: 'bg-white border border-[var(--color-border-subtle)] text-[var(--color-on-surface-variant)] hover:bg-gray-50'}"
							onclick={() => (ticketCategoryFilter = 'all')}
						>
							All ({client.tickets.length})
						</button>
						<button
							type="button"
							class="rounded-lg px-3 py-1.5 text-label-xs font-semibold transition-colors {ticketCategoryFilter === 'bug'
								? 'bg-red-600 text-white'
								: 'bg-white border border-[var(--color-border-subtle)] text-[var(--color-on-surface-variant)] hover:bg-gray-50'}"
							onclick={() => (ticketCategoryFilter = 'bug')}
						>
							Bugs
						</button>
						<button
							type="button"
							class="rounded-lg px-3 py-1.5 text-label-xs font-semibold transition-colors {ticketCategoryFilter === 'enhancement'
								? 'bg-sky-600 text-white'
								: 'bg-white border border-[var(--color-border-subtle)] text-[var(--color-on-surface-variant)] hover:bg-gray-50'}"
							onclick={() => (ticketCategoryFilter = 'enhancement')}
						>
							Enhancements
						</button>
						<button
							type="button"
							class="rounded-lg px-3 py-1.5 text-label-xs font-semibold transition-colors {ticketCategoryFilter === 'kt'
								? 'bg-violet-600 text-white'
								: 'bg-white border border-[var(--color-border-subtle)] text-[var(--color-on-surface-variant)] hover:bg-gray-50'}"
							onclick={() => (ticketCategoryFilter = 'kt')}
						>
							KT
						</button>
						<button
							type="button"
							class="rounded-lg px-3 py-1.5 text-label-xs font-semibold transition-colors {ticketCategoryFilter === 'training'
								? 'bg-emerald-600 text-white'
								: 'bg-white border border-[var(--color-border-subtle)] text-[var(--color-on-surface-variant)] hover:bg-gray-50'}"
							onclick={() => (ticketCategoryFilter = 'training')}
						>
							Training
						</button>
					</div>
				</div>

				{#if filteredTickets.length === 0}
					<div class="rounded-xl border border-dashed border-[var(--color-border-subtle)] p-8 text-center">
						<span class="material-symbols-outlined text-[36px] text-[var(--color-outline)]">confirmation_number</span>
						<p class="mt-2 text-body-sm text-[var(--color-on-surface-variant)]">No tickets match the selected filter.</p>
					</div>
				{:else}
					<div class="overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)]">
						<table class="w-full text-left text-body-sm">
							<thead class="bg-[var(--color-surface-container-low)] text-label-xs font-semibold uppercase text-[var(--color-on-surface-variant)]">
								<tr>
									<th class="px-5 py-3">Ticket Title</th>
									<th class="px-5 py-3">Category</th>
									<th class="px-5 py-3">Status / Stage</th>
									<th class="px-5 py-3">Est. / Act. Hours</th>
									<th class="px-5 py-3 text-right">Created</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-[var(--color-border-subtle)]/60">
								{#each filteredTickets as ticket}
									{@const statusBadge = getStatusBadge(ticket.status)}
									{@const catBadge = getCategoryBadge(ticket.category)}
									<tr class="hover:bg-[var(--color-surface-container-low)]/50 transition-colors">
										<td class="px-5 py-3.5">
											<div class="space-y-0.5">
												<div class="font-semibold text-[var(--color-on-surface)]">
													{ticket.title}
												</div>
												<div class="text-[12px] text-[var(--color-outline)] line-clamp-1">
													{ticket.description || 'No description'}
												</div>
											</div>
										</td>
										<td class="px-5 py-3.5">
											<span class="inline-flex rounded px-2 py-0.5 text-label-xs font-medium border {catBadge.bg}">
												{catBadge.label}
											</span>
										</td>
										<td class="px-5 py-3.5">
											<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-xs font-medium border {statusBadge.bg}">
												<span class="material-symbols-outlined text-[14px]">{statusBadge.icon}</span>
												{statusBadge.label}
											</span>
										</td>
										<td class="px-5 py-3.5 text-[var(--color-on-surface-variant)] text-[12px]">
											{#if ticket.estimated_hours || ticket.actual_hours}
												<span>{ticket.estimated_hours ?? '-'}h est. / {ticket.actual_hours ?? '-'}h act.</span>
											{:else}
												<span class="text-[var(--color-outline)]">-</span>
											{/if}
										</td>
										<td class="px-5 py-3.5 text-right text-[12px] text-[var(--color-outline)]">
											{new Date(ticket.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Create Project Modal -->
	<CreateProjectModal
		bind:open={isCreateProjectModalOpen}
		selectedClientId={client.id}
		clients={[{ id: client.id, name: client.name, code: client.code }]}
	/>

	<!-- Create User Modal -->
	<CreateUserModal
		bind:open={isCreateUserModalOpen}
		selectedClientId={client.id}
		clients={[{ id: client.id, name: client.name, code: client.code }]}
		projects={client.projects}
		allowedRoleScope="client_only"
	/>

	<!-- User Detail Modal -->
	<UserDetailModal
		bind:open={isUserDetailModalOpen}
		user={selectedUser}
		onEdit={(u) => {
			selectedUser = u;
			isEditUserModalOpen = true;
		}}
	/>

	<!-- Edit User Modal -->
	<EditUserModal
		bind:open={isEditUserModalOpen}
		user={selectedUser}
		clients={[{ id: client.id, name: client.name, code: client.code }]}
		projects={client.projects}
		allowedRoleScope="client_only"
	/>

	<!-- Delete Client Confirmation Modal -->
	{#if isDeleteModalOpen}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
			<button
				type="button"
				class="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
				onclick={() => (isDeleteModalOpen = false)}
				aria-label="Close delete modal"
			></button>

			<div class="relative w-full max-w-md rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 space-y-4">
				<div class="flex items-center gap-3 border-b border-[var(--color-outline-variant)]/40 pb-4">
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
						<span class="material-symbols-outlined text-[24px]">warning</span>
					</div>
					<div>
						<h3 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							Delete {client.name}?
						</h3>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							This action cannot be undone.
						</p>
					</div>
				</div>

				{#if deleteErrorMessage}
					<div class="flex items-center gap-2 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-body-sm text-[var(--color-error)]">
						<span class="material-symbols-outlined shrink-0 text-[18px]">error</span>
						<span>{deleteErrorMessage}</span>
					</div>
				{/if}

				<p class="text-body-sm text-[var(--color-on-surface-variant)] leading-relaxed">
					Are you sure you want to delete organization <strong class="text-[var(--color-on-surface)]">{client.name}</strong> (<code class="font-mono font-bold">{client.code}</code>)?
				</p>

				<div class="rounded-lg bg-amber-50/80 border border-amber-200 p-3 text-[12px] text-amber-900 space-y-1">
					<p class="font-bold flex items-center gap-1">
						<span class="material-symbols-outlined text-[16px] text-amber-700">info</span>
						Associated Data To Be Removed:
					</p>
					<ul class="list-disc list-inside space-y-0.5 text-amber-800">
						<li><strong>{client.projects.length}</strong> linked project{client.projects.length !== 1 ? 's' : ''}</li>
						<li><strong>{client.tickets.length}</strong> ticket{client.tickets.length !== 1 ? 's' : ''}</li>
						<li><strong>{client.members.length}</strong> client user link{client.members.length !== 1 ? 's' : ''}</li>
					</ul>
				</div>

				<form
					method="POST"
					action="?/deleteClient"
					use:enhance={() => {
						isDeleting = true;
						deleteErrorMessage = null;
						return async ({ result, update }) => {
							isDeleting = false;
							if (result.type === 'failure') {
								deleteErrorMessage = (result.data as { error?: string })?.error ?? 'Failed to delete client.';
							} else if (result.type === 'success') {
								isDeleteModalOpen = false;
								if (onClose) onClose();
								await update();
							}
						};
					}}
					class="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-outline-variant)]/40"
				>
					<input type="hidden" name="client_id" value={client.id} />
					<button
						type="button"
						class="nexus-secondary-button h-10 px-4 text-label-md"
						onclick={() => (isDeleteModalOpen = false)}
						disabled={isDeleting}
					>
						Cancel
					</button>

					<button
						type="submit"
						disabled={isDeleting}
						class="flex h-10 items-center gap-1.5 rounded-lg bg-red-600 px-5 text-label-md font-bold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
					>
						{#if isDeleting}
							<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
							<span>Deleting...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">delete</span>
							<span>Delete Organization</span>
						{/if}
					</button>
				</form>
			</div>
		</div>
	{/if}
</div>
