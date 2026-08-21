<script lang="ts">
	import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
	import TicketActivityChart from '$lib/components/dashboard/TicketActivityChart.svelte';
	import TicketStatusDonut from '$lib/components/dashboard/TicketStatusDonut.svelte';
	import TicketPriorityBars from '$lib/components/dashboard/TicketPriorityBars.svelte';
	import RecentActivityList from '$lib/components/dashboard/RecentActivityList.svelte';
	import { STATUS_LABEL, formatMetricHours as formatHours, formatVariancePct as formatPct } from '$lib/portal/ticketDisplay';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const firstName = $derived(data?.profile?.full_name?.split(' ')[0] || data?.profile?.email?.split('@')[0] || 'Admin');

	const kpiMetrics = [
		{
			title: 'Open Tickets',
			value: 24,
			icon: 'receipt_long',
			iconBgClass: 'bg-[var(--color-surface-container)]',
			iconColorClass: 'text-[var(--color-primary-container)]',
			trendText: '+3 today',
			trendPositive: false
		},
		{
			title: 'Awaiting Client',
			value: 8,
			icon: 'pending_actions',
			iconBgClass: 'bg-[var(--color-tertiary-fixed)]/30',
			iconColorClass: 'text-[var(--color-tertiary)]',
			trendText: '-2 from yesterday',
			trendPositive: true
		},
		{
			title: 'In Development',
			value: 12,
			icon: 'code',
			iconBgClass: 'bg-[var(--color-secondary-fixed)]/30',
			iconColorClass: 'text-[var(--color-secondary)]',
			trendText: '4 in QA review',
			trendPositive: true
		},
		{
			title: 'Resolved This Month',
			value: 46,
			icon: 'check_circle',
			iconBgClass: 'bg-[var(--color-secondary-container)]',
			iconColorClass: 'text-[var(--color-on-secondary-container)]',
			trendText: '+18% vs last month',
			trendPositive: true
		}
	];
</script>

<svelte:head>
	<title>Nexus Service Desk - Internal Dashboard</title>
</svelte:head>

