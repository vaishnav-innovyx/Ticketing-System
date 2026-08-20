<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Sign In - Nexus</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
	<div class="w-full max-w-sm rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-8 shadow-sm space-y-6">
		<div class="space-y-1 text-center">
			<h1 class="text-2xl font-bold text-[var(--color-on-surface)]">Sign in</h1>
			<p class="text-body-sm text-[var(--color-on-surface-variant)]">Nexus Ticketing System</p>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					isSubmitting = false;
					await update();
				};
			}}
			class="space-y-4"
		>
			{#if form?.error}
				<div class="rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-2.5 text-body-sm text-[var(--color-error)]">
					{form.error}
				</div>
			{/if}

			<div class="space-y-1.5">
				<label for="email" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Email
				</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					value={form?.email ?? ''}
					class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
				/>
			</div>

			<div class="space-y-1.5">
				<label for="password" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
					Password
				</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
				/>
			</div>

			<button
				type="submit"
				disabled={isSubmitting}
				class="w-full rounded-lg bg-[var(--color-primary-container)] px-4 py-2.5 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors disabled:opacity-50"
			>
				{isSubmitting ? 'Signing in...' : 'Sign in'}
			</button>
		</form>
	</div>
</div>
