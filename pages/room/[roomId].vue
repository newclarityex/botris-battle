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
import { renderAvatar, renderClearName, renderComboEffect, renderDamage, renderState, CELL_SIZE } from "@/utils/graphics";
import { Application } from "vue3-pixi";
import type { ApplicationInst } from "vue3-pixi";
import { executeCommand, type GameState, type Command, getPublicGameState, type PublicGameState, type GameEvent, type Piece } from "libtris";
import FontFaceObserver from "fontfaceobserver";
import { getBotCreator } from "~/utils/general";

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

const publicRoomData = ref<PublicRoomData | null>(initialRoomData);

const allPlayerGraphics = shallowRef<PlayerGraphics[]>([]);
if (initialRoomData !== null) {
    allPlayerGraphics.value = initialRoomData.players.map((player) => ({
        id: player.sessionId,
        info: player.info,
        boardContainer: null,
        backgroundContainer: null,
        foregroundContainer: null,
        heldContainer: null,
        queueContainer: null,
        damageBar: null,
        spikeEffect: null,
    }));
}

function getPlayerStats() {
    if (publicRoomData.value === null) return [];

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
            ? gameState.rawScore / gameState.piecesPlaced
            : 0;
        let dsapp = gameState.piecesPlaced > 0
            ? (gameState.rawScore + gameState.garbageCleared) / gameState.piecesPlaced
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
    if (publicRoomData.value === null || !publicRoomData.value.roundOngoing) return;
    playerStats.value = getPlayerStats();
}, 1000 / 60);

