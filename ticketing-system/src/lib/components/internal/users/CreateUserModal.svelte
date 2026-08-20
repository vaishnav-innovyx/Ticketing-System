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

	let {
		open = $bindable(false),
		clients = [],
		projects = [],
		selectedClientId = null,
		allowedRoleScope = 'all', // 'all' | 'client_only' | 'internal_only'
		onUserCreated
	}: {
		open: boolean;
		clients?: ClientItem[];
		projects?: ProjectItem[];
		selectedClientId?: string | null;
		allowedRoleScope?: 'all' | 'client_only' | 'internal_only';
		onUserCreated?: (userId: string) => void;
	} = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	let fullName = $state('');
	let email = $state('');
	let password = $state('ChangeMe123!');
	let showCustomPassword = $state(false);
	let roleCategory = $state<'client' | 'internal'>('client');
	let role = $state<string>('client_raiser');
	let clientId = $state('');
	let selectedProjectIds = $state<string[]>([]);

	$effect(() => {
		if (selectedClientId) {
			clientId = selectedClientId;
			roleCategory = 'client';
		} else if (!clientId && clients.length > 0) {
			clientId = clients[0].id;
		}

		if (allowedRoleScope === 'client_only') {
			roleCategory = 'client';
		} else if (allowedRoleScope === 'internal_only') {
			roleCategory = 'internal';
		}
	});

	$effect(() => {
		if (roleCategory === 'client') {
			if (!['client_admin', 'client_raiser', 'client_viewer'].includes(role)) {
				role = 'client_raiser';
			}
		} else {
			if (!['poc', 'specialist', 'delivery_lead', 'super_admin'].includes(role)) {
				role = 'specialist';
			}
		}
	});

	const activeClient = $derived(clients.find((c) => c.id === clientId) || null);
	const availableProjects = $derived(
		roleCategory === 'client' && clientId
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

	function resetForm() {
		fullName = '';
		email = '';
		password = 'ChangeMe123!';
		showCustomPassword = false;
		role = roleCategory === 'client' ? 'client_raiser' : 'specialist';
		selectedProjectIds = [];
		errorMessage = null;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) handleClose();
	}}
/>

{#if open}
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
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
						<span class="material-symbols-outlined text-[22px]">person_add</span>
					</div>
					<div>
						<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							Add User Account
						</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							Create login credentials, assign system role and project memberships.
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
				action="?/createUser"
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'failure') {
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to create user account.';
						} else if (result.type === 'success') {
							const createdId = (result.data as { createdUserId?: string })?.createdUserId;
							resetForm();
							open = false;
							if (createdId && onUserCreated) {
								onUserCreated(createdId);
							}
							await update();
						}
					};
				}}
				class="mt-5 space-y-4"
			>
				<!-- Role Category Segmented Control (if scope allows both) -->
				{#if allowedRoleScope === 'all' && !selectedClientId}
					<div class="space-y-1.5">
						<span class="block text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Account Type <span class="text-[var(--color-error)]">*</span>
						</span>
						<div class="grid grid-cols-2 rounded-lg border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container)] p-1 text-label-sm font-medium">
							<button
								type="button"
								class="rounded-md py-1.5 transition-colors cursor-pointer {roleCategory === 'client' ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] font-bold shadow-xs' : 'text-[var(--color-on-surface-variant)]'}"
								onclick={() => (roleCategory = 'client')}
							>
								Client Organization
							</button>
							<button
								type="button"
								class="rounded-md py-1.5 transition-colors cursor-pointer {roleCategory === 'internal' ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] font-bold shadow-xs' : 'text-[var(--color-on-surface-variant)]'}"
								onclick={() => (roleCategory = 'internal')}
							>
								Internal Staff
							</button>
						</div>
					</div>
				{/if}

				<!-- Full Name & Email -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="user-full-name" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Full Name <span class="text-[var(--color-error)]">*</span>
						</label>
						<input
							id="user-full-name"
							name="full_name"
							type="text"
							required
							placeholder="e.g. Alex Morgan"
							bind:value={fullName}
							class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="user-email" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Email Address <span class="text-[var(--color-error)]">*</span>
						</label>
						<input
							id="user-email"
							name="email"
							type="email"
							required
							placeholder="e.g. user@company.com"
							bind:value={email}
							class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
						/>
					</div>
				</div>

				<!-- Target Client (if client role) -->
				{#if roleCategory === 'client'}
					<div class="space-y-1.5">
						<label for="user-client-select" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Client Organization <span class="text-[var(--color-error)]">*</span>
						</label>
						{#if selectedClientId}
							<input type="hidden" name="client_id" value={selectedClientId} />
							<div class="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3.5 py-2 text-body-sm font-medium text-[var(--color-on-surface)]">
								{activeClient?.name ?? 'Current Client'} ({activeClient?.code ?? ''})
							</div>
						{:else if clients.length > 0}
							<select
								id="user-client-select"
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
					<label for="user-role-select" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Role & Permissions <span class="text-[var(--color-error)]">*</span>
					</label>
					<select
						id="user-role-select"
						name="role"
						required
						bind:value={role}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					>
						{#if roleCategory === 'client'}
							<option value="client_raiser">Client Raiser (Raise, approve estimates, verify & close tickets)</option>
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

				<!-- Password -->
				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<label for="user-password" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Password
						</label>
						<button
							type="button"
							class="text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
							onclick={() => (showCustomPassword = !showCustomPassword)}
						>
							{showCustomPassword ? 'Use Default Password' : 'Set Custom Password'}
						</button>
					</div>

					<input
						id="user-password"
						name="password"
						type={showCustomPassword ? 'text' : 'password'}
						required
						bind:value={password}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md font-mono text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					/>
					<p class="text-[11px] text-[var(--color-on-surface-variant)]">
						Default credentials: <span class="font-mono font-semibold text-[var(--color-primary)]">{password}</span>
					</p>
				</div>

				<!-- Project Assignment (Optional for internal/client) -->
				{#if availableProjects.length > 0}
					<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] p-3.5 space-y-2.5">
						<div class="flex items-center justify-between">
							<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								Assigned Projects ({selectedProjectIds.length})
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
						disabled={isSubmitting || !fullName.trim() || !email.trim() || (roleCategory === 'client' && !clientId)}
						class="nexus-primary-button h-10 px-5 text-label-md shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
							<span>Adding...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">check</span>
							<span>Create User</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
