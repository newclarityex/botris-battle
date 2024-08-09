<script setup lang="ts">
import { useRoute } from "vue-router";
import type { GeneralServerMessage } from "~/server/utils/messages";
import type { PublicRoomData } from "~/server/utils/rooms";
import * as PIXI from "pixi.js";
import {
    useDocumentVisibility,
    useWindowSize,
    useInterval,
    useIntervalFn,
    onKeyStroke,
} from "@vueuse/core";
import type { PlayerGraphics } from "@/utils/graphics";
import { renderClearName, renderComboEffect, renderState } from "@/utils/graphics";
import { AUDIO_SOURCES } from "~/server/utils/audio";
import { Application, useApplication } from "vue3-pixi";
import type { ApplicationInst } from "vue3-pixi";
import { getBoardBumpiness, getBoardAvgHeight, executeCommand, type GameState, type Command, getPublicGameState, type PublicGameState, type GameEvent } from "libtris";
import FontFaceObserver from "fontfaceobserver";
import { Text } from "pixi.js";

const { status, profile } = toRefs(useAuthStore());

definePageMeta({
    layout: "ingame",
});

// Wait for font to load
const font = new FontFaceObserver("Fira Mono");
await font.load();

const route = useRoute();
const roomId = route.params.roomId;

const initialRoomData = await $fetch(`/api/room/info`, {
    query: {
        roomId,
    },
}).catch((error) => {
    console.error("Error", error);

    return null;
});

if (!initialRoomData) {
    throw createError({
        statusCode: 404,
        statusMessage: "Room not found",
    });
}

const publicRoomData = ref<PublicRoomData>(initialRoomData);

const allPlayerGraphics = ref<PlayerGraphics[]>([]);
allPlayerGraphics.value = initialRoomData.players.map((player) => ({
    id: player.sessionId,
    name: player.info.bot,
    creator: player.info.creator,
    boardContainer: null,
    effectsContainer: null,
    heldContainer: null,
    queueContainer: null,
}));

function getPlayerStats() {
    const { startedAt, endedAt } = publicRoomData.value;
    return publicRoomData.value.players.map((player) => {
        const { gameState } = player;

        if (!startedAt || !gameState)
            return [
                {
                    title: "attack/min",
                    value: (0).toFixed(2),
                },
                {
                    title: "attack/piece",
                    value: (0).toFixed(2),
                },
                {
                    title: "(ds+a)/piece",
                    value: (0).toFixed(2),
                },
                {
                    title: "pieces placed",
                    value: 0,
                },
            ];

        let timePassed = (endedAt ?? Date.now()) - startedAt;
        let app = gameState.piecesPlaced > 0
            ? gameState.score / gameState.piecesPlaced
            : 0;
        let dsapp = gameState.piecesPlaced > 0
            ? (gameState.score + gameState.garbageCleared) / gameState.piecesPlaced
            : 0
        return [
            {
                title: "attack/min",
                value: ((gameState.score / (timePassed)) * 60 * 1000).toFixed(2),
            },
            {
                title: "attack/piece",
                value: app.toFixed(2),
            },
            {
                title: "(ds+a)/piece",
                value: dsapp.toFixed(2),
            },
            {
                title: "pieces placed",
                value: gameState.piecesPlaced,
            },
        ];
    });
}

const playerStats = ref(getPlayerStats());
useIntervalFn(() => {
    if (!publicRoomData.value.roundOngoing) return;
    playerStats.value = getPlayerStats();
}, 1000 / 60);

onMounted(() => {
    for (const player of initialRoomData.players) {
        const playerGraphics = allPlayerGraphics.value.find(
            (p) => p.id === player.sessionId
        ) as PlayerGraphics | undefined;
        if (!playerGraphics) return console.error("player graphics not found");

        renderState(playerGraphics, player.gameState);
    }
});

let ws: WebSocket | null = null;

