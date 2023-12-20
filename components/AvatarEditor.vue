<script setup lang="ts">
import { generateAvatar } from '@/utils/avatar'
import { renderBlock } from '@/utils/graphics'
import * as PIXI from 'pixi.js'
import { CELL_SIZE } from '@/utils/graphics'

type Piece = 'I' | 'O' | 'J' | 'L' | 'S' | 'Z' | 'T';
const CELL_NUMBER: number = 8;

type Block = Piece | null

const props = defineProps<{
    modelValue: Block[][]
}>()
const emit = defineEmits<{ (event: 'update:modelValue', newBoard: Block[][]): void }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const pixiApp = ref<PIXI.Application | null>(null)
onMounted(() => {
    if (!canvas.value) return

    pixiApp.value = new PIXI.Application({
        width: CELL_SIZE * CELL_NUMBER,
        height: CELL_SIZE * CELL_NUMBER,
        backgroundColor: 0x000000,
        view: canvas.value,
    });
})

async function renderBoard(board: Block[][]) {
    if (!pixiApp.value) return

    pixiApp.value.stage.removeChildren()

    // const ctx = canvas.value?.getContext("2d");
    // if (!ctx) return
    // ctx.rect(0, 0, CELL_SIZE * CELL_NUMBER, CELL_SIZE * CELL_NUMBER);
    // ctx.fill();

    for (let y = 0; y < CELL_NUMBER; y++) {
        for (let x = 0; x < CELL_NUMBER; x++) {
            const block = board[y][x]
            if (block === null) continue

            const graphic = renderBlock(board, x, y);
            if (!graphic) continue

            graphic.x = x * CELL_SIZE;
            graphic.y = y * CELL_SIZE;
            pixiApp.value.stage.addChild(graphic);
            // ctx.drawImage(image.value, (piecesColor[block] * 32), 0, 32, 32, CELL_SIZE * x, CELL_SIZE * y, CELL_SIZE, CELL_SIZE)
        }
    }

    if (!hoveredCell.value) return
    const hoverGraphic = new PIXI.Graphics();
    hoverGraphic.lineStyle({ width: 2, color: 0xffffff, alignment: 0 });
    hoverGraphic.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
    hoverGraphic.x = hoveredCell.value.x * CELL_SIZE;
    hoverGraphic.y = hoveredCell.value.y * CELL_SIZE;
    pixiApp.value.stage.addChild(hoverGraphic);
    // ctx.drawImage(image.value, (piecesColor[selectedPiece.value] * 32), 0, 32, 32, CELL_SIZE * hoveredCell.value.x, CELL_SIZE * hoveredCell.value.y, CELL_SIZE, CELL_SIZE)
}


const selectedPiece = ref<Piece>('Z')
function setColor(color: Piece) {
    selectedPiece.value = color
}

const brushState = ref<'erase' | 'fill'>('fill')

function handleMouseDown(event: MouseEvent) {
    const x = Math.floor(event.offsetX / CELL_SIZE)
    const y = Math.floor(event.offsetY / CELL_SIZE)
    const selectedCell = props.modelValue[y][x]
    brushState.value = selectedCell ? 'erase' : 'fill'
    hoveredCell.value = null
    drawCell(x, y)
}

function handleMouseMove(event: MouseEvent) {
    const x = Math.floor(event.offsetX / CELL_SIZE)
    const y = Math.floor(event.offsetY / CELL_SIZE)
    if (event.buttons === 0) {
        hoveredCell.value = { x, y }
        renderBoard(props.modelValue)
        return
    }
    drawCell(x, y)
}

function handleMouseLeave() {
    hoveredCell.value = null
    renderBoard(props.modelValue)
}

const hoveredCell = ref<null | { x: number, y: number }>(null)

function drawCell(x: number, y: number) {
    if (brushState.value === 'erase') {
        props.modelValue[y][x] = null
    } else {
        props.modelValue[y][x] = selectedPiece.value
    }
    emit('update:modelValue', props.modelValue)
}

function newBoard() {
    const newAvatar = generateAvatar()
    emit('update:modelValue', newAvatar)
}

watchEffect(() => {
    renderBoard(props.modelValue)
})

const btnColors = {
    'Z': 'red',
    'L': 'orange',
    'O': 'yellow',
    'S': 'green',
    'I': 'lightBlue',
    'J': 'darkBlue',
    'T': 'purple',
}

</script>

<template>
    <div>
        <div style="display: flex; flex-direction: row;">
            <div v-for="btnColor, piece in btnColors">
                <!-- ':' is the same as 'v-bind:' -->
                <button class="color-btn" @click='setColor(piece)' :style="{ backgroundColor: btnColor }"
                    :class="{ 'color-selected': piece === selectedPiece }"></button>
            </div>
        </div>


        <button @click='newBoard()' type="button">new board</button>
        <!-- ':' is the same as 'v-bind:' -->
        <canvas class="editor-avatar" @mousemove="handleMouseMove" @mousedown='handleMouseDown'
            @mouseleave="handleMouseLeave" ref="canvas" :width="CELL_SIZE * CELL_NUMBER"
            :height="CELL_SIZE * CELL_NUMBER"></canvas>
    </div>
</template>

<style scoped>
.color-btn {
    height: 16px;
    width: 16px;
    cursor: pointer;
}

.color-selected {
    border-color: cyan;
}

.editor-avatar {
    border: 1px solid #000000;
}

.editor-avatar:hover {
    cursor: pointer;
}
</style>