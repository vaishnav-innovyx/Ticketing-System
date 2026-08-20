<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<AppShell profile={data.profile}>
	{@render children()}
</AppShell>

