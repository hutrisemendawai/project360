<script lang="ts">
  import { api } from '$lib/api';
  import { onMount } from 'svelte';

  let { project, access } = $props<{ project: any; access: any }>();

  let health = $state<any>(null);
  let leadCycle = $state<any>(null);
  let capacity = $state<any[]>([]);
  let dashboards = $state<any[]>([]);
  let savedReports = $state<any[]>([]);
  let exportPayload = $state<any>(null);

  let dashboardName = $state('');
  let reportName = $state('');
  let reportType = $state<'executive' | 'health' | 'capacity' | 'velocity' | 'timesheet' | 'budget'>('executive');
  let scheduleCron = $state('');

  async function loadData() {
    const [h, lc, cp, db, sr] = await Promise.all([
      api.reports.health(project.id),
      api.reports.leadCycleTime(project.id),
      api.reports.workloadCapacity(project.id),
      api.reports.getDashboardConfigs(project.id),
      api.reports.getSavedReports(project.id)
    ]);
    health = h;
    leadCycle = lc;
    capacity = cp;
    dashboards = db;
    savedReports = sr;
  }

  async function saveDashboard() {
    if (!access?.canViewReports || !dashboardName.trim()) return;
    await api.reports.saveDashboardConfig({
      project: project.id,
      name: dashboardName,
      widgetsJson: [
        { type: 'kpi', key: 'health.overall' },
        { type: 'chart', key: 'capacity' }
      ]
    });
    dashboardName = '';
    await loadData();
  }

  async function saveReport() {
    if (!access?.canViewReports || !reportName.trim()) return;
    await api.reports.createSavedReport({
      project: project.id,
      type: reportType,
      name: reportName,
      dataJson: {
        health,
        leadCycle,
        capacity
      },
      scheduleCron: scheduleCron || undefined
    });
    reportName = '';
    scheduleCron = '';
    await loadData();
  }

  async function exportReport(format: 'csv' | 'xlsx' | 'pdf') {
    if (!access?.canViewReports) return;
    exportPayload = await api.reports.export(project.id, format);
  }

  onMount(async () => {
    await loadData();
  });
</script>

<div class="panel">
  <h3>Reporting & Dashboards</h3>

  <div class="grid">
    <div class="card">
      <h4>Executive dashboard</h4>
      {#if health}
        <p>Health: {health.overall}</p>
        <p>Schedule: {health.scheduleScore}</p>
        <p>Budget: {health.budgetScore}</p>
        <p>Workload: {health.workloadScore}</p>
        <p>Risk: {health.riskScore}</p>
      {/if}
    </div>
    <div class="card">
      <h4>Lead / cycle time</h4>
      {#if leadCycle}
        <p>Average lead time (days): {leadCycle.averageLeadTimeDays}</p>
        <p>Average cycle time (days): {leadCycle.averageCycleTimeDays}</p>
        <p>Sample size: {leadCycle.sampleSize}</p>
      {/if}
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h4>Workload & capacity</h4>
      <ul>
        {#each capacity as row}
          <li>{row.name} ({row.role}) · {row.hoursLogged}h / {row.capacityHours}h</li>
        {/each}
        {#if capacity.length === 0}
          <li>No capacity data yet.</li>
        {/if}
      </ul>
    </div>
    <div class="card">
      <h4>Custom dashboards</h4>
      {#if access?.canViewReports}
        <div class="row">
          <input type="text" placeholder="Dashboard name" bind:value={dashboardName} />
          <button onclick={saveDashboard} disabled={!dashboardName.trim()}>Save dashboard</button>
        </div>
      {/if}
      <ul>
        {#each dashboards as item}
          <li>{item.name}</li>
        {/each}
        {#if dashboards.length === 0}
          <li>No dashboard configs yet.</li>
        {/if}
      </ul>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h4>Scheduled reports</h4>
      {#if access?.canViewReports}
        <div class="row">
          <input type="text" placeholder="Report name" bind:value={reportName} />
          <select bind:value={reportType}>
            <option value="executive">Executive</option>
            <option value="health">Health</option>
            <option value="capacity">Capacity</option>
            <option value="velocity">Velocity</option>
            <option value="timesheet">Timesheet</option>
            <option value="budget">Budget</option>
          </select>
          <input type="text" placeholder="Cron (optional)" bind:value={scheduleCron} />
          <button onclick={saveReport} disabled={!reportName.trim()}>Save report</button>
        </div>
      {/if}
      <ul>
        {#each savedReports as report}
          <li>{report.name} · {report.type} {report.scheduleCron ? `· ${report.scheduleCron}` : ''}</li>
        {/each}
        {#if savedReports.length === 0}
          <li>No saved reports yet.</li>
        {/if}
      </ul>
    </div>
    <div class="card">
      <h4>Export</h4>
      {#if access?.canViewReports}
        <div class="row">
          <button onclick={() => exportReport('csv')}>CSV</button>
          <button onclick={() => exportReport('xlsx')}>XLSX</button>
          <button onclick={() => exportReport('pdf')}>PDF</button>
        </div>
      {/if}
      {#if exportPayload}
        <pre>{JSON.stringify(exportPayload, null, 2)}</pre>
      {/if}
    </div>
  </div>
</div>

<style>
  .panel { display: flex; flex-direction: column; gap: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
  .row input, .row select { background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); padding: 8px; }
  ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  pre { max-height: 220px; overflow: auto; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px; font-size: 11px; }
</style>
