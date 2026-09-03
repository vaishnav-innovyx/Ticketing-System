<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import TriageMessageModal from './TriageMessageModal.svelte';
	import {
		STATUS_LABEL,
		CATEGORY_LABEL,
		PRIORITY_LABEL,
		BLOCKED_BADGE_CLASS,
		computeTicketMetrics,
		formatMetricHours,
		formatVariancePct
	} from '$lib/portal/ticketDisplay';

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
		raised_at?: string | null;
		poc_responded_at?: string | null;
		requirement_completed_at?: string | null;
		client_approved_at?: string | null;
		closed_at?: string | null;
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
		dependencies?: { id: string; depends_on: { id: string; token: string; title: string; status: string } }[];
		dependencyNotes?: { id: string; kind: 'person' | 'module'; label: string; detail: string | null }[];
		watchers?: { id: string; email: string; full_name: string | null }[];
		attachments?: { id: string; file_name: string; file_size_bytes: number | null; mime_type: string | null }[];
		messages?: { id: string; content: string; created_at: string; author: { full_name: string | null; role: string } | null }[];
		created_at: string;
	}

	interface ProjectTicketItem {
		id: string;
		token: string | null;
		title: string;
		status: string;
	}

	let {
		open = $bindable(false),
		ticket = null,
		internalStaff = [],
		projectTickets = [],
		currentUserRole = null
	}: {
		open: boolean;
		ticket: TicketData | null;
		internalStaff?: ProfileItem[];
		projectTickets?: ProjectTicketItem[];
		currentUserRole?: string | null;
	} = $props();

	let isSubmitting = $state(false);
	let isEditingHours = $state(false);
	let estHours = $state<number | null>(null);
	let actHours = $state<number | null>(null);
	let transitionNotes = $state('');
	let watcherEmail = $state('');
	let isAttaching = $state(false);
	let replyContent = $state('');
	let lastMarkedReadTicketId = $state<string | null>(null);
	let messagesContainer: HTMLDivElement | undefined = $state();
	let showTriageMessageModal = $state(false);

	$effect(() => {
		// Track the message list so this re-runs whenever it changes, and scroll to the latest.
		ticket?.messages;
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	});

	$effect(() => {
		if (ticket && open) {
			estHours = ticket.estimated_hours ?? null;
			actHours = ticket.actual_hours ?? null;
			isEditingHours = false;
			transitionNotes = '';
		}
	});

	// Opening the modal on a ticket marks its conversation as read, so the
	// Communication sidebar badge and inbox stay in sync with this view too.
	$effect(() => {
		if (open && ticket) {
			if (ticket.id !== lastMarkedReadTicketId) {
				lastMarkedReadTicketId = ticket.id;
				const formData = new FormData();
				formData.set('ticket_id', ticket.id);
				fetch('?/markRead', { method: 'POST', body: formData }).then(() => invalidateAll());
			}
		} else {
			lastMarkedReadTicketId = null;
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
	{@const metrics = computeTicketMetrics(ticket)}
	{@const openBlockers = (ticket.dependencies ?? []).filter((d) => d.depends_on.status !== 'closed')}
	{@const linkedIds = new Set((ticket.dependencies ?? []).map((d) => d.depends_on.id))}
	{@const linkableTickets = projectTickets.filter((t) => !linkedIds.has(t.id))}

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
						{#if openBlockers.length > 0 && ticket.status !== 'closed'}
							<span
								class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-xs font-bold {BLOCKED_BADGE_CLASS}"
								title={`Blocked by ${openBlockers.map((d) => d.depends_on.token).join(', ')}`}
							>
								<span class="material-symbols-outlined text-[14px]">block</span>
								<span>Blocked</span>
							</span>
						{:else if openBlockers.length > 0 && ticket.status === 'closed'}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-label-xs font-bold text-amber-700"
								title={`Reopened after this ticket closed: ${openBlockers.map((d) => d.depends_on.token).join(', ')}`}
							>
								<span class="material-symbols-outlined text-[14px]">warning</span>
								<span>Dependency reopened</span>
							</span>
						{/if}
						{#if ticket.target_date && ticket.status !== 'closed' && ticket.target_date < new Date().toISOString().slice(0, 10)}
							<span class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-label-xs font-bold text-red-700">
								<span class="material-symbols-outlined text-[14px]">event_busy</span>
								<span>Overdue</span>
							</span>
						{/if}
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
						{#if ticket.target_date}
							<span>&bull;</span>
							<span>Target {new Date(ticket.target_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
						{/if}
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
							type="button"
							disabled={isSubmitting}
							onclick={() => (showTriageMessageModal = true)}
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
						{#if ticket.client_approved_at}
							<span class="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-label-sm font-medium text-emerald-700">
								<span class="material-symbols-outlined text-[16px]">check_circle</span>
								<span>Client approved {new Date(ticket.client_approved_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
							</span>
							<button
								type="submit"
								name="target_status"
								value="development"
								disabled={isSubmitting}
								class="nexus-primary-button h-9 px-3.5 text-label-sm flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700"
							>
								<span class="material-symbols-outlined text-[16px]">play_arrow</span>
								<span>Start Development</span>
							</button>
						{:else if currentUserRole === 'super_admin'}
							<button
								type="submit"
								name="target_status"
								value="development"
								disabled={isSubmitting}
								title="Override: normally the client approves this from the portal"
								class="nexus-primary-button h-9 px-3.5 text-label-sm flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700"
							>
								<span class="material-symbols-outlined text-[16px]">play_arrow</span>
								<span>Force Approve &amp; Start (Override)</span>
							</button>
						{:else}
							<span class="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-label-sm font-medium text-amber-700">
								<span class="material-symbols-outlined text-[16px]">hourglass_top</span>
								<span>Awaiting client approval</span>
							</span>
						{/if}
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
							disabled={isSubmitting || openBlockers.length > 0}
							title={openBlockers.length > 0 ? `Blocked by ${openBlockers.map((d) => d.depends_on.token).join(', ')}` : undefined}
							class="nexus-primary-button h-9 px-3.5 text-label-sm flex items-center gap-1.5 cursor-pointer bg-gray-800 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
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

					<!-- Reassign / Step selector, Super Admin only -->
					{#if currentUserRole === 'super_admin'}
						<select
							name="manual_status"
							class="h-9 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-2.5 text-body-xs text-[var(--color-on-surface)] outline-none"
							onchange={(e) => {
								const select = e.target as HTMLSelectElement;
								const val = select.value;
								if (!val) return;
								if (val === 'poc_triage') {
									showTriageMessageModal = true;
									select.value = '';
									return;
								}
								const form = select.form;
								if (form) {
									const input = document.createElement('input');
									input.type = 'hidden';
									input.name = 'target_status';
									input.value = val;
									form.appendChild(input);
									form.requestSubmit();
								}
							}}
						>
							<option value="">Jump directly to stage...</option>
							{#each stages as stage}
								{#if stage.key !== 'closed' || openBlockers.length === 0}
									<option value={stage.key}>{stage.label}</option>
								{/if}
							{/each}
						</select>
					{/if}
				</form>
			</div>

			<!-- Delivery Metrics -->
			<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4 space-y-3">
				<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[18px] text-emerald-600">insights</span>
					<span>Delivery Metrics</span>
				</span>
				<div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
					<div class="rounded-lg bg-[var(--color-surface-container-low)] p-3">
						<span class="text-[11px] text-[var(--color-outline)] block uppercase font-medium">PoC TAT</span>
						<p class="text-title-md font-bold text-[var(--color-on-surface)] mt-0.5">{formatMetricHours(metrics.pocTatHours)}</p>
					</div>
					<div class="rounded-lg bg-[var(--color-surface-container-low)] p-3">
						<span class="text-[11px] text-[var(--color-outline)] block uppercase font-medium">Req Duration</span>
						<p class="text-title-md font-bold text-[var(--color-on-surface)] mt-0.5">{formatMetricHours(metrics.reqDurationHours)}</p>
					</div>
					<div class="rounded-lg bg-[var(--color-surface-container-low)] p-3">
						<span class="text-[11px] text-[var(--color-outline)] block uppercase font-medium">Approval Delay</span>
						<p class="text-title-md font-bold text-[var(--color-on-surface)] mt-0.5">{formatMetricHours(metrics.approvalDelayHours)}</p>
					</div>
					<div class="rounded-lg bg-[var(--color-surface-container-low)] p-3">
						<span class="text-[11px] text-[var(--color-outline)] block uppercase font-medium">Effort Variance</span>
						<p
							class="text-title-md font-bold mt-0.5 {metrics.effortVariancePct !== null && metrics.effortVariancePct > 20
								? 'text-[var(--color-error)]'
								: 'text-[var(--color-on-surface)]'}"
						>
							{formatVariancePct(metrics.effortVariancePct)}
						</p>
					</div>
					<div class="rounded-lg bg-[var(--color-surface-container-low)] p-3">
						<span class="text-[11px] text-[var(--color-outline)] block uppercase font-medium">Total Cycle Time</span>
						<p class="text-title-md font-bold text-[var(--color-on-surface)] mt-0.5">{formatMetricHours(metrics.cycleTimeHours)}</p>
					</div>
				</div>
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

			<!-- Dependencies -->
			<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4 space-y-3">
				<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)]">link</span>
					<span>Depends On</span>
				</span>

				{#if ticket.dependencies && ticket.dependencies.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each ticket.dependencies as dep}
							<form
								method="POST"
								action="?/unlinkDependency"
								use:enhance={() => {
									isSubmitting = true;
									return async ({ update }) => {
										isSubmitting = false;
										await update();
									};
								}}
								class="inline-flex"
							>
								<input type="hidden" name="dependency_id" value={dep.id} />
								<button
									type="submit"
									disabled={isSubmitting}
									class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-label-xs font-semibold cursor-pointer {dep.depends_on.status !== 'closed'
										? BLOCKED_BADGE_CLASS + ' border-transparent'
										: 'bg-emerald-50 text-emerald-700 border-emerald-200'}"
									title="Remove dependency"
								>
									<span class="font-mono">{dep.depends_on.token}</span>
									<span class="material-symbols-outlined text-[14px]">close</span>
								</button>
							</form>
						{/each}
					</div>
				{:else}
					<p class="text-body-xs text-[var(--color-outline)]">No dependencies linked.</p>
				{/if}

				{#if linkableTickets.length > 0}
					<form
						method="POST"
						action="?/linkDependency"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update }) => {
								isSubmitting = false;
								await update();
							};
						}}
						class="flex items-center gap-2 pt-1"
					>
						<input type="hidden" name="ticket_id" value={ticket.id} />
						<select
							name="depends_on_ticket_id"
							required
							class="h-8 flex-1 rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-2 text-[12px] font-medium"
						>
							<option value="">Link a ticket this one depends on...</option>
							{#each linkableTickets as t}
								<option value={t.id}>{t.token} — {t.title}</option>
							{/each}
						</select>
						<button
							type="submit"
							disabled={isSubmitting}
							class="nexus-secondary-button h-8 px-2.5 text-label-xs cursor-pointer"
						>
							Add
						</button>
					</form>
				{/if}
			</div>

			<!-- Reported Dependencies (raiser-supplied context, read-only) -->
			{#if ticket.dependencyNotes && ticket.dependencyNotes.length > 0}
				{@const reportedPeople = ticket.dependencyNotes.filter((n) => n.kind === 'person')}
				{@const reportedModules = ticket.dependencyNotes.filter((n) => n.kind === 'module')}
				<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4 space-y-3">
					<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-1.5">
						<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)]">hub</span>
						<span>Reported Dependencies</span>
					</span>

					{#if reportedPeople.length > 0}
						<div class="space-y-1.5">
							<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">People</span>
							<div class="flex flex-wrap gap-2">
								{#each reportedPeople as note}
									<span class="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-outline-variant)] px-2 py-0.5 text-label-xs font-semibold text-[var(--color-on-surface)]">
										<span class="material-symbols-outlined text-[14px] text-[var(--color-on-surface-variant)]">person</span>
										{note.label}{#if note.detail}<span class="font-normal text-[var(--color-on-surface-variant)]"> ({note.detail})</span>{/if}
									</span>
								{/each}
							</div>
						</div>
					{/if}

					{#if reportedModules.length > 0}
						<div class="space-y-1.5">
							<span class="text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Modules / Systems</span>
							<div class="flex flex-wrap gap-2">
								{#each reportedModules as note}
									<span class="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-outline-variant)] px-2 py-0.5 text-label-xs font-semibold text-[var(--color-on-surface)]">
										<span class="material-symbols-outlined text-[14px] text-[var(--color-on-surface-variant)]">apps</span>
										{note.label}{#if note.detail}<span class="font-normal text-[var(--color-on-surface-variant)]"> ({note.detail})</span>{/if}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Watchers -->
			<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4 space-y-3">
				<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)]">visibility</span>
					<span>Watchers (CC)</span>
				</span>

				{#if ticket.watchers && ticket.watchers.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each ticket.watchers as w}
							<form
								method="POST"
								action="?/removeWatcher"
								use:enhance={() => {
									isSubmitting = true;
									return async ({ update }) => {
										isSubmitting = false;
										await update();
									};
								}}
								class="inline-flex"
							>
								<input type="hidden" name="watcher_id" value={w.id} />
								<button
									type="submit"
									disabled={isSubmitting}
									class="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-2 py-0.5 text-label-xs font-semibold cursor-pointer"
									title="Remove watcher"
								>
									<span>{w.full_name ? `${w.full_name} <${w.email}>` : w.email}</span>
									<span class="material-symbols-outlined text-[14px]">close</span>
								</button>
							</form>
						{/each}
					</div>
				{:else}
					<p class="text-body-xs text-[var(--color-outline)]">No watchers CC'd.</p>
				{/if}

				<form
					method="POST"
					action="?/addWatcher"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update, result }) => {
							isSubmitting = false;
							if (result.type === 'success') watcherEmail = '';
							await update();
						};
					}}
					class="flex items-center gap-2 pt-1"
				>
					<input type="hidden" name="ticket_id" value={ticket.id} />
					<input
						name="email"
						type="email"
						required
						placeholder="name@company.com"
						bind:value={watcherEmail}
						class="h-8 flex-1 rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-2 text-[12px]"
					/>
					<button type="submit" disabled={isSubmitting} class="nexus-secondary-button h-8 px-2.5 text-label-xs cursor-pointer">
						Add
					</button>
				</form>
			</div>

			<!-- Attachments -->
			<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4 space-y-3">
				<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)]">attach_file</span>
					<span>Attachments</span>
				</span>

				{#if ticket.attachments && ticket.attachments.length > 0}
					<ul class="space-y-1.5">
						{#each ticket.attachments as att}
							<li>
								<a
									href={`/attachments/${att.id}`}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-2 text-body-xs text-[var(--color-on-surface)] hover:text-[var(--color-primary)] hover:underline"
								>
									<span class="material-symbols-outlined text-[16px] text-[var(--color-primary)]">description</span>
									<span class="truncate">{att.file_name}</span>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-body-xs text-[var(--color-outline)]">No files attached.</p>
				{/if}

				<form
					method="POST"
					action="?/attachFile"
					enctype="multipart/form-data"
					use:enhance={() => {
						isAttaching = true;
						return async ({ update }) => {
							isAttaching = false;
							await update();
						};
					}}
				>
					<input type="hidden" name="ticket_id" value={ticket.id} />
					<label
						class="inline-flex items-center gap-1.5 text-label-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer {isAttaching ? 'opacity-50' : ''}"
					>
						<span class="material-symbols-outlined text-[16px]">upload</span>
						<span>{isAttaching ? 'Uploading...' : 'Attach a file'}</span>
						<input
							type="file"
							name="file"
							class="hidden"
							disabled={isAttaching}
							onchange={(e) => (e.currentTarget.form as HTMLFormElement)?.requestSubmit()}
						/>
					</label>
				</form>
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

			<!-- Conversation -->
			<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] p-4 space-y-3">
				<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-1.5">
					<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)]">forum</span>
					<span>Conversation</span>
				</span>

				{#if ticket.messages && ticket.messages.length > 0}
					<div bind:this={messagesContainer} class="space-y-2.5 max-h-64 overflow-y-auto pr-1">
						{#each ticket.messages as msg}
							{@const isClient = msg.author?.role?.startsWith('client_')}
							<div
								class="rounded-lg border p-3 text-body-xs {isClient
									? 'border-amber-200 bg-amber-50/60'
									: 'border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)]'}"
							>
								<div class="flex items-center justify-between mb-1">
									<span class="font-semibold text-[var(--color-on-surface)]">
										{msg.author?.full_name ?? 'Unknown'}
										<span class="ml-1 font-normal text-[10px] uppercase tracking-wide text-[var(--color-outline)]">
											{isClient ? 'Client' : (msg.author?.role ?? '')}
										</span>
									</span>
									<span class="text-[11px] text-[var(--color-outline)]">
										{new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
									</span>
								</div>
								<p class="text-[var(--color-on-surface)] whitespace-pre-wrap">{msg.content}</p>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-body-xs text-[var(--color-outline)]">No messages yet.</p>
				{/if}

				<form
					method="POST"
					action="?/reply"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							isSubmitting = false;
							replyContent = '';
							await update();
						};
					}}
					class="space-y-2"
				>
					<input type="hidden" name="ticket_id" value={ticket.id} />
					<textarea
						name="content"
						rows="2"
						required
						bind:value={replyContent}
						placeholder="Reply to the client..."
						class="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-body-xs outline-none focus:border-[var(--color-primary)]"
					></textarea>
					<button
						type="submit"
						disabled={isSubmitting || !replyContent.trim()}
						class="nexus-primary-button h-8 px-3.5 text-label-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					>
						<span class="material-symbols-outlined text-[14px]">send</span>
						<span>Send</span>
					</button>
				</form>
			</div>

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

	<TriageMessageModal
		bind:open={showTriageMessageModal}
		ticket={{ id: ticket.id, token: ticket.token ?? ticket.id, title: ticket.title }}
	/>
{/if}
