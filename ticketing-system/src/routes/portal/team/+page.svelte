<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ROLE_LABEL: Record<string, string> = {
		client_admin: 'Admin',
		client_raiser: 'Raiser',
		client_viewer: 'Viewer'
	};

	let isAdding = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
</script>

<svelte:head>
	<title>Team - Nexus Client Portal</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:px-10 md:py-10 space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-[var(--color-on-surface)]">Team</h1>
			<p class="text-body-sm text-[var(--color-on-surface-variant)]">
				Manage who at your organization can raise, view, and manage tickets.
			</p>
		</div>
		<button
			type="button"
			onclick={() => (isAdding = !isAdding)}
			class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-4 py-2 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors cursor-pointer"
		>
			<span class="material-symbols-outlined text-[18px]">{isAdding ? 'close' : 'person_add'}</span>
			<span>{isAdding ? 'Cancel' : 'Add Teammate'}</span>
		</button>
	</div>

	{#if errorMessage}
		<div class="flex items-center gap-2 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-body-sm text-[var(--color-error)]">
			<span class="material-symbols-outlined text-[18px]">error</span>
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if isAdding}
		<form
			method="POST"
			action="?/createUser"
			use:enhance={() => {
				isSubmitting = true;
				errorMessage = null;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'failure') {
						errorMessage = (result.data as { error?: string })?.error ?? 'Failed to add teammate.';
					} else if (result.type === 'success') {
						isAdding = false;
					}
					await update();
				};
			}}
			class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs space-y-4"
		>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="space-y-1.5">
					<label for="team-full-name" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Full Name
					</label>
					<input
						id="team-full-name"
						name="full_name"
						type="text"
						required
						class="w-full rounded-lg border border-[var(--color-border-subtle)] px-3.5 py-2.5 text-body-md"
					/>
				</div>
				<div class="space-y-1.5">
					<label for="team-email" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Email
					</label>
					<input
						id="team-email"
						name="email"
						type="email"
						required
						class="w-full rounded-lg border border-[var(--color-border-subtle)] px-3.5 py-2.5 text-body-md"
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="space-y-1.5">
					<label for="team-role" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Role
					</label>
					<select id="team-role" name="role" class="w-full rounded-lg border border-[var(--color-border-subtle)] px-3.5 py-2.5 text-body-md">
						<option value="client_raiser">Raiser — can raise &amp; follow tickets</option>
						<option value="client_admin">Admin — manages team &amp; all tickets</option>
						<option value="client_viewer">Viewer — read-only</option>
					</select>
				</div>
				<div class="space-y-1.5">
					<label for="team-password" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						Temporary Password
					</label>
					<input
						id="team-password"
						name="password"
						type="text"
						placeholder="ChangeMe123!"
						class="w-full rounded-lg border border-[var(--color-border-subtle)] px-3.5 py-2.5 text-body-md"
					/>
				</div>
			</div>

			{#if data.projects.length > 0}
				<div class="space-y-1.5">
					<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Projects</span>
					<div class="flex flex-wrap gap-3 pt-1">
						{#each data.projects as project}
							<label class="inline-flex items-center gap-1.5 text-body-sm text-[var(--color-on-surface)]">
								<input type="checkbox" name="project_ids" value={project.id} />
								<span>{project.name} ({project.code})</span>
							</label>
						{/each}
					</div>
				</div>
			{/if}

			<button
				type="submit"
				disabled={isSubmitting}
				class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-5 py-2 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors disabled:opacity-50 cursor-pointer"
			>
				{isSubmitting ? 'Adding...' : 'Add Teammate'}
			</button>
		</form>
	{/if}

	<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] shadow-xs overflow-hidden">
		<table class="w-full text-body-sm">
			<thead class="bg-[var(--color-surface-container-low)] text-label-sm uppercase tracking-wider text-[var(--color-on-surface-variant)]">
				<tr>
					<th class="px-4 py-2.5 text-left">Name</th>
					<th class="px-4 py-2.5 text-left">Email</th>
					<th class="px-4 py-2.5 text-left">Role</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[var(--color-border-subtle)]">
				{#each data.members as m}
					<tr>
						<td class="px-4 py-2.5 font-medium text-[var(--color-on-surface)]">{m.full_name ?? '—'}</td>
						<td class="px-4 py-2.5 text-[var(--color-on-surface-variant)]">{m.email}</td>
						<td class="px-4 py-2.5">
							<span class="inline-flex rounded-md bg-[var(--color-surface-container-high)] px-2 py-0.5 text-label-xs font-semibold text-[var(--color-on-surface)]">
								{ROLE_LABEL[m.role] ?? m.role}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
