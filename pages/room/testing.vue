<script setup lang="ts">
import { useRoute } from "vue-router";
import type { GeneralServerMessage } from "~/server/utils/messages";
import type { PublicPlayerData, PublicRoomData } from "~/server/utils/rooms";
import * as PIXI from 'pixi.js';
import { useElementSize, useDocumentVisibility, useWindowSize } from '@vueuse/core';
import type { PlayerGraphics } from '@/utils/graphics';
import { renderState } from '@/utils/graphics';
import { AUDIO_SOURCES } from "~/server/utils/audio";
import { Application, useApplication } from 'vue3-pixi'
import type { ApplicationInst } from 'vue3-pixi';

const { status } = useAuth();

definePageMeta({
    layout: "ingame",
})

const route = useRoute();
const roomId = route.params.roomId;

// const initialRoomData = await $fetch(`/api/room/info`, {
//     query: {
//         roomId,
//     }
// }).catch((error) => {
//     console.error("Error", error);

//     return null;
// });

// if (!initialRoomData) {
//     throw createError({
//         statusCode: 404,
//         statusMessage: "Room not found",
//     })
// }


// const publicRoomData = ref<PublicRoomData>(initialRoomData);
const ws = ref<WebSocket | null>(null);

async function getToken() {
    if (status.value !== "authenticated") return null;

    const { token } = await $fetch('/api/self/token/temp', {
        method: 'POST',
    });

    return token;
}

const roundStartTime = ref<number | null>(null);

const pixiCanvas = ref<HTMLCanvasElement | null>(null);
const canvasContainer = ref<HTMLDivElement | null>(null);
const allPlayerGraphics = ref<Map<string, PlayerGraphics>>(new Map());
const playersContainer = ref<PIXI.Container | null>(null);
const scoreboardContainer = ref<PIXI.Container | null>(null);

// const RESOLUTION = {
//     width: 1920,
//     height: 1080,
// };
// const RESOLUTION_RATIO = RESOLUTION.width / RESOLUTION.height;

// Handle canvas resizing
const { width: maxCanvasWidth, height: maxCanvasHeight } = useElementSize(canvasContainer);

const documentVisible = useDocumentVisibility()

// onMounted(async () => {
//     if (!pixiCanvas.value) return;

//     pixiApp.value = new PIXI.Application({
//         view: pixiCanvas.value,
//         resizeTo: window,
//         backgroundAlpha: 0,
//     });

//     playersContainer.value = new PIXI.Container();
//     pixiApp.value.stage.addChild(playersContainer.value as PIXI.Container);

//     const token = await getToken();

//     const urlParams = new URLSearchParams();
//     urlParams.append("roomId", roomId as string);
//     urlParams.append("spectate", "true");
//     if (token) urlParams.append("token", token);

//     // ws.value = new WebSocket(`ws://${location.host}/api/ws?${urlParams.toString()}`);
//     ws.value = new WebSocket(`ws://localhost:8080/api/ws?${urlParams.toString()}`);

//     ws.value.addEventListener("close", (event) => {
//         switch (event.code) {
//             case 4004:
//                 throw createError({
//                     statusCode: 404,
//                     statusMessage: "Room not found",
//                 })
//             default:
//                 break;
//         }
//     })

//     ws.value.addEventListener("message", (event) => {
//         const data = JSON.parse(event.data) as GeneralServerMessage;

//         switch (data.type) {
//             case 'room_info': {
//                 publicRoomData.value = data.payload.publicRoomData;

//                 if (!pixiApp.value || !playersContainer.value) return console.error("no pixi app");

//                 scoreboardContainer.value = renderScoreboard(pixiApp.value as PIXI.Application, publicRoomData.value);

//                 allPlayerGraphics.value = renderPlayers(pixiApp.value as PIXI.Application, playersContainer.value as PIXI.Container, publicRoomData.value.players)
//                 break;
//             }
//             case 'round_started': {
//                 if (!publicRoomData.value) return console.error("no room info");
//                 roundStartTime.value = data.payload.startsAt;
//                 publicRoomData.value.players = data.payload.players;

