<script lang="ts">
	import { enhance } from '$app/forms';

	interface ClientItem {
		id: string;
		name: string;
		code: string;
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
		onTicketCreated
	}: {
		open: boolean;
		clients?: ClientItem[];
		projects?: ProjectItem[];
		onTicketCreated?: (ticketId: string) => void;
	} = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	let clientId = $state('');
	let projectId = $state('');
	let title = $state('');
	let description = $state('');
	let category = $state<'bug' | 'enhancement' | 'kt' | 'training'>('bug');
	let priority = $state<'low' | 'medium' | 'high' | 'critical'>('medium');
	let targetDate = $state('');

	$effect(() => {
		if (clients.length > 0 && !clientId) {
			clientId = clients[0].id;
		}
	});

	const availableProjects = $derived(
		clientId ? projects.filter((p) => p.client_id === clientId) : projects
	);

	$effect(() => {
		if (availableProjects.length > 0) {
			if (!availableProjects.some((p) => p.id === projectId)) {
				projectId = availableProjects[0].id;
			}
		} else {
			projectId = '';
		}
	});

	function handleClose() {
		open = false;
		errorMessage = null;
	}

	function resetForm() {
		title = '';
		description = '';
		category = 'bug';
		priority = 'medium';
		targetDate = '';
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
			class="relative w-full max-w-2xl rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-[var(--color-outline-variant)]/40 pb-4">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-primary)]">
						<span class="material-symbols-outlined text-[22px]">confirmation_number</span>
					</div>
					<div>
						<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							Create Support Ticket
						</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							Submit a bug report, feature enhancement, KT request, or training task.
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
				action="?/createTicket"
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'failure') {
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to create ticket.';
						} else if (result.type === 'success') {
							const createdId = (result.data as { createdTicketId?: string })?.createdTicketId;
							resetForm();
							open = false;
							if (createdId && onTicketCreated) {
								onTicketCreated(createdId);
							}
							await update();
						}
					};
				}}
				class="mt-5 space-y-4"
			>
				<!-- Organization & Project Selectors -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="ticket-client" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Client Organization <span class="text-[var(--color-error)]">*</span>
						</label>
						<select
							id="ticket-client"
							name="client_id"
							required
							bind:value={clientId}
							class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
						>
							{#each clients as client}
								<option value={client.id}>{client.name} ({client.code})</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="ticket-project" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Project Workspace <span class="text-[var(--color-error)]">*</span>
						</label>
						<select
							id="ticket-project"
							name="project_id"
							required
							bind:value={projectId}
							disabled={availableProjects.length === 0}
							class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20 disabled:opacity-50"
						>
							{#if availableProjects.length === 0}
								<option value="">No projects available for this client</option>
							{:else}
								{#each availableProjects as project}
									<option value={project.id}>{project.name} ({project.code})</option>
								{/each}
							{/if}
						</select>
					</div>
				</div>

				<!-- Ticket Title -->
				<div class="space-y-1.5">
					<label for="ticket-title" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Ticket Title <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="ticket-title"
						name="title"
						type="text"
						required
						placeholder="e.g. Gateway timeout on transaction verification"
						bind:value={title}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					/>
				</div>

				<!-- Category & Priority -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="ticket-category" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Category <span class="text-[var(--color-error)]">*</span>
						</label>
						<select
							id="ticket-category"
							name="category"
							required
							bind:value={category}
							class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
						>
							<option value="bug">Bug (Defect fix / incident)</option>
							<option value="enhancement">Enhancement (New feature / scope change)</option>
							<option value="kt">Knowledge Transfer (KT session)</option>
							<option value="training">Training (Staff workshop)</option>
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="ticket-priority" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Priority Level <span class="text-[var(--color-error)]">*</span>
						</label>
						<select
							id="ticket-priority"
							name="priority"
							required
							bind:value={priority}
							class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
						>
							<option value="low">P3 – Low (Standard backlog)</option>
							<option value="medium">P2 – Medium (Regular sprint cycle)</option>
							<option value="high">P1 – High (Accelerated attention)</option>
							<option value="critical">P0 – Critical (Immediate SLA block)</option>
						</select>
					</div>
				</div>

				<!-- Target Date -->
				<div class="space-y-1.5">
					<label for="ticket-target-date" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Target Completion Date
					</label>
					<input
						id="ticket-target-date"
						name="target_date"
						type="date"
						bind:value={targetDate}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
					/>
				</div>

				<!-- Description -->
				<div class="space-y-1.5">
					<label for="ticket-desc" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Description & Steps to Reproduce
					</label>
					<textarea
						id="ticket-desc"
						name="description"
						rows="4"
						placeholder="Detailed description of the issue, acceptance criteria, or request context..."
						bind:value={description}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-3 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)]"
					></textarea>
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
						disabled={isSubmitting || !title.trim() || !clientId || !projectId}
						class="nexus-primary-button h-10 px-5 text-label-md shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
							<span>Creating...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">add_task</span>
							<span>Raise Ticket</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
