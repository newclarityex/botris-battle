<script setup lang="ts">
import { renderBlock, CELL_SIZE } from '@/utils/graphics'
import * as PIXI from 'pixi.js'
import { AVATAR_SIZE } from '@/utils/avatar';

type Piece = 'I' | 'O' | 'J' | 'L' | 'S' | 'Z' | 'T' | 'G';

type Block = Piece | null

const props = defineProps<{
    board: Block[][]
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const pixiApp = ref<PIXI.Application | null>(null)
onMounted(() => {
    if (!canvas.value) return

    pixiApp.value = new PIXI.Application({
        width: CELL_SIZE * AVATAR_SIZE,
        height: CELL_SIZE * AVATAR_SIZE,
        backgroundColor: 0x000000,
        backgroundAlpha: 0.25,
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
}

watchEffect(() => {
    renderBoard(props.board)
})
</script>

<template>
    <canvas class="editor-avatar" ref="canvas" :width="CELL_SIZE * AVATAR_SIZE" :height="CELL_SIZE * AVATAR_SIZE"></canvas>
</template>