import PocketBase from 'pocketbase';
import { writable } from 'svelte/store';
import { env } from '$env/dynamic/public';

// Instantiate pocketbase to point to local instance (default port 8090)
export const pb = new PocketBase(env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Create a Svelte store indicating if the user is authenticated
export const currentUser = writable(pb.authStore.record);

pb.authStore.onChange((auth) => {
    console.log('authStore changed', auth);
    currentUser.set(pb.authStore.record);
});
