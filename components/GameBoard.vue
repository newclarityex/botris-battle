<script setup lang="ts">
import * as PIXI from 'pixi.js';
import { getPieceMatrix, type PublicGameState } from 'libtris';

const props = defineProps<{
    gameState: PublicGameState | null;
}>();


const canvas = ref<HTMLCanvasElement | null>(null);

const colors = {
    "I": "#00FFFF",
    "J": "#0000FF",
    "L": "#FFA500",
    "O": "#FFFF00",
    "S": "#00FF00",
    "T": "#800080",
    "Z": "#FF0000",
    "G": "#888888",
}

const cellSize = 32;
const boardHeight = 20;

function render() {
    if (!canvas.value) return;

    const ctx = canvas.value.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);

    if (!props.gameState) return;

    const { board, current } = props.gameState;
    for (let y = 0; y < board.length; y++) {
        const row = board[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            ctx.fillStyle = colors[cell];
            ctx.fillRect(x * cellSize, (boardHeight - y - 1) * cellSize, cellSize, cellSize);
        }
    }

    const pieceMatrix = getPieceMatrix(current.piece, current.rotation);
    for (let y = 0; y < pieceMatrix.length; y++) {
        const row = pieceMatrix[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            ctx.fillStyle = colors[current.piece];
            ctx.fillRect((current.x + x) * cellSize, (y + boardHeight - current.y - 1) * cellSize, cellSize, cellSize);
        }
    }
}

onMounted(render);

watch(() => props.gameState, render);
</script>

<template>
    <div>
        <canvas ref="canvas" width="320" height="640"></canvas>
    </div>
</template>