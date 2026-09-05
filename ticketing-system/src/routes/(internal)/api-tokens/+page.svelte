<script lang="ts">
	import { enhance } from '$app/forms';

	interface TokenRow {
		id: string;
		name: string;
		token_prefix: string;
		client_id: string;
		project_id: string;
		is_active: boolean;
		last_used_at: string | null;
		created_at: string;
		revoked_at: string | null;
		clients?: { name?: string; code?: string } | { name?: string; code?: string }[] | null;
		projects?: { name?: string; code?: string } | { name?: string; code?: string }[] | null;
	}

	let { data, form } = $props();

	const tokens = $derived<TokenRow[]>(data.tokens || []);
	const clients = $derived(data.clients || []);
	const projects = $derived(data.projects || []);

	let isCreateOpen = $state(false);
	let selectedClientId = $state('');
	let revealedToken = $state<string | null>(null);

	const projectsForSelectedClient = $derived(
		selectedClientId ? projects.filter((p: { client_id: string }) => p.client_id === selectedClientId) : []
	);

	function oneRelation<T>(rel: T | T[] | null | undefined): T | null {
		if (!rel) return null;
		return Array.isArray(rel) ? (rel[0] ?? null) : rel;
	}

	$effect(() => {
		if (form && 'rawToken' in form && form.rawToken) {
			revealedToken = form.rawToken as string;
			isCreateOpen = false;
		}
	});
</script>

<svelte:head>
	<title>API Tokens - Nexus Service Desk</title>
</svelte:head>

<div class="space-y-6 md:space-y-8">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<span class="rounded-md bg-indigo-100 px-2 py-0.5 text-label-xs font-bold text-indigo-800 uppercase tracking-wide">
				Integrations
			</span>
			<h1 class="text-headline-md font-bold text-[var(--color-on-surface)] mt-1">API Tokens</h1>
			<p class="text-body-md mt-1 text-[var(--color-on-surface-variant)]">
				Machine credentials that let external client apps create tickets via <code>POST /api/v1/tickets</code>.
				Each token is scoped to exactly one client project.
			</p>
		</div>
		<button type="button" class="nexus-primary-button h-10 px-4 shadow-sm cursor-pointer" onclick={() => (isCreateOpen = true)}>
			<span class="material-symbols-outlined text-[18px]">add</span>
			<span>New Token</span>
		</button>
	</div>

	{#if revealedToken}
		<div class="nexus-card border border-amber-300 bg-amber-50 p-5">
			<p class="text-label-md font-bold text-amber-900">Copy this token now -- it will not be shown again.</p>
			<code class="mt-2 block break-all rounded-md bg-white px-3 py-2 text-body-sm font-mono text-amber-900 border border-amber-200">
				{revealedToken}
			</code>
			<button type="button" class="mt-3 text-label-sm font-medium text-amber-800 underline" onclick={() => (revealedToken = null)}>
				Dismiss
			</button>
		</div>
	{/if}

	{#if form?.error}
		<div class="nexus-card border border-red-300 bg-red-50 p-4 text-body-sm text-red-800">{form.error}</div>
	{/if}

	{#if isCreateOpen}
		<div class="nexus-card p-5">
			<h2 class="text-label-lg font-bold text-[var(--color-on-surface)]">Issue a new token</h2>
			<form
				method="POST"
				action="?/create"
				class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
				use:enhance
			>
				<label class="flex flex-col gap-1">
					<span class="text-label-sm font-medium text-[var(--color-on-surface-variant)]">Token name</span>
					<input
						name="name"
						type="text"
						placeholder="e.g. FPI Task Mgmt Dashboard"
						class="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20"
						required
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-label-sm font-medium text-[var(--color-on-surface-variant)]">Client</span>
					<select name="client_id" class="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20" bind:value={selectedClientId} required>
						<option value="" disabled selected>Select a client</option>
						{#each clients as client (client.id)}
							<option value={client.id}>{client.name} ({client.code})</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1 sm:col-span-2">
					<span class="text-label-sm font-medium text-[var(--color-on-surface-variant)]">Project</span>
					<select name="project_id" class="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)] focus:ring-2 focus:ring-[var(--color-primary-container)]/20" required disabled={!selectedClientId}>
						<option value="" disabled selected>Select a project</option>
						{#each projectsForSelectedClient as project (project.id)}
							<option value={project.id}>{project.name} ({project.code})</option>
						{/each}
					</select>
				</label>
				<div class="flex items-center gap-3 sm:col-span-2">
					<button type="submit" class="nexus-primary-button h-10 px-4 cursor-pointer">Create token</button>
					<button type="button" class="text-label-sm text-[var(--color-on-surface-variant)]" onclick={() => (isCreateOpen = false)}>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="nexus-card overflow-x-auto">
		<table class="w-full text-left text-body-sm">
			<thead class="border-b border-[var(--color-outline-variant)]/40 text-label-xs uppercase text-[var(--color-on-surface-variant)]">
				<tr>
					<th class="px-4 py-3">Name</th>
					<th class="px-4 py-3">Prefix</th>
					<th class="px-4 py-3">Client / Project</th>
					<th class="px-4 py-3">Status</th>
					<th class="px-4 py-3">Last used</th>
					<th class="px-4 py-3"></th>
				</tr>
			</thead>
			<tbody>
				{#each tokens as token (token.id)}
					{@const client = oneRelation(token.clients)}
					{@const project = oneRelation(token.projects)}
					<tr class="border-b border-[var(--color-outline-variant)]/20">
						<td class="px-4 py-3 font-medium text-[var(--color-on-surface)]">{token.name}</td>
						<td class="px-4 py-3 font-mono text-[var(--color-on-surface-variant)]">{token.token_prefix}…</td>
						<td class="px-4 py-3 text-[var(--color-on-surface-variant)]">{client?.name ?? '—'} / {project?.name ?? '—'}</td>
						<td class="px-4 py-3">
							{#if token.is_active}
								<span class="rounded-full bg-green-100 px-2 py-0.5 text-label-xs font-bold text-green-800">Active</span>
							{:else}
								<span class="rounded-full bg-gray-100 px-2 py-0.5 text-label-xs font-bold text-gray-600">Revoked</span>
							{/if}
						</td>
						<td class="px-4 py-3 text-[var(--color-on-surface-variant)]">
							{token.last_used_at ? new Date(token.last_used_at).toLocaleString() : 'Never'}
						</td>
						<td class="px-4 py-3 text-right">
							{#if token.is_active}
								<form method="POST" action="?/revoke" use:enhance>
									<input type="hidden" name="token_id" value={token.id} />
									<button type="submit" class="text-label-sm font-medium text-red-600 hover:underline cursor-pointer">
										Revoke
									</button>
								</form>
							{/if}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-4 py-8 text-center text-[var(--color-on-surface-variant)]">
							No API tokens yet. Issue one to let a client app create tickets.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