onMounted(() => {
    if (initialRoomData === null) return;
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

type RenderStep = { timestamp: number, type: 'piece_spawned', sessionId: string, gameState: PublicGameState }
    | { timestamp: number, type: 'command', sessionId: string, command: Command }
    | { timestamp: number, type: 'piece_placed', sessionId: string, gameState: PublicGameState, events: GameEvent[] };
const renderQueueMap = new Map<string, RenderStep[]>();

const spikeMap = new Map<string, number>();
const renderMap = new Map<string, GameState>();
const renderInterval = useIntervalFn(() => {
    for (let [id, renderQueue] of renderQueueMap.entries()) {
        if (renderQueue.length > 3 * 20) {
            renderQueue = renderQueue.filter(renderStep => renderStep.type === "piece_placed");
            renderQueue = [renderQueue[0]];
            renderQueueMap.set(id, renderQueue);
        };

        while (renderQueue.length > 0) {
            let renderStep = renderQueue[0];
            if (renderStep.timestamp > Date.now()) break;
    
            renderQueue.shift();
    
            const playerGraphics = allPlayerGraphics.value.find(player => player.id === renderStep.sessionId);
            if (playerGraphics === undefined) break;
    
            switch (renderStep.type) {
                case 'piece_spawned': {
                    let gameState: GameState = { ...renderStep.gameState, garbageQueue: [], isImmobile: false };
                    renderMap.set(renderStep.sessionId, gameState);
                    renderState(playerGraphics, renderStep.gameState);
                    renderDamage(playerGraphics, renderStep.gameState);
                    break;
                }
                case 'command': {
                    let currentGameState = renderMap.get(renderStep.sessionId);
                    if (currentGameState === undefined) break;
    
    
                    const { gameState: newGameState } = executeCommand(currentGameState, renderStep.command);
                    renderState(playerGraphics, getPublicGameState(newGameState));
    
                    renderMap.set(renderStep.sessionId, newGameState);
                    break;
                }
                case 'piece_placed': {
                    renderMap.delete(renderStep.sessionId);
    
                    renderState(playerGraphics, renderStep.gameState);
                    renderDamage(playerGraphics, renderStep.gameState);
    
                    if (documentVisible.value === "hidden") break;
    
                    if (renderStep.events.every(event => event.type !== 'clear')) {
                        spikeMap.delete(renderStep.sessionId);
                    }
    
                    for (const event of renderStep.events) {
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
    
                                    let currentSpike = spikeMap.get(renderStep.sessionId) ?? 0;
                                    currentSpike += clearData.score;
                                    spikeMap.set(renderStep.sessionId, currentSpike);
    
                                    if (currentSpike >= MIN_SPIKE) {
                                        renderSpikeEffect(playerGraphics, clearData.piece, currentSpike);
                                    }
                                }
    
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
                    break;
                }
            }
        };
    }
}, 1000 / 60)

onMounted(async () => {
    const urlParams = new URLSearchParams();
    urlParams.append("roomId", roomId as string);
    urlParams.append("spectate", "true");

    const runtimeConfig = useRuntimeConfig();
    const wsUrl = runtimeConfig.public.environment === "production" ? `wss://${location.host}/ws?${urlParams.toString()}` : `ws://localhost:8080/ws?${urlParams.toString()}`;
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
        if (!publicRoomData.value) return console.error("no room info");

        const data = JSON.parse(event.data) as GeneralServerMessage;

        switch (data.type) {
            case "room_data": {
                publicRoomData.value = data.payload.roomData;
                roomOptions.value.ft = publicRoomData.value.ft;
                roomOptions.value.startMargin = publicRoomData.value.startMargin;
                roomOptions.value.endMargin = publicRoomData.value.endMargin;
                roomOptions.value.pps = publicRoomData.value.pps;
                roomOptions.value.initialMultiplier = publicRoomData.value.initialMultiplier;
                roomOptions.value.finalMultiplier = publicRoomData.value.finalMultiplier;
                roomOptions.value.private = publicRoomData.value.private;
                break;
            }
            case "round_started": {
                publicRoomData.value = data.payload.roomData;

                for (const player of publicRoomData.value.players) {
                    const playerGraphics = allPlayerGraphics.value.find(
                        (p) => p.id === player.sessionId
                    ) as PlayerGraphics | undefined;

                    if (!playerGraphics)
                        return console.error("player graphics not found");

                    renderState(playerGraphics, player.gameState);
                    renderDamage(playerGraphics, player.gameState);
                }

                setTimeout(() => {
                    if (publicRoomData.value === null) return console.error("no room info");

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
                publicRoomData.value = data.payload.roomData;
                break;
            }
            case "player_joined": {
                const { playerData } = data.payload;
                publicRoomData.value.players.push(playerData);

                allPlayerGraphics.value.push({
                    id: playerData.sessionId,
                    info: playerData.info,
                    boardContainer: null,
                    backgroundContainer: null,
                    foregroundContainer: null,
                    heldContainer: null,
                    queueContainer: null,
                    damageBar: null,
                    spikeEffect: null,
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

                const ppsDelay = 1000 / publicRoomData.value.pps;
                let commandDelay = ppsDelay / (commands.length + 1);

                let timestamp = Date.now();
                for (const event of events) {
                    if (event.type === "queue_added") {
                        prevGameState.queue.push(event.payload.piece);
                    };
                };

                const renderQueue = renderQueueMap.get(sessionId) ?? [];

                if (commands.length < 100) {
                    renderQueue.push({ timestamp, type: "piece_spawned", sessionId, gameState: prevGameState });
                    timestamp += commandDelay;
    
                    for (const command of commands) {
                        renderQueue.push({ timestamp, type: "command", sessionId, command });
                        timestamp += commandDelay;
                    };
                }

                renderQueue.push({ timestamp, type: "piece_placed", sessionId, gameState: gameState, events });

                renderQueueMap.set(sessionId, renderQueue);
                break;
            }

            case "player_damage_received": {
                // if (!publicRoomData.value) return console.error("no room info");

                // const { sessionId, gameState } = data.payload;
                // const player = publicRoomData.value.players.find(
                //     (p) => p.sessionId === sessionId
                // );
                // if (!player) return console.error("player not found");
                // player.gameState = gameState;

                // const playerGraphics = allPlayerGraphics.value.find(
                //     (p) => p.id === sessionId
                // ) as PlayerGraphics | undefined;
                // if (!playerGraphics)
                //     return console.error("player graphics not found");

                // renderDamage(playerGraphics, player.gameState);
                break;
            }
            case "settings_changed": {
                const { roomData } = data.payload;
                publicRoomData.value = roomData;
                roomOptions.value.ft = roomData.ft;
                roomOptions.value.pps = roomData.pps;
                roomOptions.value.initialMultiplier = roomData.initialMultiplier;
                roomOptions.value.finalMultiplier = roomData.finalMultiplier;
                roomOptions.value.startMargin = roomData.startMargin;
                roomOptions.value.endMargin = roomData.endMargin;
                roomOptions.value.private = roomData.private;
                break;
            }
            case "player_banned": {
                publicRoomData.value.banned.push(data.payload.botInfo);
                break;
            }
            case "player_unbanned": {
                publicRoomData.value.banned = publicRoomData.value.banned.filter(
                    (banned) => banned.id !== data.payload.botInfo.id
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

function closeMenu() {
    if (!gameMenu.value) return;
    gameMenu.value.close();
    showMasterKey.value = false;
}

function openMenu() {
    if (!gameMenu.value) return;

    gameMenu.value.showModal();
}

onKeyStroke("Escape", (e) => {
    if (!gameMenu.value) return;

    e.preventDefault();

    if (gameMenu.value.open) {
        closeMenu()
    } else {
        openMenu()
    }
}, { dedupe: true });

const roomOptions = ref({
    ft: 5,
    private: false,
    pps: 2.5,
    initialMultiplier: 1,
    finalMultiplier: 10,
    startMargin: 90,
    endMargin: 600,
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
    if (ft > 999) {
        ft = 999;
    }

    await $fetch('/api/room/edit', {
        method: "POST",
        body: {
            roomId,
            private: roomOptions.value.private,
            ft,
            pps: roomOptions.value.pps,
            initialMultiplier: roomOptions.value.initialMultiplier,
            finalMultiplier: roomOptions.value.finalMultiplier,
            startMargin: roomOptions.value.startMargin,
            endMargin: roomOptions.value.endMargin,
        }
    });
};

const settingsChanged = computed(() => {
    if (publicRoomData.value === null) return console.error("no room info");

    if (publicRoomData.value.private !== roomOptions.value.private) {
        return true;
    };
    if (publicRoomData.value.ft !== roomOptions.value.ft) {
        return true;
    };
    if (publicRoomData.value.pps !== roomOptions.value.pps) {
        return true;
    };
    if (publicRoomData.value.initialMultiplier !== roomOptions.value.initialMultiplier) {
        return true;
    };
    if (publicRoomData.value.finalMultiplier !== roomOptions.value.finalMultiplier) {
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
const displayTime = ref<number>(0);
const multiplier = ref(1);

onMounted(() => {
    const interval = setInterval(() => {
        if (publicRoomData.value === null) return;

        const { initialMultiplier, finalMultiplier, startMargin, endMargin } = publicRoomData.value;
        if (!publicRoomData.value.startedAt) {
            countdownTime.value = null;
            displayTime.value = 0;
            multiplier.value = publicRoomData.value.initialMultiplier;
            return;
        }

        const now = Date.now();
        const timePassed = (publicRoomData.value.endedAt ?? now) - publicRoomData.value.startedAt;
        const timeLeft = publicRoomData.value.startedAt - now;
        multiplier.value = calculateMultiplier(timePassed, initialMultiplier, finalMultiplier, startMargin, endMargin);

        if (timePassed > 0) {
            countdownTime.value = null;
            displayTime.value = Math.floor((timePassed) / 1000);
        } else {
            displayTime.value = 0;
            countdownTime.value = Math.ceil((timeLeft) / 1000);
        }
    }, 1000 / 60);

    return () => {
        clearInterval(interval);
    }
});

const dpi = window.devicePixelRatio;
const resizeTarget = window;
</script>

<template>
    <div class="w-full h-full" v-if="publicRoomData">
        <div class="absolute w-full h-full overflow-hidden -z-10">
            <Application :backgroundAlpha="0" ref="pixiInst" :antialias="true" :resolution="dpi"
                :resize-to="resizeTarget">
                <tiling-sprite texture="/images/tiling.png" :width="width" :height="height" :tile-scale="8 * scale"
                    :tilePosition="[
                        backgroundOffset * scale,
                        backgroundOffset * scale,
                    ]" />
                <container :x="width / 2" :y="height / 2" :scale="scale" ref="scaledContainer">
                    <container :y="-425">
                        <!-- <container v-if="allPlayerGraphics[0]" :ref="(container: PIXI.Container) => {
                            container.removeChildren();

                            const avatar = renderAvatar(allPlayerGraphics[0].info.avatar);
                            avatar.scale.set(0.39);

                            avatar.y -= avatar.height / 2;
                            avatar.x -= avatar.width;
                            avatar.x -= 650 / 2 + 10;

                            container.addChild(avatar);
                            }" />
                        <container v-if="allPlayerGraphics[1]" :ref="(container: PIXI.Container) => {
                            container.removeChildren();

                            const avatar = renderAvatar(allPlayerGraphics[1].info.avatar);
                            avatar.scale.set(0.39);

                            avatar.y -= avatar.height / 2;
                            avatar.x += 650 / 2 + 10;

                            container.addChild(avatar);
                            }" /> -->
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
                                {{ displayTime }} -
                                {{ publicRoomData.pps.toFixed(1) }} PPS -
                                {{ multiplier.toFixed(1) }}x
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
                                <!-- Background Container -->
                                <container :ref="(el) => board.backgroundContainer = el as unknown as PIXI.Container" />
                                <!-- Board Container -->
                                <container :ref="(el) => board.boardContainer = el as unknown as PIXI.Container"
                                    :sortable-children="true" />
                                <!-- Foreground Container -->
                                <container :ref="(el) => board.foregroundContainer = el as unknown as PIXI.Container" />
                                <!-- Damage Bar Graphic -->
                                <graphics :ref="(el) => board.damageBar = el as unknown as PIXI.Graphics" :z-index="2" />
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
                            <!-- Bot Name -->
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
                                    {{ board.info.name }}
                                </text>
                            </container>
                            <!-- Bot Creator -->
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
                                    {{ getBotCreator(board.info) }}
                                </text>
                            </container>

                            <!-- Bot Avatar -->
                            <container :y="21 * CELL_SIZE + 12" :ref="(container: PIXI.Container) => {
                                if (container === null) return;

                                container.removeChildren();

                                const avatar = renderAvatar(board.info.avatar);
                                avatar.scale.set(0.3075);

                                avatar.x += 100;
                                avatar.x -= avatar.width / 2;
                                avatar.x += 5 * CELL_SIZE + 20;
                                // if (index === 0) {
                                //     // avatar.x -= avatar.width;
                                //     // avatar.x -= 5 * CELL_SIZE + 20;
                                //     avatar.x += 100;
                                //     avatar.x -= avatar.width / 2;
                                //     avatar.x += 5 * CELL_SIZE + 20;
                                // } else if (index === 1) {
                                //     avatar.x += 5 * CELL_SIZE + 20;
                                // }

                                container.addChild(avatar);
                            }" />
                            <!-- Stats -->
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
        <dialog ref="gameMenu" v-if="publicRoomData" class="bg-black/40 backdrop:bg-black/20 backdrop:backdrop-blur-sm">
            <div class="p-6 flex flex-col gap-4 w-[520px] text-white">
                <button class="absolute top-6 right-6 px-2" @click="closeMenu">X</button>
                <div class="text-white text-center text-lg">
                    Press ESC to toggle menu
                </div>
                <template v-if="publicRoomData.host.id === profile?.id">
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
                                <button class="h-full w-full absolute bg-stone-950/80 z-10"
                                    @click="showMasterKey = true" v-if="!showMasterKey">
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
                            <label>FT (max: 999):</label>
                            <input type="text" v-model.number="roomOptions.ft"
                                class="w-12 px-1 bg-white/20 text-right" />
                        </div>
                        <div class="flex justify-between items-center">
                            <label>PPS (max: 30):</label>
                            <input type="text" v-model.number="roomOptions.pps"
                                class="w-12 px-1 bg-white/20 text-right" />
                        </div>
                        <div class="flex justify-between items-center">
                            <label>Initial Multiplier (0x - 20x):</label>
                            <input type="text" v-model.number="roomOptions.initialMultiplier"
                                class="w-12 px-1 bg-white/20 text-right" />
                        </div>
                        <div class="flex justify-between items-center">
                            <label>Final Multiplier (0x - 20x):</label>
                            <input type="text" v-model.number="roomOptions.finalMultiplier"
                                class="w-12 px-1 bg-white/20 text-right" />
                        </div>
                        <div class="flex justify-between items-center">
                            <label>Start Margin (secs):</label>
                            <input type="text" v-model.number="roomOptions.startMargin"
                                class="w-12 px-1 bg-white/20 text-right" />
                        </div>
                        <div class="flex justify-between items-center">
                            <label>End Margin (secs):</label>
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
                        <ul v-else class="flex flex-col gap-2 text-sm list-none p-0">
                            <li class="flex justify-between" v-for="player in publicRoomData.players">
                                <div class="flex gap-2">
                                    <NuxtLink :href="`/bot/${player.info.id}`" target="_blank" class="text-btn">{{
                                        player.info.name }}</NuxtLink>
                                    <span class="opacity-50">
                                        {{ getBotCreator(player.info) }}
                                    </span>
                                </div>
                                <div class="flex gap-2">
                                    <button class="underline" @click="kickPlayer(player.sessionId)">
                                        Kick
                                    </button>
                                    <button class="underline" @click="banPlayer(player.info.id)">
                                        Ban
                                    </button>
                                </div>
                            </li>
                            <li class="flex justify-between" v-for=" player in publicRoomData.banned">
                                <div class="text-red-400">
                                    {{ player.name }}
                                    <span class="opacity-50">
                                        {{ getBotCreator(player) }}
                                    </span>
                                </div>
                                <div class="flex gap-2">
                                    <button class="underline" @click="unbanPlayer(player.id)">
                                        Unban
                                    </button>
                                </div>
                            </li>
                        </ul>
                    </div>
                </template>
                <template v-else>
                    <div class="p-4 bg-white/10 flex flex-col gap-2 text-sm">
                        <div class="flex justify-between items-center">
                            <div>FT (max: 999):</div>
                            <div>{{ publicRoomData.ft }}</div>
                        </div>
                        <div class="flex justify-between items-center">
                            <label>PPS (max: 30):</label>
                            <div>{{ publicRoomData.pps }}</div>
                        </div>
                        <div class="flex justify-between items-center">
                            <label>Initial Multiplier (0x - 20x):</label>
                            <div>{{ publicRoomData.initialMultiplier }}</div>
                        </div>
                        <div class="flex justify-between items-center">
                            <label>Final Multiplier (0x - 20x):</label>
                            <div>{{ publicRoomData.finalMultiplier }}</div>
                        </div>
                        <div class="flex justify-between items-center">
                            <label>Start Margin (secs):</label>
                            <div>{{ publicRoomData.startMargin }}</div>
                        </div>
                        <div class="flex justify-between items-center">
                            <label>End Margin (secs):</label>
                            <div>{{ publicRoomData.endMargin }}</div>
                        </div>
                        <div class="flex justify-between items-center">
                            <label>Private:</label>
                            <div>{{ publicRoomData.private }}</div>
                        </div>
                    </div>
                    <div class="p-4 bg-white/10 flex flex-col gap-2">
                        <h2 class="text-lg">Players</h2>
                        <div v-if="publicRoomData.players.length === 0 && publicRoomData.banned.length === 0"
                            class="italic opacity-50">
                            No Players Joined
                        </div>
                        <ul v-else class="flex flex-col gap-2 text-sm">
                            <li class="w-full flex justify-start" v-for="player in publicRoomData.players ">
                                <div>
                                    {{ player.info.name }}
                                    <span class="opacity-50">
                                        {{ getBotCreator(player.info) }}
                                    </span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </template>
                <div class="flex justify-evenly">
                    <NuxtLink class="underline text-lg" to="/rooms">
                        Leave Game
                    </NuxtLink>
                    <template v-if="publicRoomData.host.id === profile?.id">
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
                    </template>
                </div>
            </div>
        </dialog>
    </div>
    <div class="w-full h-full flex flex-col items-center p-8 gap-4" v-else>
        <h1 class="text-2xl">404 Room Not Found</h1>
        <NuxtLink class="text-btn text-xl" :href="`/rooms`">Return to Rooms</NuxtLink>
    </div>
</template>

<style scoped>
dialog {
    outline: none;
}
</style>