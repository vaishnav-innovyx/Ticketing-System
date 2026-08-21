<script lang="ts">
	import { enhance } from '$app/forms';
	import { STATUS_LABEL, formatRelative } from '$lib/portal/ticketDisplay';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isSubmitting = $state(false);
	let replyContent = $state('');
	let messagesContainer: HTMLDivElement | undefined = $state();

	$effect(() => {
		// Track the message list so this re-runs whenever it changes, and scroll to the latest.
		data.messages;
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	});
</script>

<svelte:head>
	<title>Communication - Nexus Service Desk</title>
</svelte:head>

<div class="flex h-[calc(100vh-8rem)] gap-4">
	<!-- Conversation List -->
	<div class="w-full max-w-sm shrink-0 rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] overflow-hidden flex flex-col">
		<div class="p-4 border-b border-[var(--color-outline-variant)]/40">
			<h1 class="text-title-md font-bold text-[var(--color-on-surface)]">Communication</h1>
			<p class="text-body-xs text-[var(--color-on-surface-variant)] mt-0.5">
				Every ticket conversation, in one place.
			</p>
		</div>

		<div class="flex-1 overflow-y-auto divide-y divide-[var(--color-outline-variant)]/30">
			{#if data.conversations.length === 0}
				<p class="p-4 text-body-sm text-[var(--color-outline)]">No conversations yet.</p>
			{:else}
				{#each data.conversations as convo}
					{@const isSelected = data.selectedTicket?.id === convo.ticketId}
					<a
						href="?ticket={convo.ticketId}"
						class="block p-3.5 transition-colors {isSelected
							? 'bg-[var(--color-primary-container)]/20'
							: 'hover:bg-[var(--color-surface-container-low)]'}"
					>
						<div class="flex items-center justify-between gap-2">
							<span class="font-mono text-label-xs font-bold text-[var(--color-primary)] truncate">{convo.token}</span>
							{#if convo.unreadCount > 0}
								<span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[11px] font-bold text-white">
									{convo.unreadCount}
								</span>
							{/if}
						</div>
						<p class="text-body-sm font-semibold text-[var(--color-on-surface)] truncate mt-0.5">{convo.title}</p>
						<p class="text-[11px] text-[var(--color-on-surface-variant)] truncate mt-0.5">
							<span class="font-medium">{convo.lastMessageAuthorName}:</span>
							{convo.lastMessagePreview}
						</p>
						<p class="text-[10px] text-[var(--color-outline)] mt-1">{convo.clientName} &bull; {formatRelative(convo.lastMessageAt)}</p>
					</a>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Thread -->
	<div class="flex-1 rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] overflow-hidden flex flex-col">
		{#if !data.selectedTicket}
			<div class="flex-1 flex flex-col items-center justify-center text-center p-8">
				<span class="material-symbols-outlined text-[48px] text-[var(--color-outline)] mb-2">forum</span>
				<p class="text-body-md font-medium text-[var(--color-on-surface-variant)]">Select a conversation to view the thread.</p>
			</div>
		{:else}
			<div class="p-4 border-b border-[var(--color-outline-variant)]/40 flex items-center justify-between">
				<div>
					<div class="flex items-center gap-2">
						<span class="font-mono text-label-sm font-bold text-[var(--color-primary)]">{data.selectedTicket.token}</span>
						<span class="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-label-xs font-bold text-indigo-700">
							{STATUS_LABEL[data.selectedTicket.status as keyof typeof STATUS_LABEL] ?? data.selectedTicket.status}
						</span>
					</div>
					<h2 class="text-title-sm font-bold text-[var(--color-on-surface)] mt-0.5">{data.selectedTicket.title}</h2>
					<p class="text-body-xs text-[var(--color-on-surface-variant)]">{data.selectedTicket.clientName}</p>
				</div>
				<a
					href="/tickets"
					class="text-label-xs font-semibold text-[var(--color-primary)] hover:underline whitespace-nowrap"
				>
					View full ticket &rarr;
				</a>
			</div>

			<div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-4 space-y-3">
				{#if data.messages.length === 0}
					<p class="text-body-sm text-[var(--color-outline)]">No messages yet.</p>
				{:else}
					{#each data.messages as msg}
						{@const isClient = msg.author?.role?.startsWith('client_')}
						<div
							class="rounded-lg border p-3 text-body-sm max-w-2xl {isClient
								? 'border-amber-200 bg-amber-50/60'
								: 'border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] ml-auto'}"
						>
							<div class="flex items-center justify-between mb-1 gap-3">
								<span class="font-semibold text-[var(--color-on-surface)] text-body-xs">
									{msg.author?.full_name ?? 'Unknown'}
									<span class="ml-1 font-normal text-[10px] uppercase tracking-wide text-[var(--color-outline)]">
										{isClient ? 'Client' : (msg.author?.role ?? '')}
									</span>
								</span>
								<span class="text-[11px] text-[var(--color-outline)] whitespace-nowrap">
									{new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
								</span>
							</div>
							<p class="text-[var(--color-on-surface)] whitespace-pre-wrap">{msg.content}</p>
						</div>
					{/each}
				{/if}
			</div>

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
				class="p-4 border-t border-[var(--color-outline-variant)]/40 flex items-end gap-2"
			>
				<input type="hidden" name="ticket_id" value={data.selectedTicket.id} />
				<textarea
					name="content"
					rows="2"
					required
					bind:value={replyContent}
					placeholder="Reply to {data.selectedTicket.clientName}..."
					class="flex-1 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-body-sm outline-none focus:border-[var(--color-primary)]"
				></textarea>
				<button
					type="submit"
					disabled={isSubmitting || !replyContent.trim()}
					class="nexus-primary-button h-10 px-4 text-label-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
				>
					<span class="material-symbols-outlined text-[16px]">send</span>
					<span>Send</span>
				</button>
			</form>
		{/if}
	</div>
</div>
