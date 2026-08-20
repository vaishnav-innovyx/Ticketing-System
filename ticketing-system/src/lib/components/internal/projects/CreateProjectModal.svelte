<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		open = $bindable(false),
		clients = [],
		selectedClientId = null,
		onProjectCreated
	}: {
		open: boolean;
		clients?: { id: string; name: string; code: string }[];
		selectedClientId?: string | null;
		onProjectCreated?: (projectId: string) => void;
	} = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	let clientId = $state('');
	let name = $state('');
	let code = $state('');
	let codeManuallyEdited = $state(false);

	$effect(() => {
		if (selectedClientId) {
			clientId = selectedClientId;
		} else if (!clientId && clients.length > 0) {
			clientId = clients[0].id;
		}
	});

	// Auto-generate project code from project name if user hasn't typed it manually
	$effect(() => {
		if (!codeManuallyEdited && name) {
			code = name
				.trim()
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, '')
				.slice(0, 8);
		}
	});

	const activeClient = $derived(clients.find((c) => c.id === clientId) || null);

	function handleClose() {
		open = false;
		errorMessage = null;
	}

	function resetForm() {
		name = '';
		code = '';
		codeManuallyEdited = false;
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
			class="relative w-full max-w-lg rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-[var(--color-outline-variant)]/40 pb-4">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
						<span class="material-symbols-outlined text-[22px]">folder_special</span>
					</div>
					<div>
						<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							New Project Workspace
						</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							Create a project workspace for ticket tracking and task scoping.
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
				action="?/createProject"
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'failure') {
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to create project.';
						} else if (result.type === 'success') {
							const createdId = (result.data as { createdProjectId?: string })?.createdProjectId;
							resetForm();
							open = false;
							if (createdId && onProjectCreated) {
								onProjectCreated(createdId);
							}
							await update();
						}
					};
				}}
				class="mt-5 space-y-4"
			>
				<!-- Target Client Selection -->
				<div class="space-y-1.5">
					<label for="project-client-select" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Client Organization <span class="text-[var(--color-error)]">*</span>
					</label>
					{#if clients.length > 0}
						<select
							id="project-client-select"
							name="client_id"
							required
							bind:value={clientId}
							class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
						>
							{#each clients as client}
								<option value={client.id}>{client.name} ({client.code})</option>
							{/each}
						</select>
					{:else}
						<input type="hidden" name="client_id" value={clientId} />
						<div class="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3.5 py-2.5 text-body-sm font-medium text-[var(--color-on-surface)]">
							{activeClient?.name ?? 'Selected Client'}
						</div>
					{/if}
				</div>

				<!-- Project Name -->
				<div class="space-y-1.5">
					<label for="project-name" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Project Name <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="project-name"
						name="name"
						type="text"
						required
						placeholder="e.g. Mobile Banking Application"
						bind:value={name}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					/>
				</div>

				<!-- Project Code -->
				<div class="space-y-1.5">
					<label for="project-code" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Project Code <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="project-code"
						name="code"
						type="text"
						required
						maxlength="8"
						placeholder="e.g. MBANK"
						bind:value={code}
						oninput={() => (codeManuallyEdited = true)}
						class="w-full uppercase font-mono font-bold tracking-wider rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					/>
					<p class="text-[11px] text-[var(--color-on-surface-variant)]">
						Generates ticket prefixes: <span class="font-mono font-bold text-[var(--color-primary)]">{activeClient?.code || 'CLIENT'}-{code || 'PROJECT'}-TK-0001</span>
					</p>
				</div>

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
						disabled={isSubmitting || !name.trim() || !code.trim() || !clientId}
						class="nexus-primary-button h-10 px-5 text-label-md shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
							<span>Creating...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">check</span>
							<span>Create Project</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
