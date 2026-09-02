<script lang="ts">
	import { roleLabel } from '$lib/portal/ticketDisplay';

	interface ProjectItem {
		id: string;
		code: string;
		name: string;
		client_id?: string;
	}

	interface UserData {
		id: string;
		email: string;
		full_name: string | null;
		role: string;
		client_id: string | null;
		client?: { id?: string; name?: string; code?: string } | null;
		assigned_projects?: ProjectItem[];
		created_at?: string;
	}

	let {
		open = $bindable(false),
		user = null,
		onEdit
	}: {
		open: boolean;
		user: UserData | null;
		onEdit?: (user: UserData) => void;
	} = $props();

	let copied = $state(false);

	function handleClose() {
		open = false;
	}

	function copyEmail() {
		if (user?.email) {
			navigator.clipboard.writeText(user.email);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		}
	}

	function getRoleDetails(role: string) {
		switch (role) {
			case 'super_admin':
				return {
					badge: 'bg-red-50 text-red-700 border-red-200',
					title: 'Super Administrator',
					desc: 'Full global read & write permissions across all clients, projects, SLA metrics, user accounts, and database configurations.'
				};
			case 'poc':
				return {
					badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
					title: 'Point of Contact (PoC)',
					desc: 'Responsible for triaging incoming tickets, initial turnaround response (TAT), client communication, and assigning technical specialists.'
				};
			case 'specialist':
				return {
					badge: 'bg-blue-50 text-blue-700 border-blue-200',
					title: 'Technical Specialist / Developer',
					desc: 'Assigned to technical implementation, scoping effort estimates, code development, and logging actual hours worked.'
				};
			case 'delivery_lead':
				return {
					badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
					title: 'Delivery Lead',
					desc: 'QA verification, release deployment, knowledge transfer (KT) sessions, and formal deliverable sign-off.'
				};
			case 'client_admin':
				return {
					badge: 'bg-purple-50 text-purple-700 border-purple-200',
					title: 'Client Administrator',
					desc: 'Manages organization staff seats, assigns project access, monitors ticket queues, and oversees organization analytics.'
				};
			case 'project_admin':
				return {
					badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
					title: 'Project Admin',
					desc: 'Approves tickets raised by client raisers, oversees assigned project tickets, and manages project lifecycle.'
				};
			case 'client_raiser':
				return {
					badge: 'bg-amber-50 text-amber-700 border-amber-200',
					title: 'Client Ticket Raiser',
					desc: 'Authorized to submit new support/enhancement tickets, review and approve effort estimates, test fixes, and mark tickets resolved.'
				};
			case 'client_viewer':
				return {
					badge: 'bg-slate-100 text-slate-700 border-slate-200',
					title: 'Client Stakeholder (Viewer)',
					desc: 'Read-only access to monitor ticket progress, resolution milestones, and project delivery timelines.'
				};
			default:
				return {
					badge: 'bg-gray-100 text-gray-700 border-gray-200',
					title: roleLabel(role),
					desc: 'Standard system user account.'
				};
		}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) handleClose();
	}}
/>

