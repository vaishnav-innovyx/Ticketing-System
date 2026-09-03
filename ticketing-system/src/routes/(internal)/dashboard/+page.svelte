<script lang="ts">
	import KpiCard from '$lib/components/dashboard/KpiCard.svelte';
	import TicketActivityChart from '$lib/components/dashboard/TicketActivityChart.svelte';
	import TicketStatusDonut from '$lib/components/dashboard/TicketStatusDonut.svelte';
	import TicketPriorityBars from '$lib/components/dashboard/TicketPriorityBars.svelte';
	import RecentActivityList from '$lib/components/dashboard/RecentActivityList.svelte';

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
	<title>Resolv - Ticketing & Support System</title>
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
				Good morning, Alex.
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
