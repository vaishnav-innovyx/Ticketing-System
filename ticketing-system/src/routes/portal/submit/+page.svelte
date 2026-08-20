<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// URL query params pre-selection (e.g. ?type=issue, ?type=enhancement)
	const initialType = page.url.searchParams.get('type');

	let title = $state('');
	let description = $state('');
	let category = $state(initialType === 'enhancement' ? 'enhancement' : 'bug');
	let projectId = $state(data.projects[0]?.id ?? '');
	let priority = $state('medium');
	let files = $state<Array<{ name: string; size: string; type: string }>>([]);
	let ccEmailInput = $state('');
	let ccRecipients = $state<Array<{ name: string; email: string }>>([]);
	let emailError = $state('');
	let isSubmitting = $state(false);

	const submittedTicket = $derived(form?.ticket ?? null);

	const teamSuggestions = [
		{ name: 'Sarah Jenkins', email: 'sarah.j@acme.inc' },
		{ name: 'Michael Chang', email: 'm.chang@acme.inc' },
		{ name: 'Elena Rostova', email: 'e.rostova@acme.inc' },
		{ name: 'Alex Morgan', email: 'alex.m@acme.inc' }
	];

	function addCcRecipient(member: { name: string; email: string }) {
		emailError = '';
		if (!ccRecipients.some((r) => r.email.toLowerCase() === member.email.toLowerCase())) {
			ccRecipients = [...ccRecipients, member];
		}
	}

	function handleAddCustomEmail() {
		emailError = '';
		const trimmed = ccEmailInput.trim();
		if (!trimmed) return;

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(trimmed)) {
			emailError = 'Please enter a valid email address';
			return;
		}

		if (ccRecipients.some((r) => r.email.toLowerCase() === trimmed.toLowerCase())) {
			emailError = 'This email is already added as CC';
			return;
		}

		const foundSuggestion = teamSuggestions.find(
			(s) => s.email.toLowerCase() === trimmed.toLowerCase()
		);

		ccRecipients = [
			...ccRecipients,
			{
				name: foundSuggestion ? foundSuggestion.name : trimmed.split('@')[0],
				email: trimmed
			}
		];
		ccEmailInput = '';
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddCustomEmail();
		}
	}

	function removeCcRecipient(email: string) {
		ccRecipients = ccRecipients.filter((r) => r.email !== email);
	}

	function handleFileAdd(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			for (let i = 0; i < target.files.length; i++) {
				const file = target.files[i];
				files = [
					...files,
					{
						name: file.name,
						size: `${(file.size / 1024).toFixed(1)} KB`,
						type: file.type.includes('image') ? 'img' : 'doc'
					}
				];
			}
		}
	}

	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index);
	}

</script>

<svelte:head>
	<title>Raise a Ticket - Nexus Client Portal</title>
</svelte:head>

