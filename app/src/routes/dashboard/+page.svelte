<script lang="ts">
  import { pb, currentUser } from '../../lib/pocketbase';
  import { goto } from '$app/navigation';
  import { onMount, tick } from 'svelte';
  
  $effect(() => {
    // Auth Guard: if not authenticated, redirect to login
    if (!$currentUser) {
      goto('/login');
    }
  });

  function handleLogout() {
    pb.authStore.clear();
  }
</script>

<svelte:head>
  <title>Dashboard | Project360</title>
</svelte:head>

{#if $currentUser}
  <div class="dashboard-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="brand">
        <div class="logo"></div>
        <h2>Project360</h2>
      </div>

      <nav class="nav-links">
        <a href="/dashboard" class="nav-item active">
          <!-- Octicon Dashboard -->
          <svg height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon">
            <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25H6.5v-13Zm6.25 13h6.25a.25.25 0 0 0 .25-.25V8.5h-6.5Zm0-7h6.5V1.75a.25.25 0 0 0-.25-.25H8Z"></path>
          </svg>
          Dashboard
        </a>
        <a href="/projects" class="nav-item">
          <!-- Octicon Repo -->
          <svg height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon">
            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1v7.5h-8a2.5 2.5 0 0 1-2.5-2.5v-5A1.5 1.5 0 0 1 3.5 1h8.75a.75.75 0 0 1 .75.75Z"></path>
          </svg>
          Projects
        </a>
      </nav>

      <div class="user-profile">
        <div class="avatar">
          {($currentUser?.name || $currentUser?.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div class="user-info">
          <span class="name">{$currentUser?.name || 'User'}</span>
          <span class="email">{$currentUser?.email}</span>
        </div>
        <button class="logout-btn" onclick={handleLogout} title="Logout">
          <!-- Octicon Sign Out -->
          <svg height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon">
            <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25Zm10.44 4.5-1.97-1.97a.749.749 0 0 1 1.06-1.06l3.25 3.25a.749.749 0 0 1 0 1.06l-3.25 3.25a.749.749 0 1 1-1.06-1.06l1.97-1.97H5.75a.75.75 0 0 1 0-1.5Z"></path>
          </svg>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="topbar">
        <h1>Dashboard Overview</h1>
        <div class="actions">
          <button class="action-btn">
            <svg height="16" viewBox="0 0 16 16" width="16" class="octicon"><path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.519 1.519 0 0 1 13.482 13H2.518a1.518 1.518 0 0 1-1.263-2.36l1.703-2.554A.255.255 0 0 0 3 7.947Zm5-3.5A3.5 3.5 0 0 0 4.5 5v2.947c0 .346-.102.683-.294.97l-1.703 2.556a.018.018 0 0 0-.003.01l.001.006c.002.004.006.011.018.011h10.964c.012 0 .016-.007.018-.011a.019.019 0 0 0-.002-.01l-1.703-2.555a1.75 1.75 0 0 1-.294-.97V5A3.5 3.5 0 0 0 8 1.5Z"></path></svg>
          </button>
        </div>
      </header>

      <div class="content">
        <div class="welcome-banner">
          <h2>Welcome back, {$currentUser?.name || 'User'}!</h2>
          <p>Here's what your team is working on today.</p>
        </div>

        <div class="widgets-grid">
          <!-- Placeholder Widgets -->
          <div class="widget">
            <h3>My Tasks</h3>
            <div class="empty-state">No tasks assigned yet.</div>
          </div>
          <div class="widget">
            <h3>Recent Projects</h3>
            <div class="empty-state">No projects created.</div>
          </div>
        </div>
      </div>
    </main>
  </div>
{/if}

<style>
  .dashboard-layout {
    display: flex;
    height: 100vh;
    background-color: var(--bg-color);
  }

  /* Sidebar */
  .sidebar {
    width: 260px;
    background-color: var(--surface-color);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    padding: 20px 0;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px;
    margin-bottom: 30px;
  }

  .logo {
    width: 24px;
    height: 24px;
    background-color: var(--color-green);
    border-radius: 50%;
  }

  .brand h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }

  .nav-links {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 0 15px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 15px;
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .nav-item .octicon {
    fill: currentColor;
  }

  .nav-item:hover {
    background-color: var(--surface-hover);
    color: var(--text-main);
  }

  .nav-item.active {
    background-color: rgba(29, 185, 84, 0.1);
    color: var(--color-green);
  }

  .user-profile {
    padding: 15px 20px;
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: var(--color-green);
    color: var(--color-black);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 16px;
  }

  .user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .name {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .email {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .logout-btn {
    padding: 8px;
    border-radius: 6px;
    color: var(--text-muted);
    transition: all 0.2s ease;
  }

  .logout-btn .octicon {
    fill: currentColor;
  }

  .logout-btn:hover {
    background-color: rgba(255, 60, 60, 0.1);
    color: #ff4d4d;
  }

  /* Main Content */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .topbar {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    border-bottom: 1px solid var(--border-color);
    background-color: var(--surface-color);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .topbar h1 {
    font-size: 20px;
    margin: 0;
    font-weight: 600;
  }

  .actions {
    display: flex;
    gap: 15px;
  }

  .action-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: var(--bg-color);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: all 0.2s ease;
  }

  .action-btn .octicon {
    fill: currentColor;
  }

  .action-btn:hover {
    color: var(--text-main);
    border-color: var(--text-muted);
  }

  .content {
    padding: 40px;
  }

  .welcome-banner {
    padding: 30px;
    background: linear-gradient(135deg, var(--color-green-dark) 0%, var(--color-green) 100%);
    border-radius: 16px;
    color: var(--color-black);
    margin-bottom: 40px;
  }

  .welcome-banner h2 {
    margin: 0 0 10px;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .welcome-banner p {
    margin: 0;
    font-size: 16px;
    opacity: 0.8;
  }

  .widgets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 25px;
  }

  .widget {
    background-color: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    min-height: 200px;
  }

  .widget h3 {
    margin: 0 0 20px;
    font-size: 16px;
    font-weight: 600;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    color: var(--text-muted);
    font-size: 14px;
    border: 1px dashed var(--border-color);
    border-radius: 8px;
  }
</style>
