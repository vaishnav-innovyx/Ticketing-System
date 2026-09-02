<script lang="ts">
	import { enhance } from '$app/forms';
	import { roleLabel } from '$lib/portal/ticketDisplay';

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
		allowedRoleScope = 'all'
	}: {
		open: boolean;
		clients?: ClientItem[];
		projects?: ProjectItem[];
		allowedRoleScope?: 'all' | 'client_only' | 'internal_only';
	} = $props();

	const CLIENT_ROLES = ['client_admin', 'project_admin', 'client_raiser', 'client_viewer'];
	const INTERNAL_ROLES = ['super_admin', 'poc', 'specialist', 'delivery_lead'];
	const allowedRoles = $derived(
		allowedRoleScope === 'client_only'
			? CLIENT_ROLES
			: allowedRoleScope === 'internal_only'
				? INTERNAL_ROLES
				: [...INTERNAL_ROLES, ...CLIENT_ROLES]
	);

	const TEMPLATE_HEADERS = ['full_name', 'email', 'password', 'role', 'client_code', 'project_codes'];

	interface ParsedRow {
		full_name: string;
		email: string;
		password: string;
		role: string;
		client_code: string;
		project_codes: string;
		valid: boolean;
		errors: string[];
	}

	type Phase = 'idle' | 'parsed' | 'report';
	let phase = $state<Phase>('idle');
	let submitting = $state(false);
	let parseError = $state<string | null>(null);
	let fileName = $state('');
	let parsedRows = $state<ParsedRow[]>([]);
	let report = $state<{ row: number; email: string; status: string; error?: string }[]>([]);
	let serverError = $state<string | null>(null);

	const clientByCode = $derived(new Map(clients.map((c) => [c.code.toUpperCase(), c])));
	const projectCodeSet = $derived(new Set(projects.map((p) => p.code.toUpperCase())));

	const validRows = $derived(parsedRows.filter((r) => r.valid));
	const payload = $derived(
		JSON.stringify(
			validRows.map((r) => ({
				full_name: r.full_name,
				email: r.email,
				password: r.password,
				role: r.role,
				client_code: r.client_code,
				project_codes: r.project_codes
			}))
		)
	);
	const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	function normalizeKey(k: string) {
		return String(k).trim().toLowerCase().replace(/\s+/g, '_');
	}

	function validateRow(r: Omit<ParsedRow, 'valid' | 'errors'>): ParsedRow {
		const errors: string[] = [];
		if (!r.full_name.trim()) errors.push('Missing full_name');
		if (!r.email.trim()) errors.push('Missing email');
		else if (!emailRe.test(r.email.trim())) errors.push('Invalid email');

		if (!r.role.trim()) errors.push('Missing role');
		else if (!allowedRoles.includes(r.role.trim())) errors.push(`Role "${r.role}" not allowed`);

		const isClient = r.role.trim().startsWith('client_') || r.role.trim() === 'project_admin';
		const code = r.client_code.trim().toUpperCase();
		if (isClient) {
			if (!code) errors.push('client_code required for client role');
			else if (!clientByCode.has(code)) errors.push(`Unknown client_code "${r.client_code}"`);
		} else if (code) {
			errors.push('client_code must be blank for internal role');
		}

		const target = clientByCode.get(code);
		for (const pc of r.project_codes.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)) {
			const up = pc.toUpperCase();
			if (!projectCodeSet.has(up)) {
				errors.push(`Unknown project "${pc}"`);
			} else if (target) {
				const match = projects.find((p) => p.code.toUpperCase() === up);
				if (match && match.client_id && match.client_id !== target.id) {
					errors.push(`Project "${pc}" not under ${target.code}`);
				}
			}
		}

		return { ...r, valid: errors.length === 0, errors };
	}

	async function handleFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		parseError = null;
		fileName = file.name;
		try {
			const XLSX = await import('xlsx');
			const buf = await file.arrayBuffer();
			const wb = XLSX.read(buf);
			const sheet = wb.Sheets[wb.SheetNames[0]];
			const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
			if (raw.length === 0) {
				parseError = 'The sheet has no data rows.';
				return;
			}
			const seen = new Set<string>();
			parsedRows = raw.map((rowObj) => {
				const norm: Record<string, string> = {};
				for (const [k, v] of Object.entries(rowObj)) norm[normalizeKey(k)] = String(v ?? '').trim();
				const row = validateRow({
					full_name: norm.full_name || '',
					email: norm.email || '',
					password: norm.password || '',
					role: norm.role || '',
					client_code: norm.client_code || '',
					project_codes: norm.project_codes || ''
				});
				const key = row.email.toLowerCase();
				if (key && seen.has(key)) {
					row.errors.push('Duplicate email in file');
					row.valid = false;
				}
				if (key) seen.add(key);
				return row;
			});
			phase = 'parsed';
		} catch (e) {
			parseError = e instanceof Error ? e.message : 'Failed to read the file.';
		} finally {
			input.value = '';
		}
	}

	async function downloadTemplate() {
		const XLSX = await import('xlsx');
		const example = [
			TEMPLATE_HEADERS,
			['Alex Morgan', 'alex@companyx.com', 'ChangeMe123!', 'specialist', '', ''],
			['Priya Shah', 'priya@acme-client.com', 'ChangeMe123!', 'client_raiser', 'ACME', 'MBANK, POS']
		];
		const ws = XLSX.utils.aoa_to_sheet(example);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Users');
		XLSX.writeFile(wb, 'user-upload-template.xlsx');
	}

	function reset() {
		phase = 'idle';
		submitting = false;
		parsedRows = [];
		report = [];
		parseError = null;
		serverError = null;
		fileName = '';
	}

	function handleClose() {
		open = false;
		reset();
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) handleClose();
	}}
