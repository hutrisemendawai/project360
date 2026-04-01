<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';

  let { children } = $props();

  let theme = $state('dark'); 

  onMount(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      theme = savedTheme;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
  });

  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  });
</script>

<div class="app-layout">
  {@render children()}
</div>

<CommandPalette />

<style>
  .app-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
