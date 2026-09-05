<script lang="ts">
	type TimeRange = 'Last 6 Months' | 'Last 30 Days' | 'This Year';

	let { chartData }: { chartData?: Record<TimeRange, { labels: string[]; newTickets: number[]; resolvedTickets: number[] }> } = $props();

	let selectedRange = $state<TimeRange>('Last 6 Months');
	let hoveredIndex = $state<number | null>(null);

	const defaultDataByRange: Record<
		TimeRange,
		{ labels: string[]; newTickets: number[]; resolvedTickets: number[] }
	> = {
		'Last 6 Months': {
			labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
			newTickets: [0, 0, 0, 0, 0, 0],
			resolvedTickets: [0, 0, 0, 0, 0, 0]
		},
		'Last 30 Days': {
			labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
			newTickets: [0, 0, 0, 0],
			resolvedTickets: [0, 0, 0, 0]
		},
		'This Year': {
			labels: ['Q1', 'Q2', 'Q3', 'Q4'],
			newTickets: [0, 0, 0, 0],
			resolvedTickets: [0, 0, 0, 0]
		}
	};

	let activeDataMap = $derived(chartData || defaultDataByRange);
	let currentData = $derived(activeDataMap[selectedRange]);

	// SVG Dimensions & Margins
	const width = 800;
	const height = 280;
	const padLeft = 45;
	const padRight = 20;
	const padTop = 25;
	const padBottom = 35;

	const chartW = width - padLeft - padRight;
	const chartH = height - padTop - padBottom;

	let maxVal = $derived(
		Math.max(
			...currentData.newTickets,
			...currentData.resolvedTickets,
			100
		)
	);

	// Round maxVal up to a nice number
	let niceMax = $derived(Math.ceil(maxVal / 20) * 20);

	let yTicks = $derived([0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax]);

	function getX(i: number, len: number) {
		return padLeft + (i / (len - 1)) * chartW;
	}

	function getY(val: number) {
		return padTop + chartH - (val / niceMax) * chartH;
	}

	// Smooth cubic bezier path generator
	function getSmoothPath(values: number[]) {
		if (!values || values.length === 0) return '';
		const points = values.map((v, i) => ({
			x: getX(i, values.length),
			y: getY(v)
		}));

		if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

		let d = `M ${points[0].x} ${points[0].y}`;
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[Math.max(0, i - 1)];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[Math.min(points.length - 1, i + 2)];

			const cp1x = p1.x + (p2.x - p0.x) / 6;
			const cp1y = p1.y + (p2.y - p0.y) / 6;
			const cp2x = p2.x - (p3.x - p1.x) / 6;
			const cp2y = p2.y - (p3.y - p1.y) / 6;

			d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
		}
		return d;
	}

	let newPath = $derived(getSmoothPath(currentData.newTickets));
	let resPath = $derived(getSmoothPath(currentData.resolvedTickets));
</script>