//                 for (const player of publicRoomData.value.players) {
//                     const playerGraphics = allPlayerGraphics.value.get(player.sessionId);
//                     if (!playerGraphics) return console.error("player graphics not found");

//                     renderState(playerGraphics, player.gameState)
//                 }
//                 break;
//             }
//             case 'game_reset': {
//                 if (!publicRoomData.value) return console.error("no room info");

//                 roundStartTime.value = null;

//                 publicRoomData.value.ongoing = false;
//                 publicRoomData.value.players = data.payload.players;
//                 break;
//             }
//             case 'player_joined': {
//                 if (!publicRoomData.value) return console.error("no room info");

//                 const { playerData } = data.payload;
//                 publicRoomData.value.players.push(playerData);

//                 if (!pixiApp.value || !playersContainer.value) return console.error("no pixi app");
//                 allPlayerGraphics.value = renderPlayers(pixiApp.value as PIXI.Application, playersContainer.value as PIXI.Container, publicRoomData.value.players)
//                 break;
//             }
//             case 'player_left': {
//                 if (!publicRoomData.value) return console.error("no room info");

//                 const { sessionId } = data.payload;
//                 const playerIndex = publicRoomData.value.players.findIndex((p) => p.sessionId === sessionId);
//                 if (playerIndex === -1) return console.error("player not found");
//                 publicRoomData.value.players.splice(playerIndex, 1);

//                 if (!pixiApp.value || !playersContainer.value) return console.error("no pixi app");
//                 allPlayerGraphics.value = renderPlayers(pixiApp.value as PIXI.Application, playersContainer.value as PIXI.Container, publicRoomData.value.players)
//                 break;
//             }
//             case 'player_commands': {
//                 if (!publicRoomData.value) return console.error("no room info");

//                 const { sessionId, newGameState, events } = data.payload;
//                 const player = publicRoomData.value.players.find((p) => p.sessionId === sessionId);
//                 if (!player) return console.error("player not found");
//                 player.gameState = newGameState;

//                 const playerGraphics = allPlayerGraphics.value.get(sessionId);
//                 if (!playerGraphics) return console.error("player graphics not found");

//                 renderState(playerGraphics, player.gameState)

//                 if (documentVisible.value === 'hidden') return;

//                 for (const event of events) {
//                     switch (event.type) {
//                         case 'piece_placed': {
//                             const { final } = event.payload;
//                             renderPlacedEffect(playerGraphics, final);
//                             // AUDIO_SOURCES.place_piece.play();
//                             break;
//                         }
//                         // case 'damage_tanked': {
//                         //     AUDIO_SOURCES.tank_garbage.play();
//                         //     break;
//                         // }
//                         case 'clear': {
//                             const clearData = event.payload;

//                             renderClearEffect(playerGraphics, clearData.clearedLines);

//                             if (clearData.pc) {
//                                 AUDIO_SOURCES.all_clear.play();
//                             } else if (clearData.allSpin) {
//                                 AUDIO_SOURCES.all_spin_clear.play();
//                             } else {
//                                 if (newGameState.combo > 0) {
//                                     AUDIO_SOURCES.combo[newGameState.combo - 1].play();
//                                 } else {
//                                     AUDIO_SOURCES.line_clear.play();
//                                 }
//                                 // const combo = Math.min(7, newGameState.combo);
//                             }
//                             break;
//                         }
//                     }
//                 }

//                 break;
//             }
//             case 'player_damage_received': {
//                 if (!publicRoomData.value) return console.error("no room info");

//                 const { sessionId, newGameState } = data.payload;
//                 const player = publicRoomData.value.players.find((p) => p.sessionId === sessionId);
//                 if (!player) return console.error("player not found");
//                 player.gameState = newGameState;