const pixiInst = ref<ApplicationInst | null>(null);
const pixiApp = computed(() => pixiInst.value?.app ?? null);

const { width, height } = useWindowSize();

const scaledContainer = ref<PIXI.Container | null>(null);

function scoreStr(wins: number, ft: number) {
    if (ft < 4) {
        return "[*]".repeat(Math.min(ft, wins)) + "[ ]".repeat(Math.max(ft - wins, 0));
    } else {
        return "[*]×" + Math.min(ft, wins);
    }
}

const winStrs = computed(() => {
    if (!publicRoomData.value) return [];

    const { players, ft } = publicRoomData.value;

    return players.map((player) => scoreStr(player.wins, ft));
});

const RESOLUTION = {
    width: 1920,
    height: 1080,
};

const scale = computed(() => {
    const widthScale = width.value / RESOLUTION.width;
    const heightScale = height.value / RESOLUTION.height;

    return Math.min(widthScale, heightScale);
});

const documentVisible = useDocumentVisibility();

function resizeRenderer() {
    if (!pixiApp.value) {
        console.log("NO PIXI APP")
        return;
    };

    pixiApp.value.renderer.resolution = 1 / scale.value;
    pixiApp.value.renderer.resize(width.value, height.value);
    pixiApp.value.render();
}

watch([width, height], resizeRenderer);

const renderQueueMap: Map<string, {
    gameState: PublicGameState,
    prevGameState: PublicGameState,
    commands: Command[],
    events: GameEvent[]
}[]> = new Map();

const currentlyRendering: Set<string> = new Set();
const FORCE_UPDATE_PIECES = 5;

async function startRenderingSession(sessionId: string) {
    const renderQueue = renderQueueMap.get(sessionId)!;
    const ppsDelay = 1000 / publicRoomData.value.pps;

    currentlyRendering.add(sessionId);

    console.log("Starting session render", sessionId);

    while (renderQueue.length > 0) {
        if (renderQueue.length >= FORCE_UPDATE_PIECES) {
            // Only leave final render if we are severely behind
            renderQueue.splice(0, renderQueue.length - 1);
        };

        const { gameState, prevGameState, commands, events } = renderQueue.shift()!;
        const commandDelay =
            (ppsDelay / (commands.length + 1))
            * 0.85;
        const player = publicRoomData.value.players.find(
            (p) => p.sessionId === sessionId
        );
        if (!player) continue;

        player.gameState = gameState;

        playerStats.value = getPlayerStats();

        const playerGraphics = allPlayerGraphics.value.find(
            (p) => p.id === player.sessionId
        ) as PlayerGraphics | undefined;
        if (!playerGraphics) continue;

        let tempGameState: GameState = {
            ...prevGameState,
            isImmobile: false,
            garbageQueue: [],
        };

        renderState(playerGraphics, getPublicGameState(tempGameState));
        for (const command of commands as Command[]) {
            await sleep(commandDelay);
            ({ gameState: tempGameState } = executeCommand(tempGameState, command));
            renderState(playerGraphics, getPublicGameState(tempGameState));
        };
        await sleep(commandDelay);

        renderState(playerGraphics, gameState);

        if (documentVisible.value === "hidden") continue;

        for (const event of events) {
            switch (event.type) {
                case "piece_placed": {
                    const { final } = event.payload;
                    renderPlacedEffect(playerGraphics, final);
                    // AUDIO_SOURCES.place_piece.play();
                    break;
                }
                // case 'damage_tanked': {
                //     AUDIO_SOURCES.tank_garbage.play();
                //     break;
                // }
                case "clear": {
                    const clearData = event.payload;

                    renderClearEffect(
                        playerGraphics,
                        clearData.clearedLines
                    );

                    if (clearData.score > 0) {
                        renderAttackEffect(
                            playerGraphics,
                            clearData.piece,
                            clearData.score
                        );
                    };

                    if (clearData.combo > 2) {
                        renderComboEffect(
                            playerGraphics,
                            clearData.piece,
                            clearData.combo
                        );
                    }

                    switch (clearData.clearName) {
                        case 'All-Spin Single':
                        case 'All-Spin Double':
                        case 'All-Spin Triple':
                        case 'Quad':
                        case 'Perfect Clear':
                            renderClearName(playerGraphics, clearData.clearName);
                    };

                    // if (clearData.pc) {
                    //     AUDIO_SOURCES.all_clear.play();
                    // } else if (clearData.allSpin) {
                    //     AUDIO_SOURCES.all_spin_clear.play();
                    // } else {
                    //     if (clearData.combo > 0) {
                    //         AUDIO_SOURCES.combo[clearData.combo - 1].play();
                    //     } else {
                    //         AUDIO_SOURCES.line_clear.play();
                    //     }
                    //     // const combo = Math.min(7, newGameState.combo);
                    // }
                    break;
                }
            }
        }
    }

    console.log("Ending session render", sessionId);

    currentlyRendering.delete(sessionId);
}

