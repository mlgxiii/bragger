<script lang="ts">
	import { Theme, ThemeModeToggle } from 'bref-ui';
	let { children } = $props();
</script>

<Theme />
<ThemeModeToggle mode="auto" />
{@render children()}

<style>
	:global(body) {
		margin: 0;
		font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
	}
</style>