<div class="space-y-6 md:space-y-8">
	<!-- Top Greeting & Header Bar -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<span class="rounded-md bg-[var(--color-primary-fixed)] px-2 py-0.5 text-label-xs font-bold text-[var(--color-on-primary-fixed)] uppercase tracking-wide">
					Internal Staff Area
				</span>
			</div>
			<h1 class="text-headline-md font-bold text-[var(--color-on-surface)] mt-1">
				Good morning, {firstName}.
			</h1>
			<p class="text-body-md mt-1 text-[var(--color-on-surface-variant)]">
				Here's what's happening across your internal tickets and queues.
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-3">
			<a
				href="/portal"
				class="nexus-secondary-button h-10 px-4 py-2 text-label-md"
				title="Preview Client Facing Portal"
			>
				<span class="material-symbols-outlined text-[18px]">open_in_new</span>
				<span>Client Portal</span>
			</a>

			<button
				type="button"
				class="nexus-primary-button h-10 px-4 py-2 shadow-sm"
			>
				<span class="material-symbols-outlined text-[18px]">add</span>
				<span>New Ticket</span>
			</button>
		</div>
	</div>

	<!-- KPI Metric Cards Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
		{#each kpiMetrics as kpi}
			<KpiCard
				title={kpi.title}
				value={kpi.value}
				icon={kpi.icon}
				iconBgClass={kpi.iconBgClass}
				iconColorClass={kpi.iconColorClass}
				trendText={kpi.trendText}
				trendPositive={kpi.trendPositive}
			/>
		{/each}
	</div>

	<!-- Delivery Metrics: PoC TAT, Req Duration, Approval Delay, Effort Variance, Cycle Time -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-title-md font-bold text-[var(--color-on-surface)]">Delivery Metrics</h2>
			<span class="text-body-xs text-[var(--color-on-surface-variant)]">Averaged across tickets you have visibility on</span>
		</div>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 md:gap-5">
			<KpiCard
				title="PoC TAT"
				value={formatHours(data.deliveryMetrics.pocTat.avgHours)}
				icon="assignment_turned_in"
				iconBgClass="bg-[var(--color-surface-container)]"
				iconColorClass="text-[var(--color-primary-container)]"
				trendText={`${data.deliveryMetrics.pocTat.count} tickets`}
				trendPositive
			/>
			<KpiCard
				title="Req Duration"
				value={formatHours(data.deliveryMetrics.reqDuration.avgHours)}
				icon="schedule"
				iconBgClass="bg-[var(--color-tertiary-fixed)]/30"
				iconColorClass="text-[var(--color-tertiary)]"
				trendText={`${data.deliveryMetrics.reqDuration.count} tickets`}
				trendPositive
			/>
			<KpiCard
				title="Approval Delay"
				value={formatHours(data.deliveryMetrics.approvalDelay.avgHours)}
				icon="thumb_up"
				iconBgClass="bg-[var(--color-secondary-fixed)]/30"
				iconColorClass="text-[var(--color-secondary)]"
				trendText={`${data.deliveryMetrics.approvalDelay.count} tickets`}
				trendPositive
			/>
			<KpiCard
				title="Effort Variance"
				value={formatPct(data.deliveryMetrics.effortVariance.avgPct)}
				icon="balance"
				iconBgClass="bg-[var(--color-secondary-container)]"
				iconColorClass="text-[var(--color-on-secondary-container)]"
				trendText={`${data.deliveryMetrics.effortVariance.count} tickets`}
				trendPositive={(data.deliveryMetrics.effortVariance.avgPct ?? 0) <= 0}
			/>
			<KpiCard
				title="Total Cycle Time"
				value={formatHours(data.deliveryMetrics.cycleTime.avgHours)}
				icon="cached"
				iconBgClass="bg-[var(--color-surface-container)]"
				iconColorClass="text-[var(--color-primary-container)]"
				trendText={`${data.deliveryMetrics.cycleTime.count} tickets`}
				trendPositive
			/>
		</div>

		{#if data.ticketMetricsRows.length > 0}
			<div class="nexus-card overflow-x-auto">
				<table class="w-full text-body-sm">
					<thead class="border-b border-[var(--color-outline-variant)]/40 text-label-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
						<tr>
							<th class="px-4 py-2.5 text-left">Ticket</th>
							<th class="px-4 py-2.5 text-left">Status</th>
							<th class="px-4 py-2.5 text-right">PoC TAT</th>
							<th class="px-4 py-2.5 text-right">Req Duration</th>
							<th class="px-4 py-2.5 text-right">Approval Delay</th>
							<th class="px-4 py-2.5 text-right">Effort Variance</th>
							<th class="px-4 py-2.5 text-right">Cycle Time</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-outline-variant)]/30">
						{#each data.ticketMetricsRows as row}
							<tr>
								<td class="px-4 py-2.5">
									<span class="font-mono font-semibold text-[var(--color-primary)]">{row.token}</span>
									<span class="ml-2 text-[var(--color-on-surface-variant)] truncate">{row.title}</span>
								</td>
								<td class="px-4 py-2.5 text-[var(--color-on-surface-variant)]">{STATUS_LABEL[row.status] ?? row.status}</td>
								<td class="px-4 py-2.5 text-right tabular-nums">{formatHours(row.pocTatHours)}</td>
								<td class="px-4 py-2.5 text-right tabular-nums">{formatHours(row.reqDurationHours)}</td>
								<td class="px-4 py-2.5 text-right tabular-nums">{formatHours(row.approvalDelayHours)}</td>
								<td
									class="px-4 py-2.5 text-right tabular-nums {row.effortVariancePct !== null && row.effortVariancePct > 20
										? 'text-[var(--color-error)] font-semibold'
										: ''}"
								>
									{formatPct(row.effortVariancePct)}
								</td>
								<td class="px-4 py-2.5 text-right tabular-nums">{formatHours(row.cycleTimeHours)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Middle Row: Ticket Activity Chart -->
	<TicketActivityChart />

	<!-- Bottom Row: 3-column Widget Grid -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-5">
		<!-- Widget 1: Status Donut Chart -->
		<TicketStatusDonut />

		<!-- Widget 2: Priority Bar Chart -->
		<TicketPriorityBars />

		<!-- Widget 3: Recent Activity Feed -->
		<RecentActivityList />
	</div>
</div>
