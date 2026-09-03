<script lang="ts">
	import { enhance } from '$app/forms';
	import TicketProgressStepper from '$lib/components/client/portal/TicketProgressStepper.svelte';
	import {
		STATUS_LABEL,
		STATUS_STEP,
		CATEGORY_LABEL,
		PRIORITY_LABEL,
		BLOCKED_BADGE_CLASS,
		formatDateTime,
		formatBytes,
		attachmentType,
		roleLabel,
		isClientRole
	} from '$lib/portal/ticketDisplay';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const isViewer = $derived(data.profile?.role === 'client_viewer');
	const isProjectAdmin = $derived(data.profile?.role === 'project_admin' || data.profile?.role === 'super_admin');
	const isPendingApproval = $derived(
		data.ticket.requires_admin_approval && !data.ticket.admin_approved_at && !data.ticket.admin_rejected_at
	);
	const isRejected = $derived(!!data.ticket.admin_rejected_at);

	const assignee = $derived.by(() => {
		const t = data.ticket;
		const pick =
			t.status === 'development'
				? t.specialist
				: t.status === 'delivery' || t.status === 'closed'
					? t.delivery_lead
					: t.poc;
		return pick
			? { name: pick.full_name ?? 'Unassigned', role: roleLabel(pick.role) }
			: { name: 'Triage Queue', role: 'Pending assignment' };
	});

	const ticket = $derived({
		id: data.ticket.token ?? data.ticket.id,
		title: data.ticket.title,
		description: data.ticket.description ?? '',
		status:
			data.ticket.admin_rejected_at
				? 'Rejected'
				: data.ticket.status === 'client_approval' && data.ticket.client_approved_at
					? 'Approved — Starting Soon'
					: STATUS_LABEL[data.ticket.status],
		category: CATEGORY_LABEL[data.ticket.category],
		priority: PRIORITY_LABEL[data.ticket.priority],
		application: data.ticket.projects?.name ?? '',
		environment: data.ticket.environment,
		createdAt: formatDateTime(data.ticket.raised_at),
		assignee,
		targetDate: data.ticket.target_date as string | null,
		isOverdue: !!(
			data.ticket.target_date &&
			data.ticket.status !== 'closed' &&
			data.ticket.target_date < new Date().toISOString().slice(0, 10)
		),
		progressStep: STATUS_STEP[data.ticket.status],
		aiSummary: data.ticket.ai_summary as { whatWeUnderstand: string[]; possibleCause: string } | null,
		watchers: data.watchers,
		ccRecipients: data.watchers.map((w) => w.email),
		messages: data.messages.map((m) => ({
			id: m.id,
			author: m.author?.full_name ?? 'Unknown',
			role: (m.author && isClientRole(m.author.role) ? 'client' : 'staff') as 'client' | 'staff',
			badge: m.author ? roleLabel(m.author.role) : undefined,
			timestamp: formatDateTime(m.created_at),
			content: m.content,
			attachments: data.attachments
				.filter((a) => a.message_id === m.id)
				.map((a) => ({ id: a.id, name: a.file_name, size: formatBytes(a.file_size_bytes), type: attachmentType(a.mime_type) }))
		})),
		attachments: data.attachments
			.filter((a) => !a.message_id)
			.map((a) => ({ id: a.id, name: a.file_name, size: formatBytes(a.file_size_bytes), type: attachmentType(a.mime_type) }))
	});

	let replyText = $state('');
	let isSubmittingReply = $state(false);
	let messagesContainer: HTMLDivElement | undefined = $state();
	let confirmAction: 'close' | 'reopen' | null = $state(null);
	let isSubmittingAction = $state(false);
	let actionError: string | null = $state(null);
	let successMessage: string | null = $state(null);

	function openConfirm(action: 'close' | 'reopen') {
		confirmAction = action;
		actionError = null;
	}

	$effect(() => {
		// Track the message list so this re-runs whenever it changes, and scroll to the latest.
		ticket.messages;
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	});
	let isAttaching = $state(false);
	let isSubmittingApproval = $state(false);
	let approvalNotes = $state('');
	let isSubmittingRaiseReview = $state(false);
	let rejectionReason = $state('');
	let updateRequested = $state(false);

	function requestUpdate() {
		updateRequested = true;
		setTimeout(() => {
			updateRequested = false;
		}, 4000);
	}
</script>

<svelte:head>
	<title>{ticket.id} - {ticket.title} - Nexus Client Portal</title>
