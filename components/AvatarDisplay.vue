<script setup lang="ts">
import { renderBlock } from '@/utils/graphics'
import * as PIXI from 'pixi.js'
import { CELL_SIZE } from '@/utils/graphics'

type Piece = 'I' | 'O' | 'J' | 'L' | 'S' | 'Z' | 'T';
const CELL_NUMBER: number = 8;

type Block = Piece | null

const props = defineProps<{
    board: Block[][]
}>()

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

    for (let y = 0; y < CELL_NUMBER; y++) {
        for (let x = 0; x < CELL_NUMBER; x++) {
            const block = board[y][x]
            if (block === null) continue

            const graphic = renderBlock(board, x, y);
            if (!graphic) continue

            graphic.x = x * CELL_SIZE;
            graphic.y = y * CELL_SIZE;
            pixiApp.value.stage.addChild(graphic);
        }
    }
}

watchEffect(() => {
    renderBoard(props.board)
})
</script>

<template>
    <canvas class="editor-avatar" ref="canvas" :width="CELL_SIZE * CELL_NUMBER" :height="CELL_SIZE * CELL_NUMBER"></canvas>
</template>