onMounted(async () => {
    resizeRenderer();

    const urlParams = new URLSearchParams();
    urlParams.append("roomId", roomId as string);
    urlParams.append("spectate", "true");

    const runtimeConfig = useRuntimeConfig();
    const wsUrl = runtimeConfig.public.environment === "production" ? `wss://${location.host}/ws?${urlParams.toString()}` : `ws://localhost:8080/api/ws?${urlParams.toString()}`;
    ws = new WebSocket(wsUrl);

    ws.addEventListener("close", (event) => {
        console.log("closed", event);
        switch (event.code) {
            case 4004:
                throw createError({
                    statusCode: 404,
                    statusMessage: "Room not found",
                });
            default:
                break;
        }
    });

    ws.addEventListener("message", async (event) => {
        const data = JSON.parse(event.data) as GeneralServerMessage;

        switch (data.type) {
            case "room_data": {
                publicRoomData.value = data.payload.roomData;
                roomOptions.value.ft = publicRoomData.value.ft;
                roomOptions.value.startMargin = publicRoomData.value.startMargin;
                roomOptions.value.endMargin = publicRoomData.value.endMargin;
                roomOptions.value.pps = publicRoomData.value.pps;
                roomOptions.value.initialMessiness = publicRoomData.value.initialMessiness;
                roomOptions.value.finalMessiness = publicRoomData.value.finalMessiness;
                roomOptions.value.private = publicRoomData.value.private;
                break;
            }
            case "round_started": {
                if (!publicRoomData.value) return console.error("no room info");
                publicRoomData.value = data.payload.roomData;

                for (const player of publicRoomData.value.players) {
                    const playerGraphics = allPlayerGraphics.value.find(
                        (p) => p.id === player.sessionId
                    ) as PlayerGraphics | undefined;

                    if (!playerGraphics)
                        return console.error("player graphics not found");

                    renderState(playerGraphics, player.gameState);
                }

                setTimeout(() => {
                    publicRoomData.value.roundOngoing = true;
                }, data.payload.startsAt - Date.now());
                break;
            }
            case "round_over": {
                publicRoomData.value = data.payload.roomData;
                break;
            }
            case "game_over": {
                publicRoomData.value = data.payload.roomData;
                break;
            }
            case "game_reset": {
                if (!publicRoomData.value) return console.error("no room info");

                publicRoomData.value = data.payload.roomData;
                break;
            }
            case "player_joined": {
                if (!publicRoomData.value) return console.error("no room info");

                const { playerData } = data.payload;
                publicRoomData.value.players.push(playerData);

                allPlayerGraphics.value.push({
                    id: playerData.sessionId,
                    name: playerData.info.bot,
                    creator: playerData.info.creator,
                    boardContainer: null,
                    effectsContainer: null,
                    heldContainer: null,
                    queueContainer: null,
                });

                break;
            }
            case "player_left": {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId } = data.payload;
                const playerIndex = publicRoomData.value.players.findIndex(
                    (p) => p.sessionId === sessionId
                );
                if (playerIndex === -1)
                    return console.error("player not found");
                publicRoomData.value.players.splice(playerIndex, 1);
                allPlayerGraphics.value.splice(playerIndex, 1);

                break;
            }
            case "player_action": {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId, gameState, prevGameState, commands, events } = data.payload;

                if (!renderQueueMap.has(sessionId)) {
                    renderQueueMap.set(sessionId, []);
                };

                const renderQueue = renderQueueMap.get(sessionId)!;
                renderQueue.push({ gameState, prevGameState, commands, events })

                if (currentlyRendering.has(sessionId)) return;

                startRenderingSession(sessionId);

                break;
            }
            case "player_damage_received": {
                if (!publicRoomData.value) return console.error("no room info");

                const { sessionId, gameState } = data.payload;
                const player = publicRoomData.value.players.find(
                    (p) => p.sessionId === sessionId
                );
                if (!player) return console.error("player not found");
                player.gameState = gameState;

                const playerGraphics = allPlayerGraphics.value.find(
                    (p) => p.id === sessionId
                ) as PlayerGraphics | undefined;
                if (!playerGraphics)
                    return console.error("player graphics not found");
                renderState(playerGraphics, player.gameState);
                break;
            }
            case "settings_changed": {
                const { roomData } = data.payload;
                publicRoomData.value = roomData;
                roomOptions.value.ft = roomData.ft;
                roomOptions.value.pps = roomData.pps;
                roomOptions.value.initialMessiness = roomData.initialMessiness;
                roomOptions.value.finalMessiness = roomData.finalMessiness;
                roomOptions.value.startMargin = roomData.startMargin;
                roomOptions.value.endMargin = roomData.endMargin;
                roomOptions.value.private = roomData.private;
                break;
            }
            case "player_banned": {
                publicRoomData.value.banned.push(data.payload.playerInfo);
                break;
            }
            case "player_unbanned": {
                publicRoomData.value.banned = publicRoomData.value.banned.filter(
                    (banned) => banned.userId !== data.payload.playerInfo.userId
                );
                break;
            }
        }
    });
});