<div class="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 md:px-10 md:py-10 space-y-8">
	{#if submittedTicket}
		<!-- Submission Success Screen -->
		<div class="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-8 sm:p-12 text-center shadow-sm space-y-6">
			<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EDF7ED] text-[#2E7D32]">
				<span class="material-symbols-outlined text-[36px]">check_circle</span>
			</div>
			<div>
				<h2 class="text-2xl font-bold text-[var(--color-on-surface)]">
					Ticket Submitted Successfully!
				</h2>
				<p class="mt-2 text-body-md text-[var(--color-on-surface-variant)]">
					Your ticket <span class="font-bold text-[var(--color-primary)]">#{submittedTicket.id}</span> has been logged and assigned to our triage queue.
				</p>
			</div>

			<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] p-5 text-left space-y-2.5">
				<div class="flex justify-between text-body-sm">
					<span class="text-[var(--color-on-surface-variant)]">Summary:</span>
					<span class="font-semibold text-[var(--color-on-surface)]">{submittedTicket.title}</span>
				</div>
				<div class="flex justify-between text-body-sm">
					<span class="text-[var(--color-on-surface-variant)]">Application:</span>
					<span class="font-medium text-[var(--color-on-surface)]">{submittedTicket.application}</span>
				</div>
				<div class="flex justify-between text-body-sm">
					<span class="text-[var(--color-on-surface-variant)]">Priority:</span>
					<span class="font-semibold text-[var(--color-primary)]">{submittedTicket.priority}</span>
				</div>
				{#if submittedTicket.ccRecipients && submittedTicket.ccRecipients.length > 0}
					<div class="flex justify-between text-body-sm pt-2 border-t border-[var(--color-border-subtle)]/60">
						<span class="text-[var(--color-on-surface-variant)]">CC Notifications:</span>
						<span class="font-medium text-[var(--color-on-surface)] text-right">
							{submittedTicket.ccRecipients.join(', ')}
						</span>
					</div>
				{/if}
			</div>

			<div class="flex flex-wrap items-center justify-center gap-4 pt-2">
				<a
					href="/portal/my-tickets/{submittedTicket.id}"
					class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-6 py-2.5 text-label-md font-semibold text-white hover:bg-[var(--color-primary)] transition-colors shadow-2xs"
				>
					<span>View Ticket #{submittedTicket.id}</span>
					<span class="material-symbols-outlined text-[18px]">arrow_forward</span>
				</a>
				<a
					href="/portal/submit"
					class="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-6 py-2.5 text-label-md font-semibold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors"
				>
					Raise Another Ticket
				</a>
			</div>
		</div>
	{:else}
		<!-- Page Header & Back Navigation -->
		<div class="space-y-3">
			<a
				href="/portal"
				class="inline-flex items-center gap-1 text-label-md font-semibold text-[var(--color-outline)] hover:text-[var(--color-primary)] transition-colors"
			>
				<span class="material-symbols-outlined text-[16px]">arrow_back</span>
				<span>Back to Support Center</span>
			</a>
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-[var(--color-on-surface)]">
					Raise a Ticket
				</h1>
				<p class="text-body-md text-[var(--color-on-surface-variant)] mt-1">
					Provide details about your issue or request to help us resolve it quickly.
				</p>
			</div>
		</div>

		<!-- 2-Column Layout (Form on Left, Guidelines on Right) -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			<!-- Left Form Column (8 cols) -->
			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
				class="lg:col-span-8 flex flex-col gap-6"
			>
				{#if form?.error}
					<div class="rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-4 py-2.5 text-body-sm text-[var(--color-error)]">
						{form.error}
					</div>
				{/if}

				{#each ccRecipients as recipient}
					<input type="hidden" name="cc" value={recipient.email} />
				{/each}

				<!-- Section 1: Issue Details -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xs space-y-4">
					<h2 class="text-lg font-bold text-[var(--color-on-surface)] pb-3 border-b border-[var(--color-border-subtle)]">
						Tell us about the issue
					</h2>

					<div class="space-y-1.5">
						<label for="issue-title" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Issue Title <span class="text-[var(--color-error)]">*</span>
						</label>
						<input
							id="issue-title"
							name="title"
							type="text"
							required
							bind:value={title}
							placeholder="Brief summary of the problem (e.g., Invoice PDF is not downloading)"
							class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:text-[var(--color-outline)]"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="issue-desc" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Description <span class="text-[var(--color-error)]">*</span>
						</label>
						<textarea
							id="issue-desc"
						name="description"
							required
							rows="6"
							bind:value={description}
							placeholder="Provide detailed information about the issue, reproduction steps, error messages, and expected behavior."
							class="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-body-md text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:text-[var(--color-outline)] resize-y"
						></textarea>
					</div>
				</div>

				<!-- Section 2: CC Team Members -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xs space-y-4">
					<div class="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
						<div class="flex items-center gap-2.5">
							<span class="material-symbols-outlined text-[var(--color-primary)] text-2xl">group_add</span>
							<h2 class="text-lg font-bold text-[var(--color-on-surface)]">
								CC Team Members
							</h2>
						</div>
						<span class="text-label-sm font-medium text-[var(--color-on-surface-variant)]">Optional</span>
					</div>

					<p class="text-body-sm text-[var(--color-on-surface-variant)]">
						Add colleagues who should be kept in the loop. They will receive automated email updates whenever new comments or status transitions occur.
					</p>

					<!-- Input row to add CC email -->
					<div class="space-y-1.5">
						<label for="cc-email-input" class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							Add by Email
						</label>
						<div class="flex gap-2">
							<div class="relative flex-1">
								<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] text-[18px]">
									mail
								</span>
								<input
									id="cc-email-input"
									type="email"
									bind:value={ccEmailInput}
									onkeydown={handleKeyDown}
									placeholder="colleague@acme.inc"
									class="w-full rounded-lg border {emailError ? 'border-[var(--color-error)]' : 'border-[var(--color-border-subtle)]'} bg-[var(--color-surface-container-lowest)] py-2.5 pl-10 pr-4 text-body-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:text-[var(--color-outline)]"
								/>
							</div>
							<button
								type="button"
								onclick={handleAddCustomEmail}
								class="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] px-4 py-2 text-label-md font-semibold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
							>
								Add CC
							</button>
						</div>
						{#if emailError}
							<p class="text-[12px] font-medium text-[var(--color-error)]">{emailError}</p>
						{/if}
					</div>

					<!-- Quick Suggestions from Acme Corp -->
					<div class="space-y-2 pt-1">
						<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-outline)]">
							Suggested Acme Corp Members
						</span>
						<div class="flex flex-wrap gap-2">
							{#each teamSuggestions as suggestion}
								{@const isAdded = ccRecipients.some((r) => r.email === suggestion.email)}
								<button
									type="button"
									onclick={() => (isAdded ? removeCcRecipient(suggestion.email) : addCcRecipient(suggestion))}
									class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-body-sm transition-all cursor-pointer {isAdded
										? 'border-[var(--color-primary)] bg-[var(--color-primary-fixed)]/30 text-[var(--color-primary)] font-semibold shadow-2xs'
										: 'border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)]/50 text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]'}"
								>
									<span class="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-[10px] font-bold text-white">
										{suggestion.name.split(' ').map((n) => n[0]).join('')}
									</span>
									<span>{suggestion.name}</span>
									<span class="material-symbols-outlined text-[14px]">
										{isAdded ? 'check' : 'add'}
									</span>
								</button>
							{/each}
						</div>
					</div>

					<!-- Selected CC Recipients Chips -->
					{#if ccRecipients.length > 0}
						<div class="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]/60">
							<span class="text-label-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
								Currently Added ({ccRecipients.length})
							</span>
							<div class="flex flex-wrap gap-2">
								{#each ccRecipients as recipient}
									<div class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary-fixed)]/20 px-3 py-1.5 text-body-sm text-[var(--color-on-surface)]">
										<span class="material-symbols-outlined text-[16px] text-[var(--color-primary)]">person</span>
										<span class="font-semibold text-xs">{recipient.name}</span>
										<span class="text-[11px] text-[var(--color-on-surface-variant)]">({recipient.email})</span>
										<button
											type="button"
											onclick={() => removeCcRecipient(recipient.email)}
											class="text-[var(--color-outline)] hover:text-[var(--color-error)] transition-colors ml-1 cursor-pointer"
											title="Remove CC"
										>
											<span class="material-symbols-outlined text-[16px]">close</span>
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Section 3: Request Type -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xs space-y-4">
					<h2 class="text-lg font-bold text-[var(--color-on-surface)] pb-3 border-b border-[var(--color-border-subtle)]">
						What kind of request is this?
					</h2>

					<div class="grid grid-cols-1 md:grid-cols-4 gap-3">
						{#each [
							{ value: 'bug', label: 'Report an Issue', icon: 'bug_report' },
							{ value: 'enhancement', label: 'Enhancement', icon: 'upgrade' },
							{ value: 'kt', label: 'Knowledge Transfer', icon: 'school' },
							{ value: 'training', label: 'Training', icon: 'help' }
						] as opt}
							<label
								class="relative flex items-center gap-3.5 rounded-lg border p-4 cursor-pointer transition-all {category === opt.value
									? 'border-[var(--color-primary)] bg-[var(--color-primary-fixed)]/20 shadow-2xs'
									: 'border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-container-low)]'}"
							>
								<input type="radio" name="category" value={opt.value} bind:group={category} class="sr-only" />
								<span class="material-symbols-outlined {category === opt.value ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}">
									{opt.icon}
								</span>
								<span class="text-label-md font-semibold text-[var(--color-on-surface)]">{opt.label}</span>
								<div class="ml-auto h-4 w-4 rounded-full border border-[var(--color-outline)] flex items-center justify-center {category === opt.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : ''}">
									{#if category === opt.value}
										<div class="h-1.5 w-1.5 rounded-full bg-white"></div>
									{/if}
								</div>
							</label>
						{/each}
					</div>
				</div>

				<!-- Section 4: Affected Application -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xs space-y-4">
					<h2 class="text-lg font-bold text-[var(--color-on-surface)] pb-3 border-b border-[var(--color-border-subtle)]">
						Which application is affected?
					</h2>

					{#if data.projects.length === 0}
						<p class="text-body-sm text-[var(--color-on-surface-variant)]">
							You aren't assigned to any application yet. Contact your client admin.
						</p>
					{:else}
						<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
							{#each data.projects as proj}
								<label
									class="flex flex-col items-center gap-2 rounded-lg border p-4 text-center cursor-pointer transition-all {projectId === proj.id
										? 'border-[var(--color-primary)] bg-[var(--color-primary-fixed)]/20 shadow-2xs'
										: 'border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-container-low)]'}"
								>
									<input type="radio" name="project_id" value={proj.id} bind:group={projectId} class="sr-only" />
									<span class="material-symbols-outlined text-2xl {projectId === proj.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}">
										apps
									</span>
									<span class="text-label-md font-medium text-[var(--color-on-surface)]">{proj.name}</span>
								</label>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Section 5: Urgency Level -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xs space-y-4">
					<h2 class="text-lg font-bold text-[var(--color-on-surface)] pb-3 border-b border-[var(--color-border-subtle)]">
						Urgency Level
					</h2>

					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
						{#each [
							{ level: 'low', label: 'Low', desc: 'General question / minor', dot: 'bg-slate-400' },
							{ level: 'medium', label: 'Medium', desc: 'Standard business impact', dot: 'bg-blue-500' },
							{ level: 'high', label: 'High', desc: 'Important feature degraded', dot: 'bg-amber-500' },
							{ level: 'critical', label: 'Critical', desc: 'System outage / blocker', dot: 'bg-rose-500' }
						] as urg}
							<label
								class="flex flex-col gap-1.5 rounded-lg border p-3.5 cursor-pointer transition-all {priority === urg.level
									? 'border-[var(--color-primary)] bg-[var(--color-primary-fixed)]/20 shadow-2xs'
									: 'border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-container-low)]'}"
							>
								<input type="radio" name="priority" value={urg.level} bind:group={priority} class="sr-only" />
								<div class="flex items-center gap-2">
									<div class="h-2.5 w-2.5 rounded-full {urg.dot}"></div>
									<span class="text-label-md font-bold text-[var(--color-on-surface)]">{urg.label}</span>
								</div>
								<span class="text-[11px] text-[var(--color-on-surface-variant)]">{urg.desc}</span>
							</label>
						{/each}
					</div>
				</div>

				<!-- Section 6: Attachments -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-6 shadow-xs space-y-4">
					<h2 class="text-lg font-bold text-[var(--color-on-surface)] pb-3 border-b border-[var(--color-border-subtle)]">
						Attachments (Optional)
					</h2>

					<div
						class="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border-subtle)] p-8 hover:border-[var(--color-primary)] transition-colors bg-[var(--color-surface-container-low)]/40"
					>
						<span class="material-symbols-outlined text-4xl text-[var(--color-outline)] mb-2">
							cloud_upload
						</span>
						<p class="text-body-md font-semibold text-[var(--color-on-surface)]">
							Drag & drop screenshots, logs, or error files
						</p>
						<p class="text-body-sm text-[var(--color-on-surface-variant)] mt-0.5">
							or <span class="text-[var(--color-primary)] font-medium underline">browse files</span> from your computer
						</p>
						<input
							type="file"
						name="attachments"
							multiple
							onchange={handleFileAdd}
							class="absolute inset-0 opacity-0 cursor-pointer"
						/>
					</div>

					{#if files.length > 0}
						<div class="flex flex-wrap gap-2 pt-2">
							{#each files as f, i}
								<div class="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] px-3 py-1.5 text-body-sm text-[var(--color-on-surface)]">
									<span class="material-symbols-outlined text-[16px] text-[var(--color-primary)]">attachment</span>
									<span class="font-medium">{f.name}</span>
									<span class="text-[11px] text-[var(--color-outline)]">({f.size})</span>
									<button
										type="button"
										onclick={() => removeFile(i)}
										class="text-[var(--color-outline)] hover:text-[var(--color-error)] ml-1 cursor-pointer"
									>
										<span class="material-symbols-outlined text-[16px]">close</span>
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Form Actions -->
				<div class="flex items-center gap-4 pt-2">
					<button
						type="submit"
						disabled={isSubmitting}
						class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-8 py-3 text-label-lg font-semibold text-white hover:bg-[var(--color-primary)] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
					>
						<span>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</span>
						<span class="material-symbols-outlined text-[18px]">send</span>
					</button>

					<a
						href="/portal"
						class="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] px-6 py-3 text-label-lg font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors"
					>
						Cancel
					</a>
				</div>
			</form>

			<!-- Right Guidance Sidebar (4 cols) -->
			<div class="lg:col-span-4 flex flex-col gap-6">
				<!-- Need Help Fast Card -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs space-y-3">
					<div class="flex items-center gap-2.5 text-[var(--color-primary)]">
						<span class="material-symbols-outlined text-2xl">tips_and_updates</span>
						<h3 class="text-base font-bold text-[var(--color-on-surface)]">Tips for Faster Resolution</h3>
					</div>
					<ul class="space-y-2 text-body-sm text-[var(--color-on-surface-variant)] list-disc list-inside">
						<li>Include exact steps taken prior to the error.</li>
						<li>Attach screenshots or full-screen error captures.</li>
						<li>Add relevant team members in CC for quick approvals.</li>
						<li>Mention browser type and operating system version.</li>
						<li>Include affected user IDs or invoice numbers.</li>
					</ul>
				</div>

				<!-- Expected Response Times SLA -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs space-y-3">
					<div class="flex items-center gap-2.5 text-[var(--color-secondary)]">
						<span class="material-symbols-outlined text-2xl">schedule</span>
						<h3 class="text-base font-bold text-[var(--color-on-surface)]">Response SLA</h3>
					</div>
					<div class="space-y-2.5 text-body-sm">
						<div class="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
							<span class="font-medium text-[var(--color-on-surface)]">Critical Impact</span>
							<span class="font-bold text-[var(--color-error)]">&lt; 1 hour</span>
						</div>
						<div class="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
							<span class="font-medium text-[var(--color-on-surface)]">High Priority</span>
							<span class="font-bold text-amber-600">&lt; 4 hours</span>
						</div>
						<div class="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-2">
							<span class="font-medium text-[var(--color-on-surface)]">Medium Priority</span>
							<span class="font-bold text-[var(--color-on-surface)]">&lt; 12 hours</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="font-medium text-[var(--color-on-surface)]">Low / General</span>
							<span class="font-bold text-[var(--color-outline)]">&lt; 24 hours</span>
						</div>
					</div>
				</div>

				<!-- Quick Knowledge Base Links -->
				<div class="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-lowest)] p-5 shadow-xs space-y-3">
					<h3 class="text-base font-bold text-[var(--color-on-surface)]">Common Issues</h3>
					<div class="space-y-2">
						<a href="/portal" class="block text-body-sm text-[var(--color-primary)] hover:underline">
							• How to clear browser invoice cache &rarr;
						</a>
						<a href="/portal" class="block text-body-sm text-[var(--color-primary)] hover:underline">
							• Resetting 2FA for team members &rarr;
						</a>
						<a href="/portal" class="block text-body-sm text-[var(--color-primary)] hover:underline">
							• Exporting quarterly sales CSV reports &rarr;
						</a>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
