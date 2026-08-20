<script lang="ts">
	import CreateUserModal from '$lib/components/internal/users/CreateUserModal.svelte';
	import EditUserModal from '$lib/components/internal/users/EditUserModal.svelte';
	import UserDetailModal from '$lib/components/internal/users/UserDetailModal.svelte';
	import { roleLabel } from '$lib/portal/ticketDisplay';

	interface ProjectItem {
		id: string;
		code: string;
		name: string;
		client_id?: string;
	}

	interface MemberItem {
		id: string;
		email: string;
		full_name: string | null;
		role: string;
		client_id: string | null;
		client?: { id?: string; name?: string; code?: string } | null;
		assigned_projects?: ProjectItem[];
		created_at: string;
	}

	let { data } = $props();

	let searchQuery = $state('');
	let selectedRoleFilter = $state('all');
	let selectedClientFilter = $state('all');
	let isCreateModalOpen = $state(false);
	let selectedUser = $state<MemberItem | null>(null);
	let isDetailModalOpen = $state(false);
	let isEditModalOpen = $state(false);

	const members = $derived<MemberItem[]>(data.members || []);
	const clients = $derived(data.clients || []);
	const projects = $derived(data.projects || []);

	const filteredMembers = $derived(
		members.filter((m) => {
			const matchesSearch =
				(m.full_name && m.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
				m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(m.client?.name && m.client.name.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesRole =
				selectedRoleFilter === 'all' ||
				(selectedRoleFilter === 'internal' && !m.client_id) ||
				(selectedRoleFilter === 'client' && !!m.client_id) ||
				m.role === selectedRoleFilter;

			const matchesClient =
				selectedClientFilter === 'all' ||
				(selectedClientFilter === 'internal' && !m.client_id) ||
				m.client_id === selectedClientFilter;

			return matchesSearch && matchesRole && matchesClient;
		})
	);

	const totalUsers = $derived(members.length);
	const internalStaffCount = $derived(members.filter((m) => !m.client_id).length);
	const clientUsersCount = $derived(members.filter((m) => !!m.client_id).length);
	const activeTenants = $derived(new Set(members.filter((m) => m.client_id).map((m) => m.client_id)).size);

	function getRoleBadge(role: string) {
		switch (role) {
			case 'super_admin':
				return { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Super Admin' };
			case 'poc':
				return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Point of Contact' };
			case 'specialist':
				return { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Tech Specialist' };
			case 'delivery_lead':
				return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Delivery Lead' };
			case 'client_admin':
				return { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Client Admin' };
			case 'client_raiser':
				return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Client Raiser' };
			case 'client_viewer':
				return { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Client Viewer' };
			default:
				return { bg: 'bg-gray-100 text-gray-700 border-gray-200', label: roleLabel(role) };
		}
	}
</script>

<svelte:head>
	<title>Team & Access - Nexus Service Desk</title>
</svelte:head>

<div class="space-y-6 md:space-y-8">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<span class="rounded-md bg-purple-100 px-2 py-0.5 text-label-xs font-bold text-purple-800 uppercase tracking-wide">
					Access Governance
				</span>
			</div>
			<h1 class="text-headline-md font-bold text-[var(--color-on-surface)] mt-1">
				Team & User Access
			</h1>
			<p class="text-body-md mt-1 text-[var(--color-on-surface-variant)]">
				Manage internal staff assignments, client accounts, seat allocations, and project scopes.
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="nexus-primary-button h-10 px-4 shadow-sm cursor-pointer"
				onclick={() => (isCreateModalOpen = true)}
			>
				<span class="material-symbols-outlined text-[18px]">person_add</span>
				<span>Add User</span>
			</button>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
		<!-- KPI 1 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Total Users
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{totalUsers}
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-secondary)]">
					<span class="material-symbols-outlined text-[14px]">check</span>
					<span>Active profiles</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
				<span class="material-symbols-outlined text-[24px]">group</span>
			</div>
		</div>

		<!-- KPI 2 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Internal Staff
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{internalStaffCount}
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-outline)]">
					<span>Delivery & Support</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-primary)]">
				<span class="material-symbols-outlined text-[24px]">shield_person</span>
			</div>
		</div>

		<!-- KPI 3 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Client Users
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{clientUsersCount}
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-secondary)]">
					<span class="material-symbols-outlined text-[14px]">badge</span>
					<span>Across {activeTenants} tenants</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
				<span class="material-symbols-outlined text-[24px]">contacts</span>
			</div>
		</div>

		<!-- KPI 4 -->
		<div class="nexus-card flex items-center justify-between p-5 transition-shadow hover:shadow-md">
			<div>
				<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Client Tenants
				</p>
				<p class="text-display-lg mt-1 text-[var(--color-on-surface)] font-bold">
					{clients.length}
				</p>
				<div class="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-outline)]">
					<span>Configured organizations</span>
				</div>
			</div>
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
				<span class="material-symbols-outlined text-[24px]">apartment</span>
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
					placeholder="Search by user name, email, or client..."
					bind:value={searchQuery}
					class="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] pl-10 pr-4 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
				/>
			</div>

			<select
				bind:value={selectedRoleFilter}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			>
				<option value="all">All Roles</option>
				<option value="internal">Internal Staff Only</option>
				<option value="client">Client Users Only</option>
				<option value="super_admin">Super Admins</option>
				<option value="poc">Points of Contact</option>
				<option value="specialist">Tech Specialists</option>
				<option value="delivery_lead">Delivery Leads</option>
				<option value="client_admin">Client Admins</option>
				<option value="client_raiser">Client Raisers</option>
				<option value="client_viewer">Client Viewers</option>
			</select>

			<select
				bind:value={selectedClientFilter}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			>
				<option value="all">All Organizations</option>
				<option value="internal">Company X (Internal)</option>
				{#each clients as client}
					<option value={client.id}>{client.name} ({client.code})</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Team Members Table -->
	<div class="overflow-hidden rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] shadow-xs">
		<table class="w-full text-left text-body-sm">
			<thead class="border-b border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
				<tr>
					<th class="px-5 py-3.5">User</th>
					<th class="px-5 py-3.5">Role</th>
					<th class="px-5 py-3.5">Organization</th>
					<th class="px-5 py-3.5">Assigned Projects</th>
					<th class="px-5 py-3.5">Added Date</th>
					<th class="px-5 py-3.5 text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[var(--color-outline-variant)]/30">
				{#each filteredMembers as member}
					{@const roleBadge = getRoleBadge(member.role)}
					{@const initials = (member.full_name || member.email || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
					<tr class="hover:bg-[var(--color-surface-container-low)]/60 transition-colors group">
						<!-- User Info -->
						<td class="px-5 py-4">
							<button
								type="button"
								class="flex items-center gap-3 text-left cursor-pointer"
								onclick={() => {
									selectedUser = member;
									isDetailModalOpen = true;
								}}
							>
								<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-label-xs font-bold text-white shadow-2xs group-hover:scale-105 transition-transform">
									{initials}
								</div>
								<div>
									<p class="font-semibold text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors">{member.full_name || 'Unnamed'}</p>
									<p class="text-body-xs text-[var(--color-on-surface-variant)]">{member.email}</p>
								</div>
							</button>
						</td>

						<!-- Role Badge -->
						<td class="px-5 py-4">
							<span class="inline-flex rounded-md border px-2.5 py-1 text-label-xs font-medium {roleBadge.bg}">
								{roleBadge.label}
							</span>
						</td>

						<!-- Organization -->
						<td class="px-5 py-4">
							{#if member.client}
								<span class="inline-flex items-center gap-1.5 font-medium text-[var(--color-on-surface)]">
									<span class="material-symbols-outlined text-[16px] text-[var(--color-outline)]">apartment</span>
									<span>{member.client.name}</span>
									<span class="font-mono text-label-xs text-[var(--color-on-surface-variant)]">({member.client.code})</span>
								</span>
							{:else}
								<span class="inline-flex items-center gap-1.5 text-[var(--color-primary)] font-semibold">
									<span class="material-symbols-outlined text-[16px]">domain</span>
									<span>Company X (Internal)</span>
								</span>
							{/if}
						</td>

						<!-- Projects Assigned (Badges + Count) -->
						<td class="px-5 py-4">
							{#if member.role === 'super_admin'}
								<span class="inline-flex items-center gap-1 rounded-md bg-indigo-50/80 px-2 py-0.5 text-label-xs font-semibold text-indigo-700">
									<span class="material-symbols-outlined text-[14px]">public</span>
									<span>All Workspaces</span>
								</span>
							{:else if member.assigned_projects && member.assigned_projects.length > 0}
								<div class="flex flex-wrap items-center gap-1.5 max-w-xs">
									{#each member.assigned_projects.slice(0, 2) as project}
										<span class="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700">
											{project.code}
										</span>
									{/each}
									{#if member.assigned_projects.length > 2}
										<span class="inline-flex items-center rounded bg-[var(--color-surface-container-high)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
											+{member.assigned_projects.length - 2} more
										</span>
									{/if}
								</div>
							{:else}
								<span class="text-[12px] text-[var(--color-outline)] italic">Unassigned</span>
							{/if}
						</td>

						<!-- Added Date -->
						<td class="px-5 py-4 text-[12px] text-[var(--color-on-surface-variant)]">
							{new Date(member.created_at || Date.now()).toLocaleDateString(undefined, { dateStyle: 'medium' })}
						</td>

						<!-- Actions -->
						<td class="px-5 py-4 text-right">
							<div class="inline-flex items-center gap-1.5">
								<button
									type="button"
									class="nexus-secondary-button h-8 px-2.5 text-label-xs font-semibold cursor-pointer hover:border-[var(--color-primary)]"
									onclick={() => {
										selectedUser = member;
										isDetailModalOpen = true;
									}}
								>
									View Details
								</button>
								<button
									type="button"
									class="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-outline-variant)]/60 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
									title="Edit User"
									onclick={() => {
										selectedUser = member;
										isEditModalOpen = true;
									}}
								>
									<span class="material-symbols-outlined text-[16px]">edit</span>
								</button>
							</div>
						</td>
					</tr>
				{/each}

				{#if filteredMembers.length === 0}
					<tr>
						<td colspan="6" class="px-5 py-12 text-center text-[var(--color-on-surface-variant)]">
							<span class="material-symbols-outlined text-[36px] text-[var(--color-outline)]">person_off</span>
							<p class="mt-2 text-body-sm">No team members match the selected filters.</p>
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Create User Modal -->
	<CreateUserModal
		bind:open={isCreateModalOpen}
		{clients}
		{projects}
		allowedRoleScope="all"
	/>

	<!-- User Detail Modal -->
	<UserDetailModal
		bind:open={isDetailModalOpen}
		user={selectedUser}
		onEdit={(u) => {
			selectedUser = u as MemberItem;
			isEditModalOpen = true;
		}}
	/>

	<!-- Edit User Modal -->
	<EditUserModal
		bind:open={isEditModalOpen}
		user={selectedUser}
		{clients}
		{projects}
		allowedRoleScope="all"
	/>
</div>