onUnmounted(() => {
    if (!ws) return;

    ws.close();
});

async function startGame() {
    gameMenu.value?.close();

    await $fetch('/api/room/start', {
        method: 'POST',
        body: {
            roomId,
        },
    });
}

async function resetGame() {
    await $fetch('/api/room/reset', {
        method: 'POST',
        body: {
            roomId,
        },
    });
}

async function kickPlayer(sessionId: string) {
    await $fetch('/api/room/kick', {
        method: 'POST',
        body: {
            roomId,
            targetId: sessionId,
        },
    });
}

async function banPlayer(userId: string) {
    await $fetch('/api/room/ban', {
        method: 'POST',
        body: {
            roomId,
            targetId: userId,
        },
    });
}

async function unbanPlayer(userId: string) {
    await $fetch('/api/room/unban', {
        method: 'POST',
        body: {
            roomId,
            targetId: userId,
        },
    });
}

const playerCount = 2;
const boardConfigOptions = {
    2: {
        scale: 1,
        offsets: [-450, 450],
    },
    3: {
        scale: 0.75,
        offsets: [-625, 0, 625],
    },
    4: {
        scale: 0.5,
        offsets: [-675, -225, 225, 675],
    },
};

const currentConfig = computed(() => boardConfigOptions[playerCount]);

const backgroundOffset = useInterval(50);

const gameMenu = ref<HTMLDialogElement | null>(null);
onMounted(() => {
    if (!gameMenu.value) return;

    gameMenu.value.showModal();
});

onKeyStroke("Escape", (e) => {
    if (!gameMenu.value) return;

    e.preventDefault();

    if (gameMenu.value.open) {
        gameMenu.value.close();
        showMasterKey.value = false;
    } else {
        gameMenu.value.showModal();
    }
}, { dedupe: true });

