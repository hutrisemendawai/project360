<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';
  import { gsap } from 'gsap';

  let isOpen = $state(false);
  let searchQuery = $state('');
  let results = $state<any[]>([]);
  let paletteEl = $state<HTMLElement>();

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      isOpen = !isOpen;
      if (isOpen) {
        searchQuery = '';
        results = [];
        setTimeout(() => {
          if (paletteEl) {
            gsap.fromTo(paletteEl, 
              { scale: 0.95, opacity: 0, y: -20 }, 
              { scale: 1, opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
            );
          }
        }, 10);
      }
    }
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeydown);
    }
  });

  $effect(() => {
    if (searchQuery.length > 1) {
      search();
    } else {
      results = [];
    }
  });

  async function search() {
    try {
      // Basic search implementation for MVP: Search all projects
      const projs = await api.projects.getAll();
      const matchedProjs = projs
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(p => ({ type: 'Project', title: p.name, link: `/projects/${p.id}` }));
      
      results = [...matchedProjs];
    } catch (e) { console.error('Search failed', e); }
  }

  function selectResult(link: string) {
    isOpen = false;
    searchQuery = '';
    goto(link);
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="palette-backdrop" role="presentation" onclick={(e) => { if(e.target === e.currentTarget) isOpen = false; }}>
    <div class="palette" bind:this={paletteEl}>
      <div class="search-input-wrapper">
        <svg height="20" viewBox="0 0 16 16" width="20" class="search-icon"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path></svg>
        <input type="text" bind:value={searchQuery} placeholder="Search projects... (Ctrl+K)" autofocus autocomplete="off" />
        <span class="escape-hint">ESC to close</span>
      </div>
      
      {#if searchQuery.length > 1}
        <div class="results">
          {#each results as res}
            <button class="result-item" onclick={() => selectResult(res.link)}>
              <span class="type">{res.type}</span>
              <span class="title">{res.title}</span>
            </button>
          {/each}
          {#if results.length === 0}
            <div class="no-results">No matches found for "{searchQuery}"</div>
          {/if}
        </div>
      {:else}
        <div class="welcome-search">
          <p>Type to start searching your workspace...</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .palette-backdrop {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(5px);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 15vh; z-index: 9999;
  }

  .palette {
    background: var(--surface-color);
    width: 100%; max-width: 600px;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    border: 1px solid var(--border-color);
    overflow: hidden;
    display: flex; flex-direction: column;
  }

  .search-input-wrapper {
    display: flex; align-items: center;
    padding: 0 20px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-color);
  }

  .search-icon {
    fill: var(--text-muted);
    margin-right: 15px;
  }

  .search-input-wrapper input {
    flex: 1; padding: 20px 0;
    background: transparent; border: none;
    font-size: 18px; color: var(--text-main);
    outline: none; font-family: inherit;
  }

  .escape-hint {
    font-size: 11px; color: var(--text-muted);
    font-weight: bold; background: var(--surface-hover);
    padding: 4px 8px; border-radius: 6px;
  }

  .results { max-height: 400px; overflow-y: auto; padding: 10px; }

  .result-item {
    display: flex; align-items: center; gap: 15px;
    width: 100%; padding: 15px; background: transparent;
    border: none; text-align: left; cursor: pointer;
    border-radius: 8px; font-family: inherit;
    transition: background 0.1s;
  }

  .result-item:hover, .result-item:focus {
    background: var(--surface-hover);
    outline: none;
  }

  .type {
    font-size: 11px; text-transform: uppercase;
    font-weight: 700; color: var(--color-green);
    background: rgba(29, 185, 84, 0.1);
    padding: 4px 8px; border-radius: 6px;
  }

  .title { font-size: 15px; color: var(--text-main); font-weight: 500; }

  .no-results, .welcome-search {
    padding: 30px; text-align: center;
    color: var(--text-muted); font-size: 14px;
  }
</style>
