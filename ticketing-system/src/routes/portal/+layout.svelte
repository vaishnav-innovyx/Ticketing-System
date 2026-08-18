<script lang="ts">
	import ClientAppShell from '$lib/components/client/layout/ClientAppShell.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Nexus Client Portal - Help Center</title>
</svelte:head>

<ClientAppShell>
	{@render children()}
</ClientAppShell>
