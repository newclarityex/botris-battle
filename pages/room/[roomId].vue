<script setup lang="ts">
import { useRoute } from 'vue-router';
import type { RoomInfo } from '~/server/utils/rooms';

const route = useRoute();
const roomId = route.params.roomId;

const roomInfo = ref<RoomInfo | null>(null);
const ws = ref<WebSocket | null>(null);
onMounted(async () => {
    const res = await $fetch(`/api/rooms/${roomId}`);
    roomInfo.value = res as RoomInfo;

    // ws.value = new WebSocket(`ws://${location.host}/api/ws?roomId=${roomId}&spectate=true`);
    ws.value = new WebSocket(`ws://localhost:8080?roomId=${roomId}&spectate=true`);
    ws.value.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
    });
});
</script>

<template>
    <div>
        <button>Start Game</button>
        <button>Reset Game</button>
        {{ roomInfo }}
    </div>
</template>