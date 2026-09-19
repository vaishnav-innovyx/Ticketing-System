<script lang="ts">
	import { enhance } from '$app/forms';
	import CreateUserModal from '$lib/components/internal/users/CreateUserModal.svelte';
	import BulkUploadUsersModal from '$lib/components/internal/users/BulkUploadUsersModal.svelte';
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
		status?: string;
		user_type?: string;
		microsoft_tenant_id?: string | null;
		client_id: string | null;
		client?: { id?: string; name?: string; code?: string } | null;
		assigned_projects?: ProjectItem[];
		created_at: string;
	}

	interface InvitationItem {
		id: string;
		email: string;
		full_name: string;
		role: string;
		user_type: string;
		client_id: string | null;
		status: string;
		created_at: string;
		clients?: { id?: string; name?: string; code?: string } | null;
	}

	let { data } = $props();

	let activeTab = $state<'internal' | 'client' | 'invitations'>('internal');
	let searchQuery = $state('');
	let selectedRoleFilter = $state('all');
	let selectedClientFilter = $state('all');
	let currentPage = $state(1);
	const pageSize = 10;
	let isCreateModalOpen = $state(false);
	let isBulkModalOpen = $state(false);
	let selectedUser = $state<MemberItem | null>(null);
	let deletingUser = $state<MemberItem | null>(null);
	let isDetailModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isSubmittingDelete = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	const members = $derived<MemberItem[]>(data.members || []);
	const invitations = $derived<InvitationItem[]>(data.invitations || []);
	const clients = $derived(data.clients || []);
	const projects = $derived(data.projects || []);

	const ROLE_OPTIONS: Record<'internal' | 'client', { value: string; label: string }[]> = {
		internal: [
			{ value: 'super_admin', label: 'Super Admins' },
			{ value: 'poc', label: 'Points of Contact' },
			{ value: 'specialist', label: 'Tech Specialists' },
			{ value: 'delivery_lead', label: 'Delivery Leads' }
		],
		client: [
			{ value: 'client_admin', label: 'Client Admins' },
			{ value: 'project_admin', label: 'Project Admins' },
			{ value: 'client_raiser', label: 'Client Raisers' },
			{ value: 'client_viewer', label: 'Client Viewers' }
		]
	};
	const roleOptions = $derived(activeTab === 'invitations' ? [] : ROLE_OPTIONS[activeTab]);

	const tabMembers = $derived(
		activeTab === 'invitations'
			? []
			: members.filter((m) => (activeTab === 'internal' ? !m.client_id : !!m.client_id))
	);

	const filteredInvitations = $derived(
		invitations.filter(
			(inv) =>
				(inv.full_name && inv.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
				inv.email.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	const filteredMembers = $derived(
		tabMembers.filter((m) => {
			const matchesSearch =
				(m.full_name && m.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
				m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(m.client?.name && m.client.name.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesRole = selectedRoleFilter === 'all' || m.role === selectedRoleFilter;

			const matchesClient =
				activeTab === 'internal' || selectedClientFilter === 'all' || m.client_id === selectedClientFilter;

			return matchesSearch && matchesRole && matchesClient;
		})
	);

	$effect(() => {
		activeTab;
		searchQuery;
		selectedRoleFilter;
		selectedClientFilter;
		currentPage = 1;
	});

	function selectTab(tab: 'internal' | 'client' | 'invitations') {
		activeTab = tab;
		selectedRoleFilter = 'all';
		selectedClientFilter = 'all';
	}

	const totalPages = $derived(Math.max(1, Math.ceil(filteredMembers.length / pageSize)));
	const paginatedMembers = $derived(filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize));

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
			case 'project_admin':
				return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Project Admin' };
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
	<title>Team & Access - Resolv - Ticketing & Support System</title>
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
				class="nexus-secondary-button h-10 px-4 text-label-md cursor-pointer"
				onclick={() => (isBulkModalOpen = true)}
			>
				<span class="material-symbols-outlined text-[18px]">upload_file</span>
				<span>Bulk Upload</span>
			</button>
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

	<!-- Notifications / Alerts -->
	{#if errorMessage}
		<div class="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-body-sm text-[var(--color-error)]">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-[20px]">error</span>
				<span>{errorMessage}</span>
			</div>
			<button type="button" onclick={() => (errorMessage = null)} class="text-body-sm font-semibold hover:underline cursor-pointer">Dismiss</button>
		</div>
	{/if}

	{#if successMessage}
		<div class="flex items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-body-sm text-emerald-800">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
				<span>{successMessage}</span>
			</div>
			<button type="button" onclick={() => (successMessage = null)} class="text-body-sm font-semibold hover:underline cursor-pointer">Dismiss</button>
		</div>
	{/if}

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

	<!-- Tabs -->
	<div class="flex items-center gap-1 border-b border-[var(--color-outline-variant)]/60">
		<button
			type="button"
			class="px-4 py-2.5 text-label-md font-semibold border-b-2 -mb-px transition-colors cursor-pointer {activeTab === 'internal'
				? 'border-[var(--color-primary)] text-[var(--color-primary)]'
				: 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}"
			onclick={() => selectTab('internal')}
		>
			Internal Staff ({internalStaffCount})
		</button>
		<button
			type="button"
			class="px-4 py-2.5 text-label-md font-semibold border-b-2 -mb-px transition-colors cursor-pointer {activeTab === 'client'
				? 'border-[var(--color-primary)] text-[var(--color-primary)]'
				: 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}"
			onclick={() => selectTab('client')}
		>
			Client Staff ({clientUsersCount})
		</button>
		<button
			type="button"
			class="px-4 py-2.5 text-label-md font-semibold border-b-2 -mb-px transition-colors cursor-pointer {activeTab === 'invitations'
				? 'border-[var(--color-primary)] text-[var(--color-primary)]'
				: 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}"
			onclick={() => selectTab('invitations')}
		>
			SSO Pre-Registered Invitations ({invitations.length})
		</button>
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
				{#each roleOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>

			{#if activeTab === 'client'}
				<select
					bind:value={selectedClientFilter}
					class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
				>
					<option value="all">All Organizations</option>
					{#each clients as client}
						<option value={client.id}>{client.name} ({client.code})</option>
					{/each}
				</select>
			{/if}
		</div>
	</div>

	{#if activeTab === 'invitations'}
		<!-- SSO Invitations Table -->
		<div class="overflow-x-auto rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] shadow-xs">
			<table class="w-full text-left text-body-sm">
				<thead class="border-b border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					<tr>
						<th class="px-5 py-3.5">Invited User</th>
						<th class="px-5 py-3.5">Target Role</th>
						<th class="px-5 py-3.5">Organization</th>
						<th class="px-5 py-3.5">Status</th>
						<th class="px-5 py-3.5 whitespace-nowrap">Invited Date</th>
						<th class="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-outline-variant)]/30">
					{#if filteredInvitations.length === 0}
						<tr>
							<td colspan="6" class="px-5 py-8 text-center text-body-sm text-[var(--color-on-surface-variant)]">
								No pending invitations found. Use the "Add User Account" button to invite users for Microsoft SSO.
							</td>
						</tr>
					{:else}
						{#each filteredInvitations as inv}
							{@const roleBadge = getRoleBadge(inv.role)}
							<tr class="hover:bg-[var(--color-surface-container-low)]/60 transition-colors">
								<td class="px-5 py-4">
									<div>
										<p class="font-semibold text-[var(--color-on-surface)]">{inv.full_name}</p>
										<p class="text-body-xs text-[var(--color-on-surface-variant)]">{inv.email}</p>
									</div>
								</td>
								<td class="px-5 py-4">
									<span class="inline-flex rounded-md border px-2.5 py-1 text-label-xs font-medium {roleBadge.bg}">
										{roleBadge.label}
									</span>
								</td>
								<td class="px-5 py-4">
									{#if inv.clients}
										<span class="inline-flex items-center gap-1.5 font-medium text-[var(--color-on-surface)]">
											<span class="material-symbols-outlined text-[16px] text-[var(--color-outline)]">apartment</span>
											<span>{inv.clients.name}</span>
											<span class="font-mono text-label-xs text-[var(--color-on-surface-variant)]">({inv.clients.code})</span>
										</span>
									{:else}
										<span class="text-[var(--color-primary)] font-semibold">Resolv Internal</span>
									{/if}
								</td>
								<td class="px-5 py-4">
									<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
										<span class="material-symbols-outlined text-[14px]">hourglass_top</span>
										<span>Pending SSO Login</span>
									</span>
								</td>
								<td class="px-5 py-4 text-[12px] text-[var(--color-on-surface-variant)]">
									{new Date(inv.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
								</td>
								<td class="px-5 py-4 text-right">
									<form method="POST" action="?/cancelInvitation" use:enhance class="inline">
										<input type="hidden" name="invitation_id" value={inv.id} />
										<button
											type="submit"
											class="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
										>
											Revoke
										</button>
									</form>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	{:else}
	<!-- Team Members Table -->
	<div class="overflow-x-auto rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] shadow-xs">
		<table class="w-full text-left text-body-sm">
			<thead class="border-b border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
				<tr>
					<th class="px-5 py-3.5">User</th>
					<th class="px-5 py-3.5">Role</th>
					<th class="px-5 py-3.5">Status</th>
					<th class="px-5 py-3.5">Organization</th>
					<th class="px-5 py-3.5">Assigned Projects</th>
					<th class="px-5 py-3.5 whitespace-nowrap">Added Date</th>
					<th class="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[var(--color-outline-variant)]/30">
				{#each paginatedMembers as member}
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

						<!-- Status Badge -->
						<td class="px-5 py-4">
							<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold {member.status === 'SUSPENDED' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}">
								<span class="h-1.5 w-1.5 rounded-full {member.status === 'SUSPENDED' ? 'bg-red-500' : 'bg-emerald-500'}"></span>
								{member.status || 'ACTIVE'}
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
						<td class="px-5 py-4 text-right whitespace-nowrap">
							<div class="inline-flex items-center justify-end gap-1.5">
								<button
									type="button"
									class="nexus-secondary-button h-8 px-3 text-label-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer hover:border-[var(--color-primary)]"
									onclick={() => {
										selectedUser = member;
										isDetailModalOpen = true;
									}}
								>
									View Details
								</button>
								<button
									type="button"
									class="flex h-8 w-8 items-center justify-center shrink-0 rounded-lg border border-[var(--color-outline-variant)]/60 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
									title="Edit User"
									onclick={() => {
										selectedUser = member;
										isEditModalOpen = true;
									}}
								>
									<span class="material-symbols-outlined text-[16px]">edit</span>
								</button>

								{#if member.id !== data.currentUserId}
									<!-- Quick Suspend / Reactivate User -->
									<form method="POST" action="?/toggleUserStatus" use:enhance class="inline">
										<input type="hidden" name="user_id" value={member.id} />
										<input type="hidden" name="status" value={member.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'} />
										<button
											type="submit"
											class="flex h-8 w-8 items-center justify-center shrink-0 rounded-lg border border-[var(--color-outline-variant)]/60 text-[var(--color-on-surface-variant)] hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors cursor-pointer"
											title={member.status === 'SUSPENDED' ? 'Reactivate User Account' : 'Suspend User Account'}
										>
											<span class="material-symbols-outlined text-[16px]">{member.status === 'SUSPENDED' ? 'lock_open' : 'block'}</span>
										</button>
									</form>

									<button
										type="button"
										class="flex h-8 w-8 items-center justify-center shrink-0 rounded-lg border border-[var(--color-outline-variant)]/60 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 transition-colors cursor-pointer"
										title="Delete User"
										onclick={() => {
											deletingUser = member;
										}}
									>
										<span class="material-symbols-outlined text-[16px]">delete</span>
									</button>
								{:else}
									<span class="p-1 px-2 text-label-xs font-semibold whitespace-nowrap text-purple-700 bg-purple-50 rounded-md border border-purple-200">You</span>
								{/if}
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

	{#if filteredMembers.length > 0}
		<div class="flex items-center justify-between border-t border-[var(--color-outline-variant)]/40 px-5 py-3 text-body-xs text-[var(--color-on-surface-variant)]">
			<span>
				Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredMembers.length)} of {filteredMembers.length}
			</span>
			<div class="flex items-center gap-1.5">
				<button
					type="button"
					class="nexus-secondary-button h-8 px-3 text-label-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
					disabled={currentPage === 1}
					onclick={() => (currentPage = currentPage - 1)}
				>
					Previous
				</button>
				<span class="px-2">Page {currentPage} of {totalPages}</span>
				<button
					type="button"
					class="nexus-secondary-button h-8 px-3 text-label-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
					disabled={currentPage === totalPages}
					onclick={() => (currentPage = currentPage + 1)}
				>
					Next
				</button>
			</div>
		</div>
	{/if}
	{/if}

	<!-- Create User Modal -->
	<CreateUserModal
		bind:open={isCreateModalOpen}
		{clients}
		{projects}
		allowedRoleScope="all"
	/>

	<!-- Bulk Upload Modal -->
	<BulkUploadUsersModal
		bind:open={isBulkModalOpen}
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

	<!-- Delete User Confirmation Modal -->
	{#if deletingUser}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
			<div class="w-full max-w-md rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)]">
						<span class="material-symbols-outlined text-[24px]">warning</span>
					</div>
					<div>
						<h2 class="text-title-md font-bold text-[var(--color-on-surface)]">Delete User Account</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">Permanent deletion from system</p>
					</div>
				</div>

				<p class="text-body-sm text-[var(--color-on-surface-variant)]">
					Are you sure you want to permanently delete <strong class="text-[var(--color-on-surface)]">{deletingUser.full_name || deletingUser.email}</strong> (<span class="font-mono text-xs">{deletingUser.email}</span>)? Their profile, project memberships, and authentication credentials will be removed.
				</p>

				<form
					method="POST"
					action="?/deleteUser"
					use:enhance={() => {
						isSubmittingDelete = true;
						errorMessage = null;
						return async ({ result, update }) => {
							isSubmittingDelete = false;
							if (result.type === 'failure') {
								errorMessage = (result.data as { error?: string })?.error ?? 'Failed to delete user account.';
							} else if (result.type === 'success') {
								deletingUser = null;
								successMessage = 'User account deleted successfully.';
							}
							await update();
						};
					}}
					class="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--color-outline-variant)]/40"
				>
					<input type="hidden" name="user_id" value={deletingUser.id} />
					<button
						type="button"
						onclick={() => (deletingUser = null)}
						class="nexus-secondary-button h-9 px-4 text-label-md cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmittingDelete}
						class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-error)] px-5 py-2 text-label-md font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
					>
						<span class="material-symbols-outlined text-[18px]">delete</span>
						<span>{isSubmittingDelete ? 'Deleting...' : 'Delete User'}</span>
					</button>
				</form>
			</div>
		</div>
	{/if}
</div>
