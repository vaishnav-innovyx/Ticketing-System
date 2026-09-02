<script lang="ts">
	import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
	import StageFunnelWidget from '$lib/components/internal/reports/StageFunnelWidget.svelte';
	import CategoryDonut from '$lib/components/internal/reports/CategoryDonut.svelte';
	import ProjectHealthMatrix from '$lib/components/internal/reports/ProjectHealthMatrix.svelte';
	import EffortVarianceBars from '$lib/components/internal/reports/EffortVarianceBars.svelte';
	import { STATUS_LABEL, CATEGORY_LABEL, formatMetricHours, formatVariancePct } from '$lib/portal/ticketDisplay';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const STATUS_ORDER = ['raised', 'poc_triage', 'requirement_estimation', 'client_approval', 'development', 'delivery', 'closed'] as const;
	const CATEGORY_ORDER = ['bug', 'enhancement', 'kt', 'training'] as const;
	const CATEGORY_COLORS: Record<string, string> = {
		bug: 'var(--color-error)',
		enhancement: 'var(--color-secondary)',
		kt: 'var(--color-tertiary)',
		training: 'var(--color-outline-variant)'
	};

	let selectedClientId = $state('all');
	let selectedProjectId = $state('all');
	let selectedCategory = $state('all');
	let dateFrom = $state('');
	let dateTo = $state('');

	const clients = $derived(data.clients ?? []);
	const projects = $derived(data.projects ?? []);
	const tickets = $derived(data.tickets ?? []);

	const filteredProjects = $derived(
		selectedClientId === 'all' ? projects : projects.filter((p) => p.client_id === selectedClientId)
	);

	$effect(() => {
		if (selectedProjectId !== 'all' && !filteredProjects.some((p) => p.id === selectedProjectId)) {
			selectedProjectId = 'all';
		}
	});

	function resetFilters() {
		selectedClientId = 'all';
		selectedProjectId = 'all';
		selectedCategory = 'all';
		dateFrom = '';
		dateTo = '';
	}

	const filteredTickets = $derived(
		tickets.filter((t) => {
			if (selectedClientId !== 'all' && t.client_id !== selectedClientId) return false;
			if (selectedProjectId !== 'all' && t.project_id !== selectedProjectId) return false;
			if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
			if (dateFrom && (!t.raised_at || new Date(t.raised_at) < new Date(dateFrom))) return false;
			if (dateTo && (!t.raised_at || new Date(t.raised_at) > new Date(`${dateTo}T23:59:59`))) return false;
			return true;
		})
	);

	function average(values: (number | null)[]): number | null {
		const nums = values.filter((v): v is number => v !== null);
		if (nums.length === 0) return null;
		return nums.reduce((sum, v) => sum + v, 0) / nums.length;
	}

	const clientById = $derived(new Map(clients.map((c) => [c.id, c])));
	const projectById = $derived(new Map(projects.map((p) => [p.id, p])));

	// Executive KPI row
	const activeTicketCount = $derived(filteredTickets.filter((t) => t.status !== 'closed').length);
	const closedWithTarget = $derived(filteredTickets.filter((t) => t.status === 'closed' && t.closed_at && t.target_date));
	const onTimePct = $derived(
		closedWithTarget.length === 0
			? null
			: (closedWithTarget.filter((t) => new Date(t.closed_at as string) <= new Date(t.target_date as string)).length /
					closedWithTarget.length) *
					100
	);
	const avgPocTat = $derived(average(filteredTickets.map((t) => t.pocTatHours)));
	const avgCycleTime = $derived(average(filteredTickets.map((t) => t.cycleTimeHours)));
	const avgEffortVariance = $derived(average(filteredTickets.map((t) => t.effortVariancePct)));

	// Pipeline stage funnel
	const funnelStages = $derived(
		STATUS_ORDER.map((status) => ({
			label: STATUS_LABEL[status],
			count: filteredTickets.filter((t) => t.status === status).length
		}))
	);

	// Category distribution donut
	const categorySegments = $derived(
		CATEGORY_ORDER.map((category) => ({
			label: CATEGORY_LABEL[category],
			count: filteredTickets.filter((t) => t.category === category).length,
			color: CATEGORY_COLORS[category]
		}))
	);

	// Project & Client Health Matrix + Estimated vs Actual Hours
	const projectsInScope = $derived(selectedProjectId === 'all' ? filteredProjects : filteredProjects.filter((p) => p.id === selectedProjectId));

	const healthRows = $derived(
		projectsInScope.map((project) => {
			const projectTickets = filteredTickets.filter((t) => t.project_id === project.id);
			const openTickets = projectTickets.filter((t) => t.status !== 'closed');
			const overdue = openTickets.filter((t) => t.target_date && new Date(t.target_date) < new Date());
			const client = clientById.get(project.client_id);
			return {
				clientCode: client?.code ?? '—',
				clientName: client?.name ?? 'Unknown Client',
				projectCode: project.code,
				projectName: project.name,
				open: openTickets.length,
				bugs: openTickets.filter((t) => t.category === 'bug').length,
				enhancements: openTickets.filter((t) => t.category === 'enhancement').length,
				onTrack: overdue.length === 0
			};
		})
	);

	const effortRows = $derived(
		projectsInScope
			.map((project) => {
				const projectTickets = filteredTickets.filter((t) => t.project_id === project.id && t.estimated_hours && t.actual_hours !== null);
				const estimatedHours = projectTickets.reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0);
				const actualHours = projectTickets.reduce((sum, t) => sum + (t.actual_hours ?? 0), 0);
				const pct = estimatedHours > 0 ? ((actualHours - estimatedHours) / estimatedHours) * 100 : null;
				return { projectCode: project.code, projectName: project.name, estimatedHours, actualHours, pct };
			})
			.filter((r) => r.estimatedHours > 0 || r.actualHours > 0)
	);

	// Delivery metrics summary
	const countWhere = (key: 'pocTatHours' | 'reqDurationHours' | 'approvalDelayHours' | 'effortVariancePct' | 'cycleTimeHours') =>
		filteredTickets.filter((r) => r[key] !== null).length;

	const deliveryMetrics = $derived({
		pocTat: { avgHours: average(filteredTickets.map((r) => r.pocTatHours)), count: countWhere('pocTatHours') },
		reqDuration: { avgHours: average(filteredTickets.map((r) => r.reqDurationHours)), count: countWhere('reqDurationHours') },
		approvalDelay: { avgHours: average(filteredTickets.map((r) => r.approvalDelayHours)), count: countWhere('approvalDelayHours') },
		effortVariance: { avgPct: average(filteredTickets.map((r) => r.effortVariancePct)), count: countWhere('effortVariancePct') },
		cycleTime: { avgHours: average(filteredTickets.map((r) => r.cycleTimeHours)), count: countWhere('cycleTimeHours') }
	});

	function filterSummary(): string {
		const parts: string[] = [];
		parts.push(selectedClientId === 'all' ? 'All Clients' : (clientById.get(selectedClientId)?.name ?? 'All Clients'));
		parts.push(selectedProjectId === 'all' ? 'All Projects' : (projectById.get(selectedProjectId)?.name ?? 'All Projects'));
		parts.push(selectedCategory === 'all' ? 'All Categories' : CATEGORY_LABEL[selectedCategory as keyof typeof CATEGORY_LABEL]);
		if (dateFrom || dateTo) parts.push(`Raised ${dateFrom || 'earliest'} to ${dateTo || 'latest'}`);
		return parts.join(' | ');
	}

	let exporting = $state(false);

	async function exportReport() {
		exporting = true;
		try {
			const XLSX = await import('xlsx');

			const summaryAoa: (string | number)[][] = [
				['Reports & Analytics Export'],
				['Generated', new Date().toLocaleString()],
				['Filters', filterSummary()],
				[],
				['Metric', 'Value'],
				['Active Tickets', activeTicketCount],
				['On-Time Delivery %', onTimePct !== null ? `${onTimePct.toFixed(1)}%` : 'N/A'],
				['Avg PoC TAT', formatMetricHours(avgPocTat)],
				['Avg Cycle Time', formatMetricHours(avgCycleTime)],
				['Avg Effort Variance', formatVariancePct(avgEffortVariance)]
			];

			const ticketsAoa: (string | number)[][] = [
				['Token', 'Title', 'Client', 'Project', 'Category', 'Status', 'Priority', 'Raised At', 'PoC TAT', 'Req Duration', 'Approval Delay', 'Effort Variance', 'Cycle Time', 'Estimated Hours', 'Actual Hours']
			];
			for (const t of filteredTickets) {
				const client = clientById.get(t.client_id);
				const project = projectById.get(t.project_id);
				ticketsAoa.push([
					t.token ?? '',
					t.title,
					client?.name ?? '',
					project?.name ?? '',
					CATEGORY_LABEL[t.category as keyof typeof CATEGORY_LABEL] ?? t.category,
					STATUS_LABEL[t.status as keyof typeof STATUS_LABEL] ?? t.status,
					t.priority,
					t.raised_at ?? '',
					formatMetricHours(t.pocTatHours),
					formatMetricHours(t.reqDurationHours),
					formatMetricHours(t.approvalDelayHours),
					formatVariancePct(t.effortVariancePct),
					formatMetricHours(t.cycleTimeHours),
					t.estimated_hours ?? '',
					t.actual_hours ?? ''
				]);
			}

			const healthAoa: (string | number)[][] = [
				['Client', 'Project', 'Open', 'Bugs', 'Enhancements', 'Status']
			];
			for (const row of healthRows) {
				healthAoa.push([row.clientName, row.projectName, row.open, row.bugs, row.enhancements, row.onTrack ? 'On Track' : 'Attention']);
			}

			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoa), 'Summary');
			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ticketsAoa), 'Tickets');
			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(healthAoa), 'Project Health');
			XLSX.writeFile(wb, `reports-${new Date().toISOString().slice(0, 10)}.xlsx`);
		} finally {
			exporting = false;
		}
	}
