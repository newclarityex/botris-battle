<script setup lang="ts">
const { data: bots, refresh: refreshBots } = useFetch('/api/self/bots');

const createBotModal = ref(false);
</script>

<template>
    <TheCreateBotModal v-if="createBotModal" @bot-created="refreshBots()" @close="createBotModal = false" />
    <div class="flex justify-center">
        <div class="w-[600px]">
            <h1>Bots</h1>
            <h2>Your Bots</h2>
            <ul class="list-none p-0 flex flex-col gap-2 my-2">
                <li v-for="bot in bots" class="bg-white/20 p-4 flex justify-between gap-4">
                    <div class="whitespace-nowrap overflow-hidden text-ellipsis">{{ bot.name }}</div>
                    <div class="flex gap-4">
                        <NuxtLink :href="`/bot/${bot.id}/manage`" class="text-btn"> Manage </NuxtLink>
                        <NuxtLink :href="`/bot/${bot.id}`" class="text-btn"> View </NuxtLink>
                    </div>
                </li>
            </ul>
            <div class="w-full flex justify-center">
                <button @click="createBotModal = true" class="my-4 border-white border-2 p-2">
                    Create Bot
                </button>
            </div>
        </div>
    </div>
</template>