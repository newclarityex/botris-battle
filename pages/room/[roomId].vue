<script setup lang="ts">
import { useRoute } from "vue-router";
import type { GeneralServerMessage } from "~/server/utils/messages";
import type { PublicRoomData } from "~/server/utils/rooms";
import * as PIXI from 'pixi.js';
import { useDocumentVisibility, useWindowSize, useInterval, useIntervalFn, onKeyStroke } from '@vueuse/core';
import type { PlayerGraphics } from '@/utils/graphics';
import { renderState } from '@/utils/graphics';
import { AUDIO_SOURCES } from "~/server/utils/audio";
import { Application, useApplication } from 'vue3-pixi'
import type { ApplicationInst } from 'vue3-pixi'
import { getBoardBumpiness, getBoardAvgHeight } from 'libtris';
import FontFaceObserver from 'fontfaceobserver';

const { status, session } = useAuth();

definePageMeta({
    layout: "ingame",
})

// Wait for font to load
const font = new FontFaceObserver('Fira Mono');
await font.load();

const route = useRoute();
const roomId = route.params.roomId;

const initialRoomData = await $fetch(`/api/room/info`, {
    query: {
        roomId,
    }
}).catch((error) => {
    console.error("Error", error);

    return null;
});

if (!initialRoomData) {
    throw createError({
        statusCode: 404,
        statusMessage: "Room not found",
    })
}

const publicRoomData = ref<PublicRoomData>(initialRoomData);

const allPlayerGraphics = ref<PlayerGraphics[]>([])
allPlayerGraphics.value = initialRoomData.players.map((player) => ({
    id: player.sessionId,
    name: player.info.bot,
    boardContainer: null,
    effectsContainer: null,
    heldContainer: null,
    queueContainer: null,
}));

function getPlayerStats() {
    const { startedAt, endedAt } = publicRoomData.value;
    return publicRoomData.value.players.map((player) => {
        const { sessionId, info, gameState } = player;

        if (!startedAt || !gameState) return [{
            title: 'attack/min',
            value: 0,
        }, {
            title: 'efficiency',
            value: 0,
        }, {
            title: 'bumpiness',
            value: 0,
        }, {
            title: 'avg height',
            value: 0,
        }]
        return [{
            title: 'attack/min',
            value: gameState.score / ((endedAt ?? Date.now()) - startedAt) * 60 * 1000,
        }, {
            title: 'efficiency',
            value: gameState.piecesPlaced > 0 ? gameState.score / gameState.piecesPlaced : 0,
        }, {
            title: 'bumpiness',
            value: getBoardBumpiness(gameState.board),
        }, {
            title: 'avg height',
            value: getBoardAvgHeight(gameState.board),
        }]
    })
};

const playerStats = ref(getPlayerStats());
useIntervalFn(() => {
    playerStats.value = getPlayerStats();
}, 1000 / 60);

onMounted(() => {
    for (const player of initialRoomData.players) {
        const playerGraphics = allPlayerGraphics.value.find((p) => p.id === player.sessionId) as PlayerGraphics | undefined;
        if (!playerGraphics) return console.error("player graphics not found");

        renderState(playerGraphics, player.gameState)
    }
});

let ws: WebSocket | null = null;

async function getUserToken() {
    if (status.value !== "authenticated") return null;

    const { token } = await $fetch('/api/self/token/temp', {
        method: 'POST',
    });

    return token;
}

async function getRoomKey(roomId: string) {
    if (status.value !== "authenticated") return null;

    const res = await $fetch('/api/room/masterKey', {
        query: { roomId },
    });

    return res?.token;
}

const roundStartTime = ref<number | null>(null);

const pixiInst = ref<ApplicationInst | null>(null);
const pixiApp = computed(() => pixiInst.value?.app ?? null);

const { width, height } = useWindowSize();

const scaledContainer = ref<PIXI.Container | null>(null);
const playersContainer = ref<PIXI.Container | null>(null);
const scoreboardContainer = ref<PIXI.Container | null>(null);

const scoreboardText = ref({
    left: "left",
    right: "right",
    center: "Waiting For Players...",
});

