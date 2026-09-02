<script lang="ts">
	import logo from '$lib/assets/logo.png';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={logo} />
	<title>Resolv Service Desk</title>
</svelte:head>

{@render children()}