{#if open && user}
	{@const roleInfo = getRoleDetails(user.role)}
	{@const initials = (user.full_name || user.email || 'U')
		.split(' ')
		.map((p) => p[0])
		.join('')
		.slice(0, 2)
		.toUpperCase()}

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
			class="relative w-full max-w-xl rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-6"
		>
			<!-- Top Header -->
			<div class="flex items-start justify-between border-b border-[var(--color-outline-variant)]/40 pb-5">
				<div class="flex items-center gap-4">
					<div
						class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-container)] text-title-md font-bold text-white shadow-md"
					>
						{initials}
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">
								{user.full_name || 'Unnamed User'}
							</h2>
							<span class="inline-flex rounded-md border px-2 py-0.5 text-label-xs font-semibold {roleInfo.badge}">
								{roleInfo.title}
							</span>
						</div>
						<div class="flex items-center gap-2 mt-1">
							<p class="text-body-sm text-[var(--color-on-surface-variant)]">{user.email}</p>
							<button
								type="button"
								class="flex items-center text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
								onclick={copyEmail}
								title="Copy email address"
							>
								<span class="material-symbols-outlined text-[14px] mr-0.5">
									{copied ? 'check' : 'content_copy'}
								</span>
								<span>{copied ? 'Copied' : 'Copy'}</span>
							</button>
						</div>
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

			<!-- Role & Permissions Card -->
			<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] p-4 space-y-1.5">
				<div class="flex items-center gap-2 text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)]">
					<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)]">verified_user</span>
					<span>Role Permissions & Scope</span>
				</div>
				<p class="text-body-sm text-[var(--color-on-surface-variant)]">
					{roleInfo.desc}
				</p>
			</div>

			<!-- Organization & Tenant Meta Grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
				<!-- Organization -->
				<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4">
					<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-outline)] block">
						Organization / Tenant
					</span>
					<div class="mt-1.5 flex items-center gap-2">
						<span class="material-symbols-outlined text-[20px] text-[var(--color-primary)]">
							{user.client ? 'apartment' : 'domain'}
						</span>
						<div>
							<p class="font-bold text-[var(--color-on-surface)]">
								{user.client?.name ?? 'Company X Internal'}
							</p>
							{#if user.client?.code}
								<span class="inline-block rounded bg-[var(--color-surface-container-high)] px-1.5 py-0.2 font-mono text-[11px] font-bold text-[var(--color-on-surface-variant)]">
									{user.client.code}
								</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Account Meta -->
				<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4">
					<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-outline)] block">
						Member Since
					</span>
					<div class="mt-1.5 flex items-center gap-2">
						<span class="material-symbols-outlined text-[20px] text-[var(--color-secondary)]">calendar_today</span>
						<div>
							<p class="font-bold text-[var(--color-on-surface)]">
								{new Date(user.created_at || Date.now()).toLocaleDateString(undefined, { dateStyle: 'long' })}
							</p>
							<span class="text-[11px] text-[var(--color-outline)] font-mono truncate block max-w-[180px]">
								ID: {user.id.slice(0, 8)}...
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Assigned Projects List -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="material-symbols-outlined text-[18px] text-indigo-700">folder_special</span>
						<h3 class="text-title-sm font-bold text-[var(--color-on-surface)]">
							Assigned Project Workspaces ({user.assigned_projects?.length || 0})
						</h3>
					</div>
					<span class="text-[11px] text-[var(--color-outline)]">Scoped ticket access</span>
				</div>

				{#if !user.assigned_projects || user.assigned_projects.length === 0}
					<div class="rounded-xl border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]/50 p-6 text-center">
						<span class="material-symbols-outlined text-[28px] text-[var(--color-outline)]">folder_off</span>
						<p class="mt-1.5 text-body-sm text-[var(--color-on-surface-variant)]">
							{#if user.role === 'super_admin'}
								Global access across all client project workspaces.
							{:else}
								No specific project workspaces assigned to this user.
							{/if}
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
						{#each user.assigned_projects as project}
							<div class="flex items-center gap-3 rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-3 hover:border-indigo-300 transition-colors">
								<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-mono text-xs font-bold text-indigo-700">
									{project.code}
								</div>
								<div class="min-w-0 flex-1">
									<p class="font-semibold text-body-sm text-[var(--color-on-surface)] truncate">{project.name}</p>
									<p class="font-mono text-[11px] text-[var(--color-outline)]">{project.code}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between border-t border-[var(--color-outline-variant)]/40 pt-4">
				{#if onEdit}
					<button
						type="button"
						class="nexus-primary-button h-10 px-4 text-label-md cursor-pointer flex items-center gap-1.5"
						onclick={() => {
							open = false;
							onEdit?.(user);
						}}
					>
						<span class="material-symbols-outlined text-[18px]">edit</span>
						<span>Edit Account</span>
					</button>
				{:else}
					<div></div>
				{/if}

				<button
					type="button"
					class="nexus-secondary-button h-10 px-5 text-label-md cursor-pointer"
					onclick={handleClose}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