/>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
		<button
			type="button"
			class="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
			onclick={handleClose}
			aria-label="Close modal overlay"
		></button>

		<div
			class="relative w-full max-w-3xl rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-[var(--color-outline-variant)]/40 pb-4">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
						<span class="material-symbols-outlined text-[22px]">upload_file</span>
					</div>
					<div>
						<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">Bulk Upload Users</h2>
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">
							Import an Excel or CSV file to provision multiple accounts at once.
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

			{#if serverError}
				<div class="mt-4 flex items-center gap-2 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-3 text-body-sm text-[var(--color-error)]">
					<span class="material-symbols-outlined shrink-0 text-[18px]">error</span>
					<span>{serverError}</span>
				</div>
			{/if}

			<!-- IDLE: upload -->
			{#if phase === 'idle'}
				<div class="mt-5 space-y-4">
					<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] p-4 text-body-sm text-[var(--color-on-surface-variant)]">
						<p class="font-semibold text-[var(--color-on-surface)]">Expected columns</p>
						<p class="mt-1 font-mono text-[12px]">{TEMPLATE_HEADERS.join(' · ')}</p>
						<ul class="mt-2 list-disc space-y-0.5 pl-5 text-[12px]">
							<li><span class="font-mono">password</span> optional — defaults to <span class="font-mono">ChangeMe123!</span></li>
							<li><span class="font-mono">client_code</span> required for <span class="font-mono">client_*</span> roles, blank for internal</li>
							<li><span class="font-mono">project_codes</span> optional, separate multiple with <span class="font-mono">, ; |</span></li>
						</ul>
					</div>

					<div class="flex flex-wrap items-center gap-3">
						<label class="nexus-primary-button h-10 px-4 shadow-sm cursor-pointer inline-flex items-center gap-2">
							<span class="material-symbols-outlined text-[18px]">attach_file</span>
							<span>Choose File</span>
							<input type="file" accept=".xlsx,.xls,.csv" class="hidden" onchange={handleFile} />
						</label>
						<button
							type="button"
							class="nexus-secondary-button h-10 px-4 text-label-md cursor-pointer inline-flex items-center gap-2"
							onclick={downloadTemplate}
						>
							<span class="material-symbols-outlined text-[18px]">download</span>
							<span>Download Template</span>
						</button>
					</div>

					{#if parseError}
						<p class="text-body-sm text-[var(--color-error)]">{parseError}</p>
					{/if}
				</div>
			{/if}

			<!-- PARSED: preview -->
			{#if phase === 'parsed'}
				<form
					method="POST"
					action="?/bulkCreateUsers"
					use:enhance={() => {
						submitting = true;
						serverError = null;
						return async ({ result, update }) => {
							submitting = false;
							if (result.type === 'failure') {
								serverError = (result.data as { error?: string })?.error ?? 'Bulk import failed.';
							} else if (result.type === 'success') {
								report = (result.data as { results?: typeof report })?.results ?? [];
								phase = 'report';
								await update({ reset: false });
							}
						};
					}}
					class="mt-5 space-y-4"
				>
					<input type="hidden" name="rows" value={payload} />

					<div class="flex items-center justify-between text-body-sm">
						<span class="text-[var(--color-on-surface-variant)]">
							<span class="font-mono">{fileName}</span> — {validRows.length} ready ·
							<span class={parsedRows.length - validRows.length > 0 ? 'text-[var(--color-error)]' : ''}>
								{parsedRows.length - validRows.length} with errors
							</span>
						</span>
						<button type="button" class="text-[12px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer" onclick={reset}>
							Choose a different file
						</button>
					</div>

					<div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]/50 max-h-[46vh] overflow-y-auto">
						<table class="w-full text-left text-body-xs">
							<thead class="sticky top-0 bg-[var(--color-surface-container-low)] text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								<tr>
									<th class="px-3 py-2">#</th>
									<th class="px-3 py-2">Name</th>
									<th class="px-3 py-2">Email</th>
									<th class="px-3 py-2">Role</th>
									<th class="px-3 py-2">Client</th>
									<th class="px-3 py-2">Projects</th>
									<th class="px-3 py-2">Status</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-[var(--color-outline-variant)]/30">
								{#each parsedRows as row, i}
									<tr class={row.valid ? '' : 'bg-[var(--color-error)]/5'}>
										<td class="px-3 py-2 text-[var(--color-on-surface-variant)]">{i + 2}</td>
										<td class="px-3 py-2">{row.full_name}</td>
										<td class="px-3 py-2 font-mono">{row.email}</td>
										<td class="px-3 py-2">{row.role ? roleLabel(row.role) : '—'}</td>
										<td class="px-3 py-2">{row.client_code || '—'}</td>
										<td class="px-3 py-2">{row.project_codes || '—'}</td>
										<td class="px-3 py-2">
											{#if row.valid}
												<span class="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
													<span class="material-symbols-outlined text-[13px]">check</span> Ready
												</span>
											{:else}
												<span class="text-[var(--color-error)]">{row.errors.join('; ')}</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-outline-variant)]/40">
						<button type="button" class="nexus-secondary-button h-10 px-4 text-label-md cursor-pointer" onclick={handleClose} disabled={submitting}>
							Cancel
						</button>
						<button
							type="submit"
							disabled={validRows.length === 0 || submitting}
							class="nexus-primary-button h-10 px-5 text-label-md shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
						>
							{#if submitting}
								<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
								<span>Provisioning {validRows.length} accounts…</span>
							{:else}
								<span class="material-symbols-outlined text-[18px]">group_add</span>
								<span>Create {validRows.length} User{validRows.length === 1 ? '' : 's'}</span>
							{/if}
						</button>
					</div>
				</form>
			{/if}

			<!-- REPORT -->
			{#if phase === 'report'}
				{@const createdCount = report.filter((r) => r.status === 'created').length}
				<div class="mt-5 space-y-4">
					<div class="flex items-center gap-3 rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] p-4">
						<span class="material-symbols-outlined text-[24px] text-emerald-600">task_alt</span>
						<p class="text-body-sm text-[var(--color-on-surface)]">
							<span class="font-bold">{createdCount}</span> created ·
							<span class="font-bold">{report.length - createdCount}</span> failed
						</p>
					</div>

					<div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]/50 max-h-[46vh] overflow-y-auto">
						<table class="w-full text-left text-body-xs">
							<thead class="sticky top-0 bg-[var(--color-surface-container-low)] text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								<tr>
									<th class="px-3 py-2">Row</th>
									<th class="px-3 py-2">Email</th>
									<th class="px-3 py-2">Result</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-[var(--color-outline-variant)]/30">
								{#each report as r}
									<tr class={r.status === 'created' ? '' : 'bg-[var(--color-error)]/5'}>
										<td class="px-3 py-2 text-[var(--color-on-surface-variant)]">{r.row}</td>
										<td class="px-3 py-2 font-mono">{r.email}</td>
										<td class="px-3 py-2">
											{#if r.status === 'created'}
												<span class="font-semibold text-emerald-700">Created</span>
											{:else}
												<span class="text-[var(--color-error)]">Failed — {r.error}</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-outline-variant)]/40">
						<button type="button" class="nexus-secondary-button h-10 px-4 text-label-md cursor-pointer" onclick={reset}>
							Upload Another
						</button>
						<button type="button" class="nexus-primary-button h-10 px-5 text-label-md shadow-sm cursor-pointer" onclick={handleClose}>
							Done
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
