<script lang="ts">
  import { currentUser } from '../lib/pocketbase';
  import { goto } from '$app/navigation';
  import { onMount, tick } from 'svelte';

  let hasMounted = $state(false);

  onMount(() => {
    hasMounted = true;
  });

  $effect(() => {
    if (hasMounted && typeof window !== 'undefined') {
      if ($currentUser) {
        goto('/dashboard');
      } else {
        goto('/login');
      }
    }
  });
</script>

<div class="loading-state">
  <div class="spinner"></div>
</div>

<style>
  .loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: var(--bg-color);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border-color);
    border-top-color: var(--color-green);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
</style>
