<script lang="ts">
  import { pb, currentUser } from '../../lib/pocketbase';
  import { goto } from '$app/navigation';
  import { onMount, getContext } from 'svelte';
  import { gsap } from 'gsap';

  let email = $state('');
  let password = $state('');
  let errorMsg = $state('');
  let isLoading = $state(false);

  $effect(() => {
    // If user is already authenticated, redirect to dashboard
    if ($currentUser) {
      goto('/dashboard');
    }
  });

  async function handleLogin() {
    isLoading = true;
    errorMsg = '';
    try {
      await pb.collection('users').authWithPassword(email, password);
      goto('/dashboard');
    } catch (err: any) {
      errorMsg = err.message || 'Invalid login credentials.';
    } finally {
      isLoading = false;
    }
  }

  let formContainer: HTMLElement;
  onMount(() => {
    gsap.from(formContainer, { 
      y: 40, 
      opacity: 0, 
      duration: 0.8, 
      ease: 'power4.out',
      clearProps: 'all'
    });
  });
</script>

<svelte:head>
  <title>Login | Project360</title>
</svelte:head>

<div class="auth-wrapper">
  <div class="auth-container" bind:this={formContainer}>
    <div class="brand">
      <div class="logo"></div>
      <h2>Project360</h2>
    </div>
    
    <div class="header">
      <h3>Welcome Back</h3>
      <p>Log in to your workspace</p>
    </div>

    {#if errorMsg}
      <div class="error">{errorMsg}</div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="form">
      <div class="inputGroup">
        <input id="email" type="email" bind:value={email} required autocomplete="off" />
        <label for="email">Email</label>
      </div>

      <div class="inputGroup">
        <input id="password" type="password" bind:value={password} required autocomplete="off" />
        <label for="password">Password</label>
      </div>

      <button type="submit" class="btn" disabled={isLoading}>
        {#if isLoading}
          <div class="loader"></div>
        {:else}
          Sign In
        {/if}
      </button>
    </form>

    <div class="footer-link">
      <span>New to Project360? </span>
      <a href="/register">Create an account</a>
    </div>
  </div>
</div>

<style>
  .auth-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
    background: radial-gradient(circle at center, var(--bg-color), var(--color-black));
  }

  .auth-container {
    background-color: var(--surface-color);
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    width: 100%;
    max-width: 420px;
    border: 1px solid var(--border-color);
  }

  .brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 30px;
  }

  .logo {
    width: 32px;
    height: 32px;
    background-color: var(--color-green);
    border-radius: 50%;
    box-shadow: 0 0 15px var(--color-green-dark);
  }

  .brand h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text-main);
  }

  .header {
    text-align: center;
    margin-bottom: 30px;
  }

  .header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .header p {
    margin: 5px 0 0;
    font-size: 14px;
    color: var(--text-muted);
  }

  .error {
    background-color: rgba(255, 60, 60, 0.1);
    color: #ff4d4d;
    padding: 10px 15px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 20px;
    border: 1px solid rgba(255, 60, 60, 0.3);
    text-align: center;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Uiverse Input Group */
  .inputGroup {
    position: relative;
  }

  .inputGroup input {
    font-size: 15px;
    padding: 14px;
    width: 100%;
    outline: none;
    background: none;
    color: var(--text-main);
    border: 1px solid var(--text-muted);
    border-radius: 10px;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }

  .inputGroup label {
    font-size: 15px;
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
    transition: all 0.3s ease;
    background-color: var(--surface-color);
    padding: 0 4px;
  }

  .inputGroup input:focus,
  .inputGroup input:valid {
    border-color: var(--color-green);
    box-shadow: 0 0 0 2px rgba(29, 185, 84, 0.2);
  }

  .inputGroup input:focus ~ label,
  .inputGroup input:valid ~ label {
    top: 0;
    font-size: 12px;
    color: var(--color-green);
    font-weight: 600;
  }

  /* Uiverse Button */
  .btn {
    padding: 14px;
    border-radius: 10px;
    background-color: var(--color-green);
    color: var(--color-black);
    font-size: 16px;
    font-weight: 600;
    transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .btn:hover:not(:disabled) {
    background-color: var(--color-green-light);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(29, 185, 84, 0.4);
  }

  .btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .loader {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(0, 0, 0, 0.2);
    border-top-color: var(--color-black);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .footer-link {
    margin-top: 25px;
    text-align: center;
    font-size: 14px;
    color: var(--text-muted);
  }

  .footer-link a {
    color: var(--color-green);
    font-weight: 600;
    margin-left: 5px;
    transition: color 0.2s ease;
  }

  .footer-link a:hover {
    color: var(--color-green-light);
    text-decoration: underline;
  }
</style>
