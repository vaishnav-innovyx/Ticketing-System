<script lang="ts">
	import { enhance } from '$app/forms';
	import { STATUS_LABEL, CATEGORY_LABEL, PRIORITY_LABEL } from '$lib/portal/ticketDisplay';

	interface ProfileItem {
		id: string;
		full_name: string | null;
		email: string;
		role: string;
	}

	interface TicketEvent {
		id: string;
		from_status: string | null;
		to_status: string;
		notes: string | null;
		created_at: string;
		actor?: { full_name?: string | null; email?: string } | null;
	}

	interface TicketData {
		id: string;
		token: string | null;
		title: string;
		description: string | null;
		category: 'bug' | 'enhancement' | 'kt' | 'training';
		priority: 'low' | 'medium' | 'high' | 'critical';
		status: 'raised' | 'poc_triage' | 'requirement_estimation' | 'client_approval' | 'development' | 'delivery' | 'closed';
		target_date?: string | null;
		estimated_hours?: number | null;
		actual_hours?: number | null;
		client_id: string;
		project_id: string;
		raised_by?: string | null;
		poc_id?: string | null;
		specialist_id?: string | null;
		delivery_lead_id?: string | null;
		client?: { id: string; name: string; code: string } | null;
		project?: { id: string; name: string; code: string } | null;
		raised_by_profile?: ProfileItem | null;
		poc_profile?: ProfileItem | null;
		specialist_profile?: ProfileItem | null;
		delivery_lead_profile?: ProfileItem | null;
		events?: TicketEvent[];
		created_at: string;
	}

	let {
		open = $bindable(false),
		ticket = null,
		internalStaff = []
	}: {
		open: boolean;
		ticket: TicketData | null;
		internalStaff?: ProfileItem[];
	} = $props();

	let isSubmitting = $state(false);
	let isEditingHours = $state(false);
	let estHours = $state<number | null>(null);
	let actHours = $state<number | null>(null);
	let transitionNotes = $state('');

	$effect(() => {
		if (ticket && open) {
			estHours = ticket.estimated_hours ?? null;
			actHours = ticket.actual_hours ?? null;
			isEditingHours = false;
			transitionNotes = '';
		}
	});

	const stages = [
		{ key: 'raised', label: 'Raised', icon: 'flag' },
		{ key: 'poc_triage', label: 'PoC Triage', icon: 'assignment' },
		{ key: 'requirement_estimation', label: 'Estimating', icon: 'schedule' },
		{ key: 'client_approval', label: 'Approval', icon: 'thumb_up' },
		{ key: 'development', label: 'In Dev', icon: 'code' },
		{ key: 'delivery', label: 'Delivery', icon: 'local_shipping' },
		{ key: 'closed', label: 'Closed', icon: 'check_circle' }
	];

	function getStageIndex(status: string) {
		const idx = stages.findIndex((s) => s.key === status);
		return idx >= 0 ? idx : 0;
	}

	function getPriorityBadge(priority: string) {
		switch (priority) {
			case 'critical':
				return 'bg-red-50 text-red-700 border-red-200';
			case 'high':
				return 'bg-amber-50 text-amber-700 border-amber-200';
			case 'medium':
				return 'bg-blue-50 text-blue-700 border-blue-200';
			default:
				return 'bg-slate-100 text-slate-700 border-slate-200';
		}
	}

	function getCategoryBadge(category: string) {
		switch (category) {
			case 'bug':
				return 'bg-rose-50 text-rose-700 border-rose-200';
			case 'enhancement':
				return 'bg-emerald-50 text-emerald-700 border-emerald-200';
			case 'kt':
				return 'bg-purple-50 text-purple-700 border-purple-200';
			default:
				return 'bg-cyan-50 text-cyan-700 border-cyan-200';
		}
	}

	function handleClose() {
		open = false;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) handleClose();
	}}
/>