const roomOptions = ref({
    ft: 5,
    private: false,
    pps: 2.5,
    initialMessiness: 0.05,
    finalMessiness: 1,
    startMargin: 90,
    endMargin: 150,
});

const { data: masterKey } = useFetch('/api/room/masterKey', {
    query: {
        roomId,
    },
});

const showMasterKey = ref(false);

const loadingTempKey = ref(false);
async function generateTempKey() {
    if (loadingTempKey.value) return;

    loadingTempKey.value = true;
    const temp = await $fetch("/api/room/tempKey", {
        method: "POST",
        body: {
            roomId,
        }
    });

    alert(`token: ${temp.key}`);
    loadingTempKey.value = false;
}

async function saveSettings() {
    let ft: string | number = roomOptions.value.ft;
    if (typeof ft === 'number') {
        ft = Math.floor(ft);
    } else {
        ft = parseInt(ft);
    }
    if (isNaN(ft)) {
        ft = 3;
    }
    if (ft < 1) {
        ft = 1;
    }
    if (ft > 99) {
        ft = 99;
    }

    await $fetch('/api/room/edit', {
        method: "POST",
        body: {
            roomId,
            private: roomOptions.value.private,
            ft,
            pps: roomOptions.value.pps,
            initialMessiness: roomOptions.value.initialMessiness,
            finalMessiness: roomOptions.value.finalMessiness,
            startMargin: roomOptions.value.startMargin,
            endMargin: roomOptions.value.endMargin,
        }
    });
};

const settingsChanged = computed(() => {
    if (publicRoomData.value.private !== roomOptions.value.private) {
        return true;
    };
    if (publicRoomData.value.ft !== roomOptions.value.ft) {
        return true;
    };
    if (publicRoomData.value.pps !== roomOptions.value.pps) {
        return true;
    };
    if (publicRoomData.value.initialMessiness !== roomOptions.value.initialMessiness) {
        return true;
    };
    if (publicRoomData.value.finalMessiness !== roomOptions.value.finalMessiness) {
        return true;
    };
    if (publicRoomData.value.startMargin !== roomOptions.value.startMargin) {
        return true;
    };
    if (publicRoomData.value.endMargin !== roomOptions.value.endMargin) {
        return true;
    };
    return false;
});

const countdownTime = ref<number | null>(null);
const displayTime = ref<number | null>(null);

onMounted(() => {
    const interval = setInterval(() => {
        const { startMargin, endMargin } = publicRoomData.value;
        if (!publicRoomData.value.startedAt) {
            countdownTime.value = null;
            displayTime.value = null;
            return;
        }

        const now = Date.now();
        const timePassed = now - publicRoomData.value.startedAt;
        const timeLeft = publicRoomData.value.startedAt - now;

        if (timePassed > 0) {
            countdownTime.value = null;
            displayTime.value = Math.floor((timePassed) / 1000);
        } else {
            displayTime.value = null;
            countdownTime.value = Math.ceil((timeLeft) / 1000);
        }
    }, 1000 / 60);

    return () => {
        clearInterval(interval);
    }
}); 
</script>

