import PocketBase from 'pocketbase';
import { writable } from 'svelte/store';

// Instantiate pocketbase to point to local instance (default port 8090)
export const pb = new PocketBase('http://127.0.0.1:8090');

// Create a Svelte store indicating if the user is authenticated
export const currentUser = writable(pb.authStore.record);

pb.authStore.onChange((auth) => {
    console.log('authStore changed', auth);
    currentUser.set(pb.authStore.record);
});
