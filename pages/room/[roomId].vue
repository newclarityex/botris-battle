<script setup lang="ts">
import { useRoute } from "vue-router";
import type { RoomInfo } from "~/server/utils/rooms";
const { session } = useAuth();

const route = useRoute();
const roomId = route.params.roomId;

const roomInfo = ref<RoomInfo | null>(null);
const ws = ref<WebSocket | null>(null);
onMounted(async () => {
    const res = await $fetch(`/api/rooms/${roomId}`);
    roomInfo.value = res as RoomInfo;

    // ws.value = new WebSocket(`ws://${location.host}/api/ws?roomId=${roomId}&spectate=true`);
    ws.value = new WebSocket(
        `ws://localhost:8080?roomId=${roomId}&spectate=true`
    );

    ws.value.addEventListener("open", () => {
        const id = session.value?.user?.id;
        if (!id || !ws.value) return;

        sendClientMessage(ws.value, { type: "auth", id });
    });

    ws.value.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
    });
});

function startGame() {
    if (!ws.value) return;
    console.log("start game");

    sendClientMessage(ws.value, { type: "start_game" });
}

function resetGame() {
    if (!ws.value) return;
    console.log("reset game");

    sendClientMessage(ws.value, { type: "reset_game" });
}
</script>

<template>
    <div>
        <button @click="startGame">Start Game</button>
        <button @click="resetGame">Reset Game</button>
        {{ roomInfo }}
    </div>
</template>