<div class="nexus-card p-5 sm:p-6">
	<!-- Header & Controls -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-title-lg font-semibold text-[var(--color-on-surface)]">
				Ticket Activity
			</h2>
			<p class="text-body-sm text-[var(--color-on-surface-variant)]">
				Volume of new vs. resolved issues
			</p>
		</div>

		<div class="flex items-center gap-4">
			<!-- Legend -->
			<div class="flex items-center gap-4 text-label-md">
				<div class="flex items-center gap-1.5">
					<span class="h-2.5 w-2.5 rounded-full bg-[var(--color-primary-container)]"></span>
					<span class="text-[var(--color-on-surface-variant)]">New Tickets</span>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="h-2.5 w-2.5 rounded-full bg-[var(--color-secondary)]"></span>
					<span class="text-[var(--color-on-surface-variant)]">Resolved</span>
				</div>
			</div>

			<!-- Filter Selector -->
			<div class="relative">
				<select
					bind:value={selectedRange}
					class="appearance-none rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface)] py-1.5 pr-8 pl-3 text-label-md font-medium text-[var(--color-on-surface-variant)] transition-all focus:border-[var(--color-primary-container)] focus:ring-1 focus:ring-[var(--color-primary-container)] focus:outline-none cursor-pointer"
				>
					<option value="Last 6 Months">Last 6 Months</option>
					<option value="Last 30 Days">Last 30 Days</option>
					<option value="This Year">This Year</option>
				</select>
				<span
					class="material-symbols-outlined pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[18px] text-[var(--color-on-surface-variant)]"
				>
					arrow_drop_down
				</span>
			</div>
		</div>
	</div>

	<!-- SVG Line Chart Canvas -->
	<div class="relative h-[280px] w-full select-none">
		<svg
			viewBox="0 0 {width} {height}"
			class="h-full w-full overflow-visible"
			preserveAspectRatio="none"
		>
			<!-- Horizontal Grid Lines & Y-Axis Labels -->
			{#each yTicks as tick}
				{@const yPos = getY(tick)}
				<line
					x1={padLeft}
					y1={yPos}
					x2={width - padRight}
					y2={yPos}
					stroke="var(--color-surface-container-high)"
					stroke-width="1"
					stroke-dasharray="3 3"
				/>
				<text
					x={padLeft - 10}
					y={yPos + 4}
					text-anchor="end"
					class="fill-[var(--color-on-surface-variant)] text-[11px] font-medium"
				>
					{Math.round(tick)}
				</text>
			{/each}

			<!-- X-Axis Labels -->
			{#each currentData.labels as label, i}
				{@const xPos = getX(i, currentData.labels.length)}
				<text
					x={xPos}
					y={height - 10}
					text-anchor="middle"
					class="fill-[var(--color-on-surface-variant)] text-[11px] font-medium"
				>
					{label}
				</text>
			{/each}

			<!-- Smooth Curves -->
			<path
				d={newPath}
				fill="none"
				stroke="var(--color-primary-container)"
				stroke-width="2.5"
				stroke-linecap="round"
				class="transition-all duration-300"
			/>

			<path
				d={resPath}
				fill="none"
				stroke="var(--color-secondary)"
				stroke-width="2.5"
				stroke-linecap="round"
				class="transition-all duration-300"
			/>

			<!-- Hover guides & interactive points -->
			{#each currentData.labels as _, i}
				{@const xPos = getX(i, currentData.labels.length)}
				{@const yNew = getY(currentData.newTickets[i])}
				{@const yRes = getY(currentData.resolvedTickets[i])}
				{@const isHovered = hoveredIndex === i}

				<!-- Vertical hover bar -->
				{#if isHovered}
					<line
						x1={xPos}
						y1={padTop}
						x2={xPos}
						y2={height - padBottom}
						stroke="var(--color-outline-variant)"
						stroke-width="1.5"
						stroke-dasharray="4 4"
					/>
				{/if}

				<!-- New tickets point -->
				<circle
					cx={xPos}
					cy={yNew}
					r={isHovered ? 6 : 4}
					fill="var(--color-primary-container)"
					stroke="#ffffff"
					stroke-width="2"
					class="transition-all duration-150"
				/>

				<!-- Resolved tickets point -->
				<circle
					cx={xPos}
					cy={yRes}
					r={isHovered ? 6 : 4}
					fill="var(--color-secondary)"
					stroke="#ffffff"
					stroke-width="2"
					class="transition-all duration-150"
				/>

				<!-- Transparent interaction column -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<rect
					x={xPos - chartW / (currentData.labels.length * 2)}
					y={padTop}
					width={chartW / currentData.labels.length}
					height={chartH}
					fill="transparent"
					class="cursor-pointer"
					onmouseenter={() => (hoveredIndex = i)}
					onmouseleave={() => (hoveredIndex = null)}
				/>
			{/each}
		</svg>

		<!-- Tooltip Overlay -->
		{#if hoveredIndex !== null}
			{@const xRatio = hoveredIndex / (currentData.labels.length - 1)}
			<div
				class="pointer-events-none absolute top-4 z-20 flex -translate-x-1/2 flex-col rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-on-surface)] p-2.5 text-white shadow-xl"
				style="left: calc({padLeft}px + {xRatio} * (100% - {padLeft + padRight}px));"
			>
				<span class="text-[11px] font-semibold text-white/70 uppercase tracking-wider">
					{currentData.labels[hoveredIndex]}
				</span>
				<div class="mt-1 flex items-center gap-3 text-body-sm">
					<div class="flex items-center gap-1.5 text-[var(--color-primary-fixed)] font-medium">
						<span class="h-2 w-2 rounded-full bg-[var(--color-primary-fixed)]"></span>
						New: {currentData.newTickets[hoveredIndex]}
					</div>
					<div class="flex items-center gap-1.5 text-[var(--color-secondary-fixed)] font-medium">
						<span class="h-2 w-2 rounded-full bg-[var(--color-secondary-fixed)]"></span>
						Resolved: {currentData.resolvedTickets[hoveredIndex]}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
