<script setup lang="ts">
import { useRoute } from "vue-router";
import type { GeneralServerMessage } from "~/server/utils/messages";
import type { PublicRoomData } from "~/server/utils/rooms";
const { status } = useAuth();

const route = useRoute();
const roomId = route.params.roomId;

const publicRoomData = ref<PublicRoomData | null>(null);
const ws = ref<WebSocket | null>(null);

async function getToken() {
    if (status.value !== "authenticated") return null;

    const { token } = await $fetch('/api/token/temp', {
        method: 'POST',
    });

    return token;
}

const roundStartTime = ref<number | null>(null);

onMounted(async () => {
    const token = await getToken();

    const urlParams = new URLSearchParams();
    urlParams.append("roomId", roomId as string);
    urlParams.append("spectate", "true");
    if (token) urlParams.append("token", token);

    // ws.value = new WebSocket(`ws://${location.host}/api/ws?${urlParams.toString()}`);
    ws.value = new WebSocket(`ws://localhost:8080/api/ws?${urlParams.toString()}`);

    ws.value.addEventListener("message", (event) => {
        const data = JSON.parse(event.data) as GeneralServerMessage;

        switch (data.type) {
            case 'room_info': {
                publicRoomData.value = data.payload.publicRoomData;
                break;
            }
            case 'round_started': {
                if (!publicRoomData.value) return console.error("no room info");
                roundStartTime.value = data.payload.startsAt;
                publicRoomData.value.players = data.payload.players;
                break;
            }
            case 'game_reset': {
                if (!publicRoomData.value) return console.error("no room info");

                roundStartTime.value = null;

                publicRoomData.value.players = data.payload.players;
                break;
            }
            case 'player_ready': {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId } = data.payload;
                const player = publicRoomData.value.players.find((p) => p.sessionId === sessionId);
                if (!player) return console.error("player not found");
                player.ready = true;
                break;
            }
            case 'player_unready': {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId } = data.payload;
                const player = publicRoomData.value.players.find((p) => p.sessionId === sessionId);
                if (!player) return console.error("player not found");
                player.ready = false;
                break;
            }
            case 'player_joined': {
                if (!publicRoomData.value) return console.error("no room info");

                const { playerData } = data.payload;
                publicRoomData.value.players.push(playerData);
                break;
            }
            case 'player_left': {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId } = data.payload;
                const playerIndex = publicRoomData.value.players.findIndex((p) => p.sessionId === sessionId);
                if (playerIndex === -1) return console.error("player not found");
                publicRoomData.value.players.splice(playerIndex, 1);
                break;
            }
            case 'player_commands': {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId, newGameState } = data.payload;
                const player = publicRoomData.value.players.find((p) => p.sessionId === sessionId);
                if (!player) return console.error("player not found");
                player.gameState = newGameState;
                break;
            }
            case 'player_damage_received': {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId, newGameState } = data.payload;
                const player = publicRoomData.value.players.find((p) => p.sessionId === sessionId);
                if (!player) return console.error("player not found");
                player.gameState = newGameState;
                break;
            }
        }
    });
});

const readyPlayers = computed(() => {
    if (!publicRoomData.value) return 0;

    return publicRoomData.value.players.filter((p) => p.ready).length;
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
        <Countdown v-if="roundStartTime" :startsAt="roundStartTime" />
        <h2>Players:</h2>
        <ul v-if="publicRoomData">
            <li v-for="player in publicRoomData.players">
                <GameBoard :gameState="player.gameState" />
                <span>{{ player.info.bot }}</span>
                <span>{{ player.info.creator }}</span>
                <span v-if="player.ready">Ready</span>
                <span v-else>Not Ready</span>
                <button @click="kickPlayer(player.sessionId)">Kick</button>
                <button @click="banPlayer(player.info.userId)">Ban</button>
            </li>
        </ul>
        <button @click="startGame" class="disabled:opacity-50"
            :disabled="readyPlayers < 2 || !publicRoomData || publicRoomData.ongoing">
            Start Game
        </button>
        <button @click="resetGame" class="disabled:opacity-50" :disabled="!publicRoomData || !publicRoomData.ongoing">
            Reset Game
        </button>
        {{ publicRoomData }}
    </div>
</template>