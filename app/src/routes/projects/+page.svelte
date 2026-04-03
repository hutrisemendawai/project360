<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api';
  import { currentUser } from '$lib/pocketbase';
  import { goto } from '$app/navigation';
  import { gsap } from 'gsap';

  $effect(() => {
    if (!$currentUser) goto('/login');
  });

  let projects = $state<any[]>([]);
  let isLoading = $state(true);
  let canCreateProject = $state(false);
  let canManageFinancials = $state(false);
  let errorMsg = $state('');
  
  // New Project modal state
  let showModal = $state(false);
  let newName = $state('');
  let newDesc = $state('');
  let newBudget = $state('0');
  let newActualCost = $state('0');

  let gridContainer = $state<HTMLElement>();

  onMount(async () => {
    try {
      const [projectList, canCreate, canManageFinancialsInWorkspace] = await Promise.all([
        api.projects.getAll(),
        api.governance.canCreateProjectInDefaultWorkspace(),
        api.governance.canManageFinancialsInDefaultWorkspace()
      ]);
      projects = projectList;
      canCreateProject = canCreate;
      canManageFinancials = canManageFinancialsInWorkspace || projects.some((project) => project.access?.canManageFinancials);
    } catch (e) {
      console.error(e);
      errorMsg = 'Failed to load projects.';
    } finally {
      isLoading = false;
      // Animate project cards in
      if (projects.length > 0 && gridContainer) {
        gsap.from(gridContainer.children, {
          y: 20,
          opacity: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: 'power2.out'
        });
      }
    }
  });

  async function createProject() {
    try {
      if (!canCreateProject) {
        errorMsg = 'You do not have permission to create projects.';
        return;
      }

      const p = await api.projects.create({
        name: newName,
        description: newDesc,
        status: 'active',
        ...(canManageFinancials ? { budget: Number(newBudget) || 0, actualCost: Number(newActualCost) || 0 } : {})
      });
      projects = [p, ...projects];
      showModal = false;
      newName = '';
      newDesc = '';
      newBudget = '0';
      newActualCost = '0';
      errorMsg = '';
    } catch (e) {
      console.error(e);
      errorMsg = 'Failed to create project.';
    }
  }
</script>

<svelte:head>
  <title>Projects | Project360</title>
</svelte:head>

<div class="page-container">
  <div class="header">
    <h1>Projects</h1>
    {#if canCreateProject}
      <button class="create-btn" onclick={() => showModal = true}>+ New Project</button>
    {/if}
  </div>
  {#if errorMsg}
    <p class="error-msg">{errorMsg}</p>
  {/if}

  {#if isLoading}
    <div class="loader-container"><div class="loader"></div></div>
  {:else if projects.length === 0}
    <div class="empty">
      <div class="empty-icon">📂</div>
      <h3>No projects found</h3>
      <p>Create your first project to get started.</p>
    </div>
  {:else}
    <div class="projects-grid" bind:this={gridContainer}>
      {#each projects as project}
        <a href={`/projects/${project.id}`} class="project-card">
          <div class="card-header">
            <h3>{project.name}</h3>
            <span class="status-badge {project.status}">{project.status}</span>
          </div>
          <p class="description">{project.description || 'No description provided.'}</p>
          {#if project.access?.role}
            <div class="role-badge">{project.access.role}</div>
          {/if}
          {#if project.financials}
            <div class="finance-summary">
              <span>Budget: ${project.financials.budget ?? 0}</span>
              <span>Actual: ${project.financials.actualCost ?? 0}</span>
            </div>
          {/if}
          <div class="card-footer">
            <span class="date">Created {new Date(project.created).toLocaleDateString()}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-backdrop" role="presentation" onclick={(e) => { if(e.target === e.currentTarget) showModal = false; }}>
    <div class="modal">
      <h2>Create Project</h2>
      <div class="input-group">
        <label for="newName">Project Name</label>
        <input id="newName" type="text" bind:value={newName} placeholder="e.g. Website Redesign" />
      </div>
      <div class="input-group">
        <label for="newDesc">Description</label>
        <textarea id="newDesc" bind:value={newDesc} placeholder="Optional details..."></textarea>
      </div>
      {#if canManageFinancials}
        <div class="input-group">
          <label for="newBudget">Budget</label>
          <input id="newBudget" type="number" min="0" bind:value={newBudget} />
        </div>
        <div class="input-group">
          <label for="newActualCost">Actual Cost</label>
          <input id="newActualCost" type="number" min="0" bind:value={newActualCost} />
        </div>
      {/if}
      <div class="modal-actions">
        <button class="cancel" onclick={() => showModal = false}>Cancel</button>
        <button class="save" onclick={createProject} disabled={!newName}>Create</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-container {
    padding: 30px 40px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  .header h1 {
    font-size: 28px;
    margin: 0;
  }

  .create-btn {
    background-color: var(--color-green);
    color: var(--color-black);
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    transition: transform 0.2s, background 0.2s;
  }

  .create-btn:hover {
    background-color: var(--color-green-light);
    transform: translateY(-2px);
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .project-card {
    background-color: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    text-decoration: none;
    color: inherit;
  }

  .project-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    border-color: var(--color-green);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
  }

  .card-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-main);
  }

  .status-badge {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 12px;
    text-transform: uppercase;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .status-badge.active { background: rgba(29, 185, 84, 0.2); color: var(--color-green-light); }
  .status-badge.completed { background: rgba(100, 100, 100, 0.2); color: var(--text-muted); }

  .description {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0 0 20px 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex: 1;
  }

  .role-badge {
    display: inline-block;
    margin-bottom: 10px;
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--color-green);
    background: rgba(29, 185, 84, 0.1);
    padding: 4px 8px;
    border-radius: 999px;
  }

  .finance-summary {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  .error-msg {
    color: #ff4d4d;
    margin: -10px 0 20px 0;
    font-size: 13px;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-muted);
    border-top: 1px solid var(--border-color);
    padding-top: 15px;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: var(--surface-color);
    padding: 30px;
    border-radius: 16px;
    width: 100%;
    max-width: 450px;
    border: 1px solid var(--border-color);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .modal h2 { margin: 0 0 20px; }

  .input-group {
    margin-bottom: 15px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .input-group label {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .input-group input, .input-group textarea {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    padding: 12px;
    border-radius: 8px;
    color: var(--text-main);
    font-family: inherit;
  }

  .input-group textarea { resize: vertical; min-height: 80px; }

  .input-group input:focus, .input-group textarea:focus {
    outline: none;
    border-color: var(--color-green);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 25px;
  }

  .modal-actions button {
    padding: 10px 16px;
    border-radius: 6px;
    font-weight: 500;
  }

  .cancel { color: var(--text-muted); }
  .cancel:hover { background: rgba(255,255,255,0.05); color: var(--text-main); }

  .save { background: var(--color-green); color: var(--color-black); }
  .save:hover:not(:disabled) { background: var(--color-green-light); }
  .save:disabled { opacity: 0.5; cursor: not-allowed; }

  .loader-container { display: flex; justify-content: center; padding: 50px; }
  .loader { width: 30px; height: 30px; border: 3px solid var(--border-color); border-top-color: var(--color-green); border-radius: 50%; animation: spin 1s infinite linear; }
  .empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
  .empty-icon { font-size: 48px; margin-bottom: 15px; }
  .empty h3 { color: var(--text-main); margin: 0 0 5px; }
</style>
