<script setup>
import { useAuthStore } from '~/stores/auth';

const route = useRoute();

const authStore = useAuthStore();
</script>

<template>
    <div class="w-full h-full">
        <div class="w-full h-full fixed pointer-events-none z-20" id="modals"></div>
        <RegisterProfileModal v-if="authStore.status === 'authenticated' && authStore.profile === null" />
        <div>
            <div class="w-full flex md:flex-row flex-col items-center justify-center gap-8 py-8 text-xl text-white">
                <NuxtLink to="/" :class="{
                    'underline text-secondary': route.path !== '/'
                }">Info</NuxtLink>
                <!-- <NuxtLink to="/rules" :class="{
                    'underline text-secondary': route.path !== '/rules'
                }">Rules</NuxtLink> -->
                <NuxtLink to="https://discord.gg/47AhNAs25M" class="underline text-secondary">Discord</NuxtLink>
                <!-- <NuxtLink to="/docs" :class="{
                    'underline text-secondary': route.path !== '/docs'
                }">API Documentation</NuxtLink> -->
                <NuxtLink to="/rooms" :class="{
                    'underline text-secondary': route.path !== '/rooms'
                }">View Rooms</NuxtLink>
                <a class="bg-white/20 p-2" href="/api/login/github">
                    Register
                </a>
                <!-- <template v-if="status === 'authenticated'">
                    <NuxtLink to="/dashboard" :class="{
                    'underline text-secondary': route.path !== '/dashboard'
                }">Dashboard</NuxtLink>
                    <button class="bg-white/20 p-2" @click="signOut">
                        Sign Out
                    </button>
                </template> -->
            </div>
            <slot />
        </div>
    </div>
    
</template>