{#if open && ticket}
	{@const currentStageIdx = getStageIndex(ticket.status)}

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
			class="relative w-full max-w-3xl rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-6"
		>
			<!-- Top Header -->
			<div class="flex items-start justify-between border-b border-[var(--color-outline-variant)]/40 pb-4">
				<div class="space-y-1.5">
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-mono text-title-sm font-bold text-[var(--color-primary)]">
							{ticket.token}
						</span>
						<span class="inline-flex rounded-md border px-2 py-0.5 text-label-xs font-semibold {getCategoryBadge(ticket.category)}">
							{CATEGORY_LABEL[ticket.category] ?? ticket.category}
						</span>
						<span class="inline-flex rounded-md border px-2 py-0.5 text-label-xs font-semibold {getPriorityBadge(ticket.priority)}">
							{PRIORITY_LABEL[ticket.priority] ?? ticket.priority}
						</span>
						<span class="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-label-xs font-bold text-indigo-700">
							{STATUS_LABEL[ticket.status] ?? ticket.status}
						</span>
					</div>

					<h2 class="text-title-lg font-bold text-[var(--color-on-surface)]">
						{ticket.title}
					</h2>

					<p class="text-body-xs text-[var(--color-on-surface-variant)] flex items-center gap-2">
						<span class="font-medium text-[var(--color-on-surface)]">{ticket.client?.name ?? 'Client'}</span>
						<span>&bull;</span>
						<span class="font-mono font-semibold text-[var(--color-primary)]">{ticket.project?.name ?? 'Project'} ({ticket.project?.code ?? ''})</span>
						<span>&bull;</span>
						<span>Raised {new Date(ticket.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
					</p>
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

			<!-- 7-Stage Stepper -->
			<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] p-4">
				<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-outline)] block mb-3">
					Lifecycle Progression
				</span>

				<div class="grid grid-cols-7 gap-1 text-center">
					{#each stages as stage, idx}
						{@const isPast = idx < currentStageIdx}
						{@const isCurrent = idx === currentStageIdx}
						<div class="flex flex-col items-center">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all {isCurrent ? 'bg-[var(--color-primary)] text-white shadow-md ring-4 ring-[var(--color-primary)]/20' : isPast ? 'bg-emerald-500 text-white' : 'bg-[var(--color-surface-container-high)] text-[var(--color-outline)]'}"
							>
								{#if isPast}
									<span class="material-symbols-outlined text-[16px]">check</span>
								{:else}
									<span>{idx + 1}</span>
								{/if}
							</div>
							<span class="mt-1.5 text-[11px] font-medium truncate w-full {isCurrent ? 'text-[var(--color-primary)] font-bold' : isPast ? 'text-emerald-700' : 'text-[var(--color-outline)]'}">
								{stage.label}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Quick Lifecycle Transition Actions -->
			<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4 space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-1.5">
						<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)]">tune</span>
						<span>Transition Lifecycle Stage</span>
					</span>
					<span class="text-[11px] text-[var(--color-outline)]">Current: {STATUS_LABEL[ticket.status]}</span>
				</div>

				<form
					method="POST"
					action="?/updateStatus"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							isSubmitting = false;
							await update();
						};
					}}
					class="flex flex-wrap items-center gap-2"
				>
					<input type="hidden" name="ticket_id" value={ticket.id} />

					{#if ticket.status === 'raised'}
						<button
							type="submit"
							name="target_status"
							value="poc_triage"
							disabled={isSubmitting}
							class="nexus-primary-button h-9 px-3.5 text-label-sm flex items-center gap-1.5 cursor-pointer"
						>
							<span class="material-symbols-outlined text-[16px]">assignment</span>
							<span>Triage Ticket (PoC)</span>
						</button>
					{:else if ticket.status === 'poc_triage'}
						<button
							type="submit"
							name="target_status"
							value="requirement_estimation"
							disabled={isSubmitting}
							class="nexus-primary-button h-9 px-3.5 text-label-sm flex items-center gap-1.5 cursor-pointer"
						>
							<span class="material-symbols-outlined text-[16px]">schedule</span>
							<span>Begin Effort Estimation</span>
						</button>
					{:else if ticket.status === 'requirement_estimation'}
						<button
							type="submit"
							name="target_status"
							value="client_approval"
							disabled={isSubmitting}
							class="nexus-primary-button h-9 px-3.5 text-label-sm flex items-center gap-1.5 cursor-pointer"
						>
							<span class="material-symbols-outlined text-[16px]">send</span>
							<span>Submit for Client Approval</span>
						</button>
					{:else if ticket.status === 'client_approval'}
						<button
							type="submit"
							name="target_status"
							value="development"
							disabled={isSubmitting}
							class="nexus-primary-button h-9 px-3.5 text-label-sm flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700"
						>
							<span class="material-symbols-outlined text-[16px]">play_arrow</span>
							<span>Approve & Start Dev</span>
						</button>
					{:else if ticket.status === 'development'}
						<button
							type="submit"
							name="target_status"
							value="delivery"
							disabled={isSubmitting}
							class="nexus-primary-button h-9 px-3.5 text-label-sm flex items-center gap-1.5 cursor-pointer bg-purple-600 hover:bg-purple-700"
						>
							<span class="material-symbols-outlined text-[16px]">local_shipping</span>
							<span>Deploy / Deliver to Client</span>
						</button>
					{:else if ticket.status === 'delivery'}
						<button
							type="submit"
							name="target_status"
							value="closed"
							disabled={isSubmitting}
							class="nexus-primary-button h-9 px-3.5 text-label-sm flex items-center gap-1.5 cursor-pointer bg-gray-800 hover:bg-black"
						>
							<span class="material-symbols-outlined text-[16px]">verified</span>
							<span>Verify & Close Ticket</span>
						</button>
					{:else}
						<button
							type="submit"
							name="target_status"
							value="development"
							disabled={isSubmitting}
							class="nexus-secondary-button h-9 px-3.5 text-label-sm flex items-center gap-1.5 cursor-pointer"
						>
							<span class="material-symbols-outlined text-[16px]">replay</span>
							<span>Reopen Ticket</span>
						</button>
					{/if}

					<!-- Reassign / Step selector for Super Admin -->
					<select
						name="manual_status"
						class="h-9 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-2.5 text-body-xs text-[var(--color-on-surface)] outline-none"
						onchange={(e) => {
							const val = (e.target as HTMLSelectElement).value;
							if (val) {
								const form = (e.target as HTMLSelectElement).form;
								if (form) {
									const input = document.createElement('input');
									input.type = 'hidden';
									input.name = 'target_status';
									input.value = val;
									form.appendChild(input);
									form.requestSubmit();
								}
							}
						}}
					>
						<option value="">Jump directly to stage...</option>
						{#each stages as stage}
							<option value={stage.key}>{stage.label}</option>
						{/each}
					</select>
				</form>
			</div>

			<!-- Meta Grid: Hours & Team Assignments -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Hours Tracking Card -->
				<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4 space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-1.5">
							<span class="material-symbols-outlined text-[18px] text-amber-600">timer</span>
							<span>Hours Scoping & Actuals</span>
						</span>
						<button
							type="button"
							class="text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
							onclick={() => (isEditingHours = !isEditingHours)}
						>
							{isEditingHours ? 'Cancel' : 'Update Hours'}
						</button>
					</div>

					{#if isEditingHours}
						<form
							method="POST"
							action="?/updateHours"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ update }) => {
									isSubmitting = false;
									isEditingHours = false;
									await update();
								};
							}}
							class="space-y-3 pt-1"
						>
							<input type="hidden" name="ticket_id" value={ticket.id} />
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="edit-est-hours" class="text-[11px] font-semibold text-[var(--color-on-surface-variant)] block">
										Estimated (h)
									</label>
									<input
										id="edit-est-hours"
										name="estimated_hours"
										type="number"
										step="0.5"
										min="0"
										bind:value={estHours}
										class="mt-1 w-full rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-body-sm"
									/>
								</div>
								<div>
									<label for="edit-act-hours" class="text-[11px] font-semibold text-[var(--color-on-surface-variant)] block">
										Actual Logged (h)
									</label>
									<input
										id="edit-act-hours"
										name="actual_hours"
										type="number"
										step="0.5"
										min="0"
										bind:value={actHours}
										class="mt-1 w-full rounded-lg border border-[var(--color-outline-variant)] px-3 py-1.5 text-body-sm"
									/>
								</div>
							</div>
							<button
								type="submit"
								disabled={isSubmitting}
								class="nexus-primary-button h-8 w-full text-label-xs font-semibold cursor-pointer"
							>
								Save Hours
							</button>
						</form>
					{:else}
						<div class="grid grid-cols-2 gap-3 pt-1">
							<div class="rounded-lg bg-[var(--color-surface-container-low)] p-3">
								<span class="text-[11px] text-[var(--color-outline)] block uppercase font-medium">Estimated</span>
								<p class="text-title-md font-bold text-[var(--color-on-surface)] mt-0.5">
									{ticket.estimated_hours !== null && ticket.estimated_hours !== undefined ? `${ticket.estimated_hours}h` : 'Not scoped'}
								</p>
							</div>
							<div class="rounded-lg bg-[var(--color-surface-container-low)] p-3">
								<span class="text-[11px] text-[var(--color-outline)] block uppercase font-medium">Actual Spent</span>
								<p class="text-title-md font-bold text-[var(--color-on-surface)] mt-0.5">
									{ticket.actual_hours !== null && ticket.actual_hours !== undefined ? `${ticket.actual_hours}h` : '0h'}
								</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- Staff Assignments Card -->
				<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4 space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-1.5">
							<span class="material-symbols-outlined text-[18px] text-indigo-600">group</span>
							<span>Assigned Staff</span>
						</span>
					</div>

					<form
						method="POST"
						action="?/assignStaff"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update }) => {
								isSubmitting = false;
								await update();
							};
						}}
						class="space-y-2.5 pt-1"
					>
						<input type="hidden" name="ticket_id" value={ticket.id} />

						<!-- Specialist Assign -->
						<div class="flex items-center justify-between text-body-xs">
							<span class="text-[var(--color-on-surface-variant)] font-medium">Tech Specialist:</span>
							<select
								name="specialist_id"
								class="h-8 rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-2 text-[12px] font-medium"
								onchange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()}
							>
								<option value="">Unassigned</option>
								{#each internalStaff.filter((s) => s.role === 'specialist' || s.role === 'super_admin') as staff}
									<option value={staff.id} selected={ticket.specialist_id === staff.id}>
										{staff.full_name || staff.email}
									</option>
								{/each}
							</select>
						</div>

						<!-- PoC Assign -->
						<div class="flex items-center justify-between text-body-xs">
							<span class="text-[var(--color-on-surface-variant)] font-medium">Point of Contact:</span>
							<select
								name="poc_id"
								class="h-8 rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-2 text-[12px] font-medium"
								onchange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()}
							>
								<option value="">Unassigned</option>
								{#each internalStaff.filter((s) => s.role === 'poc' || s.role === 'super_admin') as staff}
									<option value={staff.id} selected={ticket.poc_id === staff.id}>
										{staff.full_name || staff.email}
									</option>
								{/each}
							</select>
						</div>

						<!-- Delivery Lead Assign -->
						<div class="flex items-center justify-between text-body-xs">
							<span class="text-[var(--color-on-surface-variant)] font-medium">Delivery Lead:</span>
							<select
								name="delivery_lead_id"
								class="h-8 rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-2 text-[12px] font-medium"
								onchange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()}
							>
								<option value="">Unassigned</option>
								{#each internalStaff.filter((s) => s.role === 'delivery_lead' || s.role === 'super_admin') as staff}
									<option value={staff.id} selected={ticket.delivery_lead_id === staff.id}>
										{staff.full_name || staff.email}
									</option>
								{/each}
							</select>
						</div>
					</form>
				</div>
			</div>

			<!-- Description & Notes -->
			{#if ticket.description}
				<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] p-4 space-y-1.5">
					<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-outline)] block">
						Description & Specification
					</span>
					<p class="text-body-sm text-[var(--color-on-surface)] whitespace-pre-wrap">
						{ticket.description}
					</p>
				</div>
			{/if}

			<!-- Audit Events Timeline -->
			{#if ticket.events && ticket.events.length > 0}
				<div class="space-y-2.5">
					<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)] block">
						Activity & History Timeline
					</span>
					<div class="divide-y divide-[var(--color-outline-variant)]/30 rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)]">
						{#each ticket.events as evt}
							<div class="flex items-center justify-between p-3 text-body-xs">
								<div class="flex items-center gap-2">
									<span class="material-symbols-outlined text-[16px] text-[var(--color-primary)]">history</span>
									<span>
										Transitioned to <strong>{STATUS_LABEL[evt.to_status as keyof typeof STATUS_LABEL] ?? evt.to_status}</strong>
										{#if evt.actor}
											by {evt.actor.full_name || evt.actor.email}
										{/if}
									</span>
								</div>
								<span class="text-[11px] text-[var(--color-outline)]">
									{new Date(evt.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Footer -->
			<div class="flex items-center justify-end border-t border-[var(--color-outline-variant)]/40 pt-4">
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
