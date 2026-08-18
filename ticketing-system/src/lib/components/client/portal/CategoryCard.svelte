<script lang="ts">
	let {
		title,
		description,
		icon,
		articleCount,
		href
	}: {
		title: string;
		description: string;
		icon: string;
		articleCount: number;
		href: string;
	} = $props();
</script>

<a
	{href}
	class="group flex flex-col justify-between rounded-xl border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface-container-lowest)] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-primary-container)] hover:shadow-md"
>
	<div>
		<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-fixed)] text-[var(--color-on-primary-fixed)] transition-transform group-hover:scale-110">
			<span class="material-symbols-outlined text-[26px]">{icon}</span>
		</div>
		<h3 class="mt-4 text-title-md font-semibold text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)]">
			{title}
		</h3>
		<p class="mt-1 text-body-sm text-[var(--color-on-surface-variant)] line-clamp-2">
			{description}
		</p>
	</div>

	<div class="mt-4 flex items-center justify-between border-t border-[var(--color-outline-variant)]/40 pt-3 text-label-sm text-[var(--color-on-surface-variant)]">
		<span>{articleCount} articles</span>
		<span class="material-symbols-outlined text-[18px] text-[var(--color-primary)] transition-transform group-hover:translate-x-1">
			arrow_forward
		</span>
	</div>
</a>
