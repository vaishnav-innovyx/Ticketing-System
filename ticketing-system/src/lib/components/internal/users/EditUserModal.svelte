<script lang="ts">
	import { enhance } from '$app/forms';

	interface ClientItem {
		id: string;
		name: string;
		code: string;
		projects?: { id: string; name: string; code: string }[];
	}

	interface ProjectItem {
		id: string;
		name: string;
		code: string;
		client_id?: string;
	}

	interface UserData {
		id: string;
		email: string;
		full_name: string | null;
		role: string;
		client_id: string | null;
		client?: { id?: string; name?: string; code?: string } | null;
		assigned_projects?: ProjectItem[];
	}

	let {
		open = $bindable(false),
		user = null,
		clients = [],
		projects = [],
		allowedRoleScope = 'all', // 'all' | 'client_only' | 'internal_only'
		onUserUpdated
	}: {
		open: boolean;
		user: UserData | null;
		clients?: ClientItem[];
		projects?: ProjectItem[];
		allowedRoleScope?: 'all' | 'client_only' | 'internal_only';
		onUserUpdated?: (userId: string) => void;
	} = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	let fullName = $state('');
	let email = $state('');
	let role = $state<string>('client_raiser');
	let clientId = $state<string>('');
	let selectedProjectIds = $state<string[]>([]);
	let isClientUser = $state(false);

	$effect(() => {
		if (user && open) {
			fullName = user.full_name || '';
			email = user.email || '';
			role = user.role || 'client_raiser';
			clientId = user.client_id || (clients[0]?.id ?? '');
			isClientUser = !!user.client_id || user.role.startsWith('client_') || user.role === 'project_admin';
			selectedProjectIds = user.assigned_projects?.map((p) => p.id) || [];
			errorMessage = null;
		}
	});

	const activeClient = $derived(clients.find((c) => c.id === clientId) || null);
	const availableProjects = $derived(
		isClientUser && clientId
			? projects.filter((p) => p.client_id === clientId || activeClient?.projects?.some((cp) => cp.id === p.id))
			: projects
	);

	function toggleProject(projectId: string) {
		if (selectedProjectIds.includes(projectId)) {
			selectedProjectIds = selectedProjectIds.filter((id) => id !== projectId);
		} else {
			selectedProjectIds = [...selectedProjectIds, projectId];
		}
	}

	function handleClose() {
		open = false;
		errorMessage = null;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) handleClose();
	}}
/>