function scoreStr(wins: number, ft: number) {
    if (ft < 4) {
        return '[*]'.repeat(wins) + '[ ]'.repeat(ft - wins);
    } else {
        return '[*]×' + wins;
    }
}

watchEffect(() => {
    if (!publicRoomData.value || publicRoomData.value.players.length < 2) {
        scoreboardText.value = {
            left: "",
            right: "",
            center: "Waiting For Players...",
        };
        return;
    };

    const { players } = publicRoomData.value;

    const leftPlayer = players[0];
    const rightPlayer = players[1];

    scoreboardText.value = {
        left: scoreStr(leftPlayer.wins, publicRoomData.value.ft),
        right: scoreStr(rightPlayer.wins, publicRoomData.value.ft),
        center: `win@${publicRoomData.value.ft}`,
    };
})

const RESOLUTION = {
    width: 1920,
    height: 1080,
};

const scale = computed(() => {
    const widthScale = width.value / RESOLUTION.width;
    const heightScale = height.value / RESOLUTION.height;

    return Math.min(widthScale, heightScale);
})

const documentVisible = useDocumentVisibility()

function resizeRenderer() {
    if (!pixiApp.value) return;

    pixiApp.value.renderer.resize(width.value, height.value);
    pixiApp.value.render();
}
watch([width, height], resizeRenderer);


onMounted(async () => {
    resizeRenderer();

    const userToken = await getUserToken();
    const roomKey = await getRoomKey(roomId as string);

    const urlParams = new URLSearchParams();
    urlParams.append("roomId", roomId as string);
    urlParams.append("spectate", "true");

    if (userToken) urlParams.append("userToken", userToken);
    if (roomKey) urlParams.append("roomKey", roomKey);

    // ws.value = new WebSocket(`ws://${location.host}/api/ws?${urlParams.toString()}`);
    ws = new WebSocket(`ws://localhost:8080/api/ws?${urlParams.toString()}`);

    ws.addEventListener("close", (event) => {
        switch (event.code) {
            case 4004:
                throw createError({
                    statusCode: 404,
                    statusMessage: "Room not found",
                })
            default:
                break;
        }
    })

    ws.addEventListener("message", (event) => {
        const data = JSON.parse(event.data) as GeneralServerMessage;

        switch (data.type) {
            case 'room_info': {
                publicRoomData.value = data.payload.publicRoomData;

                if (!pixiApp.value || !playersContainer.value) return console.error("no pixi app");

                scoreboardContainer.value = renderScoreboard(pixiApp.value as PIXI.Application, publicRoomData.value);

                break;
            }
            case 'round_started': {
                if (!publicRoomData.value) return console.error("no room info");
                roundStartTime.value = data.payload.startsAt;
                publicRoomData.value = data.payload.roomData;

                for (const player of publicRoomData.value.players) {
                    const playerGraphics = allPlayerGraphics.value.find((p) => p.id === player.sessionId) as PlayerGraphics | undefined;
                    if (!playerGraphics) return console.error("player graphics not found");

                    renderState(playerGraphics, player.gameState)
                }
                break;
            }
            case 'game_over': {
                publicRoomData.value = data.payload.roomData;
                break;
            }
            case 'game_reset': {
                if (!publicRoomData.value) return console.error("no room info");

                roundStartTime.value = null;

                publicRoomData.value.ongoing = false;
                publicRoomData.value.players = data.payload.players;
                break;
            }
            case 'player_joined': {
                if (!publicRoomData.value) return console.error("no room info");

                const { playerData } = data.payload;
                publicRoomData.value.players.push(playerData);

                allPlayerGraphics.value.push({
                    id: playerData.sessionId,
                    name: playerData.info.bot,
                    boardContainer: null,
                    effectsContainer: null,
                    heldContainer: null,
                    queueContainer: null,
                });

                break;
            }
            case 'player_left': {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId } = data.payload;
                const playerIndex = publicRoomData.value.players.findIndex((p) => p.sessionId === sessionId);
                if (playerIndex === -1) return console.error("player not found");
                publicRoomData.value.players.splice(playerIndex, 1);
                allPlayerGraphics.value.splice(playerIndex, 1);

                break;
            }
            case 'player_commands': {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId, newGameState, events } = data.payload;
                const player = publicRoomData.value.players.find((p) => p.sessionId === sessionId);
                if (!player) return console.error("player not found");
                player.gameState = newGameState;

                playerStats.value = getPlayerStats();

                const playerGraphics = allPlayerGraphics.value.find((p) => p.id === player.sessionId) as PlayerGraphics | undefined;
                if (!playerGraphics) return console.error("player graphics not found");

                renderState(playerGraphics, player.gameState)

                if (documentVisible.value === 'hidden') return;

                for (const event of events) {
                    switch (event.type) {
                        case 'piece_placed': {
                            const { final } = event.payload;
                            renderPlacedEffect(playerGraphics, final);
                            // AUDIO_SOURCES.place_piece.play();
                            break;
                        }
                        // case 'damage_tanked': {
                        //     AUDIO_SOURCES.tank_garbage.play();
                        //     break;
                        // }
                        case 'clear': {
                            const clearData = event.payload;

                            renderClearEffect(playerGraphics, clearData.clearedLines);

                            if (clearData.attack > 0) {
                                renderAttackEffect(playerGraphics, clearData.piece, clearData.attack);
                            }

                            // if (clearData.pc) {
                            //     AUDIO_SOURCES.all_clear.play();
                            // } else if (clearData.allSpin) {
                            //     AUDIO_SOURCES.all_spin_clear.play();
                            // } else {
                            //     if (newGameState.combo > 0) {
                            //         AUDIO_SOURCES.combo[newGameState.combo - 1].play();
                            //     } else {
                            //         AUDIO_SOURCES.line_clear.play();
                            //     }
                            //     // const combo = Math.min(7, newGameState.combo);
                            // }
                            break;
                        }
                    }
                }

                break;
            }
            case 'player_damage_received': {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId, newGameState } = data.payload;
                const player = publicRoomData.value.players.find((p) => p.sessionId === sessionId);
                if (!player) return console.error("player not found");
                player.gameState = newGameState;

                const playerGraphics = allPlayerGraphics.value.find((p) => p.id === sessionId) as PlayerGraphics | undefined;
                if (!playerGraphics) return console.error("player graphics not found");
                renderState(playerGraphics, player.gameState)
                break;
            }
        }
    });
});

