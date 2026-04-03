<script lang="ts">
  import { api } from '$lib/api';
  import { onMount } from 'svelte';

  let { project, access } = $props<{ project: any; access: any }>();

  let board = $state<{ tasks: any[]; sprints: any[]; epics: any[]; initiatives: any[]; retros: any[] }>({
    tasks: [],
    sprints: [],
    epics: [],
    initiatives: [],
    retros: []
  });
  let velocity = $state<any>(null);
  let burndown = $state<any>(null);

  let sprintName = $state('');
  let sprintGoal = $state('');
  let sprintStart = $state('');
  let sprintEnd = $state('');
  let sprintCapacity = $state(0);

  let epicName = $state('');
  let epicStoryPoints = $state(0);
  let epicWsjf = $state(0);

  let initiativeName = $state('');
  let retroTitle = $state('');
  let retroActionItem = $state('');

  async function loadData() {
    const [nextBoard, nextVelocity, nextBurndown] = await Promise.all([
      api.agile.getBoard(project.id),
      api.agile.velocity(project.id),
      api.agile.burndown(project.id)
    ]);
    board = nextBoard;
    velocity = nextVelocity;
    burndown = nextBurndown;
  }

  async function createSprint() {
    if (!access?.canManageAgile || !sprintName.trim() || !sprintStart || !sprintEnd) return;
    await api.agile.createSprint({
      project: project.id,
      name: sprintName,
      goal: sprintGoal,
      startDate: sprintStart,
      endDate: sprintEnd,
      capacityHours: sprintCapacity
    });
    sprintName = '';
    sprintGoal = '';
    sprintStart = '';
    sprintEnd = '';
    sprintCapacity = 0;
    await loadData();
  }

  async function createEpic() {
    if (!access?.canManageAgile || !epicName.trim()) return;
    await api.agile.upsertEpic({
      project: project.id,
      name: epicName,
      storyPoints: epicStoryPoints,
      wsjfScore: epicWsjf
    });
    epicName = '';
    epicStoryPoints = 0;
    epicWsjf = 0;
    await loadData();
  }

  async function createInitiative() {
    if (!access?.canManageAgile || !initiativeName.trim()) return;
    await api.agile.createInitiative({
      project: project.id,
      name: initiativeName
    });
    initiativeName = '';
    await loadData();
  }

  async function createRetro() {
    if (!access?.canManageAgile || !retroTitle.trim()) return;
    const actionItems = retroActionItem.trim()
      ? [{ title: retroActionItem.trim(), description: 'Generated from retro action item' }]
      : [];
    await api.agile.createRetro({
      project: project.id,
      title: retroTitle,
      actionItems
    });
    retroTitle = '';
    retroActionItem = '';
    await loadData();
  }

  async function rolloverToNextSprint(currentSprintId: string) {
    if (!access?.canManageAgile) return;
    const current = board.sprints.find((sprint) => sprint.id === currentSprintId);
    if (!current) return;
    const sorted = [...board.sprints].sort((a, b) => {
      const aTime = new Date(a.startDate || a.created).getTime();
      const bTime = new Date(b.startDate || b.created).getTime();
      return aTime - bTime;
    });
    const currentIndex = sorted.findIndex((sprint) => sprint.id === currentSprintId);
    const nextSprint = currentIndex >= 0 ? sorted[currentIndex + 1] : null;
    if (!nextSprint) return;
    await api.agile.rolloverIncompleteTasks(currentSprintId, nextSprint.id);
    await loadData();
  }

  onMount(async () => {
    await loadData();
  });
</script>

<div class="panel">
  <h3>Agile / Scrum</h3>

  <div class="grid">
    <div class="card">
      <h4>Backlog and prioritization</h4>
      <ul>
        {#each board.tasks as task}
          <li>{task.title} · {task.status}</li>
        {/each}
        {#if board.tasks.length === 0}
          <li>No backlog items.</li>
        {/if}
      </ul>
    </div>
    <div class="card">
      <h4>Sprints</h4>
      {#if access?.canManageAgile}
        <div class="row">
          <input type="text" placeholder="Sprint name" bind:value={sprintName} />
          <input type="text" placeholder="Sprint goal" bind:value={sprintGoal} />
          <input type="date" bind:value={sprintStart} />
          <input type="date" bind:value={sprintEnd} />
          <input type="number" min="0" placeholder="Capacity hours" bind:value={sprintCapacity} />
          <button onclick={createSprint}>Create Sprint</button>
        </div>
      {/if}
      <ul>
        {#each board.sprints as sprint}
          <li>
            {sprint.name} · {sprint.startDate} → {sprint.endDate} · {sprint.status}
            {#if access?.canManageAgile}
              <button onclick={() => rolloverToNextSprint(sprint.id)}>Rollover incomplete</button>
            {/if}
          </li>
        {/each}
        {#if board.sprints.length === 0}
          <li>No sprints yet.</li>
        {/if}
      </ul>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h4>Epics and initiatives</h4>
      {#if access?.canManageAgile}
        <div class="row">
          <input type="text" placeholder="Epic name" bind:value={epicName} />
          <input type="number" min="0" placeholder="Story points" bind:value={epicStoryPoints} />
          <input type="number" min="0" step="0.1" placeholder="WSJF score" bind:value={epicWsjf} />
          <button onclick={createEpic}>Save Epic</button>
        </div>
        <div class="row">
          <input type="text" placeholder="Initiative name" bind:value={initiativeName} />
          <button onclick={createInitiative}>Add Initiative</button>
        </div>
      {/if}
      <ul>
        {#each board.epics as epic}
          <li>{epic.name} · SP: {epic.storyPoints || 0} · WSJF: {epic.wsjfScore || 0}</li>
        {/each}
      </ul>
      <ul>
        {#each board.initiatives as initiative}
          <li>{initiative.name} · {initiative.status}</li>
        {/each}
      </ul>
    </div>

    <div class="card">
      <h4>Retrospectives</h4>
      {#if access?.canManageAgile}
        <div class="row">
          <input type="text" placeholder="Retro title" bind:value={retroTitle} />
          <input type="text" placeholder="Action item -> task" bind:value={retroActionItem} />
          <button onclick={createRetro}>Save Retro</button>
        </div>
      {/if}
      <ul>
        {#each board.retros as retro}
          <li>{retro.title} · {new Date(retro.created).toLocaleDateString()}</li>
        {/each}
        {#if board.retros.length === 0}
          <li>No retros yet.</li>
        {/if}
      </ul>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h4>Velocity trend</h4>
      {#if velocity}
        <ul>
          {#each velocity.velocityTrend as item}
            <li>{item.sprint}: {item.velocity}</li>
          {/each}
        </ul>
      {/if}
    </div>
    <div class="card">
      <h4>Burndown / Burnup</h4>
      {#if burndown}
        <p>Total: {burndown.total}</p>
        <p>Done: {burndown.done}</p>
        <p>Remaining: {burndown.remaining}</p>
        <p>Burnup: {burndown.burnup}</p>
        <p>Burndown: {burndown.burndown}</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .panel { display: flex; flex-direction: column; gap: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
  .row input { background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); padding: 8px; }
  ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
</style>
