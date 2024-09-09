<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const route = useRoute();
// force into string
const botId = typeof route.params.botId === 'string' ? route.params.botId : '';

const { data } = await useFetch(`/api/bot/${botId}`);

const editBotModal = ref(false);
const owned = computed(() => data.value !== null && data.value.developers.some(
    developer =>
        authStore.profile !== null &&
        developer.id === authStore.profile.id
));
</script>

<template>
    <div class="flex justify-center" v-if="data">
        <TheEditBotModal v-if="editBotModal" :id="data.id" :initial-data="data" @close="editBotModal = false" />
        <main class="px-8 flex flex-col items-center">
            <h1>{{ data.name }}</h1>
            <h2>{{ data.team ?? data.developers.map(dev => dev.displayName).join(",") }}</h2>
            <AvatarDisplay :board="data.avatar" class="my-6" />
            <div class="grid grid-cols-2 info-grid gap-4 my-6 text-xl w-96">
                <div>
                    Developers:
                </div>
                <div class="grow relative overflow-hidden">
                    <div v-for="developer in data.developers" class="w-full text-right overflow-hidden text-nowrap text-ellipsis">
                        {{ developer.displayName }}
                    </div>
                </div>
                <div>
                    Language:
                </div>
                <div v-if="data.language" class="text-right overflow-hidden text-nowrap text-ellipsis">
                    {{ data.language }}
                </div>
                <div v-else class="opacity-50 text-right">
                    N/A
                </div>
                <div>
                    Eval:
                </div>
                <div v-if="data.eval" class="text-right overflow-hidden text-nowrap text-ellipsis">
                    {{ data.eval }}
                </div>
                <div v-else class="opacity-50 text-right">
                    N/A
                </div>
                <div>
                    Movegen:
                </div>
                <div v-if="data.movegen" class="text-right overflow-hidden text-nowrap text-ellipsis">
                    {{ data.movegen }}
                </div>
                <div v-else class="opacity-50 text-right">
                    N/A
                </div>
                <div>
                    Search:
                </div>
                <div v-if="data.search" class="text-right overflow-hidden text-nowrap text-ellipsis">
                    {{ data.search }}
                </div>
                <div v-else class="opacity-50 text-right">
                    N/A
                </div>
            </div>
            <div v-if="owned" class="flex gap-8">
                <NuxtLink class="text-btn text-xl" :href="`/bot/${data.id}/manage`">Manage Bot</NuxtLink>
            </div>
        </main>
    </div>
    <div class="flex justify-center" v-else>
        <h1>404 Bot Not Found</h1>
    </div>
</template>

<style scoped>
.info-grid {
    grid-template-columns: 1fr 3fr;
}
</style>