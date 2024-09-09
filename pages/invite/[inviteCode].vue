<script setup lang="ts">
const route = useRoute();
// force into string
const inviteCode = typeof route.params.inviteCode === 'string' ? route.params.inviteCode : '';

const { data: info } = await useFetch('/api/invite/info', {
    query: {
        inviteCode,
    },
});

async function acceptInvite() {
    if (info.value === null) return;

    await $fetch('/api/invite/join', {
        body: {
            inviteCode,
        },
    });

    navigateTo(`/bot/${info.value.id}/manage`);
}

const authStore = useAuthStore();

const owned = computed(() => info.value !== null && info.value.developers.find(
    developer =>
        authStore.profile !== null &&
        developer.id === authStore.profile.id
) !== null);
</script>
<template>
<div class="flex justify-center" v-if="info && !owned">
    <main class="px-8 flex flex-col items-center">
        <h1>You were invited to join {{ info.name }}!</h1>
        <h2>Developed by: {{ info.team ?? info.developers.map(dev => dev.displayName).join(",") }}</h2>
        <AvatarDisplay :board="info.avatar" class="my-6" />
        <div class="flex gap-8">
            <button class="text-btn text-xl" @click="acceptInvite">Join</button>
            <NuxtLink class="text-btn text-xl" :href="`/bots`">Ignore</NuxtLink>
        </div>
    </main>
</div>
<div class="flex justify-center" v-else-if="owned">
    <main class="px-8 flex flex-col items-center">
        <h1>Already Joined</h1>
        <NuxtLink class="text-btn text-xl" :href="`/`">Home</NuxtLink>
    </main>
</div>
<div class="flex justify-center" v-else>
    <main class="px-8 flex flex-col items-center">
        <h1>Invalid Invite</h1>
        <NuxtLink class="text-btn text-xl" :href="`/`">Home</NuxtLink>
    </main>
</div>
</template>