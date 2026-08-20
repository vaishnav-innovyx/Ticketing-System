<script lang="ts">
	import { enhance } from '$app/forms';
	import TicketProgressStepper from '$lib/components/client/portal/TicketProgressStepper.svelte';
	import {
		STATUS_LABEL,
		STATUS_STEP,
		CATEGORY_LABEL,
		PRIORITY_LABEL,
		formatDateTime,
		formatBytes,
		attachmentType,
		roleLabel,
		isClientRole
	} from '$lib/portal/ticketDisplay';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
		status: STATUS_LABEL[data.ticket.status],
		category: CATEGORY_LABEL[data.ticket.category],
		priority: PRIORITY_LABEL[data.ticket.priority],
		application: data.ticket.projects?.name ?? '',
		environment: data.ticket.environment,
		createdAt: formatDateTime(data.ticket.raised_at),
		assignee,
		targetResolution: undefined as string | undefined,
		progressStep: STATUS_STEP[data.ticket.status],
		aiSummary: data.ticket.ai_summary as { whatWeUnderstand: string[]; possibleCause: string } | null,
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
				.map((a) => ({ name: a.file_name, size: formatBytes(a.file_size_bytes), type: attachmentType(a.mime_type) }))
		})),
		attachments: data.attachments
			.filter((a) => !a.message_id)
			.map((a) => ({ name: a.file_name, size: formatBytes(a.file_size_bytes), type: attachmentType(a.mime_type) }))
	});

	let replyText = $state('');
	let isSubmittingReply = $state(false);
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
					<span
						class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-secondary-container)]/30 border border-[var(--color-secondary)] text-[var(--color-secondary)] font-bold text-label-md shadow-2xs"
					>
						<span class="h-2 w-2 rounded-full bg-[var(--color-secondary)]"></span>
						<span>{ticket.status}</span>
					</span>
				</div>
			</div>

			<!-- Linear Progress Stepper -->
			<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-4 sm:p-6 shadow-xs">
				<TicketProgressStepper currentStepIndex={ticket.progressStep} />
			</div>
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
					<div class="space-y-4">
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
											<div class="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] px-3 py-1.5 text-body-sm text-[var(--color-on-surface)]">
												<span class="material-symbols-outlined text-[16px] text-[var(--color-primary)]">
													{att.type === 'log' ? 'terminal' : att.type === 'pdf' ? 'picture_as_pdf' : 'image'}
												</span>
												<span class="font-medium text-xs">{att.name}</span>
												<span class="text-[10px] text-[var(--color-outline)]">({att.size})</span>
											</div>
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

						<div class="flex items-center justify-between pt-1">
							<button
								type="button"
								class="inline-flex items-center gap-1.5 text-label-md font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
							>
								<span class="material-symbols-outlined text-[18px]">attach_file</span>
								<span>Attach file</span>
							</button>

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
									<span class="h-2 w-2 rounded-full {ticket.priority === 'High' ? 'bg-amber-500' : ticket.priority === 'Critical' ? 'bg-rose-500' : 'bg-blue-500'}"></span>
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
								<span class="text-label-sm uppercase tracking-wider text-[var(--color-outline)]">Target SLA</span>
								<div class="font-semibold text-[var(--color-primary)] mt-0.5 text-xs">{ticket.targetResolution || 'Within SLA'}</div>
							</div>
						</div>

						{#if ticket.ccRecipients && ticket.ccRecipients.length > 0}
							<div class="pt-2 border-t border-[var(--color-border-subtle)]/60">
								<span class="text-label-sm uppercase tracking-wider text-[var(--color-outline)]">CC'd Members ({ticket.ccRecipients.length})</span>
								<div class="flex flex-wrap gap-1.5 mt-1.5">
									{#each ticket.ccRecipients as cc}
										<span class="inline-flex items-center gap-1 rounded bg-[var(--color-surface-container-high)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
											<span class="material-symbols-outlined text-[13px] text-[var(--color-primary)]">mail</span>
											<span>{cc}</span>
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Quick Actions Card -->
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

					{#if ticket.status !== 'Resolved'}
						<form method="POST" action="?/close" use:enhance>
							<button
								type="submit"
								class="w-full flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] py-2.5 text-label-md font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors cursor-pointer"
							>
								<span class="material-symbols-outlined text-[18px]">lock_reset</span>
								<span>Mark as Resolved</span>
							</button>
						</form>
					{/if}
				</div>

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
									<button class="p-1 text-[var(--color-primary)] hover:underline text-xs font-semibold cursor-pointer">
										Download
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
</div>
