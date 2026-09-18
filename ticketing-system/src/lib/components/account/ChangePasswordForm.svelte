<script lang="ts">
	import { enhance } from '$app/forms';

	let { form }: { form?: { error?: string; success?: boolean } | null } = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);
</script>

<form
	method="POST"
	action="?/changePassword"
	use:enhance={() => {
		isSubmitting = true;
		errorMessage = null;
		successMessage = null;
		return async ({ result }) => {
			isSubmitting = false;
			if (result.type === 'failure') {
				errorMessage = (result.data as { error?: string })?.error ?? 'Failed to update password.';
			} else if (result.type === 'success') {
				successMessage = 'Password updated successfully.';
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
			}
		};
	}}
	class="space-y-4 max-w-md"
>
	{#if errorMessage}
		<div class="flex items-center gap-2 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-body-sm text-[var(--color-error)]">
			<span class="material-symbols-outlined shrink-0 text-[18px]">error</span>
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if successMessage}
		<div class="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-body-sm text-emerald-700">
			<span class="material-symbols-outlined shrink-0 text-[18px]">check_circle</span>
			<span>{successMessage}</span>
		</div>
	{/if}

	<div class="space-y-1.5">
		<label for="current-password" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
			Current Password <span class="text-[var(--color-error)]">*</span>
		</label>
		<div class="relative">
			<input
				id="current-password"
				name="currentPassword"
				type={showCurrentPassword ? 'text' : 'password'}
				required
				autocomplete="current-password"
				bind:value={currentPassword}
				class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 pr-10 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
			/>
			<button
				type="button"
				onclick={() => (showCurrentPassword = !showCurrentPassword)}
				class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
				aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
				tabindex="-1"
			>
				<span class="material-symbols-outlined text-[18px]">{showCurrentPassword ? 'visibility_off' : 'visibility'}</span>
			</button>
		</div>
	</div>

	<div class="space-y-1.5">
		<label for="new-password" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
			New Password <span class="text-[var(--color-error)]">*</span>
		</label>
		<div class="relative">
			<input
				id="new-password"
				name="newPassword"
				type={showNewPassword ? 'text' : 'password'}
				required
				autocomplete="new-password"
				bind:value={newPassword}
				class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 pr-10 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
			/>
			<button
				type="button"
				onclick={() => (showNewPassword = !showNewPassword)}
				class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
				aria-label={showNewPassword ? 'Hide password' : 'Show password'}
				tabindex="-1"
			>
				<span class="material-symbols-outlined text-[18px]">{showNewPassword ? 'visibility_off' : 'visibility'}</span>
			</button>
		</div>
	</div>

	<div class="space-y-1.5">
		<label for="confirm-password" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
			Confirm New Password <span class="text-[var(--color-error)]">*</span>
		</label>
		<div class="relative">
			<input
				id="confirm-password"
				name="confirmPassword"
				type={showConfirmPassword ? 'text' : 'password'}
				required
				autocomplete="new-password"
				bind:value={confirmPassword}
				class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3.5 py-2.5 pr-10 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
			/>
			<button
				type="button"
				onclick={() => (showConfirmPassword = !showConfirmPassword)}
				class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
				aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
				tabindex="-1"
			>
				<span class="material-symbols-outlined text-[18px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
			</button>
		</div>
	</div>

	<button
		type="submit"
		disabled={isSubmitting}
		class="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-label-md font-semibold text-[var(--color-on-primary)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
	>
		{#if isSubmitting}
			<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
		{/if}
		<span>Update Password</span>
	</button>
</form>
