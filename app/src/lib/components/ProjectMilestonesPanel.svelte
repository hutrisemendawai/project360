<script lang="ts">
  import { api } from '$lib/api';
  import { onMount } from 'svelte';

  let { project, access } = $props<{ project: any; access: any }>();

  let milestones = $state<any[]>([]);
  let dependencies = $state<any[]>([]);
  let title = $state('');
  let plannedStart = $state('');
  let plannedDue = $state('');
  let status = $state<'planned' | 'in_progress' | 'completed' | 'blocked'>('planned');
  let isLoading = $state(false);
  let selectedDependencySource = $state('');
  let selectedDependencyTarget = $state('');
  let dependencyType = $state<'finish_to_start' | 'start_to_start' | 'finish_to_finish'>('finish_to_start');

  async function loadData() {
    isLoading = true;
    try {
      const data = await api.milestones.getForProject(project.id);
      milestones = data.milestones;
      dependencies = data.dependencies;
    } finally {
      isLoading = false;
    }
  }

  async function createMilestone() {
    if (!title.trim() || !access?.canManageMilestones) return;
    await api.milestones.create({
      project: project.id,
      title,
      status,
      plannedStart: plannedStart || undefined,
      plannedDue: plannedDue || undefined,
      completion: status === 'completed' ? 100 : 0
    });
    title = '';
    plannedStart = '';
    plannedDue = '';
    status = 'planned';
    await loadData();
  }

  async function updateCompletion(item: any, completion: number) {
    if (!access?.canManageMilestones) return;
    const clamped = Math.max(0, Math.min(100, Math.round(completion)));
    await api.milestones.update(item.id, {
      completion: clamped,
      status: clamped === 100 ? 'completed' : clamped > 0 ? 'in_progress' : 'planned',
      actualDue: clamped === 100 ? new Date().toISOString() : null
    });
    await loadData();
  }

  async function addDependency() {
    if (!selectedDependencySource || !selectedDependencyTarget || !access?.canManageMilestones) return;
    await api.milestones.addDependency({
      project: project.id,
      sourceMilestone: selectedDependencySource,
      targetMilestone: selectedDependencyTarget,
      type: dependencyType,
      requiresApproval: true
    });
    selectedDependencySource = '';
    selectedDependencyTarget = '';
    dependencyType = 'finish_to_start';
    await loadData();
  }

  async function requestReschedule(depId: string) {
    if (!access?.canManageMilestones) return;
    await api.milestones.requestAutoReschedule({
      project: project.id,
      dependencyId: depId,
      reason: 'Blocker slipped; reschedule dependent milestone.'
    });
  }

  function varianceDays(item: any) {
    if (!item.plannedDue || !item.actualDue) return null;
    const planned = new Date(item.plannedDue).getTime();
    const actual = new Date(item.actualDue).getTime();
    return Math.round((actual - planned) / (1000 * 60 * 60 * 24));
  }

  function milestoneTitle(id: string) {
    return milestones.find((m) => m.id === id)?.title || id;
  }

  onMount(async () => {
    await loadData();
  });
</script>

<div class="panel">
  <h3>Milestones</h3>

  {#if access?.canManageMilestones}
    <div class="create-row">
      <input type="text" placeholder="Milestone title" bind:value={title} />
      <input type="date" bind:value={plannedStart} />
      <input type="date" bind:value={plannedDue} />
      <select bind:value={status}>
        <option value="planned">Planned</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="blocked">Blocked</option>
      </select>
      <button onclick={createMilestone} disabled={!title.trim()}>Add</button>
    </div>
  {/if}

  <div class="table-wrap">
    {#if isLoading}
      <p>Loading milestones...</p>
    {:else if milestones.length === 0}
      <p>No milestones yet.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Planned</th>
            <th>Actual</th>
            <th>Variance</th>
            <th>Completion</th>
          </tr>
        </thead>
        <tbody>
          {#each milestones as item}
            <tr>
              <td>{item.title}</td>
              <td>{item.status}</td>
              <td>{item.plannedStart || '-'} → {item.plannedDue || '-'}</td>
              <td>{item.actualStart || '-'} → {item.actualDue || '-'}</td>
              <td>
                {#if varianceDays(item) === null}
                  -
                {:else}
                  {varianceDays(item)}d
                {/if}
              </td>
              <td>
                {#if access?.canManageMilestones}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.completion || 0}
                    onchange={(e) => updateCompletion(item, Number((e.currentTarget as HTMLInputElement).value))}
                  />
                {:else}
                  {item.completion || 0}%
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <div class="dependency-grid">
    <div class="card">
      <h4>Dependencies</h4>
      <ul>
        {#each dependencies as dep}
          <li>
            {milestoneTitle(dep.sourceMilestone)} → {milestoneTitle(dep.targetMilestone)} ({dep.type})
            {#if dep.requiresApproval}
              <span class="pill">approval</span>
            {/if}
            {#if access?.canManageMilestones}
              <button onclick={() => requestReschedule(dep.id)}>Request Auto-Reschedule</button>
            {/if}
          </li>
        {/each}
        {#if dependencies.length === 0}
          <li>No dependencies yet.</li>
        {/if}
      </ul>
    </div>

    {#if access?.canManageMilestones}
      <div class="card">
        <h4>Add dependency</h4>
        <select bind:value={selectedDependencySource}>
          <option value="">Source milestone</option>
          {#each milestones as milestone}
            <option value={milestone.id}>{milestone.title}</option>
          {/each}
        </select>
        <select bind:value={selectedDependencyTarget}>
          <option value="">Target milestone</option>
          {#each milestones as milestone}
            <option value={milestone.id}>{milestone.title}</option>
          {/each}
        </select>
        <select bind:value={dependencyType}>
          <option value="finish_to_start">Finish to Start</option>
          <option value="start_to_start">Start to Start</option>
          <option value="finish_to_finish">Finish to Finish</option>
        </select>
        <button onclick={addDependency} disabled={!selectedDependencySource || !selectedDependencyTarget}>Save Dependency</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .panel { display: flex; flex-direction: column; gap: 12px; }
  .create-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 8px; }
  .create-row input, .create-row select { background: var(--surface-color); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 8px; padding: 8px; }
  .table-wrap { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; overflow: auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid var(--border-color); padding: 10px; text-align: left; font-size: 13px; }
  .dependency-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .card select { background: var(--bg-color); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 8px; padding: 8px; }
  ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  .pill { font-size: 10px; border: 1px solid var(--border-color); border-radius: 999px; padding: 2px 6px; margin-left: 6px; color: var(--text-muted); }
</style>
