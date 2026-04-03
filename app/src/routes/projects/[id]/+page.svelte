<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '$lib/api';
  import { pb, currentUser } from '$lib/pocketbase';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { gsap } from 'gsap';
  import TaskModal from './TaskModal.svelte';

  let projectId = $derived($page.params.id as string);
  let project = $state<any>(null);
  let tasks = $state<any[]>([]);
  let isLoading = $state(true);
  let access = $state<any>(null);
  let canViewFinancials = $state(false);
  let canManageFinancials = $state(false);
  let budgetInput = $state('0');
  let actualCostInput = $state('0');
  let errorMsg = $state('');

  let columns = [
    { id: 'todo', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'review', title: 'Review' },
    { id: 'done', title: 'Done' }
  ];

  onMount(async () => {
    if (!$currentUser) {
      goto('/login');
      return;
    }
    try {
      project = await api.projects.getOne(projectId);
      access = project.access;
      canViewFinancials = !!project.access?.canViewFinancials;
      canManageFinancials = !!project.access?.canManageFinancials;
      budgetInput = String(project.financials?.budget ?? 0);
      actualCostInput = String(project.financials?.actualCost ?? 0);
      tasks = await api.tasks.getForProject(projectId);

      // Realtime task updates
      pb.collection('tasks').subscribe('*', function (e) {
        if (e.action === 'create' && e.record.project === projectId) {
          if (!tasks.some(t => t.id === e.record.id)) {
            tasks = [...tasks, e.record];
          }
        }
        if (e.action === 'update' && e.record.project === projectId) {
          tasks = tasks.map(t => t.id === e.record.id ? e.record : t);
        }
        if (e.action === 'delete') {
          tasks = tasks.filter(t => t.id !== e.record.id);
        }
      });
    } catch (e) {
      console.error(e);
      errorMsg = 'You do not have access to this project.';
      goto('/projects');
    } finally {
      isLoading = false;
      // Animate Kanban board columns natively
      setTimeout(() => {
        gsap.from('.kanban-col', {
          y: 30,
          opacity: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power3.out',
          clearProps: 'all'
        });
      }, 50);
    }
  });

  onDestroy(() => {
    pb.collection('tasks').unsubscribe('*');
  });

  // Drag functionality
  let draggedTaskId = $state<string | null>(null);
  let dragHoverColumn = $state<string | null>(null);

  function handleDragStart(e: DragEvent, task: any) {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
      setTimeout(() => { draggedTaskId = task.id; }, 0);
    }
  }

  function handleDragEnd() {
    draggedTaskId = null;
    dragHoverColumn = null;
  }

  function handleDragOver(e: DragEvent, colId: string) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (dragHoverColumn !== colId) {
      dragHoverColumn = colId;
    }
  }

  async function handleDrop(e: DragEvent, colId: string) {
    e.preventDefault();
    dragHoverColumn = null;
    if (!access?.canEditTask) {
      draggedTaskId = null;
      return;
    }
    const taskId = e.dataTransfer?.getData('text/plain');
    if (taskId) {
      const t = tasks.find(t => t.id === taskId);
      if (t && t.status !== colId) {
        t.status = colId;
        tasks = [...tasks];
        try {
          await api.tasks.update(taskId, { status: colId });
        } catch (err) {
          console.error('Update failed', err);
        }
      }
    }
    draggedTaskId = null;
  }

  function handleDragLeave(e: DragEvent) {
    dragHoverColumn = null;
  }

  // View toggle
  let currentView = $state('kanban'); // kanban, list, grid

  // Target element for GSAP animation
  let viewContainerContainer = $state<HTMLElement>();

  $effect(() => {
    // Re-animate when view changes
    if (viewContainerContainer && currentView) {
      gsap.from(viewContainerContainer.children, {
        y: 20,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.out'
      });
    }
  });

  // Modal
  let showTaskModal = $state(false);
  let newTaskTitle = $state('');
  let newTaskStatus = $state('todo');
  let newTaskDesc = $state(''); // New field!

  async function createTask() {
    if (!newTaskTitle) return;
    if (!access?.canCreateTask) return;
    try {
      await api.tasks.create({
        title: newTaskTitle,
        description: newTaskDesc,
        project: projectId,
        status: newTaskStatus,
        order: tasks.length
      });
      showTaskModal = false;
      newTaskTitle = '';
      newTaskDesc = '';
    } catch (e) { console.error(e); }
  }

  let selectedTask = $state<any>(null);

  async function saveFinancials() {
    if (!canManageFinancials || !project?.id) return;
    try {
      project = await api.projects.update(project.id, {
        budget: Number(budgetInput) || 0,
        actualCost: Number(actualCostInput) || 0
      });
    } catch (e) {
      console.error(e);
      errorMsg = 'Failed to update financial fields.';
    }
  }
