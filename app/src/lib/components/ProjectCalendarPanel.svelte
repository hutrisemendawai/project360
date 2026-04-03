<script lang="ts">
  import { api } from '$lib/api';
  import { onMount } from 'svelte';

  let { project, access } = $props<{ project: any; access: any }>();

  let integrations = $state<any[]>([]);
  let holidays = $state<any[]>([]);
  let provider = $state<'google' | 'microsoft' | 'ical'>('google');
  let externalId = $state('');
  let locale = $state('en-US');
  let holidayName = $state('');
  let holidayDate = $state('');
  let iCalFeed = $state<{ feedPath: string; token: string } | null>(null);
  let isLoading = $state(false);

  async function loadData() {
    isLoading = true;
    try {
      const data = await api.calendar.getForProject(project.id);
      integrations = data.integrations;
      holidays = data.holidays;
      iCalFeed = await api.calendar.getProjectIcsFeed(project.id);
    } finally {
      isLoading = false;
    }
  }

  async function saveIntegration() {
    if (!access?.canManageCalendar) return;
    await api.calendar.upsertIntegration({
      project: project.id,
      provider,
      externalId: externalId || undefined,
      icalToken: provider === 'ical' ? externalId || undefined : undefined
    });
    externalId = '';
    await loadData();
  }

  async function addHoliday() {
    if (!access?.canManageCalendar || !holidayDate || !holidayName.trim()) return;
    await api.calendar.addHoliday({
      project: project.id,
      locale,
      date: holidayDate,
      name: holidayName
    });
    holidayDate = '';
    holidayName = '';
    await loadData();
  }

  onMount(async () => {
    await loadData();
  });
</script>

<div class="panel">
  <h3>Calendar & Scheduling</h3>

  {#if isLoading}
    <p>Loading calendar data...</p>
  {/if}

  <div class="grid">
    <div class="card">
      <h4>Calendar integrations</h4>
      {#if access?.canManageCalendar}
        <div class="row">
          <select bind:value={provider}>
            <option value="google">Google</option>
            <option value="microsoft">Microsoft</option>
            <option value="ical">iCal</option>
          </select>
          <input type="text" placeholder={provider === 'ical' ? 'iCal token' : 'External calendar id'} bind:value={externalId} />
          <button onclick={saveIntegration}>Save</button>
        </div>
      {/if}
      <ul>
        {#each integrations as item}
          <li>{item.provider} · {item.externalId || item.icalToken || '-'}</li>
        {/each}
        {#if integrations.length === 0}
          <li>No integrations configured.</li>
        {/if}
      </ul>
      {#if iCalFeed}
        <p><strong>Project iCal feed:</strong> <code>{iCalFeed.feedPath}</code></p>
      {/if}
    </div>

    <div class="card">
      <h4>Holiday-aware scheduling</h4>
      {#if access?.canManageCalendar}
        <div class="row">
          <input type="text" placeholder="Locale (e.g. id-ID)" bind:value={locale} />
          <input type="date" bind:value={holidayDate} />
          <input type="text" placeholder="Holiday name" bind:value={holidayName} />
          <button onclick={addHoliday}>Add Holiday</button>
        </div>
      {/if}
      <ul>
        {#each holidays as holiday}
          <li>{holiday.date} · {holiday.locale} · {holiday.name}</li>
        {/each}
        {#if holidays.length === 0}
          <li>No holidays configured.</li>
        {/if}
      </ul>
    </div>
  </div>
</div>

<style>
  .panel { display: flex; flex-direction: column; gap: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface-color); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
  .row input, .row select { background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); padding: 8px; }
  ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  code { font-size: 12px; color: var(--text-muted); }
</style>
