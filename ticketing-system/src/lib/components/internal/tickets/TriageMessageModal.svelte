<script lang="ts">
	import { enhance } from '$app/forms';

	interface TriageTicket {
		id: string;
		token: string;
		title: string;
	}

	let {
		open = $bindable(false),
		ticket,
		onTriaged
	}: {
		open: boolean;
		ticket: TriageTicket | null;
		onTriaged?: () => void;
	} = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let message = $state('');

	function handleClose() {
		if (isSubmitting) return;
		open = false;
		errorMessage = null;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) handleClose();
	}}
/>

{#if open && ticket}
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
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--color-primary)]">
						<span class="material-symbols-outlined text-[22px]">forward_to_inbox</span>
					</div>
					<div>
						<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">
							Message Client Before Triage
						</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							{ticket.token} &middot; {ticket.title}
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
				action="?/updateStatus"
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'failure') {
							errorMessage = (result.data as { error?: string })?.error ?? 'Failed to send message.';
						} else if (result.type === 'success') {
							message = '';
							open = false;
							onTriaged?.();
							await update();
						}
					};
				}}
				class="mt-4 space-y-4"
			>
				<input type="hidden" name="ticket_id" value={ticket.id} />
				<input type="hidden" name="target_status" value="poc_triage" />

				<p class="text-body-sm text-[var(--color-on-surface-variant)]">
					This message is emailed to the client and added to the ticket conversation before it moves to PoC Triage.
				</p>

				<div class="space-y-1.5">
					<label for="triage-message" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Message to Client <span class="text-[var(--color-error)]">*</span>
					</label>
					<textarea
						id="triage-message"
						name="message"
						rows="4"
						required
						placeholder="Let the client know their ticket is being triaged..."
						bind:value={message}
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-3 text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
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
						disabled={isSubmitting || !message.trim()}
						class="nexus-primary-button h-10 px-5 text-label-md shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
					>
						{#if isSubmitting}
							<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
							<span>Sending...</span>
						{:else}
							<span class="material-symbols-outlined text-[18px]">send</span>
							<span>Send & Triage</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
