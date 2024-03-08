<script setup>
const route = useRoute();
const { signIn, signOut, status } = useAuth();
</script>

<template>
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
            <!-- <NuxtLink to="/rooms" :class="{
                'underline text-secondary': route.path !== '/rooms'
            }">View Rooms</NuxtLink>
            <button class="bg-white/20 p-2" @click="signIn('github')" v-if="status === 'unauthenticated'">
                Register
            </button>
            <template v-if="status === 'authenticated'">
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
</template>