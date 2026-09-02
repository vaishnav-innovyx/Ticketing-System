<script lang="ts">
	import ClientAppShell from '$lib/components/client/layout/ClientAppShell.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<title>Resolv Client Portal - Help Center</title>
</svelte:head>

<ClientAppShell profile={data.profile} pendingApprovalCount={data.pendingApprovalCount}>
	{@render children()}
</ClientAppShell>
