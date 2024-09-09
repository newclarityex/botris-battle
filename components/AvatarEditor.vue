<script setup lang="ts">
import { AVATAR_SIZE, type Avatar } from '@/utils/avatar'
import { renderBlock, PIECE_COLORS, CELL_SIZE } from '@/utils/graphics'
import * as PIXI from 'pixi.js'

type Color = 'I' | 'O' | 'J' | 'L' | 'S' | 'Z' | 'T' | 'G' | null;

const model = defineModel<Avatar>({ required: true });

const canvas = ref<HTMLCanvasElement | null>(null)
const pixiApp = ref<PIXI.Application | null>(null)
onMounted(() => {
    if (!canvas.value) return

    pixiApp.value = new PIXI.Application({
        width: CELL_SIZE * AVATAR_SIZE,
        height: CELL_SIZE * AVATAR_SIZE,
        backgroundColor: 0x00000040,
        view: canvas.value,
    });
})

async function renderBoard(board: Block[][]) {
    if (!pixiApp.value) return

    pixiApp.value.stage.removeChildren()

    for (let y = 0; y < AVATAR_SIZE; y++) {
        for (let x = 0; x < AVATAR_SIZE; x++) {
            const block = board[y][x]
            if (block === null) continue

            const graphic = renderBlock(board, x, y);
            if (!graphic) continue

            graphic.x = x * CELL_SIZE;
            graphic.y = y * CELL_SIZE;
            pixiApp.value.stage.addChild(graphic);
        }
    }

    if (!hoveredCell.value) return
    const hoverGraphic = new PIXI.Graphics();
    hoverGraphic.lineStyle({ width: 2, color: 0xffffff, alignment: 0 });
    hoverGraphic.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
    hoverGraphic.x = hoveredCell.value.x * CELL_SIZE;
    hoverGraphic.y = hoveredCell.value.y * CELL_SIZE;
    pixiApp.value.stage.addChild(hoverGraphic);
}


const selectedPiece = ref<Color>(null)
function setColor(color: Color) {
    selectedPiece.value = color;
}

function handleMouseDown(event: MouseEvent) {
    const x = Math.floor(event.offsetX / CELL_SIZE)
    const y = Math.floor(event.offsetY / CELL_SIZE)
    // hoveredCell.value = null
    model.value[y][x] = selectedPiece.value
}

function handleMouseMove(event: MouseEvent) {
    const x = Math.floor(event.offsetX / CELL_SIZE)
    const y = Math.floor(event.offsetY / CELL_SIZE)
    hoveredCell.value = { x, y };
    if (event.buttons === 0) {
        renderBoard(model.value)
        return
    }
    if (x >= 0 && y >= 0 && x < AVATAR_SIZE && y < AVATAR_SIZE) {
        model.value[y][x] = selectedPiece.value
    }
}

function handleMouseLeave() {
    hoveredCell.value = null
    renderBoard(model.value)
}

const hoveredCell = ref<null | { x: number, y: number }>(null)

function randomizeAvatar() {
    model.value = generateRandomAvatar();
}

function clearAvatar() {
    model.value = generateEmptyAvatar();
}

watchEffect(() => {
    renderBoard(model.value)
})

const colors = ['I', 'O', 'J', 'L', 'S', 'Z', 'T', 'G'] as const;
</script>

<template>
    <div class="flex flex-col items-center gap-3 p-4 bg-white/10">
        <div class="flex gap-4">
            <button @click='randomizeAvatar()' type="button" class="text-btn">Randomize</button>
            <button @click='clearAvatar()' type="button" class="text-btn">Clear</button>
        </div>
        <canvas class="editor-avatar" @mousemove="handleMouseMove" @mousedown='handleMouseDown'
        @mouseleave="handleMouseLeave" ref="canvas" :width="CELL_SIZE * AVATAR_SIZE"
        :height="CELL_SIZE * AVATAR_SIZE"></canvas>
        <div class="flex gap-1">
                <button class="color-btn" @click='setColor(null)'
                    type="button"
                    :style="{ backgroundColor: 'black', borderColor: 'black', borderWidth: '4px', borderStyle: 'solid' }"
                    :class="{ 'color-selected': selectedPiece === null }">
                    <div class="w-full h-full" :style="{ backgroundColor: 'black', opacity: 0.5 }" />
                </button>
            <div v-for="color in colors">
                <button class="color-btn" @click='setColor(color)'
                    type="button"
                    :style="{ backgroundColor: 'black', borderColor: PIECE_COLORS[color], borderWidth: '4px', borderStyle: 'solid' }"
                    :class="{ 'color-selected': selectedPiece === color }">
                    <div class="w-full h-full" :style="{ backgroundColor: PIECE_COLORS[color], opacity: 0.5 }" />
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.color-btn {
    height: 32px;
    width: 32px;
    cursor: pointer;
}

.color-selected {
    outline: white 2px solid;
}

.editor-avatar:hover {
    cursor: pointer;
}
</style>