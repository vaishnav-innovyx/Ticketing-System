<script lang="ts">
	import { enhance } from '$app/forms';

	interface ProjectData {
		id: string;
		name: string;
		code: string;
		client?: { name?: string; code?: string } | null;
		default_poc_id?: string | null;
		team?: { id: string }[];
	}

	let {
		open = $bindable(false),
		project = null,
		internalStaff = [],
		onProjectUpdated
	}: {
		open: boolean;
		project: ProjectData | null;
		internalStaff?: { id: string; full_name: string | null; email: string; role: string }[];
		onProjectUpdated?: (projectId: string) => void;
	} = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let name = $state('');
	let defaultPocId = $state('');
	let selectedTeamMemberIds = $state<string[]>([]);

	$effect(() => {
		if (project && open) {
			name = project.name;
			defaultPocId = project.default_poc_id || '';
			selectedTeamMemberIds = project.team?.map((t) => t.id) || [];
			errorMessage = null;
		}
	});

	// All super admins and POC-role staff are eligible as Default POC
	const pocCandidates = $derived(
		internalStaff.filter((s) => s.role === 'super_admin' || s.role === 'poc')
	);
	const teamCandidates = $derived(internalStaff.filter((s) => s.role !== 'super_admin'));

	$effect(() => {
		if (defaultPocId && !pocCandidates.some((s) => s.id === defaultPocId)) {
			defaultPocId = '';
		}
	});

	// When Default POC is selected, automatically include them in the Project Team if applicable
	$effect(() => {
		if (defaultPocId) {
			const isTeamCandidate = teamCandidates.some((t) => t.id === defaultPocId);
			if (isTeamCandidate && !selectedTeamMemberIds.includes(defaultPocId)) {
				selectedTeamMemberIds = [...selectedTeamMemberIds, defaultPocId];
			}
		}
	});

	function toggleTeamMember(id: string) {
		if (id === defaultPocId) {
			defaultPocId = '';
		}
		selectedTeamMemberIds = selectedTeamMemberIds.includes(id)
			? selectedTeamMemberIds.filter((x) => x !== id)
			: [...selectedTeamMemberIds, id];
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

{#if open && project}
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
			class="relative w-full max-w-lg rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col my-auto overflow-hidden"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-[var(--color-outline-variant)]/40 px-6 py-4.5 shrink-0">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
						<span class="material-symbols-outlined text-[22px]">edit_note</span>
					</div>
					<div>
						<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							Edit Project
						</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							{project.client?.name ?? 'Client'} &bull; {project.client?.code ?? ''}-{project.code}
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

			<!-- Form -->
			<form
				method="POST"
				action="?/updateProject"
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'failure') {
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to update project.';
						} else if (result.type === 'success') {
							const updatedId = (result.data as { updatedProjectId?: string })?.updatedProjectId;
							open = false;
							if (updatedId && onProjectUpdated) onProjectUpdated(updatedId);
							await update();
						}
					};
				}}
				class="flex flex-col flex-1 min-h-0"
			>
				<!-- Scrollable Form Body -->
				<div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
					<!-- Error Alert -->
					{#if errorMessage}
						<div class="flex items-center gap-2 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-body-sm text-[var(--color-error)]">
							<span class="material-symbols-outlined shrink-0 text-[18px]">error</span>
							<span>{errorMessage}</span>
						</div>
					{/if}
				<input type="hidden" name="project_id" value={project.id} />

				<!-- Project Code (read-only, baked into ticket tokens) -->
				<div class="space-y-1.5">
					<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Project Code
					</span>
					<div class="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3.5 py-2.5 text-body-md font-mono font-bold text-[var(--color-on-surface-variant)]">
						{project.code}
					</div>
				</div>

				<!-- Project Name -->
				<div class="space-y-1.5">
					<label for="edit-project-name" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Project Name <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="edit-project-name"
						name="name"
						type="text"
						required
						bind:value={name}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					/>
				</div>

				<!-- Default POC -->
				{#if pocCandidates.length > 0}
					<div class="space-y-1.5">
						<label for="edit-project-default-poc" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Default POC
						</label>
						<select
							id="edit-project-default-poc"
							name="default_poc_id"
							bind:value={defaultPocId}
							class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
						>
							<option value="">Unassigned — triage manually</option>
							{#each pocCandidates as staff}
								<option value={staff.id}>{staff.full_name || staff.email}</option>
							{/each}
						</select>
						<p class="text-[11px] text-[var(--color-on-surface-variant)]">
							Auto-assigned as PoC on new tickets and automatically included in the project team.
						</p>
					</div>
				{/if}

				<!-- Project Team -->
				{#if teamCandidates.length > 0}
					<div class="space-y-1.5">
						<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Project Team ({selectedTeamMemberIds.length})
						</span>
						<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] p-3 max-h-40 overflow-y-auto space-y-1.5">
							{#each teamCandidates as staff}
								{@const isChecked = selectedTeamMemberIds.includes(staff.id)}
								{@const isDefaultPoc = staff.id === defaultPocId}
								<label
									class="flex items-center gap-2.5 rounded-lg p-2 transition-colors cursor-pointer {isChecked ? 'bg-white border border-indigo-200 shadow-2xs' : 'hover:bg-white/60'}"
								>
									<input
										type="checkbox"
										name="team_member_ids"
										value={staff.id}
										checked={isChecked}
										onchange={() => toggleTeamMember(staff.id)}
										class="h-4 w-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
									/>
									<div class="flex items-center justify-between flex-1 min-w-0">
										<div class="truncate">
											<span class="text-body-sm font-medium text-[var(--color-on-surface)]">{staff.full_name || staff.email}</span>
											<span class="ml-1 text-[11px] uppercase tracking-wide text-[var(--color-on-surface-variant)]">{staff.role.replace('_', ' ')}</span>
										</div>
										{#if isDefaultPoc}
											<span class="ml-2 shrink-0 rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
												Default POC
											</span>
										{/if}
									</div>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				</div>

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-outline-variant)]/40 shrink-0 bg-[var(--color-surface-container-lowest)]">
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
						disabled={isSubmitting || !name.trim()}
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
