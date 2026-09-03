<script lang="ts">
	import logo from '$lib/assets/logo.png';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={logo} />
	<title>Resolv - Ticketing & Support System</title>
</svelte:head>

{@render children()}