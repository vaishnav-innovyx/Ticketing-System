<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		open = $bindable(false),
		onClientCreated
	}: {
		open: boolean;
		onClientCreated?: (clientId: string) => void;
	} = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	let name = $state('');
	let code = $state('');
	let codeManuallyEdited = $state(false);
	let seatQuota = $state(10);
	let isUnlimited = $state(false);
	let showProjectSection = $state(false);
	let projectName = $state('');
	let projectCode = $state('');
	let projectCodeManuallyEdited = $state(false);

	// Auto-generate code from name if user hasn't typed code manually
	$effect(() => {
		if (!codeManuallyEdited && name) {
			code = name
				.trim()
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, '')
				.slice(0, 8);
		}
	});

	// Auto-generate project code from project name if user hasn't typed it manually
	$effect(() => {
		if (!projectCodeManuallyEdited && projectName) {
			projectCode = projectName
				.trim()
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, '')
				.slice(0, 6);
		}
	});

	function handleClose() {
		open = false;
		errorMessage = null;
	}

	function resetForm() {
		name = '';
		code = '';
		codeManuallyEdited = false;
		seatQuota = 10;
		isUnlimited = false;
		showProjectSection = false;
		projectName = '';
		projectCode = '';
		projectCodeManuallyEdited = false;
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
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-fixed)] text-[var(--color-on-primary-fixed)]">
						<span class="material-symbols-outlined text-[22px]">add_business</span>
					</div>
					<div>
						<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							New Client Organization
						</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							Set up tenant workspace, seat quota, and initial project.
						</p>
					</div>
				</div>

				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
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
				action="?/createClient"
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'failure') {
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to create client.';
						} else if (result.type === 'success') {
							const createdId = (result.data as { createdClientId?: string })?.createdClientId;
							resetForm();
							open = false;
							if (createdId && onClientCreated) {
								onClientCreated(createdId);
							}
							await update();
						}
					};
				}}
				class="mt-5 space-y-4"
			>
				<!-- Organization Name -->
				<div class="space-y-1.5">
					<label for="client-name" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Organization Name <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="client-name"
						name="name"
						type="text"
						required
						placeholder="e.g. Acme Corporation"
						bind:value={name}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					/>
				</div>

				<!-- Organization Code & Seat Quota Grid -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<!-- Organization Code -->
					<div class="space-y-1.5">
						<label for="client-code" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Tenant Code <span class="text-[var(--color-error)]">*</span>
						</label>
						<input
							id="client-code"
							name="code"
							type="text"
							required
							maxlength="10"
							placeholder="e.g. ACME"
							bind:value={code}
							oninput={() => (codeManuallyEdited = true)}
							class="w-full uppercase font-mono font-bold tracking-wider rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
						/>
						<p class="text-[11px] text-[var(--color-on-surface-variant)]">
							Used in ticket tokens (e.g. {code || 'CODE'}-PROJ-TK-0001).
						</p>
					</div>

					<!-- Seat Quota -->
					<div class="space-y-1.5">
						<div class="flex items-center justify-between">
							<label for="client-seat-quota" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								Seat Quota <span class="text-[var(--color-error)]">*</span>
							</label>
							<div class="inline-flex rounded-lg border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container)] p-0.5 text-[11px] font-semibold">
								<button
									type="button"
									class="rounded-md px-2 py-0.5 transition-colors cursor-pointer {!isUnlimited ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--color-on-surface-variant)]'}"
									onclick={() => (isUnlimited = false)}
								>
									Fixed Max
								</button>
								<button
									type="button"
									class="rounded-md px-2 py-0.5 transition-colors cursor-pointer {isUnlimited ? 'bg-[var(--color-surface-container-lowest)] text-[var(--color-primary)] shadow-xs' : 'text-[var(--color-on-surface-variant)]'}"
									onclick={() => (isUnlimited = true)}
								>
									Infinite (∞)
								</button>
							</div>
						</div>

						<input type="hidden" name="is_unlimited" value={isUnlimited ? 'true' : 'false'} />

						{#if isUnlimited}
							<div class="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/70 p-3 text-emerald-900 animate-in fade-in duration-150">
								<span class="material-symbols-outlined text-[20px] text-emerald-700">all_inclusive</span>
								<div>
									<p class="text-label-sm font-bold">Unlimited User Seats</p>
									<p class="text-[11px] text-emerald-700">No member quota limits will be applied to this client.</p>
								</div>
							</div>
						{:else}
							<div class="space-y-2 animate-in fade-in duration-150">
								<div class="flex items-center gap-2">
									<input
										id="client-seat-quota"
										name="seat_quota"
										type="number"
										min="1"
										max="1000"
										required={!isUnlimited}
										bind:value={seatQuota}
										class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
									/>
								</div>
								<div class="flex flex-wrap gap-1.5">
									{#each [5, 10, 25, 50, 100] as preset}
										<button
											type="button"
											class="rounded border border-[var(--color-outline-variant)]/60 px-2 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] cursor-pointer {seatQuota === preset ? 'bg-[var(--color-primary-fixed)] font-bold text-[var(--color-on-primary-fixed)]' : ''}"
											onclick={() => (seatQuota = preset)}
										>
											{preset}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Optional Initial Project Section -->
				<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] p-3.5 space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)]">folder_special</span>
							<span class="text-label-md font-semibold text-[var(--color-on-surface)]">Initial Project</span>
						</div>
						<button
							type="button"
							class="text-label-sm font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
							onclick={() => (showProjectSection = !showProjectSection)}
						>
							{showProjectSection ? 'Remove' : '+ Add Project'}
						</button>
					</div>

					{#if showProjectSection}
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in duration-150">
							<div class="space-y-1">
								<label for="project-name" class="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
									Project Name
								</label>
								<input
									id="project-name"
									name="project_name"
									type="text"
									placeholder="e.g. Mobile Banking"
									bind:value={projectName}
									class="w-full rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]"
								/>
							</div>

							<div class="space-y-1">
								<label for="project-code" class="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
									Project Code
								</label>
								<input
									id="project-code"
									name="project_code"
									type="text"
									maxlength="8"
									placeholder="e.g. MBANK"
									bind:value={projectCode}
									oninput={() => (projectCodeManuallyEdited = true)}
									class="w-full uppercase font-mono font-bold rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]"
								/>
							</div>
						</div>
					{/if}
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-outline-variant)]/40">
					<button
						type="button"
						class="nexus-secondary-button h-10 px-4 text-label-md"
						onclick={handleClose}
						disabled={isSubmitting}
					>
						Cancel
					</button>

					<button
						type="submit"
						disabled={isSubmitting || !name.trim() || !code.trim()}
						class="nexus-primary-button h-10 px-5 text-label-md shadow-sm disabled:opacity-50 flex items-center gap-2"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
							<span>Creating...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">check</span>
							<span>Create Client</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
