<script lang="ts">
  import { api } from '$lib/api';

  let { project } = $props<{ project: any }>();

  let query = $state('');
  let includeTasks = $state(true);
  let includeComments = $state(true);
  let includeFiles = $state(true);
  let includeWiki = $state(true);
  let isSearching = $state(false);
  let result = $state<{ tasks: any[]; comments: any[]; files: any[]; wiki: any[] }>({
    tasks: [],
    comments: [],
    files: [],
    wiki: []
  });

  async function runSearch() {
    if (!query.trim()) return;
    isSearching = true;
    try {
      result = await api.search.global(project.id, query, {
        includeTasks,
        includeComments,
        includeFiles,
        includeWiki
      });
    } finally {
      isSearching = false;
    }
  }
</script>

<div class="panel">
  <h3>Global Search</h3>
  <div class="toolbar">
    <input type="text" placeholder="Search tasks, comments, files, wiki..." bind:value={query} />
    <button onclick={runSearch} disabled={!query.trim() || isSearching}>{isSearching ? 'Searching...' : 'Search'}</button>
  </div>
  <div class="filters">
    <label><input type="checkbox" bind:checked={includeTasks} /> Tasks</label>
    <label><input type="checkbox" bind:checked={includeComments} /> Comments</label>
    <label><input type="checkbox" bind:checked={includeFiles} /> Files</label>
    <label><input type="checkbox" bind:checked={includeWiki} /> Wiki</label>
  </div>

  <div class="results">
    <section>
      <h4>Tasks ({result.tasks.length})</h4>
      <ul>{#each result.tasks as row}<li><strong>{row.title}</strong> · {row.status}</li>{/each}</ul>
    </section>
    <section>
      <h4>Comments ({result.comments.length})</h4>
      <ul>{#each result.comments as row}<li>{row.content}</li>{/each}</ul>
    </section>
    <section>
      <h4>Files ({result.files.length})</h4>
      <ul>{#each result.files as row}<li>{row.name}</li>{/each}</ul>
    </section>
    <section>
      <h4>Wiki ({result.wiki.length})</h4>
      <ul>{#each result.wiki as row}<li>{row.title}</li>{/each}</ul>
    </section>
  </div>
</div>

<style>
  .panel { display: flex; flex-direction: column; gap: 10px; }
  .toolbar { display: flex; gap: 8px; }
  .toolbar input { flex: 1; background: var(--surface-color); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 8px; padding: 8px; }
  .filters { display: flex; gap: 12px; flex-wrap: wrap; color: var(--text-muted); font-size: 13px; }
  .results { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
  section { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; background: var(--surface-color); }
  h4 { margin: 0 0 8px; }
  ul { margin: 0; padding-left: 18px; }
</style>
