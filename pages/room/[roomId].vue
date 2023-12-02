<script setup lang="ts">
import { useRoute } from "vue-router";
import type { GeneralServerMessage } from "~/server/utils/messages";
import type { RoomInfo } from "~/server/utils/rooms";
const { status } = useAuth();

const route = useRoute();
const roomId = route.params.roomId;

const roomInfo = ref<RoomInfo | null>(null);
const ws = ref<WebSocket | null>(null);

async function getToken() {
    if (status.value !== "authenticated") return null;

    const { token } = await $fetch('/api/token/temp', {
        method: 'POST',
    });

    return token;
}

onMounted(async () => {
    const res = await $fetch(`/api/rooms/${roomId}`);
    roomInfo.value = res as RoomInfo;

    const token = await getToken();


    const urlParams = new URLSearchParams();
    urlParams.append("roomId", roomId as string);
    urlParams.append("spectate", "true");
    if (token) urlParams.append("token", token);

    // ws.value = new WebSocket(`ws://${location.host}/api/ws?${urlParams.toString()}`);
    ws.value = new WebSocket(`ws://localhost:8080/api/ws?${urlParams.toString()}`);

    ws.value.addEventListener("message", (event) => {
        if (!roomInfo.value) return console.error("no room info");

        const data = JSON.parse(event.data) as GeneralServerMessage;

        switch (data.type) {
            case 'game_started': {
                roomInfo.value.players = data.payload.players;
                break;
            }
            case 'player_ready': {
                const { userId } = data.payload;
                const player = roomInfo.value.players.find((p) => p.id === userId);
                if (!player) return console.error("player not found");
                player.ready = true;
                break;
            }
            case 'player_unready': {
                const { userId } = data.payload;
                const player = roomInfo.value.players.find((p) => p.id === userId);
                if (!player) return console.error("player not found");
                player.ready = false;
                break;
            }
            case 'player_joined': {
                const { playerData } = data.payload;
                roomInfo.value.players.push(playerData);
                break;
            }
            case 'player_left': {
                const { sessionId } = data.payload;
                const playerIndex = roomInfo.value.players.findIndex((p) => p.sessionId === sessionId);
                if (playerIndex === -1) return console.error("player not found");
                roomInfo.value.players.splice(playerIndex, 1);
                break;
            }
            case 'player_commands': {
                const { sessionId, newGameState } = data.payload;
                const player = roomInfo.value.players.find((p) => p.sessionId === sessionId);
                if (!player) return console.error("player not found");
                player.gameState = newGameState;
                break;
            }
        }
    });
});

const readyPlayers = computed(() => {
    if (!roomInfo.value) return 0;

    return roomInfo.value.players.filter((p) => p.ready).length;
});

function startGame() {
    if (!ws.value) return;

    sendClientMessage(ws.value, { type: "start_game" });
}

function resetGame() {
    if (!ws.value) return;

    sendClientMessage(ws.value, { type: "reset_game" });
}

function kickPlayer(sessionId: string) {
    if (!ws.value) return;

    sendClientMessage(ws.value, { type: "kick", payload: { sessionId } });
}

function banPlayer(userId: string) {
    if (!ws.value) return;

    sendClientMessage(ws.value, { type: "ban", payload: { userId } });
}
</script>

<template>
    <div>
        <h2>Players:</h2>
        <ul v-if="roomInfo">
            <li v-for="player in roomInfo.players">
                <span>{{ player.info.bot }}</span>
                <span>{{ player.info.creator }}</span>
                <span v-if="player.ready">Ready</span>
                <span v-else>Not Ready</span>
                <button @click="kickPlayer(player.sessionId)">Kick</button>
                <button @click="banPlayer(player.id)">Ban</button>
            </li>
        </ul>
        <button @click="startGame" class="disabled:opacity-50" :disabled="readyPlayers < 2">Start Game</button>
        <button @click="resetGame" class="disabled:opacity-50" :disabled="!roomInfo || !roomInfo.ongoing">
            Reset Game
        </button>
        {{ roomInfo }}
    </div>
</template>