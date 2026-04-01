<script lang="ts">
  import { pb, currentUser } from '../../lib/pocketbase';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';

  let email = $state('');
  let password = $state('');
  let passwordConfirm = $state('');
  let name = $state('');
  let errorMsg = $state('');
  let isLoading = $state(false);

  $effect(() => {
    if ($currentUser) {
      goto('/dashboard');
    }
  });

  async function handleRegister() {
    isLoading = true;
    errorMsg = '';
    
    if (password !== passwordConfirm) {
      errorMsg = 'Passwords do not match.';
      isLoading = false;
      return;
    }

    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm,
        name
      });
      await pb.collection('users').authWithPassword(email, password);
      goto('/dashboard');
    } catch (err: any) {
      errorMsg = err.message || 'Failed to create account. Check your details.';
    } finally {
      isLoading = false;
    }
  }

  let formContainer: HTMLElement;
  onMount(() => {
    gsap.from(formContainer, { 
      scale: 0.95, 
      opacity: 0, 
      duration: 0.6, 
      ease: 'back.out(1.7)',
      clearProps: 'all'
    });
  });
</script>

<svelte:head>
  <title>Register | Project360</title>
</svelte:head>

<div class="auth-wrapper">
  <div class="auth-container" bind:this={formContainer}>
    <div class="brand">
      <div class="logo"></div>
      <h2>Project360</h2>
    </div>
    
    <div class="header">
      <h3>Create an Account</h3>
      <p>Join the ultimate workspace</p>
    </div>

    {#if errorMsg}
      <div class="error">{errorMsg}</div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); handleRegister(); }} class="form">
      <div class="inputGroup">
        <input id="name" type="text" bind:value={name} required autocomplete="off" />
        <label for="name">Full Name</label>
      </div>

      <div class="inputGroup">
        <input id="email" type="email" bind:value={email} required autocomplete="off" />
        <label for="email">Email</label>
      </div>

      <div class="inputGroup">
        <input id="password" type="password" bind:value={password} required autocomplete="off" />
        <label for="password">Password</label>
      </div>

      <div class="inputGroup">
        <input id="passwordConfirm" type="password" bind:value={passwordConfirm} required autocomplete="off" />
        <label for="passwordConfirm">Confirm Password</label>
      </div>

      <button type="submit" class="btn" disabled={isLoading}>
        {#if isLoading}
          <div class="loader"></div>
        {:else}
          Register
        {/if}
      </button>
    </form>

    <div class="footer-link">
      <span>Already have an account? </span>
      <a href="/login">Sign In</a>
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
    background: radial-gradient(circle at top right, var(--color-gray-900), var(--color-black));
  }

  .auth-container {
    background-color: var(--surface-color);
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    width: 100%;
    max-width: 440px;
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
    border-radius: 5px;
    box-shadow: 0 0 20px var(--color-green-dark);
    transform: rotate(45deg);
  }

  .brand h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
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
    margin-top: 10px;
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
