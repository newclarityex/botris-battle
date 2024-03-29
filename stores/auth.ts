import type { Profile } from '@prisma/client';
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', () => {
    const profile = ref<Profile | null>(null);
    const status = ref<'pending' | 'authenticated' | 'unauthenticated'>('pending');

    async function tryAuthenticate() {
        status.value = 'pending';

        const profileRes = $fetch("/api/self/profile").catch(() => null);
        const userRes = $fetch("/api/self/user").catch(() => null);

        const [newProfile, user] = await Promise.all([profileRes, userRes]);
        
        profile.value = newProfile;

        if (user) {
            status.value = 'authenticated';
        } else {
            status.value = 'unauthenticated';
        };
    };

    tryAuthenticate();

    async function logout() {
        await $fetch("/api/logout", {
            method: "POST",
        });
        await tryAuthenticate();
    };

    return { profile, status, logout, tryAuthenticate };
});