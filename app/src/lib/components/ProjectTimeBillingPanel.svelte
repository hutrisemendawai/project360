<script lang="ts">
  import { api } from '$lib/api';
  import { onMount } from 'svelte';

  let { project, access } = $props<{ project: any; access: any }>();

  let entries = $state<any[]>([]);
  let timesheets = $state<any[]>([]);
  let expenses = $state<any[]>([]);
  let budget = $state<{ budget: number; actual: number; variance: number; timeCost: number; expenseCost: number } | null>(null);
  let invoicePayload = $state<any | null>(null);

  let manualMinutes = $state(60);
  let manualNote = $state('');
  let expenseAmount = $state(0);
  let expenseDate = $state('');
  let expenseCategory = $state('');
  let expenseDesc = $state('');
  let weekStart = $state('');
  let totalMinutes = $state(0);
  let timerEntry = $state<any>(null);

  async function loadData() {
    const [e, t, x, b] = await Promise.all([
      api.time.getEntries(project.id),
      api.time.getTimesheets(project.id),
      api.billing.getExpenses(project.id),
      api.billing.getBudgetVsActual(project.id)
    ]);
    entries = e;
    timesheets = t;
    expenses = x;
    budget = b;
  }

  async function startTimer() {
    if (!access?.canManageTime) return;
    timerEntry = await api.time.startTimer({ project: project.id, notes: 'Live timer' });
    await loadData();
  }

  async function stopTimer() {
    if (!timerEntry || !access?.canManageTime) return;
    await api.time.stopTimer(timerEntry.id);
    timerEntry = null;
    await loadData();
  }

  async function addManual() {
    if (!access?.canManageTime) return;
    await api.time.addManualEntry({
      project: project.id,
      minutes: manualMinutes,
      notes: manualNote,
      billable: true
    });
    manualMinutes = 60;
    manualNote = '';
    await loadData();
  }

  async function saveTimesheet() {
    if (!access?.canManageTime || !weekStart) return;
    await api.time.upsertTimesheet({
      project: project.id,
      weekStart,
      totalMinutes
    });
    await loadData();
  }

  async function submitTimesheet(sheetId: string) {
    await api.time.submitTimesheet(sheetId);
    await loadData();
  }

  async function approveTimesheet(sheetId: string, approved: boolean) {
    if (!access?.canManageBilling) return;
    await api.time.approveTimesheet(sheetId, approved);
    await loadData();
  }

  async function addExpense() {
    if (!access?.canManageTime || !expenseDate) return;
    await api.billing.createExpense({
      project: project.id,
      amount: expenseAmount,
      expenseDate,
      category: expenseCategory,
      description: expenseDesc,
      billable: true
    });
    expenseAmount = 0;
    expenseDate = '';
    expenseCategory = '';
    expenseDesc = '';
    await loadData();
  }

  async function submitExpense(expenseId: string) {
    await api.billing.submitExpense(expenseId);
    await loadData();
  }

  async function approveExpense(expenseId: string, approved: boolean) {
    if (!access?.canManageBilling) return;
    await api.billing.approveExpense(expenseId, approved);
    await loadData();
  }

  async function exportInvoice() {
    if (!access?.canManageBilling) return;
    invoicePayload = await api.billing.exportInvoicePayload(project.id);
  }

  onMount(async () => {
    await loadData();
  });
</script>

<div class="panel">
  <h3>Time Tracking, Costs & Billing</h3>

  <div class="grid">
    <div class="card">
      <h4>Time tracking</h4>
      {#if access?.canManageTime}
        <div class="row">
          <button onclick={startTimer} disabled={!!timerEntry}>Start timer</button>
          <button onclick={stopTimer} disabled={!timerEntry}>Stop timer</button>
          <input type="number" min="1" bind:value={manualMinutes} />
          <input type="text" placeholder="Manual entry note" bind:value={manualNote} />
          <button onclick={addManual}>Add manual entry</button>
        </div>
      {/if}
      <ul>
        {#each entries as entry}
          <li>{entry.expand?.user?.name || entry.user}: {entry.minutes}m {entry.billable ? '(billable)' : '(non-billable)'}</li>
        {/each}
        {#if entries.length === 0}
          <li>No entries yet.</li>
        {/if}
      </ul>
    </div>

    <div class="card">
      <h4>Timesheets</h4>
      {#if access?.canManageTime}
        <div class="row">
          <input type="date" bind:value={weekStart} />
          <input type="number" min="0" bind:value={totalMinutes} placeholder="Total minutes" />
          <button onclick={saveTimesheet}>Save week</button>
        </div>
      {/if}
      <ul>
        {#each timesheets as sheet}
          <li>
            {sheet.weekStart} · {sheet.totalMinutes}m · {sheet.status}
            {#if sheet.status === 'draft'}
              <button onclick={() => submitTimesheet(sheet.id)}>Submit</button>
            {/if}
            {#if sheet.status === 'submitted' && access?.canManageBilling}
              <button onclick={() => approveTimesheet(sheet.id, true)}>Approve</button>
              <button onclick={() => approveTimesheet(sheet.id, false)}>Reject</button>
            {/if}
          </li>
        {/each}
        {#if timesheets.length === 0}
          <li>No timesheets yet.</li>
        {/if}
      </ul>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h4>Expenses</h4>
      {#if access?.canManageTime}
        <div class="row">
          <input type="number" min="0" step="0.01" bind:value={expenseAmount} placeholder="Amount" />
          <input type="date" bind:value={expenseDate} />
          <input type="text" bind:value={expenseCategory} placeholder="Category" />
          <input type="text" bind:value={expenseDesc} placeholder="Description" />
          <button onclick={addExpense}>Add expense</button>
        </div>
      {/if}
      <ul>
        {#each expenses as expense}
          <li>
            {expense.expenseDate} · {expense.amount} · {expense.status}
            {#if expense.status === 'draft'}
              <button onclick={() => submitExpense(expense.id)}>Submit</button>
            {/if}
            {#if expense.status === 'submitted' && access?.canManageBilling}
              <button onclick={() => approveExpense(expense.id, true)}>Approve</button>
              <button onclick={() => approveExpense(expense.id, false)}>Reject</button>
            {/if}
          </li>
        {/each}
        {#if expenses.length === 0}
          <li>No expenses yet.</li>
        {/if}
      </ul>
    </div>

    <div class="card">
      <h4>Budget vs Actual</h4>
      {#if budget}
        <p>Budget: {budget.budget.toFixed(2)}</p>
        <p>Actual: {budget.actual.toFixed(2)}</p>
        <p>Variance: {budget.variance.toFixed(2)}</p>
        <p>Time Cost: {budget.timeCost.toFixed(2)}</p>
        <p>Expense Cost: {budget.expenseCost.toFixed(2)}</p>
      {/if}
      {#if access?.canManageBilling}
        <button onclick={exportInvoice}>Export invoice payload</button>
      {/if}
      {#if invoicePayload}
        <pre>{JSON.stringify(invoicePayload, null, 2)}</pre>
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
  pre { max-height: 220px; overflow: auto; background: var(--bg-color); border: 1px solid var(--border-color); padding: 8px; border-radius: 6px; font-size: 11px; }
</style>
