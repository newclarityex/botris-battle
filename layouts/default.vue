<script setup>
import { useAuthStore } from '~/stores/auth';

const route = useRoute();

const authStore = useAuthStore();

async function signOut() {
    await $fetch('/api/logout', {
        method: 'POST',
    });

    authStore.tryAuthenticate();

    navigateTo("/")
};

const showEditProfile = ref(false);
</script>

<template>
    <TheEditProfileModal @close="showEditProfile = false" v-if="showEditProfile" />
    <div class="w-full h-full">
        <div class="w-full h-full fixed pointer-events-none z-20" id="modals"></div>
        <TheRegisterProfileModal v-if="authStore.status === 'authenticated' && authStore.profile === null" />
        <div>
            <div class="w-full flex md:flex-row flex-col items-center justify-center gap-8 py-8 text-xl text-white">
                <NuxtLink to="/" :class="{
                    'underline text-secondary': route.path !== '/'
                }">Info</NuxtLink>
                <NuxtLink to="/docs" :class="{
                    'underline text-secondary': route.path !== '/docs'
                }">Documentation</NuxtLink>
                <NuxtLink to="/rooms" :class="{
                    'underline text-secondary': route.path !== '/rooms'
                }">Rooms</NuxtLink>
                <a class="bg-white/20 p-2" href="/api/login/github" v-if="authStore.status === 'unauthenticated'">
                    Login/Register
                </a>
                <template v-if="authStore.status === 'authenticated'">
                    <NuxtLink to="/bots" :class="{
                        'underline text-secondary': route.path !== '/bots'
                    }">Bots</NuxtLink>
                    <button to="/bots" @click="showEditProfile = true" class="underline text-secondary">Config</button>
                    <button class="bg-white/20 p-2" @click="signOut">
                        Sign Out
                    </button>
                </template>
            </div>
            <slot />
        </div>
    </div>

</template>