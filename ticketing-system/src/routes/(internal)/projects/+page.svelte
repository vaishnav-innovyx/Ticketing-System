<script lang="ts">
	import CreateProjectModal from '$lib/components/internal/projects/CreateProjectModal.svelte';
	import EditProjectModal from '$lib/components/internal/projects/EditProjectModal.svelte';

	interface ProjectItem {
		id: string;
		client_id: string;
		code: string;
		name: string;
		created_at: string;
		client?: { id?: string; name?: string; code?: string };
		ticket_count?: number;
		active_ticket_count?: number;
		member_count?: number;
		default_poc_id?: string | null;
		team?: { id: string; full_name: string | null; email: string; role: string }[];
	}

	let { data } = $props();

	let searchQuery = $state('');
	let selectedClientFilter = $state('all');
	let isCreateModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let selectedProjectId = $state<string | null>(null);

	const projects = $derived<ProjectItem[]>(data.projects || []);
	const clients = $derived(data.clients || []);
	const internalStaff = $derived(data.internalStaff || []);
	const selectedProject = $derived<ProjectItem | null>(
		selectedProjectId ? (projects.find((p) => p.id === selectedProjectId) ?? null) : null
	);

	const filteredProjects = $derived(
		projects.filter((p) => {
			const matchesSearch =
				p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(p.client?.name && p.client.name.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesClient = selectedClientFilter === 'all' || p.client_id === selectedClientFilter;
			return matchesSearch && matchesClient;
		})
	);

	const totalProjects = $derived(projects.length);
	const totalClients = $derived(new Set(projects.map((p) => p.client_id)).size);
	const totalTickets = $derived(projects.reduce((acc, p) => acc + (p.ticket_count || 0), 0));
	const totalActiveTickets = $derived(projects.reduce((acc, p) => acc + (p.active_ticket_count || 0), 0));
</script>

<svelte:head>
	<title>Projects - Nexus Service Desk</title>
</svelte:head>

<div class="space-y-6 md:space-y-8">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<span class="rounded-md bg-indigo-100 px-2 py-0.5 text-label-xs font-bold text-indigo-800 uppercase tracking-wide">
					Workspace Directory
				</span>
			</div>
			<h1 class="text-headline-md font-bold text-[var(--color-on-surface)] mt-1">
				Project Workspaces
			</h1>
			<p class="text-body-md mt-1 text-[var(--color-on-surface-variant)]">
				Manage client project workspaces, assigned staff, ticket backlogs, and token scopes.
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="nexus-primary-button h-10 px-4 shadow-sm cursor-pointer"
				onclick={() => (isCreateModalOpen = true)}
			>
				<span class="material-symbols-outlined text-[18px]">add</span>
				<span>New Project</span>
			</button>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
		<!-- KPI 1 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Total Projects
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{totalProjects}
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-secondary)]">
					<span class="material-symbols-outlined text-[14px]">check</span>
					<span>Active workspaces</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
				<span class="material-symbols-outlined text-[24px]">folder_special</span>
			</div>
		</div>

		<!-- KPI 2 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Client Tenants
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{totalClients}
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-outline)]">
					<span>Linked organizations</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-primary)]">
				<span class="material-symbols-outlined text-[24px]">apartment</span>
			</div>
		</div>

		<!-- KPI 3 -->
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

		<!-- KPI 4 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Total Backlog
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{totalTickets}
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-outline)]">
					<span>All-time tickets</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
				<span class="material-symbols-outlined text-[24px]">history</span>
			</div>
		</div>
	</div>

	<!-- Controls Toolbar -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 items-center gap-3">
			<div class="relative flex-1 max-w-md">
				<span class="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-[var(--color-outline)]">
					search
				</span>
				<input
					type="text"
					placeholder="Search by project name, code, or client..."
					bind:value={searchQuery}
					class="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] pl-10 pr-4 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
				/>
			</div>

			<select
				bind:value={selectedClientFilter}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			>
				<option value="all">All Clients</option>
				{#each clients as client}
					<option value={client.id}>{client.name} ({client.code})</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Projects Grid -->
	{#if filteredProjects.length === 0}
		<div class="rounded-2xl border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]/50 p-12 text-center">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
				<span class="material-symbols-outlined text-[32px]">folder_off</span>
			</div>
			<h3 class="mt-4 text-title-md font-bold text-[var(--color-on-surface)]">No projects found</h3>
			<p class="mt-1 text-body-sm text-[var(--color-on-surface-variant)]">
				Try adjusting your search criteria or create a new project workspace.
			</p>
			<button
				type="button"
				class="nexus-primary-button mt-5 inline-flex items-center gap-2 px-4 py-2 text-label-md cursor-pointer"
				onclick={() => (isCreateModalOpen = true)}
			>
				<span class="material-symbols-outlined text-[18px]">add</span>
				<span>Create Project</span>
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredProjects as project}
				<div class="nexus-card p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group">
					<div>
						<!-- Header with Avatar & Code -->
						<div class="flex items-start justify-between">
							<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-mono font-bold text-sm shadow-xs">
								{project.code.slice(0, 4)}
							</div>
							<span class="inline-flex items-center rounded-full bg-[var(--color-surface-container-high)] px-2.5 py-1 text-label-xs font-mono font-bold text-[var(--color-on-surface-variant)]">
								{project.client?.code ?? 'CLIENT'}-{project.code}
							</span>
						</div>

						<!-- Title & Client Badge -->
						<h3 class="mt-4 text-title-md font-bold text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors">
							{project.name}
						</h3>

						<div class="mt-1 flex items-center gap-1.5 text-body-xs text-[var(--color-on-surface-variant)]">
							<span class="material-symbols-outlined text-[15px] text-[var(--color-outline)]">apartment</span>
							<span class="font-medium text-[var(--color-on-surface)]">{project.client?.name ?? 'Client'}</span>
						</div>
					</div>

					<!-- Team -->
					<div class="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--color-on-surface-variant)]">
						<span class="material-symbols-outlined text-[15px] text-[var(--color-outline)]">groups</span>
						{#if project.team && project.team.length > 0}
							<span>{project.team.length} team member{project.team.length === 1 ? '' : 's'}</span>
						{:else}
							<span>No specialists assigned</span>
						{/if}
					</div>

					<!-- Metrics & Footer -->
					<div class="mt-3 pt-4 border-t border-[var(--color-outline-variant)]/40 flex items-center justify-between text-[12px]">
						<div class="flex items-center gap-3">
							<span class="flex items-center gap-1 text-[var(--color-on-surface-variant)]">
								<span class="material-symbols-outlined text-[15px] text-amber-600">pending_actions</span>
								<span class="font-semibold text-[var(--color-on-surface)]">{project.active_ticket_count ?? 0}</span> active
							</span>
							<span class="text-[var(--color-outline-variant)]">|</span>
							<span class="flex items-center gap-1 text-[var(--color-on-surface-variant)]">
								<span class="material-symbols-outlined text-[15px] text-[var(--color-outline)]">confirmation_number</span>
								<span>{project.ticket_count ?? 0} total</span>
							</span>
						</div>

						<button
							type="button"
							class="text-label-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-0.5 cursor-pointer"
							onclick={() => {
								selectedProjectId = project.id;
								isEditModalOpen = true;
							}}
						>
							<span class="material-symbols-outlined text-[14px]">manage_accounts</span>
							<span>Manage</span>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Create Project Modal -->
	<CreateProjectModal
		bind:open={isCreateModalOpen}
		{clients}
		{internalStaff}
	/>

	<!-- Edit Project Modal -->
	<EditProjectModal
		bind:open={isEditModalOpen}
		project={selectedProject}
		{internalStaff}
	/>
</div>