</script>

<svelte:head>
	<title>Nexus Service Desk - Reports & Analytics</title>
</svelte:head>

<div class="space-y-6 md:space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<span class="rounded-md bg-[var(--color-primary-fixed)] px-2 py-0.5 text-label-xs font-bold text-[var(--color-on-primary-fixed)] uppercase tracking-wide">
				Executive Analytics
			</span>
			<h1 class="text-headline-md mt-1 font-bold text-[var(--color-on-surface)]">Reports & Analytics</h1>
			<p class="text-body-md mt-1 text-[var(--color-on-surface-variant)]">
				Drill into SLA metrics, pipeline health, and effort variance across every client and project.
			</p>
		</div>

		<button type="button" class="nexus-primary-button h-10 px-4 py-2 shadow-sm" onclick={exportReport} disabled={exporting}>
			<span class="material-symbols-outlined text-[18px]">download</span>
			<span>{exporting ? 'Exporting…' : 'Export Report'}</span>
		</button>
	</div>

	<!-- Filter Bar -->
	<div class="nexus-card flex flex-wrap items-end gap-3 p-4">
		<div class="flex flex-col gap-1">
			<label for="report-client" class="text-label-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Client</label>
			<select
				id="report-client"
				bind:value={selectedClientId}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			>
				<option value="all">All Clients</option>
				{#each clients as client}
					<option value={client.id}>{client.name} ({client.code})</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-1">
			<label for="report-project" class="text-label-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Project</label>
			<select
				id="report-project"
				bind:value={selectedProjectId}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			>
				<option value="all">All Projects</option>
				{#each filteredProjects as project}
					<option value={project.id}>{project.name} ({project.code})</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-1">
			<label for="report-category" class="text-label-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Category</label>
			<select
				id="report-category"
				bind:value={selectedCategory}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			>
				<option value="all">All Categories</option>
				{#each CATEGORY_ORDER as category}
					<option value={category}>{CATEGORY_LABEL[category]}</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-1">
			<label for="report-from" class="text-label-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Raised From</label>
			<input
				id="report-from"
				type="date"
				bind:value={dateFrom}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			/>
		</div>

		<div class="flex flex-col gap-1">
			<label for="report-to" class="text-label-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Raised To</label>
			<input
				id="report-to"
				type="date"
				bind:value={dateTo}
				class="h-10 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 text-body-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary-container)]"
			/>
		</div>

		<button
			type="button"
			class="nexus-secondary-button h-10 px-4 py-2 text-label-md"
			onclick={resetFilters}
		>
			<span class="material-symbols-outlined text-[18px]">filter_alt_off</span>
			<span>Reset</span>
		</button>
	</div>

	<!-- Executive KPI Row -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 md:gap-5">
		<KpiCard title="Active Tickets" value={activeTicketCount} icon="receipt_long" />
		<KpiCard
			title="On-Time Delivery"
			value={onTimePct !== null ? `${onTimePct.toFixed(1)}%` : '—'}
			icon="verified"
			iconBgClass="bg-[var(--color-secondary-container)]"
			iconColorClass="text-[var(--color-on-secondary-container)]"
		/>
		<KpiCard
			title="Avg PoC TAT"
			value={formatMetricHours(avgPocTat)}
			icon="timer"
			iconBgClass="bg-[var(--color-tertiary-fixed)]/30"
			iconColorClass="text-[var(--color-tertiary)]"
		/>
		<KpiCard
			title="Avg Cycle Time"
			value={formatMetricHours(avgCycleTime)}
			icon="cached"
			iconBgClass="bg-[var(--color-secondary-fixed)]/30"
			iconColorClass="text-[var(--color-secondary)]"
		/>
		<KpiCard
			title="Avg Effort Variance"
			value={formatVariancePct(avgEffortVariance)}
			icon="balance"
			trendText={avgEffortVariance !== null && avgEffortVariance > 20 ? 'Over estimate' : undefined}
			trendPositive={false}
		/>
	</div>

	<!-- Pipeline Stage Funnel -->
	<StageFunnelWidget stages={funnelStages} />

	<!-- Health Matrix + Category Distribution -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-5">
		<ProjectHealthMatrix rows={healthRows} />
		<CategoryDonut segments={categorySegments} />
	</div>

	<!-- Effort Variance + Delivery Metrics -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-5">
		<EffortVarianceBars rows={effortRows} />

		<div class="nexus-card flex flex-col p-5 sm:p-6">
			<h2 class="text-title-lg mb-4 border-b border-[var(--color-outline-variant)]/30 pb-3 font-semibold text-[var(--color-on-surface)]">
				Delivery Metrics
			</h2>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<p class="text-label-xs uppercase tracking-wide text-[var(--color-on-surface-variant)]">PoC TAT</p>
					<p class="text-title-lg font-bold text-[var(--color-on-surface)]">{formatMetricHours(deliveryMetrics.pocTat.avgHours)}</p>
					<p class="text-body-xs text-[var(--color-on-surface-variant)]">{deliveryMetrics.pocTat.count} tickets</p>
				</div>
				<div>
					<p class="text-label-xs uppercase tracking-wide text-[var(--color-on-surface-variant)]">Req Duration</p>
					<p class="text-title-lg font-bold text-[var(--color-on-surface)]">{formatMetricHours(deliveryMetrics.reqDuration.avgHours)}</p>
					<p class="text-body-xs text-[var(--color-on-surface-variant)]">{deliveryMetrics.reqDuration.count} tickets</p>
				</div>
				<div>
					<p class="text-label-xs uppercase tracking-wide text-[var(--color-on-surface-variant)]">Approval Delay</p>
					<p class="text-title-lg font-bold text-[var(--color-on-surface)]">{formatMetricHours(deliveryMetrics.approvalDelay.avgHours)}</p>
					<p class="text-body-xs text-[var(--color-on-surface-variant)]">{deliveryMetrics.approvalDelay.count} tickets</p>
				</div>
				<div>
					<p class="text-label-xs uppercase tracking-wide text-[var(--color-on-surface-variant)]">Effort Variance</p>
					<p class="text-title-lg font-bold text-[var(--color-on-surface)]">{formatVariancePct(deliveryMetrics.effortVariance.avgPct)}</p>
					<p class="text-body-xs text-[var(--color-on-surface-variant)]">{deliveryMetrics.effortVariance.count} tickets</p>
				</div>
				<div class="col-span-2">
					<p class="text-label-xs uppercase tracking-wide text-[var(--color-on-surface-variant)]">Total Cycle Time</p>
					<p class="text-title-lg font-bold text-[var(--color-primary)]">{formatMetricHours(deliveryMetrics.cycleTime.avgHours)}</p>
					<p class="text-body-xs text-[var(--color-on-surface-variant)]">{deliveryMetrics.cycleTime.count} tickets</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Detail Table -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-title-md font-bold text-[var(--color-on-surface)]">Ticket Detail</h2>
			<span class="text-body-xs text-[var(--color-on-surface-variant)]">{filteredTickets.length} ticket{filteredTickets.length === 1 ? '' : 's'} matching current filters</span>
		</div>

		{#if filteredTickets.length === 0}
			<div class="nexus-card p-8 text-center text-body-sm text-[var(--color-on-surface-variant)]">
				No tickets match the current filters.
			</div>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] shadow-xs">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-body-sm">
						<thead class="border-b border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)] text-label-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
							<tr>
								<th class="px-5 py-3.5">Ticket</th>
								<th class="px-5 py-3.5">Client / Project</th>
								<th class="px-5 py-3.5">Status</th>
								<th class="px-5 py-3.5 text-right">PoC TAT</th>
								<th class="px-5 py-3.5 text-right">Approval Delay</th>
								<th class="px-5 py-3.5 text-right">Effort Variance</th>
								<th class="px-5 py-3.5 text-right">Cycle Time</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[var(--color-outline-variant)]/30">
							{#each filteredTickets as row}
								<tr class="transition-colors hover:bg-[var(--color-surface-container-low)]/50">
									<td class="px-5 py-3.5">
										<span class="font-mono text-label-xs font-bold text-[var(--color-primary)]">{row.token}</span>
										<span class="ml-2 truncate font-medium text-[var(--color-on-surface)]">{row.title}</span>
									</td>
									<td class="px-5 py-3.5 text-body-xs text-[var(--color-on-surface-variant)]">
										{clientById.get(row.client_id)?.code ?? '—'} / {projectById.get(row.project_id)?.code ?? '—'}
									</td>
									<td class="px-5 py-3.5">
										<span class="inline-flex rounded-md border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container)] px-2 py-0.5 text-label-xs font-semibold text-[var(--color-on-surface)]">
											{STATUS_LABEL[row.status as keyof typeof STATUS_LABEL] ?? row.status}
										</span>
									</td>
									<td class="px-5 py-3.5 text-right font-mono text-body-xs tabular-nums">{formatMetricHours(row.pocTatHours)}</td>
									<td class="px-5 py-3.5 text-right font-mono text-body-xs tabular-nums">{formatMetricHours(row.approvalDelayHours)}</td>
									<td
										class="px-5 py-3.5 text-right font-mono text-body-xs tabular-nums {row.effortVariancePct !== null && row.effortVariancePct > 20
											? 'font-bold text-[var(--color-error)]'
											: 'text-[var(--color-on-surface)]'}"
									>
										{formatVariancePct(row.effortVariancePct)}
									</td>
									<td class="px-5 py-3.5 text-right font-mono text-body-xs font-semibold tabular-nums text-[var(--color-primary)]">{formatMetricHours(row.cycleTimeHours)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>
