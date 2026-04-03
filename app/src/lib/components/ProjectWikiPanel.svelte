<script lang="ts">
  import { api } from '$lib/api';
  import { onMount } from 'svelte';

  let { project, access } = $props<{ project: any; access: any }>();

  let pages = $state<any[]>([]);
  let backlinks = $state<any[]>([]);
  let templates = $state<any[]>([]);
  let linkPreviews = $state<any[]>([]);
  let selectedPage = $state<any>(null);
  let newTitle = $state('');
  let newContent = $state('');
  let parentId = $state('');
  let selectedTemplate = $state('');
  let linkUrl = $state('');
  let linkTitle = $state('');
  let error = $state('');

  function buildTree(items: any[], parent: string | null = null): any[] {
    return items
      .filter((item) => (item.parent || null) === parent)
      .map((item): any => ({
        ...item,
        children: buildTree(items, item.id)
      }));
  }

  function flattenTree(nodes: any[], depth = 0): Array<{ node: any; depth: number }> {
    return nodes.flatMap((entry) => [{ node: entry, depth }, ...flattenTree(entry.children || [], depth + 1)]);
  }

  async function loadData() {
    error = '';
    try {
      const [wikiPages, tpl, previews] = await Promise.all([
        api.wiki.getForProject(project.id),
        api.wiki.getTemplates(project.id),
        api.wiki.getLinkPreviews(project.id)
      ]);
      pages = wikiPages;
      templates = tpl;
      linkPreviews = previews;
      if (selectedPage) {
        const refreshed = pages.find((page) => page.id === selectedPage.id) || null;
        selectedPage = refreshed;
      }
    } catch (e) {
      console.error(e);
      error = 'Failed to load wiki data.';
    }
  }

  async function createPage() {
    if (!newTitle.trim() || !access?.canManageWiki) return;
    await api.wiki.createPage({
      project: project.id,
      title: newTitle,
      content: newContent,
      parent: parentId || undefined,
      template: selectedTemplate || undefined
    });
    newTitle = '';
    newContent = '';
    parentId = '';
    selectedTemplate = '';
    await loadData();
  }

  async function savePage() {
    if (!selectedPage || !access?.canManageWiki) return;
    await api.wiki.updatePage(selectedPage.id, {
      title: selectedPage.title,
      content: selectedPage.content,
      parent: selectedPage.parent || null
    });
    await loadData();
    await loadBacklinks(selectedPage.id);
  }

  async function deletePage() {
    if (!selectedPage || !access?.canManageWiki) return;
    await api.wiki.deletePage(selectedPage.id);
    selectedPage = null;
    backlinks = [];
    await loadData();
  }

  async function loadBacklinks(pageId: string) {
    backlinks = await api.wiki.getBacklinks(pageId);
  }

  async function saveUnfurl() {
    if (!linkUrl.trim() || !access?.canManageWiki) return;
    await api.wiki.unfurlLink({
      project: project.id,
      url: linkUrl.trim(),
      title: linkTitle.trim() || undefined
    });
    linkUrl = '';
    linkTitle = '';
    await loadData();
  }

  onMount(async () => {
    await loadData();
  });

  const flattened = $derived(flattenTree(buildTree(pages)));
</script>

<div class="panel">
  <div class="panel-header">
    <h3>Project Wiki</h3>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="layout">
    <div class="sidebar">
      <h4>Pages</h4>
      {#each flattened as row}
        <button class="item {selectedPage?.id === row.node.id ? 'active' : ''}" style={`padding-left:${8 + row.depth * 16}px`} onclick={async () => { selectedPage = { ...row.node }; await loadBacklinks(row.node.id); }}>
          {row.node.title}
        </button>
      {/each}
      {#if pages.length === 0}
        <p>No pages yet.</p>
      {/if}
    </div>

    <div class="content">
      {#if access?.canManageWiki}
        <div class="editor-card">
          <h4>Create page</h4>
          <input type="text" placeholder="Page title" bind:value={newTitle} />
          <select bind:value={parentId}>
            <option value="">No parent</option>
            {#each pages as page}
              <option value={page.id}>{page.title}</option>
            {/each}
          </select>
          <select bind:value={selectedTemplate}>
            <option value="">No template</option>
            {#each templates as tpl}
              <option value={tpl.id}>{tpl.name} ({tpl.kind})</option>
            {/each}
          </select>
          <textarea rows="6" placeholder="Content" bind:value={newContent}></textarea>
          <button onclick={createPage} disabled={!newTitle.trim()}>Create Page</button>
        </div>
      {/if}

      {#if selectedPage}
        <div class="editor-card">
          <h4>Selected page</h4>
          <input type="text" bind:value={selectedPage.title} disabled={!access?.canManageWiki} />
          <textarea rows="10" bind:value={selectedPage.content} disabled={!access?.canManageWiki}></textarea>
          {#if access?.canManageWiki}
            <div class="actions">
              <button onclick={savePage}>Save Page</button>
              <button class="danger" onclick={deletePage}>Delete Page</button>
            </div>
          {/if}
        </div>

        <div class="editor-card">
          <h4>Backlinks</h4>
          <ul>
            {#each backlinks as link}
              <li>{link.expand?.sourcePage?.title || link.sourcePage}</li>
            {/each}
            {#if backlinks.length === 0}
              <li>No backlinks yet.</li>
            {/if}
          </ul>
        </div>
      {/if}

      <div class="editor-card">
        <h4>Link unfurl</h4>
        {#if access?.canManageWiki}
          <div class="actions">
            <input type="url" placeholder="Paste Google Doc / Notion / Figma URL" bind:value={linkUrl} />
            <input type="text" placeholder="Optional title override" bind:value={linkTitle} />
            <button onclick={saveUnfurl} disabled={!linkUrl.trim()}>Save Preview</button>
          </div>
        {/if}
        <div class="preview-grid">
          {#each linkPreviews as preview}
            <a href={preview.url} target="_blank" rel="noreferrer" class="preview-card">
              <strong>{preview.title || preview.url}</strong>
              <span>{preview.provider}</span>
              {#if preview.description}
                <p>{preview.description}</p>
              {/if}
            </a>
          {/each}
          {#if linkPreviews.length === 0}
            <p>No previews yet.</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .panel {
    /* Sidebar width keeps hierarchical page labels readable without overcrowding the editor pane. */
    --wiki-sidebar-width: 280px;
    /* Minimum panel height preserves comfortable editing/preview layout before internal scrolling kicks in. */
    --wiki-min-height: 460px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .layout { display: grid; grid-template-columns: var(--wiki-sidebar-width) 1fr; gap: 12px; min-height: var(--wiki-min-height); }
  .sidebar, .content { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; }
  .sidebar { display: flex; flex-direction: column; gap: 6px; }
  .item { text-align: left; border: 1px solid var(--border-color); background: var(--bg-color); border-radius: 6px; padding: 6px 8px; }
  .item.active { border-color: var(--color-green); }
  .content { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
  .editor-card { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; background: var(--bg-color); }
  .editor-card input, .editor-card textarea, .editor-card select { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); padding: 8px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .danger { color: #ff5a5a; }
  .preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
  .preview-card { display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; background: var(--surface-color); }
  .preview-card p { margin: 0; color: var(--text-muted); font-size: 12px; }
  .error { color: #ff5a5a; }
</style>
