<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		open = $bindable(false),
		client,
		onClientUpdated
	}: {
		open: boolean;
		client: {
			id: string;
			name: string;
			seat_quota: number | null;
			microsoft_tenant_id?: string | null;
		};
		onClientUpdated?: () => void;
	} = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	let name = $state('');
	let seatQuota = $state(10);
	let isUnlimited = $state(false);
	let microsoftTenantId = $state('');

	$effect(() => {
		if (open) {
			name = client.name;
			seatQuota = client.seat_quota || 10;
			isUnlimited = client.seat_quota === null || client.seat_quota === undefined || client.seat_quota <= 0;
			microsoftTenantId = client.microsoft_tenant_id || '';
			errorMessage = null;
		}
	});

	function handleClose() {
		open = false;
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
						<span class="material-symbols-outlined text-[22px]">edit</span>
					</div>
					<div>
						<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							Edit Client Organization
						</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							Update tenant name, seat quota, and SSO tenant binding.
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
				action="?/updateClient"
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'failure') {
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to update client.';
						} else if (result.type === 'success') {
							open = false;
							if (onClientUpdated) onClientUpdated();
						}
						await update();
					};
				}}
				class="mt-5 space-y-4"
			>
				<input type="hidden" name="client_id" value={client.id} />

				<!-- Organization Name -->
				<div class="space-y-1.5">
					<label for="edit-client-name" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Organization Name <span class="text-[var(--color-error)]">*</span>
					</label>
					<input
						id="edit-client-name"
						name="name"
						type="text"
						required
						placeholder="e.g. Acme Corporation"
						bind:value={name}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					/>
				</div>

				<!-- Seat Quota -->
				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<label for="edit-client-seat-quota" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
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
									id="edit-client-seat-quota"
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

				<!-- Microsoft Entra Tenant ID (SSO) -->
				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<label for="edit-client-microsoft-tenant" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Microsoft Entra Tenant ID (Optional)
						</label>
						<span class="text-[11px] text-[var(--color-primary)] font-medium">SSO Multi-Tenant</span>
					</div>
					<input
						id="edit-client-microsoft-tenant"
						name="microsoft_tenant_id"
						type="text"
						placeholder="e.g. 72f988bf-86f1-41af-91ab-2d7cd011db47"
						bind:value={microsoftTenantId}
						class="w-full font-mono text-xs rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
					/>
					<p class="text-[11px] text-[var(--color-on-surface-variant)]">
						Links this organization to the client's Microsoft 365 Azure AD directory for automatic tenant binding.
					</p>
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
						disabled={isSubmitting || !name.trim()}
						class="nexus-primary-button h-10 px-5 text-label-md shadow-sm disabled:opacity-50 flex items-center gap-2"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
							<span>Saving...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">check</span>
							<span>Save Changes</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
