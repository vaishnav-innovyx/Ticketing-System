<script lang="ts">
	import { parseDiagnostics, formatLogsAsText } from '$lib/utils/diagnostics';
	import type { LogLevel } from '$lib/types/diagnostics';

	let { diagnostics = null }: { diagnostics: unknown } = $props();

	const parsed = $derived(parseDiagnostics(diagnostics));

	let filterLevel = $state<LogLevel | 'all'>('all');
	let searchQuery = $state('');
	let showRawJson = $state(false);
	let copied = $state(false);
	let expandedLogs = $state<Record<string, boolean>>({});

	const filteredLogs = $derived.by(() => {
		if (!parsed) return [];
		return parsed.logs.filter((log) => {
			const matchesLevel =
				filterLevel === 'all' ||
				log.level === filterLevel ||
				(filterLevel === 'info' && log.level === 'log');

			if (!matchesLevel) return false;

			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				log.message.toLowerCase().includes(q) ||
				(log.stack && log.stack.toLowerCase().includes(q)) ||
				(log.timestamp && log.timestamp.toLowerCase().includes(q))
			);
		});
	});

	function toggleExpand(id: string) {
		expandedLogs[id] = !expandedLogs[id];
	}

	async function copyLogs() {
		if (!parsed) return;
		const text = formatLogsAsText(parsed);
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy logs:', err);
		}
	}

	function downloadLogs() {
		if (!parsed) return;
		const text = formatLogsAsText(parsed);
		const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ticket-console-logs-${new Date().toISOString().slice(0, 10)}.log`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

{#if !parsed}
	<div class="rounded-xl border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] p-5 text-center">
		<span class="material-symbols-outlined text-[28px] text-[var(--color-outline)] mb-1">terminal</span>
		<p class="text-body-sm font-medium text-[var(--color-outline)]">No console logs or diagnostics attached to this ticket.</p>
	</div>
{:else}
	<div class="rounded-xl border border-slate-700/80 bg-[#0d1117] text-[#c9d1d9] shadow-xl overflow-hidden font-mono text-xs">
		<!-- Header Toolbar -->
		<div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 bg-[#161b22] px-4 py-3">
			<div class="flex items-center gap-2">
				<div class="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400">
					<span class="material-symbols-outlined text-[16px]">terminal</span>
				</div>
				<span class="font-semibold text-white tracking-wide">Client Console & Diagnostics</span>
				<span class="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
					{parsed.logs.length} {parsed.logs.length === 1 ? 'entry' : 'entries'}
				</span>
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => (showRawJson = !showRawJson)}
					class="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
					title="Toggle raw JSON payload"
				>
					<span class="material-symbols-outlined text-[14px]">data_object</span>
					<span>{showRawJson ? 'Hide JSON' : 'Raw JSON'}</span>
				</button>

				<button
					type="button"
					onclick={copyLogs}
					class="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
					title="Copy all logs to clipboard"
				>
					<span class="material-symbols-outlined text-[14px] {copied ? 'text-emerald-400' : ''}">
						{copied ? 'check' : 'content_copy'}
					</span>
					<span>{copied ? 'Copied!' : 'Copy'}</span>
				</button>

				<button
					type="button"
					onclick={downloadLogs}
					class="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
					title="Download .log file"
				>
					<span class="material-symbols-outlined text-[14px]">download</span>
					<span>Download .log</span>
				</button>
			</div>
		</div>

		<!-- Environment / Client Context Banner (if available) -->
		{#if parsed.environment}
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-slate-800 bg-[#090d13] px-4 py-2 text-[11px] text-slate-400">
				{#if parsed.environment.url}
					<div class="flex items-center gap-1 truncate max-w-md" title={parsed.environment.url}>
						<span class="material-symbols-outlined text-[13px] text-slate-500">link</span>
						<span class="text-slate-500">URL:</span>
						<span class="text-slate-300 truncate">{parsed.environment.url}</span>
					</div>
				{/if}
				{#if parsed.environment.browser}
					<div class="flex items-center gap-1">
						<span class="material-symbols-outlined text-[13px] text-slate-500">web</span>
						<span class="text-slate-500">Browser:</span>
						<span class="text-slate-300">{parsed.environment.browser}</span>
					</div>
				{/if}
				{#if parsed.environment.os}
					<div class="flex items-center gap-1">
						<span class="material-symbols-outlined text-[13px] text-slate-500">devices</span>
						<span class="text-slate-500">OS:</span>
						<span class="text-slate-300">{parsed.environment.os}</span>
					</div>
				{/if}
				{#if parsed.environment.screen}
					<div class="flex items-center gap-1">
						<span class="material-symbols-outlined text-[13px] text-slate-500">aspect_ratio</span>
						<span class="text-slate-500">Screen:</span>
						<span class="text-slate-300">{parsed.environment.screen}</span>
					</div>
				{/if}
				{#if parsed.environment.environment}
					<div class="flex items-center gap-1">
						<span class="material-symbols-outlined text-[13px] text-slate-500">tune</span>
						<span class="text-slate-500">Env:</span>
						<span class="text-indigo-400 font-semibold">{parsed.environment.environment}</span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Filter Bar -->
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#12161f] px-4 py-2">
			<!-- Level Filter Tabs -->
			<div class="flex flex-wrap items-center gap-1.5">
				<button
					type="button"
					onclick={() => (filterLevel = 'all')}
					class="rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer {filterLevel === 'all'
						? 'bg-slate-700 text-white'
						: 'text-slate-400 hover:text-slate-200'}"
				>
					All ({parsed.logs.length})
				</button>

				<button
					type="button"
					onclick={() => (filterLevel = 'error')}
					class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer {filterLevel === 'error'
						? 'bg-red-900/60 text-red-200 border border-red-700/50'
						: 'text-red-400 hover:text-red-300'}"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
					<span>Errors ({parsed.errorCount})</span>
				</button>

				<button
					type="button"
					onclick={() => (filterLevel = 'warn')}
					class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer {filterLevel === 'warn'
						? 'bg-amber-900/60 text-amber-200 border border-amber-700/50'
						: 'text-amber-400 hover:text-amber-300'}"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
					<span>Warnings ({parsed.warnCount})</span>
				</button>

				<button
					type="button"
					onclick={() => (filterLevel = 'info')}
					class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer {filterLevel === 'info'
						? 'bg-cyan-900/60 text-cyan-200 border border-cyan-700/50'
						: 'text-cyan-400 hover:text-cyan-300'}"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
					<span>Info & Logs ({parsed.infoCount})</span>
				</button>
			</div>

			<!-- Search Query Input -->
			<div class="relative w-full sm:w-56">
				<span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-500">search</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search logs & stack..."
					class="h-7 w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-6 text-[11px] text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
				/>
				{#if searchQuery}
					<button
						type="button"
						onclick={() => (searchQuery = '')}
						class="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
					>
						<span class="material-symbols-outlined text-[14px]">close</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Raw JSON Viewer Accordion -->
		{#if showRawJson}
			<div class="border-b border-slate-800 bg-[#06090e] p-4">
				<div class="flex items-center justify-between mb-2">
					<span class="text-[11px] font-semibold text-slate-400">Raw JSON Payload</span>
					<span class="text-[10px] text-slate-500">Stored in tickets.diagnostics</span>
				</div>
				<pre class="max-h-64 overflow-auto rounded-lg bg-[#0d1117] p-3 text-[11px] text-emerald-400 font-mono leading-relaxed border border-slate-800">{JSON.stringify(parsed.rawJson, null, 2)}</pre>
			</div>
		{/if}

		<!-- Log Entries Stream -->
		<div class="max-h-96 overflow-y-auto divide-y divide-slate-800/60 p-2">
			{#if filteredLogs.length === 0}
				<div class="py-8 text-center text-slate-500">
					{#if searchQuery || filterLevel !== 'all'}
						<p>No log entries match the current filter or search query.</p>
						<button
							type="button"
							onclick={() => {
								filterLevel = 'all';
								searchQuery = '';
							}}
							class="mt-2 text-[11px] text-indigo-400 hover:underline cursor-pointer"
						>
							Reset filters
						</button>
					{:else}
						<p>Diagnostics payload contains no console logs.</p>
					{/if}
				</div>
			{:else}
				{#each filteredLogs as log (log.id)}
					{@const isError = log.level === 'error'}
					{@const isWarn = log.level === 'warn'}
					{@const isInfo = log.level === 'info'}
					{@const isDebug = log.level === 'debug'}
					{@const isExpanded = expandedLogs[log.id]}

					<div
						class="group flex flex-col gap-1 rounded-md px-2 py-1.5 transition-colors {isError
							? 'bg-red-950/20 hover:bg-red-950/30'
							: isWarn
								? 'bg-amber-950/15 hover:bg-amber-950/25'
								: 'hover:bg-slate-800/40'}"
					>
						<div class="flex items-start gap-2 leading-relaxed">
							<!-- Level Pill -->
							<span
								class="mt-0.5 inline-flex items-center justify-center rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider shrink-0 {isError
									? 'bg-red-500/20 text-red-400 border border-red-500/30'
									: isWarn
										? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
										: isInfo
											? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
											: isDebug
												? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
												: 'bg-slate-700 text-slate-300'}"
							>
								{isError ? 'ERR' : isWarn ? 'WRN' : isInfo ? 'INF' : isDebug ? 'DBG' : 'LOG'}
							</span>

							<!-- Timestamp if present -->
							{#if log.timestamp}
								<span class="mt-0.5 text-[10px] text-slate-500 shrink-0 select-none">
									{log.timestamp.includes('T') ? log.timestamp.split('T')[1].replace('Z', '') : log.timestamp}
								</span>
							{/if}

							<!-- Message Body -->
							<span
								class="flex-1 break-words {isError
									? 'text-red-300 font-medium'
									: isWarn
										? 'text-amber-200'
										: 'text-slate-200'}"
							>
								{log.message}
							</span>

							<!-- Expand button if stack trace or object data exists -->
							{#if log.stack || log.data}
								<button
									type="button"
									onclick={() => toggleExpand(log.id)}
									class="text-[10px] text-slate-400 hover:text-white shrink-0 cursor-pointer flex items-center gap-0.5"
									title="Toggle stack trace & details"
								>
									<span>{isExpanded ? 'Hide' : 'Details'}</span>
									<span class="material-symbols-outlined text-[12px]">
										{isExpanded ? 'expand_less' : 'expand_more'}
									</span>
								</button>
							{/if}
						</div>

						<!-- Expanded Stack Trace / Data -->
						{#if isExpanded}
							<div class="mt-1 space-y-1.5 pl-6">
								{#if log.stack}
									<div class="rounded bg-black/40 p-2 text-[10px] text-slate-400 border border-slate-800 whitespace-pre-wrap font-mono">
										{log.stack}
									</div>
								{/if}
								{#if log.data}
									<pre class="rounded bg-black/40 p-2 text-[10px] text-emerald-300 border border-slate-800 overflow-x-auto font-mono">{JSON.stringify(log.data, null, 2)}</pre>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}
