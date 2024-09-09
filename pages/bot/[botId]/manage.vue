<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const route = useRoute();
// force into string
const botId = typeof route.params.botId === 'string' ? route.params.botId : '';

const { data: botData, refresh: refreshBot } = await useFetch(`/api/bot/${route.params.botId}`);

const editBotModal = ref(false);
const owned = computed(() => botData.value !== null && botData.value.developers.find(
    developer =>
        authStore.profile !== null &&
        developer.id === authStore.profile.id
) !== null);

const { data: tokens, refresh: refreshTokens } = useFetch(`/api/bot/${botId}/tokens`);

const createTokenModal = ref(false);
async function removeToken(token: string) {
    await $fetch(`/api/self/token`, {
        method: 'DELETE',
        body: {
            token,
        },
    });

    await refreshTokens();
}

async function removeDeveloper(developer: string) {
    if (!confirm("Are you sure you want to remove this developer?")) return;

    await $fetch(`/api/bot/${botId}/removeDeveloper`, {
        body: {
            developer,
        }
    });
}

async function leaveBot() {
    if (!confirm("Are you sure you want to leave this bot?")) return;

    if (authStore.profile === null) return;
    await removeDeveloper(authStore.profile.id);
    navigateTo(`/bots/${botId}`);
}

async function deleteBot() {
    if (!confirm("Are you sure you want to delete this bot?")) return;

    await $fetch(`/api/bot/${botId}`, {
        method: "DELETE",
    });

    navigateTo('/bots');
};
async function createInvite() {
    const code = await $fetch(`/api/bot/${botId}/invite`, {
        method: "POST",
    });
    console.log(code)
    prompt("Copy Invite Link:", `${useRequestURL().origin}/invite/${code}`);

}
</script>

<template>
    <div v-if="botData" class="flex justify-center">
        <TheCreateTokenModal v-if="createTokenModal" @token-created="refreshTokens" @close="createTokenModal = false"
            :botId="botId" />
        <TheEditBotModal v-if="editBotModal" :id="botData.id" :initial-data="botData" @close="editBotModal = false"
            @bot-updated="refreshBot" />
        <template v-if="owned">
            <div class="w-[600px]">
                <div class="px-8 flex flex-col items-center">
                    <h1>{{ botData.name }}</h1>
                    <h2>{{ botData.team ?? botData.developers.map(dev => dev.displayName).join(",") }}</h2>
                    <AvatarDisplay :board="botData.avatar" class="my-6" />
                </div>
                <div class="flex justify-center">
                    <button class="text-btn text-xl" @click="editBotModal = true">Edit Info</button>
                </div>
                <div class="my-6 flex flex-col gap-4">
                    <h2 class="text-center">API Tokens</h2>
                    <ul class="list-none p-0 flex flex-col gap-2">
                        <li v-for="token in tokens" class="bg-white/20 p-4 flex">
                            <div class="w-40 overflow-hidden text-ellipsis">{{ token.name }}</div>
                            <div class="w-96">{{ token.token }}</div>
                            <div>
                                <button class="text-btn" @click="removeToken(token.token)"> Remove </button>
                            </div>
                        </li>
                    </ul>
                    <div class="w-full flex justify-center">
                        <button @click="createTokenModal = true" class="my-4 border-white border-2 p-2">
                            Create Token
                        </button>
                    </div>
                </div>
                <div class="my-6 flex flex-col gap-4">
                    <h2 class="text-center">Developers</h2>
                    <ul class="list-none p-0 flex flex-col gap-2">
                        <li v-for="developer in botData.developers" class="bg-white/20 p-4 flex justify-between gap-4">
                            <div class="grow overflow-hidden text-ellipsis">{{ developer.displayName }}</div>
                            <div>
                                <button class="text-btn" @click="removeDeveloper(developer.id)" v-if="botData.developers.length !== 1"> Remove </button>
                            </div>
                        </li>
                    </ul>
                    <div class="w-full flex justify-center">
                        <button @click="createInvite" class="my-4 border-white border-2 p-2">
                            Create Invite
                        </button>
                    </div>
                </div>
                <div class="flex justify-center gap-8">
                    <NuxtLink class="text-btn text-xl" :href="`./`">Public View</NuxtLink>
                    <button class="text-btn text-xl" @click="leaveBot"
                        v-if="authStore.profile && botData.developers.length > 1">Leave Bot</button>
                    <button class="text-btn text-xl text-red-400" @click="deleteBot">Delete Bot</button>
                </div>
            </div>
        </template>
        <template v-else>
            <div>
                <h2>You don't own this bot!</h2>
                <NuxtLink class="text-btn" href="/bots">Your Bots</NuxtLink>
            </div>
        </template>
    </div>
    <div v-else>
        <h1>404 Bot Not Found</h1>
    </div>
</template>

<style scoped>
.info-grid {
    grid-template-columns: 1fr 3fr;
}
</style>