</svelte:head>

<div class="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:px-10 md:py-10 space-y-8">
	<!-- Header & Breadcrumbs -->
		<div class="space-y-4">
			<a
				href="/portal/my-tickets"
				class="inline-flex items-center gap-1 text-label-md font-semibold text-[var(--color-outline)] hover:text-[var(--color-primary)] transition-colors"
			>
				<span class="material-symbols-outlined text-[16px]">arrow_back</span>
				<span>Back to My Tickets</span>
			</a>

			<div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
				<div class="space-y-2">
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-bold text-lg text-[var(--color-primary)]">{ticket.id}</span>
						<span class="px-2.5 py-0.5 rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)] text-label-sm font-semibold uppercase tracking-wider">
							{ticket.category}
						</span>
						<span class="px-2.5 py-0.5 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] text-label-sm font-semibold uppercase tracking-wider">
							{ticket.application}
						</span>
						<span class="px-2.5 py-0.5 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] text-label-sm font-semibold uppercase tracking-wider">
							{ticket.environment}
						</span>
					</div>
					<h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-on-surface)]">
						{ticket.title}
					</h1>
				</div>

				<div>
					{#if isPendingApproval}
						<span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-400 text-amber-800 font-bold text-label-md shadow-2xs">
							<span class="material-symbols-outlined text-[16px]">hourglass_top</span>
							<span>Pending Admin Approval</span>
						</span>
					{:else if isRejected}
						<span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-error-container)] text-[var(--color-on-error-container)] font-bold text-label-md shadow-2xs">
							<span class="material-symbols-outlined text-[16px]">block</span>
							<span>Rejected</span>
						</span>
					{:else}
						<span
							class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-secondary-container)]/30 border border-[var(--color-secondary)] text-[var(--color-secondary)] font-bold text-label-md shadow-2xs"
						>
							<span class="h-2 w-2 rounded-full bg-[var(--color-secondary)]"></span>
							<span>{ticket.status}</span>
						</span>
					{/if}
				</div>
			</div>

			{#if isPendingApproval}
				<!-- Admin Approval Gate -->
				<div class="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-5 shadow-xs space-y-3">
					<h3 class="text-base font-bold text-[var(--color-on-surface)] flex items-center gap-1.5">
						<span class="material-symbols-outlined text-[20px] text-amber-600">hourglass_top</span>
						<span>This ticket hasn't reached our team yet</span>
					</h3>
					{#if isProjectAdmin}
						<p class="text-body-sm text-[var(--color-on-surface-variant)]">
							A member of your team raised this ticket. Approve it to send it to our support desk, or reject it with a reason.
						</p>
						<form
							method="POST"
							action="?/rejectRaisedTicket"
							use:enhance={() => {
								isSubmittingRaiseReview = true;
								return async ({ update }) => {
									isSubmittingRaiseReview = false;
									rejectionReason = '';
									await update();
								};
							}}
							class="space-y-2.5"
						>
							<textarea
								name="reason"
								rows="2"
								bind:value={rejectionReason}
								placeholder="Reason if rejecting (required to reject)..."
								class="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-body-sm outline-none focus:border-[var(--color-primary)]"
							></textarea>
							<div class="flex items-center gap-2">
								<button
									type="submit"
									formaction="?/approveRaisedTicket"
									disabled={isSubmittingRaiseReview}
									class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-label-md font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
								>
									<span class="material-symbols-outlined text-[18px]">check</span>
									<span>Approve &amp; Send to Support</span>
								</button>
								<button
									type="submit"
									disabled={isSubmittingRaiseReview}
									class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-4 py-2 text-label-md font-semibold text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50 cursor-pointer"
								>
									<span class="material-symbols-outlined text-[18px]">block</span>
									<span>Reject</span>
								</button>
							</div>
						</form>
					{:else}
						<p class="text-body-sm text-[var(--color-on-surface-variant)]">
							Your ticket is waiting for an admin on your team to review and approve it before it's sent to support.
						</p>
					{/if}
				</div>
			{:else if isRejected}
				<div class="rounded-xl border-2 border-[var(--color-error)]/40 bg-[var(--color-error-container)]/40 p-5 shadow-xs space-y-1.5">
					<h3 class="text-base font-bold text-[var(--color-on-error-container)] flex items-center gap-1.5">
						<span class="material-symbols-outlined text-[20px]">block</span>
						<span>This ticket was rejected by your admin</span>
					</h3>
					<p class="text-body-sm text-[var(--color-on-error-container)]">{data.ticket.admin_rejection_reason}</p>
				</div>
			{:else}
				<!-- Linear Progress Stepper -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-4 sm:p-6 shadow-xs">
					<TicketProgressStepper currentStepIndex={ticket.progressStep} />
				</div>
			{/if}
		</div>

		<!-- Main 2-Column Content Canvas (8 cols left, 4 cols right) -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			<!-- Left Column: Summary, AI Insights, Conversation Thread -->
			<div class="lg:col-span-8 flex flex-col gap-6">
				<!-- Original Request Card -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xs space-y-4">
					<div class="flex items-center gap-3 pb-3 border-b border-[var(--color-border-subtle)]">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">
							<span class="material-symbols-outlined text-[18px]">description</span>
						</div>
						<h2 class="text-lg font-bold text-[var(--color-on-surface)]">Original Request</h2>
					</div>
					<div class="text-body-md text-[var(--color-on-surface-variant)] whitespace-pre-line leading-relaxed">
						{ticket.description}
					</div>
				</div>

				<!-- AI-Generated Summary Card -->
				{#if ticket.aiSummary}
					<div class="relative overflow-hidden rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-surface-container-low)] p-6 shadow-xs space-y-4">
						<div class="absolute top-0 right-0 h-28 w-28 bg-[var(--color-primary)]/5 rounded-bl-full pointer-events-none"></div>

						<div class="flex items-center gap-1.5 text-[var(--color-primary)] text-label-sm font-bold uppercase tracking-wider">
							<span class="material-symbols-outlined text-[18px]">smart_toy</span>
							<span>AI-Generated Summary</span>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<h3 class="text-label-md font-bold text-[var(--color-on-surface)] mb-2">
									What we understand:
								</h3>
								<ul class="list-disc list-inside space-y-1 text-body-sm text-[var(--color-on-surface-variant)]">
									{#each ticket.aiSummary.whatWeUnderstand as item}
										<li>{item}</li>
									{/each}
								</ul>
							</div>

							<div>
								<h3 class="text-label-md font-bold text-[var(--color-on-surface)] mb-2">
									Possible Cause:
								</h3>
								<p class="text-body-sm text-[var(--color-on-surface-variant)] leading-relaxed">
									{ticket.aiSummary.possibleCause}
								</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Activity & Conversation Thread -->
				<div class="space-y-4">
					<h2 class="text-xl font-bold text-[var(--color-on-surface)] pb-2 border-b border-[var(--color-border-subtle)]">
						Activity & Discussion
					</h2>

					<!-- Messages List -->
					<div bind:this={messagesContainer} class="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
						{#each ticket.messages as message}
							<div
								class="rounded-xl border p-5 shadow-xs transition-all {message.role === 'client'
									? 'border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)]'
									: 'border-[var(--color-primary-fixed)]/80 bg-[var(--color-primary-fixed)]/10'}"
							>
								<div class="flex items-start justify-between gap-3 mb-3">
									<div class="flex items-center gap-3">
										<div class="h-9 w-9 rounded-full overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-high)] flex items-center justify-center font-bold text-[13px] text-[var(--color-on-surface)]">
											{message.author.slice(0, 2).toUpperCase()}
										</div>
										<div>
											<div class="flex items-center gap-2">
												<span class="text-label-md font-bold text-[var(--color-on-surface)]">
													{message.author}
												</span>
												{#if message.badge}
													<span class="rounded bg-[var(--color-primary-container)] px-2 py-0.2 text-[10px] font-semibold text-white uppercase tracking-wider">
														{message.badge}
													</span>
												{/if}
											</div>
											<span class="text-[11px] text-[var(--color-on-surface-variant)]">
												{message.timestamp}
											</span>
										</div>
									</div>
								</div>

								<p class="text-body-md text-[var(--color-on-surface)] leading-relaxed">
									{message.content}
								</p>

								{#if message.attachments && message.attachments.length > 0}
									<div class="mt-3 flex flex-wrap gap-2 pt-2 border-t border-[var(--color-border-subtle)]/40">
										{#each message.attachments as att}
											<a
												href={`/attachments/${att.id}`}
												target="_blank"
												rel="noopener noreferrer"
												class="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] px-3 py-1.5 text-body-sm text-[var(--color-on-surface)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
											>
												<span class="material-symbols-outlined text-[16px] text-[var(--color-primary)]">
													{att.type === 'log' ? 'terminal' : att.type === 'pdf' ? 'picture_as_pdf' : 'image'}
												</span>
												<span class="font-medium text-xs">{att.name}</span>
												<span class="text-[10px] text-[var(--color-outline)]">({att.size})</span>
											</a>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Interactive Reply Box -->
					<form
						method="POST"
						action="?/reply"
						use:enhance={() => {
							isSubmittingReply = true;
							return async ({ update }) => {
								isSubmittingReply = false;
								replyText = '';
								await update();
							};
						}}
						class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs space-y-3"
					>
						<label for="reply-box" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Add a Reply
						</label>
						<textarea
							id="reply-box"
							name="content"
							rows="4"
							required
							bind:value={replyText}
							placeholder="Write a message, ask a question, or provide additional information..."
							class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:text-[var(--color-outline)] resize-y"
						></textarea>

						<div class="flex items-center justify-end pt-1">
							<button
								type="submit"
								disabled={isSubmittingReply}
								class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-6 py-2 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
							>
								<span>{isSubmittingReply ? 'Sending...' : 'Send Reply'}</span>
								<span class="material-symbols-outlined text-[16px]">send</span>
							</button>
						</div>
					</form>

					{#if isViewer}
						<span class="inline-flex items-center gap-1.5 text-label-md font-medium text-[var(--color-on-surface-variant)]/60">
							<span class="material-symbols-outlined text-[18px]">attach_file</span>
							<span>Attach file</span>
						</span>
					{:else}
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
							<label
								class="inline-flex items-center gap-1.5 text-label-md font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors cursor-pointer {isAttaching ? 'opacity-50' : ''}"
							>
								<span class="material-symbols-outlined text-[18px]">attach_file</span>
								<span>{isAttaching ? 'Uploading...' : 'Attach file'}</span>
								<input
									type="file"
									name="file"
									class="hidden"
									disabled={isAttaching}
									onchange={(e) => (e.currentTarget.form as HTMLFormElement)?.requestSubmit()}
								/>
							</label>
						</form>
					{/if}
				</div>
			</div>

			<!-- Right Column: Ticket Metadata & Quick Actions (4 cols) -->
			<div class="lg:col-span-4 flex flex-col gap-6">
				<!-- Ticket Properties Card -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs space-y-4">
					<h3 class="text-base font-bold text-[var(--color-on-surface)] pb-2 border-b border-[var(--color-border-subtle)]">
						Ticket Details
					</h3>

					<div class="space-y-3 text-body-sm">
						<div>
							<span class="text-label-sm uppercase tracking-wider text-[var(--color-outline)]">Assigned Engineer</span>
							<div class="flex items-center gap-3 mt-1.5">
								<div class="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-high)] text-[11px] font-bold text-[var(--color-on-surface-variant)]">
									{ticket.assignee.name.slice(0, 2).toUpperCase()}
								</div>
								<div>
									<div class="font-bold text-[var(--color-on-surface)]">{ticket.assignee.name}</div>
									<div class="text-[11px] text-[var(--color-on-surface-variant)]">{ticket.assignee.role}</div>
								</div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border-subtle)]/60">
							<div>
								<span class="text-label-sm uppercase tracking-wider text-[var(--color-outline)]">Priority</span>
								<div class="font-semibold text-[var(--color-on-surface)] mt-0.5 flex items-center gap-1.5">
									<span class="h-2 w-2 rounded-full {data.ticket.priority === 'high' ? 'bg-amber-500' : data.ticket.priority === 'critical' ? 'bg-rose-500' : 'bg-blue-500'}"></span>
									<span>{ticket.priority}</span>
								</div>
							</div>

							<div>
								<span class="text-label-sm uppercase tracking-wider text-[var(--color-outline)]">Application</span>
								<div class="font-semibold text-[var(--color-on-surface)] mt-0.5">{ticket.application}</div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border-subtle)]/60">
							<div>
								<span class="text-label-sm uppercase tracking-wider text-[var(--color-outline)]">Created</span>
								<div class="font-medium text-[var(--color-on-surface)] mt-0.5 text-xs">{ticket.createdAt}</div>
							</div>

							<div>
								<span class="text-label-sm uppercase tracking-wider text-[var(--color-outline)]">Target Date</span>
								<div class="font-semibold mt-0.5 text-xs {ticket.isOverdue ? 'text-[var(--color-error)]' : 'text-[var(--color-primary)]'}">
									{ticket.targetDate
										? new Date(ticket.targetDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
										: 'Not set'}
									{#if ticket.isOverdue}<span class="ml-1">· Overdue</span>{/if}
								</div>
							</div>
						</div>

						<div class="pt-2 border-t border-[var(--color-border-subtle)]/60">
							<span class="text-label-sm uppercase tracking-wider text-[var(--color-outline)]">CC'd Members ({ticket.watchers.length})</span>
							<div class="flex flex-wrap gap-1.5 mt-1.5">
								{#each ticket.watchers as w}
									{#if isViewer}
										<span class="inline-flex items-center gap-1 rounded bg-[var(--color-surface-container-high)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
											<span class="material-symbols-outlined text-[13px] text-[var(--color-primary)]">mail</span>
											<span>{w.email}</span>
										</span>
									{:else}
										<form method="POST" action="?/removeWatcher" use:enhance class="inline-flex">
											<input type="hidden" name="watcher_id" value={w.id} />
											<button
												type="submit"
												class="inline-flex items-center gap-1 rounded bg-[var(--color-surface-container-high)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)] cursor-pointer hover:bg-[var(--color-surface-container)]"
												title="Remove watcher"
											>
												<span class="material-symbols-outlined text-[13px] text-[var(--color-primary)]">mail</span>
												<span>{w.email}</span>
												<span class="material-symbols-outlined text-[12px]">close</span>
											</button>
										</form>
									{/if}
								{/each}
							</div>
							{#if !isViewer}
								<form method="POST" action="?/addWatcher" use:enhance class="flex items-center gap-1.5 mt-2">
									<input
										name="email"
										type="email"
										required
										placeholder="name@company.com"
										class="h-7 flex-1 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-2 text-[11px]"
									/>
									<button type="submit" class="text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer">
										Add
									</button>
								</form>
							{/if}
						</div>

						{#if data.dependencyNotes && data.dependencyNotes.length > 0}
							{@const reportedPeople = data.dependencyNotes.filter((n) => n.kind === 'person')}
							{@const reportedModules = data.dependencyNotes.filter((n) => n.kind === 'module')}
							<div class="pt-2 border-t border-[var(--color-border-subtle)]/60 space-y-2">
								<span class="text-label-sm uppercase tracking-wider text-[var(--color-outline)]">Reported Dependencies</span>
								{#if reportedPeople.length > 0}
									<div class="flex flex-wrap gap-1.5">
										{#each reportedPeople as note}
											<span class="inline-flex items-center gap-1 rounded bg-[var(--color-surface-container-high)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
												<span class="material-symbols-outlined text-[13px] text-[var(--color-primary)]">person</span>
												<span>{note.label}{note.detail ? ` (${note.detail})` : ''}</span>
											</span>
										{/each}
									</div>
								{/if}
								{#if reportedModules.length > 0}
									<div class="flex flex-wrap gap-1.5">
										{#each reportedModules as note}
											<span class="inline-flex items-center gap-1 rounded bg-[var(--color-surface-container-high)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
												<span class="material-symbols-outlined text-[13px] text-[var(--color-primary)]">apps</span>
												<span>{note.label}{note.detail ? ` (${note.detail})` : ''}</span>
											</span>
										{/each}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Estimate Approval Card -->
				{#if data.ticket.status === 'client_approval' && !data.ticket.client_approved_at}
					<div class="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-5 shadow-xs space-y-3">
						<h3 class="text-base font-bold text-[var(--color-on-surface)] flex items-center gap-1.5">
							<span class="material-symbols-outlined text-[20px] text-amber-600">pending_actions</span>
							<span>Estimate Ready for Your Approval</span>
						</h3>
						<div class="rounded-lg bg-white border border-amber-200 p-3 flex items-center justify-between">
							<span class="text-body-sm text-[var(--color-on-surface-variant)]">Estimated Effort</span>
							<span class="text-title-md font-bold text-[var(--color-on-surface)]">
								{data.ticket.estimated_hours !== null && data.ticket.estimated_hours !== undefined ? `${data.ticket.estimated_hours}h` : 'Not scoped'}
							</span>
						</div>

						{#if isViewer}
							<p class="text-body-sm text-[var(--color-on-surface-variant)]">
								Awaiting approval from an admin or raiser on your team — viewers can't approve estimates.
							</p>
						{:else}
							<form
								method="POST"
								action="?/approveEstimate"
								use:enhance={() => {
									isSubmittingApproval = true;
									return async ({ update }) => {
										isSubmittingApproval = false;
										approvalNotes = '';
										await update();
									};
								}}
								class="space-y-2.5"
							>
								<textarea
									name="notes"
									rows="2"
									bind:value={approvalNotes}
									placeholder="Optional notes for the team..."
									class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-body-sm outline-none focus:border-[var(--color-primary)]"
								></textarea>
								<div class="flex items-center gap-2">
									<button
										type="submit"
										disabled={isSubmittingApproval}
										class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-label-md font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
									>
										<span class="material-symbols-outlined text-[18px]">check</span>
										<span>Approve Estimate</span>
									</button>
									<button
										type="submit"
										formaction="?/requestEstimateChanges"
										disabled={isSubmittingApproval}
										class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-white px-4 py-2 text-label-md font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] transition-colors disabled:opacity-50 cursor-pointer"
									>
										<span class="material-symbols-outlined text-[18px]">undo</span>
										<span>Request Changes</span>
									</button>
								</div>
								<p class="text-[11px] text-[var(--color-on-surface-variant)]">Notes are required if requesting changes.</p>
							</form>
						{/if}
					</div>
				{:else if data.ticket.status === 'client_approval' && data.ticket.client_approved_at}
					<div class="rounded-xl border border-emerald-300 bg-emerald-50/50 p-5 shadow-xs space-y-1.5">
						<h3 class="text-base font-bold text-[var(--color-on-surface)] flex items-center gap-1.5">
							<span class="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
							<span>Estimate Approved</span>
						</h3>
						<p class="text-body-sm text-[var(--color-on-surface-variant)]">
							You approved this on {new Date(data.ticket.client_approved_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}. Our team will start development shortly.
						</p>
					</div>
				{/if}

				<!-- Quick Actions Card -->
				{#if !isPendingApproval && !isRejected}
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs space-y-3">
					<h3 class="text-base font-bold text-[var(--color-on-surface)]">Quick Actions</h3>

					{#if updateRequested}
						<div class="rounded-lg bg-[#EDF7ED] border border-[#C8E6C9] p-3 text-body-sm text-[#1E4620] flex items-center gap-2">
							<span class="material-symbols-outlined text-[#2E7D32] text-lg">check_circle</span>
							<span>Status update requested from engineering lead.</span>
						</div>
					{:else}
						<button
							type="button"
							onclick={requestUpdate}
							class="w-full flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] py-2.5 text-label-md font-semibold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
						>
							<span class="material-symbols-outlined text-[18px]">notifications_active</span>
							<span>Request Status Update</span>
						</button>
					{/if}

					{#if isViewer}
						<p class="text-body-xs text-[var(--color-on-surface-variant)]">Viewer accounts are read-only.</p>
					{:else if data.ticket.status !== 'closed'}
						{#if data.blockers.length > 0}
							<div
								class="w-full flex items-start gap-2 rounded-lg p-3 text-body-sm {BLOCKED_BADGE_CLASS}"
							>
								<span class="material-symbols-outlined text-[18px]">block</span>
								<span>Blocked by {data.blockers.map((b) => b.token).join(', ')} — resolve the linked ticket(s) first.</span>
							</div>
						{:else}
							<button
								type="button"
								onclick={() => openConfirm('close')}
								class="w-full flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] py-2.5 text-label-md font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors cursor-pointer"
							>
								<span class="material-symbols-outlined text-[18px]">lock_reset</span>
								<span>Mark as Resolved</span>
							</button>
						{/if}
					{:else}
						<button
							type="button"
							onclick={() => openConfirm('reopen')}
							class="w-full flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] py-2.5 text-label-md font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors cursor-pointer"
						>
							<span class="material-symbols-outlined text-[18px]">restart_alt</span>
							<span>Reopen Ticket</span>
						</button>
					{/if}
				</div>
				{/if}

				<!-- Attached Files Card -->
				{#if ticket.attachments && ticket.attachments.length > 0}
					<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs space-y-3">
						<h3 class="text-base font-bold text-[var(--color-on-surface)]">Attached Files ({ticket.attachments.length})</h3>
						<div class="space-y-2">
							{#each ticket.attachments as att}
								<div class="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)]/50 p-2.5 text-body-sm">
									<div class="flex items-center gap-2 overflow-hidden">
										<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)]">
											{att.type === 'pdf' ? 'picture_as_pdf' : 'image'}
										</span>
										<div class="truncate">
											<div class="font-medium text-xs text-[var(--color-on-surface)] truncate">{att.name}</div>
											<div class="text-[10px] text-[var(--color-outline)]">{att.size}</div>
										</div>
									</div>
									<a
										href={`/attachments/${att.id}`}
										target="_blank"
										rel="noopener noreferrer"
										class="p-1 text-[var(--color-primary)] hover:underline text-xs font-semibold"
									>
										View
									</a>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
</div>

<!-- Confirm Resolve / Reopen Modal -->
{#if confirmAction}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="fixed inset-0 bg-black/50 backdrop-blur-xs"
			onclick={() => (confirmAction = null)}
			aria-label="Close"
		></button>
		<div class="relative w-full max-w-sm rounded-2xl bg-[var(--color-surface-container-lowest)] p-6 shadow-2xl z-10 space-y-4">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full {confirmAction === 'close'
						? 'bg-emerald-50 text-emerald-700'
						: 'bg-amber-50 text-amber-700'}"
				>
					<span class="material-symbols-outlined text-[22px]">{confirmAction === 'close' ? 'lock_reset' : 'restart_alt'}</span>
				</div>
				<h3 class="text-title-md font-bold text-[var(--color-on-surface)]">
					{confirmAction === 'close' ? 'Mark ticket as resolved?' : 'Reopen this ticket?'}
				</h3>
			</div>
			<p class="text-body-sm text-[var(--color-on-surface-variant)]">
				{confirmAction === 'close'
					? 'This confirms the issue has been fixed. You can reopen it later if the problem comes back.'
					: 'Our team will be notified and will pick this back up.'}
			</p>

			{#if actionError}
				<div class="flex items-center gap-2 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-body-sm text-[var(--color-error)]">
					<span class="material-symbols-outlined text-[16px] shrink-0">error</span>
					<span>{actionError}</span>
				</div>
			{/if}

			<form
				method="POST"
				action={confirmAction === 'close' ? '?/close' : '?/reopen'}
				use:enhance={() => {
					isSubmittingAction = true;
					return async ({ result, update }) => {
						isSubmittingAction = false;
						if (result.type === 'success') {
							successMessage =
								confirmAction === 'close' ? 'Ticket marked as resolved.' : 'Ticket reopened — our team has been notified.';
							confirmAction = null;
						} else if (result.type === 'failure') {
							actionError = (result.data as { error?: string })?.error ?? 'Something went wrong.';
						}
						await update();
					};
				}}
				class="flex items-center justify-end gap-3"
			>
				<button
					type="button"
					onclick={() => (confirmAction = null)}
					disabled={isSubmittingAction}
					class="rounded-lg border border-[var(--color-border-subtle)] bg-white px-4 py-2 text-label-md font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] transition-colors disabled:opacity-50 cursor-pointer"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isSubmittingAction}
					class="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-label-md font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer {confirmAction === 'close'
						? 'bg-emerald-600 hover:bg-emerald-700'
						: 'bg-[var(--color-primary-container)] hover:bg-[var(--color-primary)]'}"
				>
					{#if isSubmittingAction}
						<span class="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
						<span>Please wait...</span>
					{:else}
						<span>{confirmAction === 'close' ? 'Yes, Resolve' : 'Yes, Reopen'}</span>
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Success Modal -->
{#if successMessage}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="fixed inset-0 bg-black/50 backdrop-blur-xs"
			onclick={() => (successMessage = null)}
			aria-label="Close"
		></button>
		<div class="relative w-full max-w-sm rounded-2xl bg-[var(--color-surface-container-lowest)] p-6 shadow-2xl z-10 space-y-4 text-center">
			<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
				<span class="material-symbols-outlined text-[32px]">check_circle</span>
			</div>
			<h3 class="text-title-md font-bold text-[var(--color-on-surface)]">Success</h3>
			<p class="text-body-sm text-[var(--color-on-surface-variant)]">{successMessage}</p>
			<button
				type="button"
				onclick={() => (successMessage = null)}
				class="w-full rounded-lg bg-[var(--color-primary-container)] px-4 py-2.5 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors cursor-pointer"
			>
				Done
			</button>
		</div>
	</div>
{/if}
