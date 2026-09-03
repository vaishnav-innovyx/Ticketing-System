<script lang="ts">
	import { enhance } from '$app/forms';
	import BulkUploadUsersModal from '$lib/components/internal/users/BulkUploadUsersModal.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
		assigned_projects?: ProjectItem[];
		created_at: string;
	}

	const ROLE_DETAILS: Record<string, { label: string; badge: string; desc: string }> = {
		client_admin: {
			label: 'Client Admin',
			badge: 'bg-purple-100 text-purple-800 border-purple-200',
			desc: 'Manages team members, project assignments, and company-wide settings.'
		},
		project_admin: {
			label: 'Project Admin',
			badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
			desc: 'Approves tickets raised by team members and oversees assigned project delivery.'
		},
		client_raiser: {
			label: 'Client Raiser',
			badge: 'bg-blue-100 text-blue-800 border-blue-200',
			desc: 'Raises tickets, approves effort estimates, tests fixes, and closes resolved tickets.'
		},
		client_viewer: {
			label: 'Client Viewer',
			badge: 'bg-gray-100 text-gray-800 border-gray-200',
			desc: 'Read-only access to monitor tickets, timelines, and project progress.'
		}
	};

	let searchQuery = $state('');
	let selectedRoleFilter = $state('all');

	let isAdding = $state(false);
	let isSubmittingAdd = $state(false);
	let isBulkModalOpen = $state(false);

	let viewingUser = $state<MemberItem | null>(null);
	let editingUser = $state<MemberItem | null>(null);
	let deletingUser = $state<MemberItem | null>(null);

	let editFullName = $state('');
	let editEmail = $state('');
	let editRole = $state('client_raiser');
	let editProjectIds = $state<string[]>([]);
	let isSubmittingEdit = $state(false);
	let isSubmittingDelete = $state(false);

	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	const members = $derived<MemberItem[]>(data.members || []);
	const projects = $derived<ProjectItem[]>(data.projects || []);

	const filteredMembers = $derived(
		members.filter((m) => {
			const query = searchQuery.toLowerCase().trim();
			const matchesSearch =
				!query ||
				(m.full_name && m.full_name.toLowerCase().includes(query)) ||
				m.email.toLowerCase().includes(query);

			const matchesRole = selectedRoleFilter === 'all' || m.role === selectedRoleFilter;

			return matchesSearch && matchesRole;
		})
	);

	const totalCount = $derived(members.length);
	const projectAdminCount = $derived(members.filter((m) => m.role === 'project_admin').length);
	const raiserCount = $derived(members.filter((m) => m.role === 'client_raiser').length);
	const viewerCount = $derived(members.filter((m) => m.role === 'client_viewer').length);

	function openEdit(member: MemberItem) {
		editingUser = member;
		editFullName = member.full_name || '';
		editEmail = member.email || '';
		editRole = member.role || 'client_raiser';
		editProjectIds = (member.assigned_projects || []).map((p) => p.id);
		errorMessage = null;
	}

	function toggleEditProject(projectId: string) {
		if (editProjectIds.includes(projectId)) {
			editProjectIds = editProjectIds.filter((id) => id !== projectId);
		} else {
			editProjectIds = [...editProjectIds, projectId];
		}
	}

	function formatDate(iso: string) {
		try {
			return new Date(iso).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return iso;
		}
	}

	function getInitials(name: string | null, email: string) {
		const str = (name || email || 'U').trim();
		return str
			.split(' ')
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}
</script>

