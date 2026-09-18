<script lang="ts">
	import ChangePasswordForm from '$lib/components/account/ChangePasswordForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:px-10 md:py-10 space-y-8">
	<div>
		<h1 class="text-headline-md font-bold text-[var(--color-on-surface)]">Account Settings</h1>
		<p class="text-body-md mt-1 text-[var(--color-on-surface-variant)]">
			Manage your account security.
		</p>
	</div>

	<div class="rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-6">
		<h2 class="text-title-lg font-bold text-[var(--color-on-surface)] mb-4">Change Password</h2>
		<ChangePasswordForm {form} />
	</div>
</div>
