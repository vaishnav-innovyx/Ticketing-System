<script lang="ts">
	interface Props {
		currentStepIndex?: number; // 0: Raised, 1: Triaged, 2: Estimated, 3: Approved, 4: In Dev, 5: QA, 6: Deployed, 7: Resolved
	}

	let { currentStepIndex = 4 }: Props = $props();

	const steps = [
		{ label: 'Raised', icon: 'check' },
		{ label: 'Triaged', icon: 'check' },
		{ label: 'Estimated', icon: 'check' },
		{ label: 'Approved', icon: 'check' },
		{ label: 'In Dev', icon: 'code' },
		{ label: 'QA', icon: 'bug_report' },
		{ label: 'Deployed', icon: 'rocket_launch' },
		{ label: 'Resolved', icon: 'task_alt' }
	];
</script>

<div class="w-full overflow-x-auto py-2 scrollbar-none">
	<div class="relative flex min-w-[760px] items-center justify-between px-2">
		<!-- Background Track Line -->
		<div class="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--color-outline-variant)]/60 -z-10"></div>
		<!-- Filled Track Line based on progress -->
		<div
			class="absolute left-8 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--color-primary)] -z-10 transition-all duration-500"
			style="width: {(Math.min(currentStepIndex, steps.length - 1) / (steps.length - 1)) * 90}%"
		></div>

		<!-- Step Nodes -->
		{#each steps as step, index}
			{@const isCompleted = index < currentStepIndex}
			{@const isCurrent = index === currentStepIndex}
			{@const isPending = index > currentStepIndex}

			<div class="flex flex-col items-center gap-1.5 w-20">
				{#if isCompleted}
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-white border-2 border-[var(--color-surface)] shadow-2xs"
					>
						<span class="material-symbols-outlined text-[13px]">check</span>
					</div>
					<span class="text-label-sm font-medium text-[var(--color-on-surface-variant)] text-center">
						{step.label}
					</span>
				{:else if isCurrent}
					<div
						class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-white border-2 border-[var(--color-surface)] ring-2 ring-[var(--color-primary)] shadow-sm animate-pulse"
					>
						<span class="material-symbols-outlined text-[15px]">{step.icon}</span>
					</div>
					<span class="text-label-sm font-bold text-[var(--color-primary)] text-center">
						{step.label}
					</span>
				{:else}
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-container-highest)] border-2 border-[var(--color-outline-variant)] text-[var(--color-outline)]"
					>
						<span class="material-symbols-outlined text-[13px]">{step.icon}</span>
					</div>
					<span class="text-label-sm font-medium text-[var(--color-outline)] text-center">
						{step.label}
					</span>
				{/if}
			</div>
		{/each}
	</div>
</div>