{#if open && user}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
		<!-- Backdrop -->
		<button
			type="button"
			class="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
			onclick={handleClose}
			aria-label="Close modal overlay"
		></button>

		<!-- Modal Dialog -->
		<div
			class="relative w-full max-w-lg rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-[var(--color-outline-variant)]/40 pb-4">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
						<span class="material-symbols-outlined text-[22px]">edit_note</span>
					</div>
					<div>
						<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							Edit User Account
						</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							Update profile name, role permissions, and project assignments.
						</p>
					</div>
				</div>

				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] cursor-pointer"
					onclick={handleClose}
					aria-label="Close modal"
				>
					<span class="material-symbols-outlined text-[20px]">close</span>
				</button>
			</div>

			<!-- Error Alert -->
			{#if errorMessage}
				<div class="mt-4 flex items-center gap-2 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-body-sm text-[var(--color-error)]">
					<span class="material-symbols-outlined shrink-0 text-[18px]">error</span>
					<span>{errorMessage}</span>
				</div>
			{/if}

			<!-- Form -->
			<form
				method="POST"
				action="?/updateUser"
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'failure') {
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to update user account.';
						} else if (result.type === 'success') {
							const updatedId = (result.data as { updatedUserId?: string })?.updatedUserId;
							open = false;
							if (updatedId && onUserUpdated) {
								onUserUpdated(updatedId);
							}
							await update();
						}
					};
				}}
				class="mt-5 space-y-4"
			>
				<input type="hidden" name="user_id" value={user.id} />

				<!-- Email Address -->
				<div class="space-y-1.5">
					<label for="edit-user-email" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Email Address <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="edit-user-email"
						name="email"
						type="email"
						required
						bind:value={email}
						placeholder="alex@company.com"
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					/>
				</div>

				<!-- Full Name -->
				<div class="space-y-1.5">
					<label for="edit-user-name" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Full Name <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="edit-user-name"
						name="full_name"
						type="text"
						required
						placeholder="e.g. Alex Morgan"
						bind:value={fullName}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					/>
				</div>

				<!-- Target Client (if client role) -->
				{#if isClientUser}
					<div class="space-y-1.5">
						<label for="edit-user-client-select" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Client Organization <span class="text-[var(--color-error)]">*</span>
						</label>
						{#if allowedRoleScope === 'client_only' || clients.length <= 1}
							<input type="hidden" name="client_id" value={clientId} />
							<div class="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3.5 py-2 text-body-sm font-medium text-[var(--color-on-surface)]">
								{activeClient?.name ?? user.client?.name ?? 'Assigned Client'}
							</div>
						{:else}
							<select
								id="edit-user-client-select"
								name="client_id"
								required
								bind:value={clientId}
								class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
							>
								{#each clients as client}
									<option value={client.id}>{client.name} ({client.code})</option>
								{/each}
							</select>
						{/if}
					</div>
				{:else}
					<input type="hidden" name="client_id" value="" />
				{/if}

				<!-- Role Selector -->
				<div class="space-y-1.5">
					<label for="edit-user-role-select" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Role & Permissions <span class="text-[var(--color-error)]">*</span>
					</label>
					<select
						id="edit-user-role-select"
						name="role"
						required
						bind:value={role}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					>
						{#if isClientUser}
							<option value="client_raiser">Client Raiser (Raise, approve estimates, verify & close tickets)</option>
							<option value="project_admin">Project Admin (Approve raised tickets & manage assigned projects)</option>
							<option value="client_admin">Client Admin (Manage team, assign projects, review metrics)</option>
							<option value="client_viewer">Client Viewer (Read-only status overview & ticket tracking)</option>
						{:else}
							<option value="specialist">Tech Specialist (Estimate effort, develop code, log hours)</option>
							<option value="poc">Point of Contact / PoC (Triage tickets, manage SLA, assign staff)</option>
							<option value="delivery_lead">Delivery Lead (QA review, deploy releases, client handover)</option>
							<option value="super_admin">Super Admin (Global enterprise governance & configuration)</option>
						{/if}
					</select>
				</div>

				<!-- Project Assignment Checkboxes -->
				{#if availableProjects.length > 0}
					<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] p-3.5 space-y-2.5">
						<div class="flex items-center justify-between">
							<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								Assigned Project Workspaces ({selectedProjectIds.length})
							</span>
							<span class="text-[11px] text-[var(--color-outline)]">Grants workspace access</span>
						</div>

						<div class="max-h-36 overflow-y-auto space-y-1.5 pr-1">
							{#each availableProjects as project}
								{@const isChecked = selectedProjectIds.includes(project.id)}
								<label
									class="flex items-center justify-between rounded-lg p-2 transition-colors cursor-pointer {isChecked ? 'bg-white border border-indigo-200 shadow-2xs' : 'hover:bg-white/60'}"
								>
									<div class="flex items-center gap-2.5">
										<input
											type="checkbox"
											name="project_ids"
											value={project.id}
											checked={isChecked}
											onchange={() => toggleProject(project.id)}
											class="h-4 w-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
										/>
										<div>
											<span class="text-body-sm font-medium text-[var(--color-on-surface)]">{project.name}</span>
											<span class="ml-1 text-[11px] font-mono text-[var(--color-on-surface-variant)]">({project.code})</span>
										</div>
									</div>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-outline-variant)]/40">
					<button
						type="button"
						class="nexus-secondary-button h-10 px-4 text-label-md cursor-pointer"
						onclick={handleClose}
						disabled={isSubmitting}
					>
						Cancel
					</button>

					<button
						type="submit"
						disabled={isSubmitting || !fullName.trim() || (isClientUser && !clientId)}
						class="nexus-primary-button h-10 px-5 text-label-md shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
							<span>Saving...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">save</span>
							<span>Save Changes</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