</script>

<svelte:head>
  <title>{project ? project.name : 'Kanban'} | Project360</title>
</svelte:head>

<div class="board-container">
  {#if errorMsg}
    <div class="error-msg">{errorMsg}</div>
  {/if}
  {#if isLoading}
    <div class="loader-container"><div class="loader"></div></div>
  {:else if project}
    <div class="board-header">
      <div class="header-content">
        <a href="/projects" class="back-link">
          <svg height="16" viewBox="0 0 16 16" width="16" class="octicon"><path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7.25h9.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"></path></svg>
          Projects
        </a>
        <h1>{project.name}</h1>
        {#if project.description}
          <p class="project-desc">{project.description}</p>
        {/if}
      </div>
      <div class="view-toggles">
        <button class="toggle-btn {currentView === 'kanban' ? 'active' : ''}" onclick={() => currentView = 'kanban'}>Kanban</button>
        <button class="toggle-btn {currentView === 'list' ? 'active' : ''}" onclick={() => currentView = 'list'}>List</button>
        <button class="toggle-btn {currentView === 'grid' ? 'active' : ''}" onclick={() => currentView = 'grid'}>Grid</button>
      </div>
      {#if access?.canCreateTask}
        <button class="add-task-btn" onclick={() => { newTaskStatus = 'todo'; showTaskModal = true; }}>+ Add Task</button>
      {/if}
    </div>
    <div class="meta-toolbar">
      {#if access?.role}
        <span class="role-badge">{access.role}</span>
      {/if}
      {#if canViewFinancials}
        <div class="financial-panel">
          <label>
            Budget
            <input type="number" min="0" bind:value={budgetInput} disabled={!canManageFinancials} />
          </label>
          <label>
            Actual Cost
            <input type="number" min="0" bind:value={actualCostInput} disabled={!canManageFinancials} />
          </label>
          {#if canManageFinancials}
            <button class="save-financial-btn" onclick={saveFinancials}>Save</button>
          {/if}
        </div>
      {/if}
    </div>

    <div class="view-container" bind:this={viewContainerContainer}>
      {#if currentView === 'kanban'}
        <div class="kanban-board">
          {#each columns as col}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
              class="kanban-col {dragHoverColumn === col.id ? 'drag-over' : ''}"
              ondragover={(e) => handleDragOver(e, col.id)}
              ondragleave={handleDragLeave}
              ondrop={(e) => handleDrop(e, col.id)}
            >
              <div class="col-header">
                <h3>{col.title} <span class="count">{tasks.filter(t => t.status === col.id).length}</span></h3>
                {#if access?.canCreateTask}
                  <button class="icon-btn" onclick={() => { newTaskStatus = col.id; showTaskModal = true; }} title="Add task in {col.title}">+</button>
                {/if}
              </div>

              <div class="col-tasks">
                {#each tasks.filter(t => t.status === col.id) as task (task.id)}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <div 
                    class="task-card {draggedTaskId === task.id ? 'dragging' : ''}"
                    role="button"
                    tabindex="0"
                    draggable={access?.canEditTask}
                    ondragstart={(e) => handleDragStart(e, task)}
                    ondragend={handleDragEnd}
                    onclick={() => selectedTask = task}
                  >
                    <h4>{task.title}</h4>
                    {#if task.description}<p class="task-desc-preview">{task.description}</p>{/if}
                    <div class="task-meta">
                      <div class="avatar-small"></div>
                    </div>
                  </div>
                {/each}
                {#if tasks.filter(t => t.status === col.id).length === 0}
                  <div class="empty-col">No tasks</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else if currentView === 'list'}
        <div class="list-view">
          <table class="tasks-table">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#each tasks as task}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <tr class="task-row" role="button" tabindex="0" onclick={() => selectedTask = task}>
                  <td class="task-title-cell"><strong>{task.title}</strong></td>
                  <td class="task-desc-cell">{task.description || '-'}</td>
                  <td>
                    <span class="status-badge {task.status}">
                      {columns.find(c => c.id === task.status)?.title}
                    </span>
                  </td>
                </tr>
              {/each}
              {#if tasks.length === 0}
                <tr><td colspan="3" class="empty-col">No tasks found in this project.</td></tr>
              {/if}
            </tbody>
          </table>
        </div>
      {:else if currentView === 'grid'}
        <div class="grid-view">
          {#each tasks as task}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div class="grid-card" role="button" tabindex="0" onclick={() => selectedTask = task}>
              <div class="card-top">
                <span class="status-badge {task.status}">
                  {columns.find(c => c.id === task.status)?.title}
                </span>
              </div>
              <h4>{task.title}</h4>
              <p class="task-desc-preview">{task.description || 'No description'}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if showTaskModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" role="presentation" onclick={(e) => { if(e.target === e.currentTarget) showTaskModal = false; }}>
    <div class="modal">
      <h2>Create New Task</h2>
      <div class="input-group">
        <label for="taskTitle">Task Title</label>
        <input id="taskTitle" type="text" bind:value={newTaskTitle} placeholder="What needs to be done?" />
      </div>
      <div class="input-group">
        <label for="taskDesc">Description (Optional)</label>
        <textarea id="taskDesc" bind:value={newTaskDesc} placeholder="Add some details..."></textarea>
      </div>
      <div class="input-group">
        <label for="taskStatus">Status</label>
        <select id="taskStatus" bind:value={newTaskStatus}>
          {#each columns as col}
            <option value={col.id}>{col.title}</option>
          {/each}
        </select>
      </div>
      <div class="modal-actions">
        <button class="cancel" onclick={() => showTaskModal = false}>Cancel</button>
        <button class="save" onclick={createTask} disabled={!newTaskTitle}>Create Task</button>
      </div>
    </div>
  </div>
{/if}

{#if selectedTask}
  <TaskModal task={selectedTask} onClose={() => selectedTask = null} />
{/if}

<style>
  .board-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 20px 40px;
    background-color: var(--bg-color);
  }

  .error-msg {
    color: #ff4d4d;
    font-size: 13px;
    margin-bottom: 8px;
  }

  .meta-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    gap: 10px;
    flex-wrap: wrap;
  }

  .role-badge {
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--color-green);
    background: rgba(29, 185, 84, 0.1);
    padding: 4px 8px;
    border-radius: 999px;
  }

  .financial-panel {
    display: flex;
    gap: 10px;
    align-items: end;
    flex-wrap: wrap;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px;
  }

  .financial-panel label {
    display: flex;
    flex-direction: column;
    font-size: 12px;
    gap: 4px;
    color: var(--text-muted);
  }

  .financial-panel input {
    width: 140px;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-main);
    padding: 6px 8px;
  }

  .save-financial-btn {
    background: var(--color-green);
    color: var(--color-black);
    padding: 8px 12px;
    border-radius: 6px;
    font-weight: 600;
  }

  .loader-container { display: flex; justify-content: center; align-items: center; height: 100%; }
  .loader { width: 40px; height: 40px; border: 4px solid var(--border-color); border-top-color: var(--color-green); border-radius: 50%; animation: spin 1s infinite linear; }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 25px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 10px;
    transition: color 0.2s;
  }
  .back-link:hover { color: var(--color-green); }
  .back-link .octicon { fill: currentColor; }

  .header-content h1 {
    font-size: 26px;
    margin: 0 0 8px;
  }
  .project-desc {
    margin: 0;
    color: var(--text-muted);
    font-size: 14px;
    max-width: 600px;
  }

  .add-task-btn {
    background-color: var(--color-green);
    color: var(--color-black);
    padding: 10px 18px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s;
  }
  .add-task-btn:hover { background-color: var(--color-green-light); transform: translateY(-2px); }

  .kanban-board {
    display: flex;
    gap: 20px;
    height: 100%;
    overflow-x: auto;
    padding-bottom: 20px;
  }

  .view-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: hidden;
  }

  .view-toggles {
    display: flex;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    margin-right: 15px;
  }

  .toggle-btn {
    padding: 8px 16px;
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 500;
    transition: all 0.2s;
    border-right: 1px solid var(--border-color);
  }
  .toggle-btn:last-child { border-right: none; }
  .toggle-btn:hover { background: var(--surface-hover); color: var(--text-main); }
  .toggle-btn.active { background: rgba(29, 185, 84, 0.1); color: var(--color-green); }

  /* List View */
  .list-view {
    background: var(--surface-color);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    overflow: hidden;
    flex: 1;
  }

  .tasks-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  .tasks-table th {
    padding: 16px 20px;
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 600;
    border-bottom: 1px solid var(--border-color);
    background: rgba(0,0,0,0.2);
  }

  .task-row td {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    font-size: 14px;
    cursor: pointer;
  }
  .task-row:last-child td { border-bottom: none; }
  .task-row:hover { background: var(--surface-hover); }
  
  .task-desc-cell {
    color: var(--text-muted);
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Grid View */
  .grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    overflow-y: auto;
    padding-bottom: 20px;
  }

  .grid-card {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: pointer;
  }
  .grid-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); border-color: var(--color-green); }
  
  .grid-card .card-top { margin-bottom: 15px; }
  .grid-card h4 { margin: 0 0 10px; font-size: 16px; font-weight: 600; }
  .task-desc-preview { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  .status-badge {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 12px;
    text-transform: uppercase;
    font-weight: bold;
    letter-spacing: 0.5px;
    display: inline-block;
  }

  .status-badge.todo { background: rgba(150, 150, 150, 0.2); color: #ccc; }
  .status-badge.in_progress { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
  .status-badge.review { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
  .status-badge.done { background: rgba(29, 185, 84, 0.2); color: var(--color-green-light); }

  .kanban-col {
    background-color: var(--surface-color);
    border-radius: 12px;
    width: 300px;
    min-width: 300px;
    display: flex;
    flex-direction: column;
    max-height: 100%;
    border: 2px solid transparent;
    transition: border-color 0.2s;
  }

  .kanban-col.drag-over {
    border-color: var(--color-green);
    background-color: var(--surface-hover);
  }

  .col-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .col-header h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .count {
    background: var(--bg-color);
    color: var(--text-muted);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: bold;
  }

  .icon-btn {
    color: var(--text-muted);
    font-size: 18px;
    display: flex;
    align-items: center; justify-content: center;
    width: 24px; height: 24px;
    border-radius: 4px;
    transition: all 0.2s;
  }
  .icon-btn:hover { background: var(--border-color); color: var(--text-main); }

  .col-tasks {
    padding: 15px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .task-card {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    padding: 15px;
    border-radius: 8px;
    cursor: grab;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  }
  .task-card:hover {
    border-color: var(--text-muted);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .task-card:active { cursor: grabbing; transform: scale(0.98); }
  .task-card.dragging { opacity: 0.5; }

  .task-card h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
  }

  .task-meta {
    display: flex;
    justify-content: flex-end;
  }

  .avatar-small {
    width: 20px; height: 20px;
    border-radius: 50%;
    background-color: var(--border-color);
  }

  .empty-col {
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
    font-style: italic;
    padding: 20px 0;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 1000;
  }

  .modal {
    background: var(--surface-color); padding: 30px; border-radius: 16px;
    width: 100%; max-width: 450px; border: 1px solid var(--border-color);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .input-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
  .input-group label { font-size: 13px; color: var(--text-muted); font-weight: 500; }
  .input-group input, .input-group select {
    background: var(--bg-color); border: 1px solid var(--border-color);
    padding: 12px; border-radius: 8px; color: var(--text-main); font-family: inherit;
  }
  .input-group input:focus, .input-group select:focus { outline: none; border-color: var(--color-green); }

  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
  .modal-actions button { padding: 10px 16px; border-radius: 6px; font-weight: 500; }
  .cancel { color: var(--text-muted); }
  .cancel:hover { background: rgba(255,255,255,0.05); color: var(--text-main); }
  .save { background: var(--color-green); color: var(--color-black); }
  .save:hover:not(:disabled) { background: var(--color-green-light); }
  .save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