<svelte:head>
	<title>Team & Access - Nexus Client Portal</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10 space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<span class="rounded-md bg-purple-100 px-2 py-0.5 text-label-xs font-bold text-purple-800 uppercase tracking-wide">
					Organization Governance
				</span>
			</div>
			<h1 class="text-3xl font-bold tracking-tight text-[var(--color-on-surface)] mt-1">Team & Access</h1>
			<p class="text-body-sm text-[var(--color-on-surface-variant)] mt-1">
				Manage who at your company can raise tickets, review and approve estimates, and oversee project workflows.
			</p>
		</div>
		<div class="flex items-center gap-3 self-start sm:self-auto">
			<button
				type="button"
				onclick={() => (isBulkModalOpen = true)}
				class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-label-md font-semibold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-[18px]">upload_file</span>
				<span>Bulk Upload</span>
			</button>
			<button
				type="button"
				onclick={() => {
					isAdding = true;
					errorMessage = null;
				}}
				class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-4 py-2.5 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors shadow-2xs cursor-pointer"
			>
				<span class="material-symbols-outlined text-[18px]">person_add</span>
				<span>Add Teammate</span>
			</button>
		</div>
	</div>

	<!-- Metric Cards -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
		<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-4 shadow-xs">
			<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-outline)]">Total Members</span>
			<p class="text-2xl font-bold text-[var(--color-on-surface)] mt-1">{totalCount}</p>
		</div>
		<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-4 shadow-xs">
			<span class="text-label-xs font-semibold uppercase tracking-wider text-indigo-600">Project Admins</span>
			<p class="text-2xl font-bold text-[var(--color-on-surface)] mt-1">{projectAdminCount}</p>
		</div>
		<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-4 shadow-xs">
			<span class="text-label-xs font-semibold uppercase tracking-wider text-blue-600">Ticket Raisers</span>
			<p class="text-2xl font-bold text-[var(--color-on-surface)] mt-1">{raiserCount}</p>
		</div>
		<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-4 shadow-xs">
			<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-outline)]">Viewers</span>
			<p class="text-2xl font-bold text-[var(--color-on-surface)] mt-1">{viewerCount}</p>
		</div>
	</div>

	<!-- Notifications / Alerts -->
	{#if errorMessage}
		<div class="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-body-sm text-[var(--color-error)]">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-[20px]">error</span>
				<span>{errorMessage}</span>
			</div>
			<button type="button" onclick={() => (errorMessage = null)} class="text-body-sm font-semibold hover:underline">Dismiss</button>
		</div>
	{/if}

	{#if successMessage}
		<div class="flex items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-body-sm text-emerald-800">
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
				<span>{successMessage}</span>
			</div>
			<button type="button" onclick={() => (successMessage = null)} class="text-body-sm font-semibold hover:underline">Dismiss</button>
		</div>
	{/if}

	<!-- Search and Filter Bar -->
	<div class="flex flex-col sm:flex-row items-center gap-3">
		<div class="relative w-full sm:flex-1">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-[var(--color-outline)]">search</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search teammates by name or email..."
				class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] pl-9 pr-4 py-2 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			/>
		</div>
		<select
			bind:value={selectedRoleFilter}
			class="w-full sm:w-56 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
		>
			<option value="all">All Roles</option>
			<option value="client_admin">Client Admins</option>
			<option value="project_admin">Project Admins</option>
			<option value="client_raiser">Client Raisers</option>
			<option value="client_viewer">Client Viewers</option>
		</select>
	</div>

	<!-- Members Table -->
	<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] shadow-xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-body-sm text-left">
				<thead class="bg-[var(--color-surface-container-low)] text-label-sm uppercase tracking-wider text-[var(--color-on-surface-variant)] border-b border-[var(--color-border-subtle)]">
					<tr>
						<th class="px-5 py-3">Teammate</th>
						<th class="px-5 py-3">Role</th>
						<th class="px-5 py-3">Assigned Projects</th>
						<th class="px-5 py-3">Joined Date</th>
						<th class="px-5 py-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-border-subtle)]">
					{#if filteredMembers.length === 0}
						<tr>
							<td colspan="5" class="px-5 py-8 text-center text-[var(--color-on-surface-variant)]">
								No teammates found matching your criteria.
							</td>
						</tr>
					{:else}
						{#each filteredMembers as m}
							{@const roleInfo = ROLE_DETAILS[m.role] ?? { label: m.role, badge: 'bg-gray-100 text-gray-800 border-gray-200', desc: '' }}
							{@const initials = getInitials(m.full_name, m.email)}
							<tr class="hover:bg-[var(--color-surface-container-lowest)]/80 transition-colors">
								<td class="px-5 py-3.5">
									<div class="flex items-center gap-3">
										<div class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-container)]/15 text-label-sm font-bold text-[var(--color-primary)]">
											{initials}
										</div>
										<div class="min-w-0">
											<div class="font-semibold text-[var(--color-on-surface)] truncate">{m.full_name || '—'}</div>
											<div class="text-body-xs text-[var(--color-on-surface-variant)] truncate">{m.email}</div>
										</div>
									</div>
								</td>
								<td class="px-5 py-3.5 whitespace-nowrap">
									<span class="inline-flex rounded-md border px-2.5 py-1 text-label-xs font-semibold {roleInfo.badge}">
										{roleInfo.label}
									</span>
								</td>
								<td class="px-5 py-3.5">
									{#if m.assigned_projects && m.assigned_projects.length > 0}
										<div class="flex flex-wrap gap-1.5 max-w-xs">
											{#each m.assigned_projects as p}
												<span class="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-label-xs font-medium text-slate-700">
													{p.code}
												</span>
											{/each}
										</div>
									{:else}
										<span class="text-body-xs text-[var(--color-outline)] italic">All company projects</span>
									{/if}
								</td>
								<td class="px-5 py-3.5 whitespace-nowrap text-body-xs text-[var(--color-on-surface-variant)]">
									{formatDate(m.created_at)}
								</td>
								<td class="px-5 py-3.5 whitespace-nowrap text-right">
									<div class="inline-flex items-center gap-1">
										<!-- View Button -->
										<button
											type="button"
											title="View Details"
											onclick={() => (viewingUser = m)}
											class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
										>
											<span class="material-symbols-outlined text-[18px]">visibility</span>
										</button>
										<!-- Edit Button -->
										<button
											type="button"
											title="Edit Teammate"
											onclick={() => openEdit(m)}
											class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
										>
											<span class="material-symbols-outlined text-[18px]">edit</span>
										</button>
										<!-- Delete Button -->
										{#if m.id !== data.currentUserId}
											<button
												type="button"
												title="Delete Teammate"
												onclick={() => (deletingUser = m)}
												class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors cursor-pointer"
											>
												<span class="material-symbols-outlined text-[18px]">delete</span>
											</button>
										{:else}
											<span class="p-1.5 text-label-xs font-semibold text-purple-700 bg-purple-50 rounded-md border border-purple-200">You</span>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- ========================= MODALS ========================= -->

<!-- BULK UPLOAD TEAMMATES MODAL -->
<BulkUploadUsersModal
	bind:open={isBulkModalOpen}
	{projects}
	fixedClient={data.client}
	allowedRoleScope="client_only"
	action="?/bulkCreateUsers"
/>

<!-- 1. ADD TEAMMATE MODAL -->
{#if isAdding}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
		<div class="w-full max-w-lg rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
			<div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
				<div class="flex items-center gap-2.5">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-container)] text-white shadow-2xs">
						<span class="material-symbols-outlined text-[22px]">person_add</span>
					</div>
					<div>
						<h2 class="text-lg font-bold text-[var(--color-on-surface)]">Add New Teammate</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">Provision a new account for your organization</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (isAdding = false)}
					class="rounded-lg p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/createUser"
				use:enhance={() => {
					isSubmittingAdd = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmittingAdd = false;
						if (result.type === 'failure') {
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to add teammate.';
						} else if (result.type === 'success') {
							isAdding = false;
							successMessage = 'Teammate added successfully!';
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				<div class="space-y-1.5">
					<label for="create-full-name" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Full Name <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="create-full-name"
						name="full_name"
						type="text"
						required
						placeholder="e.g. John Doe"
						class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="create-email" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Email Address <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="create-email"
						name="email"
						type="email"
						required
						placeholder="teammate@company.com"
						class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="create-role" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Role & Permissions <span class="text-[var(--color-error)]">*</span>
						</label>
						<select
							id="create-role"
							name="role"
							class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-3 py-2.5 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
						>
							<option value="client_raiser">Client Raiser (Raise & verify tickets)</option>
							<option value="project_admin">Project Admin (Approve raised tickets)</option>
							<option value="client_admin">Client Admin (Manage team & all tickets)</option>
							<option value="client_viewer">Client Viewer (Read-only overview)</option>
						</select>
					</div>
					<div class="space-y-1.5">
						<label for="create-password" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Temporary Password
						</label>
						<input
							id="create-password"
							name="password"
							type="text"
							placeholder="ChangeMe123!"
							class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
						/>
					</div>
				</div>

				{#if projects.length > 0}
					<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] p-3.5 space-y-2">
						<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Assign Project Workspaces
						</span>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
							{#each projects as project}
								<label class="inline-flex items-center gap-2 text-body-xs text-[var(--color-on-surface)] p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer">
									<input type="checkbox" name="project_ids" value={project.id} class="rounded text-[var(--color-primary-container)]" />
									<span>{project.name} <span class="font-mono text-[var(--color-outline)]">({project.code})</span></span>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border-subtle)]">
					<button
						type="button"
						onclick={() => (isAdding = false)}
						class="rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-label-md font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)] transition-colors cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmittingAdd}
						class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-5 py-2 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors disabled:opacity-50 cursor-pointer"
					>
						{isSubmittingAdd ? 'Adding...' : 'Add Teammate'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 2. VIEW USER DETAILS MODAL -->
{#if viewingUser}
	{@const roleInfo = ROLE_DETAILS[viewingUser.role] ?? { label: viewingUser.role, badge: 'bg-gray-100 text-gray-800 border-gray-200', desc: 'Standard account.' }}
	{@const initials = getInitials(viewingUser.full_name, viewingUser.email)}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
		<div class="w-full max-w-md rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
			<div class="flex items-start justify-between">
				<div class="flex items-center gap-3.5">
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-label-lg font-bold text-white shadow-xs">
						{initials}
					</div>
					<div>
						<h2 class="text-lg font-bold text-[var(--color-on-surface)]">{viewingUser.full_name || '—'}</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">{viewingUser.email}</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (viewingUser = null)}
					class="rounded-lg p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>

			<div class="space-y-4 text-body-sm">
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] p-4 space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-outline)]">Role</span>
						<span class="inline-flex rounded-md border px-2.5 py-0.5 text-label-xs font-semibold {roleInfo.badge}">
							{roleInfo.label}
						</span>
					</div>
					<p class="text-body-xs text-[var(--color-on-surface-variant)]">{roleInfo.desc}</p>
				</div>

				<div class="space-y-2">
					<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-outline)]">
						Assigned Projects ({viewingUser.assigned_projects?.length ?? 0})
					</span>
					{#if viewingUser.assigned_projects && viewingUser.assigned_projects.length > 0}
						<div class="space-y-1.5 max-h-40 overflow-y-auto">
							{#each viewingUser.assigned_projects as p}
								<div class="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-body-xs">
									<span class="font-medium text-[var(--color-on-surface)]">{p.name}</span>
									<span class="font-mono text-slate-500 font-semibold">{p.code}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-body-xs text-[var(--color-on-surface-variant)] italic">No specific project assignments (has broad company access).</p>
					{/if}
				</div>

				<div class="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3 text-body-xs text-[var(--color-on-surface-variant)]">
					<span>Account created</span>
					<span class="font-medium text-[var(--color-on-surface)]">{formatDate(viewingUser.created_at)}</span>
				</div>
			</div>

			<div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
				<button
					type="button"
					onclick={() => {
						const u = viewingUser;
						viewingUser = null;
						if (u) openEdit(u);
					}}
					class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-container)] px-4 py-2 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">edit</span>
					<span>Edit Teammate</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- 3. EDIT TEAMMATE MODAL -->
{#if editingUser}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
		<div class="w-full max-w-lg rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
			<div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
				<div class="flex items-center gap-2.5">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
						<span class="material-symbols-outlined text-[22px]">edit</span>
					</div>
					<div>
						<h2 class="text-lg font-bold text-[var(--color-on-surface)]">Edit Teammate</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">{editingUser.email}</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (editingUser = null)}
					class="rounded-lg p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
				>
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>

			<form
				method="POST"
				action="?/updateUser"
				use:enhance={() => {
					isSubmittingEdit = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmittingEdit = false;
						if (result.type === 'failure') {
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to update teammate.';
						} else if (result.type === 'success') {
							editingUser = null;
							successMessage = 'Teammate updated successfully!';
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="user_id" value={editingUser.id} />

				<div class="space-y-1.5">
					<label for="edit-full-name" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Full Name <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="edit-full-name"
						name="full_name"
						type="text"
						required
						bind:value={editFullName}
						class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="edit-email" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Email Address <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="edit-email"
						name="email"
						type="email"
						required
						bind:value={editEmail}
						class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="edit-role-select" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Role & Permissions <span class="text-[var(--color-error)]">*</span>
					</label>
					<select
						id="edit-role-select"
						name="role"
						bind:value={editRole}
						class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-3 py-2.5 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
					>
						<option value="client_raiser">Client Raiser (Raise, approve estimates, verify & close tickets)</option>
						<option value="project_admin">Project Admin (Approve raised tickets & manage assigned projects)</option>
						<option value="client_admin">Client Admin (Manage team, assign projects, company settings)</option>
						<option value="client_viewer">Client Viewer (Read-only overview & tracking)</option>
					</select>
				</div>

				{#if projects.length > 0}
					<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] p-3.5 space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								Assigned Project Workspaces ({editProjectIds.length})
							</span>
							<span class="text-[11px] text-[var(--color-outline)]">Check to grant access</span>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto">
							{#each projects as project}
								{@const checked = editProjectIds.includes(project.id)}
								<label class="inline-flex items-center gap-2 text-body-xs text-[var(--color-on-surface)] p-2 rounded-lg border transition-colors cursor-pointer {checked ? 'bg-white border-indigo-300 font-medium' : 'bg-transparent border-transparent hover:bg-white'}">
									<input
										type="checkbox"
										name="project_ids"
										value={project.id}
										{checked}
										onchange={() => toggleEditProject(project.id)}
										class="rounded text-[var(--color-primary-container)]"
									/>
									<span>{project.name} <span class="font-mono text-[var(--color-outline)]">({project.code})</span></span>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border-subtle)]">
					<button
						type="button"
						onclick={() => (editingUser = null)}
						class="rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-label-md font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)] transition-colors cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmittingEdit}
						class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-label-md font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
					>
						{isSubmittingEdit ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 4. DELETE TEAMMATE CONFIRMATION MODAL -->
{#if deletingUser}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
		<div class="w-full max-w-md rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)]">
					<span class="material-symbols-outlined text-[24px]">warning</span>
				</div>
				<div>
					<h2 class="text-lg font-bold text-[var(--color-on-surface)]">Remove Teammate</h2>
					<p class="text-body-xs text-[var(--color-on-surface-variant)]">This action cannot be undone</p>
				</div>
			</div>

			<p class="text-body-sm text-[var(--color-on-surface-variant)]">
				Are you sure you want to remove <strong class="text-[var(--color-on-surface)]">{deletingUser.full_name || deletingUser.email}</strong> (<span class="font-mono text-xs">{deletingUser.email}</span>) from your organization? They will immediately lose access to the portal.
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
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to delete teammate.';
						} else if (result.type === 'success') {
							deletingUser = null;
							successMessage = 'Teammate removed successfully.';
						}
						await update();
					};
				}}
				class="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--color-border-subtle)]"
			>
				<input type="hidden" name="user_id" value={deletingUser.id} />
				<button
					type="button"
					onclick={() => (deletingUser = null)}
					class="rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-label-md font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)] transition-colors cursor-pointer"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isSubmittingDelete}
					class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-error)] px-5 py-2 text-label-md font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
				>
					<span class="material-symbols-outlined text-[18px]">delete</span>
					<span>{isSubmittingDelete ? 'Removing...' : 'Remove Teammate'}</span>
				</button>
			</form>
		</div>
	</div>
{/if}