onUnmounted(() => {
    if (!ws) return;

    ws.close();
});

function startGame() {
    if (!ws) return;

    gameMenu.value?.close();

    sendClientMessage(ws, { type: "start_game" });
}

function resetGame() {
    if (!ws) return;

    sendClientMessage(ws, { type: "reset_game" });
}

function kickPlayer(sessionId: string) {
    if (!ws) return;

    sendClientMessage(ws, { type: "kick", payload: { sessionId } });
}

function banPlayer(userId: string) {
    if (!ws) return;

    sendClientMessage(ws, { type: "ban", payload: { userId } });
}

const playerCount = 2
const boardConfigOptions = {
    2: {
        scale: 1,
        offsets: [-450, 450],
    },
    3: {
        scale: 0.75,
        offsets: [-625, 0, 625]
    },
    4: {
        scale: 0.5,
        offsets: [-675, -225, 225, 675]
    },
}

const currentConfig = computed(() => boardConfigOptions[playerCount]);

const backgroundOffset = useInterval(50);

const gameMenu = ref<HTMLDialogElement | null>(null);
onMounted(() => {
    if (!gameMenu.value) return;

    gameMenu.value.showModal();
});

onKeyStroke('Escape', (e) => {
    if (!gameMenu.value) return;

    e.preventDefault()

    if (gameMenu.value.open) {
        gameMenu.value.close();
    } else {
        gameMenu.value.showModal();
    }
});

const roomOptions = ref({
    ft: 5,
    ppsCap: 0,
    private: false,
});

async function showMasterKey() {
    const res = await $fetch('/api/room/masterKey', {
        query: {
            roomId,
        }
    });

    if (!res) return;

    alert(`Master Key: ${res.token}`);
}
</script>