<template>
    <div class="w-full h-full">
        <div class="absolute w-full h-full overflow-hidden -z-10">
            <Application :backgroundAlpha="0" ref="pixiInst" :antialias="true">
                <tiling-sprite texture="/images/tiling.png" :width="width" :height="height" :tile-scale="8 * scale"
                    :tilePosition="[
                backgroundOffset * scale,
                backgroundOffset * scale,
            ]" />
                <container :x="width / 2" :y="height / 2" :scale="scale" ref="scaledContainer">
                    <container :y="-425">
                        <graphics :pivotX="650 / 2" :pivotY="100 / 2" @render="(graphics: PIXI.Graphics) => {
                graphics.clear();
                graphics.beginFill(0x000000, 0.2);
                graphics.drawRect(0, 0, 650, 100);
                graphics.endFill();
            }
                " />
                        <text :anchor="0.5" :x="0" :y="0" :style="{
                fill: 'white',
                fontSize: '32px',
                fontFamily: 'Fira Mono',
            }" v-if="publicRoomData.players.length === 0">
                            Waiting For Players...
                        </text>
                        <template v-else>
                            <text :anchor="0.5" :x="0" :y="-12" :style="{
                fill: 'white',
                fontSize: '30px',
                fontFamily: 'Fira Mono',
            }">
                                win@{{ publicRoomData.ft }}
                            </text>
                            <text :anchor="0.5" :x="0" :y="20" :style="{
                fill: 'white',
                fontSize: '20px',
                fontFamily: 'Fira Mono',
            }">
                                {{ displayTime }} - {{ publicRoomData.pps.toFixed(1) }} PPS
                            </text>
                            <text :anchorX="0" :anchorY="0.5" :x="-650 / 2 + 24" :y="0" :style="{
                fill: 'white',
                fontSize: '32px',
                fontFamily: 'Fira Mono',
            }">
                                {{ winStrs[0] }}
                            </text>
                            <text :anchorX="1" :anchorY="0.5" :x="650 / 2 - 24" :y="0" :style="{
                fill: 'white',
                fontSize: '32px',
                fontFamily: 'Fira Mono',
            }">
                                {{ winStrs[1] }}
                            </text>
                        </template>
                    </container>
                    <container :y="70">
                        <container v-for="(board, index) in allPlayerGraphics" :key="board.id"
                            :x="currentConfig.offsets[index]" :scale="currentConfig.scale"
                            :pivotY="(21 * CELL_SIZE) / 2">
                            <container :pivotX="5 * CELL_SIZE" :pivotY="0">
                                <graphics :pivotX="0" :pivotY="0" @render="(graphics: PIXI.Graphics) => {
                graphics.clear();
                graphics.beginFill(0x000000, 0.5);
                graphics.drawRect(
                    0,
                    0,
                    10 * CELL_SIZE,
                    21 * CELL_SIZE
                );
                graphics.endFill();
            }" />
                                <!-- Effects Container -->
                                <container :ref="(el: any) => board.effectsContainer = el" />
                                <!-- Board Container -->
                                <container :ref="(el: any) => board.boardContainer = el" :sortable-children="true" />
                                <text :anchorX="0.5" :anchorY="0.5" :x="10 * CELL_SIZE / 2" :y="200" :style="{
                fill: 'white',
                fontSize: '48px',
                fontFamily: 'Fira Mono',
            }">
                                    {{ countdownTime }}
                                </text>
                                <text v-if="publicRoomData.lastWinner === board.id" :anchorX="0.5" :anchorY="0.5"
                                    :x="10 * CELL_SIZE / 2" :y="200" :style="{
                fill: 'white',
                fontSize: '36px',
                fontFamily: 'Fira Mono',
            }">
                                    winner
                                </text>
                            </container>
                            <container :y="21 * CELL_SIZE + 12">
                                <graphics :pivotX="(10 * CELL_SIZE) / 2" @render="(graphics: PIXI.Graphics) => {
                graphics.clear();
                graphics.beginFill(0x000000, 0.25);
                graphics.drawRect(
                    0,
                    0,
                    10 * CELL_SIZE,
                    50
                );
                graphics.endFill();
            }
                " />
                                <text :x="0" :y="0" :anchorX="0.5" :style="{
                fill: 'white',
                fontFamily: 'Fira Mono',
                fontSize: 24,
                lineHeight: 50,
            }">
                                    {{ board.name }}
                                </text>
                            </container>
                            <container :y="21 * CELL_SIZE + 74">
                                <graphics :pivotX="(10 * CELL_SIZE) / 2" @render="(graphics: PIXI.Graphics) => {
                graphics.clear();
                graphics.beginFill(0x000000, 0.25);
                graphics.drawRect(
                    0,
                    0,
                    10 * CELL_SIZE,
                    36
                );
                graphics.endFill();
            }
                " />
                                <text :x="0" :y="0" :anchorX="0.5" :style="{
                fill: 'white',
                fontFamily: 'Fira Mono',
                fontSize: 20,
                lineHeight: 36,
            }">
                                    {{ board.creator }}
                                </text>
                            </container>
                            <container :x="-5 * CELL_SIZE - 20" :pivotX="200" :pivotY="0">
                                <graphics :pivot="0" @render="(graphics: PIXI.Graphics) => {
                graphics.clear();
                graphics.beginFill(0x000000, 0.25);
                graphics.drawRect(0, 0, 200, 200);
                graphics.endFill();
            }
                " />
                                <!-- <text :anchorX="0.5" :x="200 / 2" :y="24"
                                    :style="{ fill: 'white', fontSize: '32px', fontFamily: 'Fira Mono' }">
                                    [held]
                                </text> -->
                                <sprite :anchorX="0.5" :x="200 / 2" :y="24" texture="/images/held.svg" />
                                <!-- Held Container -->
                                <container :ref="(el: any) => board.heldContainer = el" />

                                <template v-if="playerStats[index]">
                                    <container v-for="(stat, statIndex) in playerStats[
                index
            ]" :y="224 + 112 * statIndex">
                                        <text :style="{
                fill: '#FFFFFFBB',
                fontFamily: 'Fira Mono',
                fontSize: 24,
            }">
                                            {{ stat.title }}
                                        </text>
                                        <text :style="{
                fill: 'white',
                fontFamily: 'Fira Mono',
                fontSize: 36,
            }" :y="36">
                                            {{ stat.value }}
                                        </text>
                                    </container>
                                </template>
                            </container>
                            <container :x="5 * CELL_SIZE + 20" :pivotX="0" :pivotY="0">
                                <graphics :pivot="0" @render="(graphics: PIXI.Graphics) => {
                graphics.clear();
                graphics.beginFill(0x000000, 0.25);
                graphics.drawRect(
                    0,
                    0,
                    200,
                    21 * CELL_SIZE
                );
                graphics.endFill();
            }
                " />
                                <!-- <text :anchorX="0.5" :x="200 / 2" :y="24"
                                    :style="{ fill: 'white', fontSize: '32px', fontFamily: 'Fira Mono' }">
                                    [queue]
                                </text> -->
                                <sprite :anchorX="0.5" :x="200 / 2" :y="24" texture="/images/queue.svg" />
                                <!-- Queue Container -->
                                <container :ref="(el: any) => board.queueContainer = el" />
                            </container>
                        </container>
                    </container>
                </container>
            </Application>
        </div>
        <dialog ref="gameMenu" v-if="publicRoomData && publicRoomData.host.userId === profile?.id
                " class="bg-black/40 backdrop:bg-black/20 backdrop:backdrop-blur-sm">
            <div class="p-6 flex flex-col gap-4 w-[520px] text-white">
                <div class="text-white text-center text-lg">
                    Press ESC to toggle menu
                </div>
                <div class="p-4 bg-white/10 flex flex-col gap-2 text-sm">
                    <div class="flex justify-between">
                        <div>Room ID:</div>
                        <div>
                            {{ publicRoomData.id }}
                        </div>
                    </div>
                    <div class="flex justify-between">
                        <div>Master Key:</div>
                        <div class="relative">
                            <button class="h-full w-full absolute bg-stone-950/80 z-10" @click="showMasterKey = true"
                                v-if="!showMasterKey">
                            </button>
                            <div class="px-1" :class="{
                'opacity-0': !showMasterKey
            }">
                                {{ masterKey?.key }}
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-between">
                        <div>Single Use Key:</div>
                        <button class="underline disabled:opacity-50" @click="generateTempKey"
                            :disabled="loadingTempKey">Generate</button>
                    </div>
                </div>
                <div class="p-4 bg-white/10 flex flex-col gap-2 text-sm">
                    <div class="flex justify-between items-center">
                        <label>FT:</label>
                        <input type="text" v-model.number="roomOptions.ft" class="w-12 px-1 bg-white/20 text-right" />
                    </div>
                    <div class="flex justify-between items-center">
                        <label>PPS (max: 30):</label>
                        <input type="text" v-model.number="roomOptions.pps" class="w-12 px-1 bg-white/20 text-right" />
                    </div>
                    <div class="flex justify-between items-center">
                        <label>Initial Messiness (0 - 1):</label>
                        <input type="text" v-model.number="roomOptions.initialMessiness"
                            class="w-12 px-1 bg-white/20 text-right" />
                    </div>
                    <div class="flex justify-between items-center">
                        <label>Final Messiness (0 - 1):</label>
                        <input type="text" v-model.number="roomOptions.finalMessiness"
                            class="w-12 px-1 bg-white/20 text-right" />
                    </div>
                    <div class="flex justify-between items-center">
                        <label>Start Margin:</label>
                        <input type="text" v-model.number="roomOptions.startMargin"
                            class="w-12 px-1 bg-white/20 text-right" />
                    </div>
                    <div class="flex justify-between items-center">
                        <label>End Margin:</label>
                        <input type="text" v-model.number="roomOptions.endMargin"
                            class="w-12 px-1 bg-white/20 text-right" />
                    </div>
                    <div class="flex justify-between items-center">
                        <label>Private:</label>
                        <input type="checkbox" v-model.number="roomOptions.private" class="w-4 h-4" />
                    </div>
                    <div class="flex justify-center">
                        <button class="bg-white/10 w-full py-1 hover:bg-white/20" @click="saveSettings">
                            Save{{ settingsChanged ? '*' : '' }}
                        </button>
                    </div>
                </div>
                <div class="p-4 bg-white/10 flex flex-col gap-2">
                    <h2 class="text-lg">Players</h2>
                    <div v-if="publicRoomData.players.length === 0 && publicRoomData.banned.length === 0"
                        class="italic opacity-50">
                        No Players Joined
                    </div>
                    <ul v-else class="flex flex-col gap-2 text-sm">
                        <li class="w-full flex justify-between" v-for="player in publicRoomData.players ">
                            <div>
                                {{ player.info.bot }}
                                <span class="opacity-50">
                                    {{ player.info.creator }}
                                </span>
                            </div>
                            <div class="flex gap-2">
                                <button class="underline" @click="kickPlayer(player.sessionId)">
                                    Kick
                                </button>
                                <button class="underline" @click="banPlayer(player.info.userId)">
                                    Ban
                                </button>
                            </div>
                        </li>
                        <li class="flex justify-between" v-for=" player in publicRoomData.banned">
                            <div class="text-red-400">
                                {{ player.bot }}
                                <span class="opacity-50">
                                    {{ player.creator }}
                                </span>
                            </div>
                            <div class="flex gap-2">
                                <button class="underline" @click="unbanPlayer(player.userId)">
                                    Unban
                                </button>
                            </div>
                        </li>
                    </ul>
                </div>
                <div class="flex justify-evenly">
                    <NuxtLink class="underline text-lg" to="/rooms">
                        Leave Game
                    </NuxtLink>
                    <button class="underline disabled:opacity-60 text-lg" @click="resetGame"
                        :disabled="!publicRoomData || !publicRoomData.gameOngoing">
                        Reset Game
                    </button>
                    <button class="underline disabled:opacity-60 text-lg" @click="startGame" :disabled="!publicRoomData ||
                publicRoomData.gameOngoing ||
                publicRoomData.players.length < 2
                ">
                        Start Game
                    </button>
                </div>
            </div>
        </dialog>
    </div>
</template>

<style scoped>
dialog {
    outline: none;
}
</style>