//                 const playerGraphics = allPlayerGraphics.value.get(sessionId);
//                 if (!playerGraphics) return console.error("player graphics not found");
//                 renderState(playerGraphics, player.gameState)
//                 break;
//             }
//         }
//     });
// });

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

const windowRef = ref(window);

// watchEffect(() => {
//     console.log("pixiApp", pixiApp);
// });

const pixiInst = ref<ApplicationInst | null>(null);

const { width, height } = useWindowSize();

function resizeRenderer() {
    const pixiApp = pixiInst.value?.app;
    if (!pixiApp) return;

    pixiApp.renderer.resize(width.value, height.value);
    pixiApp.render();
}
onMounted(resizeRenderer)
watch([width, height], resizeRenderer);

const RESOLUTION = {
    width: 1920,
    height: 1080,
};

const scale = computed(() => {
    const widthScale = width.value / RESOLUTION.width;
    const heightScale = height.value / RESOLUTION.height;

    return Math.min(widthScale, heightScale);
})
</script>

<template>
    <div class="w-full h-full">
        <div class="absolute w-full h-full overflow-hidden flex items-center justify-center">
            <Application :backgroundAlpha="0" ref="pixiInst" :antialias="true">
                <container :x="width / 2" :y="height / 2" :scale="scale">
                    <graphics :pivotX="650 / 2" :pivotY="100 / 2" :x="0" :y="-150" @render="graphics => {
                        graphics.clear()
                        graphics.beginFill(0x000000, 0.2);
                        graphics.drawRect(0, 0, 650, 100);
                        graphics.endFill()
                    }" />
                    <text :scale="5" :resolution="5" :anchor="0.5" :x="0" :y="0" :style="{ fill: 'white' }"
                        font-family="Fira Mono">
                        Hello World
                    </text>

                    <container :x="width / 2" :y="height / 2" :scale="scale">
                        <text :anchor="0.5" :x="0" :y="0" :style="{ fill: 'white' }" font-family="Fira Mono">
                            Hello World
                        </text>
                    </container>
                </container>
                <!-- <graphics :x="120" :y="120" @render="graphics => {
                    graphics.clear()
                    graphics.beginFill(0xDE3249)
                    graphics.drawCircle(0, 0, 20)
                    graphics.endFill()
                }" /> -->
            </Application>
        </div>
        <!-- <canvas ref="pixiCanvas" class="absolute w-full h-full" /> -->
        <!-- <div class="absolute w-full h-full flex justify-center items-center -z-10" ref="canvasContainer">
            <div class="relative" :class="{
                'w-full h-auto': maxCanvasWidth / maxCanvasHeight < RESOLUTION_RATIO,
                'w-auto h-full': maxCanvasWidth / maxCanvasHeight > RESOLUTION_RATIO,
            }">
                <div class="absolute w-full flex justify-center gap-8 top-16">
                    <div v-for="player in publicRoomData?.players" class="text-xl">
                        {{ player.wins }}
                    </div>
                </div>
            </div>
        </div> -->
        <!-- <Countdown v-if="roundStartTime" :startsAt="roundStartTime" />
        <h2>Players:</h2>
        <ul v-if="publicRoomData">
            <li v-for="player in publicRoomData.players">
                <span>{{ player.info.bot }}</span>
                <span>{{ player.info.creator }}</span>
                <button @click="kickPlayer(player.sessionId)">Kick</button>
                <button @click="banPlayer(player.info.userId)">Ban</button>
            </li>
        </ul>
        <button @click="startGame" class="disabled:opacity-50" :disabled="!publicRoomData || publicRoomData.ongoing">
            Start Game
        </button>
        <button @click="resetGame" class="disabled:opacity-50" :disabled="!publicRoomData || !publicRoomData.ongoing">
            Reset Game
        </button> -->
        <!-- {{ publicRoomData }} -->
    </div>
</template>