<template>
    <div class="w-full h-full">
        <div class="absolute w-full h-full overflow-hidden -z-10">
            <Application :backgroundAlpha="0" ref="pixiInst" :antialias="true">
                <tiling-sprite texture="/images/tiling.png" :width="width" :height="height" :tile-scale="8 * scale"
                    :tilePosition="[backgroundOffset * scale, backgroundOffset * scale]" />
                <container :x="width / 2" :y="height / 2" :scale="scale" ref="scaledContainer">
                    <container ref="scoreboardContainer" :y="-425">
                        <graphics :pivotX="650 / 2" :pivotY="100 / 2" @render="graphics => {
                            graphics.clear()
                            graphics.beginFill(0x000000, 0.2);
                            graphics.drawRect(0, 0, 650, 100);
                            graphics.endFill()
                        }" />
                        <text :anchor="0.5" :x="0" :y="0"
                            :style="{ fill: 'white', fontSize: '32px', fontFamily: 'Fira Mono' }">
                            {{ scoreboardText.center }}
                        </text>
                        <text :anchorX="0" :anchorY="0.5" :x="-650 / 2 + 24" :y="0"
                            :style="{ fill: 'white', fontSize: '32px', fontFamily: 'Fira Mono' }">
                            {{ scoreboardText.left }}
                        </text>
                        <text :anchorX="1" :anchorY="0.5" :x="650 / 2 - 24" :y="0"
                            :style="{ fill: 'white', fontSize: '32px', fontFamily: 'Fira Mono' }">
                            {{ scoreboardText.right }}
                        </text>
                    </container>
                    <container :y="75">
                        <container v-for="board, index in allPlayerGraphics" :x="currentConfig.offsets[index]"
                            :scale="currentConfig.scale" :pivotY="21 * CELL_SIZE / 2">
                            <container :pivotX="5 * CELL_SIZE" :pivotY="0">
                                <graphics :pivotX="0" :pivotY="0" @render="graphics => {
                                    graphics.clear()
                                    graphics.beginFill(0x000000, 0.5);
                                    graphics.drawRect(0, 0, 10 * CELL_SIZE, 21 * CELL_SIZE);
                                    graphics.endFill()
                                }" />
                                <!-- Effects Container -->
                                <container :ref="(el: any) => board.effectsContainer = el" />
                                <!-- Board Container -->
                                <container :ref="(el: any) => board.boardContainer = el" />
                            </container>
                            <container :y="21 * CELL_SIZE + 12">
                                <graphics :pivotX="10 * CELL_SIZE / 2" @render="graphics => {
                                    graphics.clear()
                                    graphics.beginFill(0x000000, 0.25);
                                    graphics.drawRect(0, 0, 10 * CELL_SIZE, 50);
                                    graphics.endFill()
                                }" />
                                <text :x="0" :y="0" :anchorX="0.5"
                                    :style="{ fill: 'white', fontFamily: 'Fira Mono', fontSize: 24, lineHeight: 50 }">
                                    {{ board.name }}
                                </text>
                            </container>
                            <container :x="-5 * CELL_SIZE - 20" :pivotX="200" :pivotY="0">
                                <graphics :pivot="0" @render="graphics => {
                                    graphics.clear()
                                    graphics.beginFill(0x000000, 0.25);
                                    graphics.drawRect(0, 0, 200, 200);
                                    graphics.endFill()
                                }" />
                                <!-- <text :anchorX="0.5" :x="200 / 2" :y="24"
                                    :style="{ fill: 'white', fontSize: '32px', fontFamily: 'Fira Mono' }">
                                    [held]
                                </text> -->
                                <sprite :anchorX="0.5" :x="200 / 2" :y="24" texture="/images/held.svg"
                                    :cacheAsBitmapResolution="4" />
                                <!-- Held Container -->
                                <container :ref="(el: any) => board.heldContainer = el" />
                                <template v-if="playerStats[index]">
                                    <container v-for="stat, statIndex in playerStats[index]" :y="224 + 112 * statIndex">
                                        <text :style="{ fill: '#FFFFFFBB', fontFamily: 'Fira Mono', fontSize: 24 }">
                                            {{ stat.title }}
                                        </text>
                                        <text :style="{ fill: 'white', fontFamily: 'Fira Mono', fontSize: 36 }" :y="36">
                                            {{ stat.value.toFixed(2) }}
                                        </text>
                                    </container>
                                </template>
                            </container>
                            <container :x="5 * CELL_SIZE + 20" :pivotX="0" :pivotY="0">
                                <graphics :pivot="0" @render="graphics => {
                                    graphics.clear()
                                    graphics.beginFill(0x000000, 0.25);
                                    graphics.drawRect(0, 0, 200, 21 * CELL_SIZE);
                                    graphics.endFill()
                                }" />
                                <!-- <text :anchorX="0.5" :x="200 / 2" :y="24"
                                    :style="{ fill: 'white', fontSize: '32px', fontFamily: 'Fira Mono' }">
                                    [queue]
                                </text> -->
                                <sprite :anchorX="0.5" :x="200 / 2" :y="24" texture="/images/queue.svg"
                                    :cacheAsBitmapResolution="4" />
                                <!-- Queue Container -->
                                <container :ref="(el: any) => board.queueContainer = el" />
                            </container>
                        </container>
                    </container>
                </container>
            </Application>
            <!-- <canvas ref="pixiCanvas" class="absolute w-full h-full" /> -->
        </div>
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
        <dialog ref="gameMenu" v-if="publicRoomData && session && publicRoomData.host.userId === session.user?.id"
            class="bg-black/40">
            <div class="p-8 flex flex-col gap-4 w-[500px]">
                <div class="text-white/60 text-center">
                    Press ESC to toggle menu
                </div>
                <div class="flex justify-between">
                    <div>Master Key:</div>
                    <button class="underline" @click="showMasterKey">
                        Generate
                    </button>
                </div>
                <div class="flex justify-between">
                    <div>Single Use Key:</div>
                    <button class="underline">
                        Generate
                    </button>
                </div>
                <div class="flex justify-between">
                    <label>FT:</label>
                    <input type="number" v-model="roomOptions.ft" class="w-12 px-1" />
                </div>
                <div class="flex justify-between">
                    <label>PPS Cap:</label>
                    <input type="number" v-model="roomOptions.ppsCap" class="w-12 px-1" />
                </div>
                <div class="flex justify-between">
                    <label>Private:</label>
                    <input type="checkbox" v-model="roomOptions.private" />
                </div>
                <div class="flex justify-between">
                    <label>Players:</label>
                    <button class="underline">
                        Manage
                    </button>
                </div>
                <div class="flex justify-between">
                    <label>Banned:</label>
                    <button class="underline">
                        Manage
                    </button>
                </div>
                <div class="flex justify-evenly">
                    <button class="underline disabled:opacity-50" @click="resetGame"
                        :disabled="!publicRoomData || !publicRoomData.ongoing">
                        Reset Game
                    </button>
                    <button class="underline disabled:opacity-50" @click="startGame"
                        :disabled="!publicRoomData || publicRoomData.ongoing || publicRoomData.players.length < 2">
                        Start Game
                    </button>
                </div>
            </div>
        </dialog>
        <div v-if="!publicRoomData.ongoing">
            <Countdown v-if="roundStartTime" :startsAt="roundStartTime" />
            scale: {{ scale }}
            <h2>Players:</h2>
            <ul v-if="publicRoomData">
                <li v-for="player in publicRoomData.players">
                    <span>{{ player.info.bot }}</span>
                    <span>{{ player.info.creator }}</span>
                    <button @click="kickPlayer(player.sessionId)">Kick</button>
                    <button @click="banPlayer(player.info.userId)">Ban</button>
                </li>
            </ul>
        </div>
        {{ JSON.stringify(playerStats) }}
        <br>
        startedAt: {{ publicRoomData.startedAt }}, {{ publicRoomData.endedAt }}
        <!-- {{ publicRoomData }} -->
    </div>
</template>

<style scoped>
::backdrop {
    background: black;
    opacity: 0.25;
}

dialog {
    outline: none;
}
</style>