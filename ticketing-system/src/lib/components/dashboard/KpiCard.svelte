<script lang="ts">
	interface Props {
		title: string;
		value: number | string;
		icon: string;
		iconBgClass?: string;
		iconColorClass?: string;
		trendText?: string;
		trendPositive?: boolean;
	}

	let {
		title,
		value,
		icon,
		iconBgClass = 'bg-[var(--color-surface-container)]',
		iconColorClass = 'text-[var(--color-primary-container)]',
		trendText,
		trendPositive = true
	}: Props = $props();
</script>

<div
	class="nexus-card flex items-center justify-between p-5 transition-shadow duration-200 hover:shadow-md"
>
	<div>
		<p class="text-label-md font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
			{title}
		</p>
		<p class="text-display-lg mt-1 text-[var(--color-on-surface)]">
			{value}
		</p>
		{#if trendText}
			<div class="mt-1 flex items-center gap-1 text-[12px] {trendPositive ? 'text-[var(--color-secondary)]' : 'text-[var(--color-error)]'}">
				<span class="material-symbols-outlined text-[14px]">
					{trendPositive ? 'trending_up' : 'trending_down'}
				</span>
				<span>{trendText}</span>
			</div>
		{/if}
	</div>

	<div
		class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl {iconBgClass} {iconColorClass}"
	>
		<span class="material-symbols-outlined text-[24px]">
			{icon}
		</span>
	</div>
</div>
