<script setup lang="ts">
import * as PIXI from 'pixi.js';
import { getPieceMatrix, type PublicGameState } from 'libtris';

const props = defineProps<{
    gameState: PublicGameState | null;
    pixiApp: PIXI.Application | null;
    index: number;
    totalPlayers: number;
}>();


const container = ref<PIXI.Container | null>(null);
const boardContainer = ref<PIXI.Container | null>(null);
const queueContainer = ref<PIXI.Container | null>(null);
const heldContainer = ref<PIXI.Container | null>(null);

const cellSize = 32;
const boardHeight = 20;
const borderSize = 4;

const CONTAINER_OFFSET = {
    x: 100,
    y: 280,
};

const HELD_DIMENSIONS = {
    width: 200,
    height: 200,
    x: 0,
    y: 0,
};

const BOARD_DIMENSIONS = {
    x: HELD_DIMENSIONS.width + 20,
    y: 0,
    width: 10 * cellSize,
    height: 21 * cellSize,
};

const QUEUE_DIMENSIONS = {
    x: BOARD_DIMENSIONS.x + BOARD_DIMENSIONS.width + 20,
    y: 0,
    width: 200,
    height: BOARD_DIMENSIONS.height,
};

const boardGraphicsContainer = ref<PIXI.Container | null>(null);
const queueGraphicsContainer = ref<PIXI.Container | null>(null);
const heldGraphicsContainer = ref<PIXI.Container | null>(null);
watchEffect(() => {
    if (!props.pixiApp) return;

    if (container.value) {
        props.pixiApp.stage.removeChild(container.value as PIXI.Container);
    }

    container.value = new PIXI.Container();

    boardContainer.value = new PIXI.Container();
    boardContainer.value.x = BOARD_DIMENSIONS.x;
    boardContainer.value.y = BOARD_DIMENSIONS.y;
    boardGraphicsContainer.value = new PIXI.Container();
    boardGraphicsContainer.value.y = 10;
    boardContainer.value.addChild(boardGraphicsContainer.value as PIXI.Container);

    queueContainer.value = new PIXI.Container();
    queueContainer.value.x = QUEUE_DIMENSIONS.x;
    queueContainer.value.y = QUEUE_DIMENSIONS.y;
    queueGraphicsContainer.value = new PIXI.Container();
    queueContainer.value.addChild(queueGraphicsContainer.value as PIXI.Container);

    heldContainer.value = new PIXI.Container();
    heldContainer.value.x = HELD_DIMENSIONS.x;
    heldContainer.value.y = HELD_DIMENSIONS.y;
    heldGraphicsContainer.value = new PIXI.Container();
    heldContainer.value.addChild(heldGraphicsContainer.value as PIXI.Container);

    container.value.addChild(boardContainer.value as PIXI.Container);
    container.value.addChild(queueContainer.value as PIXI.Container);
    container.value.addChild(heldContainer.value as PIXI.Container);

    // Draw board background
    const boardBackground = new PIXI.Graphics();
    boardBackground.beginFill(0x000000, 0.5);
    boardBackground.drawRect(0, 0, BOARD_DIMENSIONS.width, BOARD_DIMENSIONS.height);
    boardBackground.endFill();
    boardContainer.value.addChild(boardBackground);

    // Draw held
    const heldBackground = new PIXI.Graphics();
    heldBackground.beginFill(0x000000, 0.25);
    heldBackground.drawRect(0, 0, HELD_DIMENSIONS.width, HELD_DIMENSIONS.height);
    heldBackground.endFill();
    heldContainer.value.addChild(heldBackground);

    // Draw queue
    const queueBackground = new PIXI.Graphics();
    queueBackground.beginFill(0x000000, 0.25);
    queueBackground.drawRect(0, 0, QUEUE_DIMENSIONS.width, QUEUE_DIMENSIONS.height);
    queueBackground.endFill();
    queueContainer.value.addChild(queueBackground);

    if (props.index === 0) {
        container.value.x = CONTAINER_OFFSET.x;
        container.value.y = CONTAINER_OFFSET.y;
    } else if (props.index === 1) {
        container.value.x = props.pixiApp.screen.width - CONTAINER_OFFSET.x - container.value.width;
        container.value.y = CONTAINER_OFFSET.y;
    }

    props.pixiApp.stage.addChild(container.value as PIXI.Container);

    render();
});

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

type Block = "I" | "J" | "L" | "O" | "S" | "T" | "Z" | "G" | null;

function renderBlock(matrix: Block[][], x: number, y: number) {
    const row = matrix[y];
    const cell = matrix[y][x];
    if (cell === null) return null;

    const cellGraphics = new PIXI.Graphics();
    cellGraphics.beginFill(colors[cell], 0.5);
    cellGraphics.drawRect(0, 0, cellSize, cellSize);
    cellGraphics.endFill();

    cellGraphics.beginFill(colors[cell]);
    const topCell = y - 1 >= 0 ? matrix[y - 1][x] : null;
    const bottomCell = y + 1 < matrix.length ? matrix[y + 1][x] : null;
    const leftCell = x - 1 >= 0 ? matrix[y][x - 1] : null;
    const rightCell = x + 1 < row.length ? matrix[y][x + 1] : null;
    if (topCell !== cell) {
        cellGraphics.drawRect(0, 0, cellSize, borderSize);
    }
    if (bottomCell !== cell) {
        cellGraphics.drawRect(0, cellSize - borderSize, cellSize, borderSize);
    }
    if (leftCell !== cell) {
        cellGraphics.drawRect(0, 0, borderSize, cellSize);
    }
    if (rightCell !== cell) {
        cellGraphics.drawRect(cellSize - borderSize, 0, borderSize, cellSize);
    }

    const topLeftCell = y - 1 >= 0 && x - 1 >= 0 ? matrix[y - 1][x - 1] : null;
    const topRightCell = y - 1 >= 0 && x + 1 < row.length ? matrix[y - 1][x + 1] : null;
    const bottomLeftCell = y + 1 < matrix.length && x - 1 >= 0 ? matrix[y + 1][x - 1] : null;
    const bottomRightCell = y + 1 < matrix.length && x + 1 < row.length ? matrix[y + 1][x + 1] : null;

    if (topCell && leftCell && topLeftCell !== cell) {
        cellGraphics.drawRect(0, 0, borderSize, borderSize);
    }

    if (topCell && rightCell && topRightCell !== cell) {
        cellGraphics.drawRect(cellSize - borderSize, 0, borderSize, borderSize);
    }

    if (bottomCell && leftCell && bottomLeftCell !== cell) {
        cellGraphics.drawRect(0, cellSize - borderSize, borderSize, borderSize);
    }

    if (bottomCell && rightCell && bottomRightCell !== cell) {
        cellGraphics.drawRect(cellSize - borderSize, cellSize - borderSize, borderSize, borderSize);
    }

    return cellGraphics;
}

function render() {
    if (!boardGraphicsContainer.value || !queueGraphicsContainer.value || !heldGraphicsContainer.value) return;
    if (!props.gameState) return;

    const { board, current } = props.gameState;
    const reversedBoard = board.toReversed();

    boardGraphicsContainer.value.removeChildren();
    for (let y = 0; y < reversedBoard.length; y++) {
        const row = reversedBoard[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            const graphics = renderBlock(reversedBoard, x, y);

            if (graphics) {
                graphics.x = x * cellSize;
                graphics.y = (y + (boardHeight - board.length)) * cellSize;
                boardGraphicsContainer.value.addChild(graphics);
            }
        }
    }

    const pieceMatrix = getPieceMatrix(current.piece, current.rotation);
    for (let y = 0; y < pieceMatrix.length; y++) {
        const row = pieceMatrix[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            const graphics = renderBlock(pieceMatrix, x, y);

            if (graphics) {
                graphics.x = (current.x + x) * cellSize;
                graphics.y = (y + boardHeight - current.y - 1) * cellSize;
                boardGraphicsContainer.value.addChild(graphics);
            }
        }
    }

    queueGraphicsContainer.value.removeChildren();

    for (const [index, piece] of props.gameState.queue.entries()) {
        const pieceMatrix = getPieceMatrix(piece, 0);
        const pieceContainer = new PIXI.Container();

        for (let y = 0; y < pieceMatrix.length; y++) {
            const row = pieceMatrix[y];
            for (let x = 0; x < row.length; x++) {
                const cell = row[x];
                if (cell === null) continue;

                const graphics = renderBlock(pieceMatrix, x, y);

                if (graphics) {
                    graphics.x = x * cellSize;
                    graphics.y = y * cellSize;
                    pieceContainer.addChild(graphics);
                }
            }
        }

        pieceContainer.y = index * 4 * cellSize;
        pieceContainer.x = queueGraphicsContainer.value.width / 2;
        pieceContainer.pivot = {
            x: 0.5,
            y: 0.5,
        };
        queueGraphicsContainer.value.addChild(pieceContainer);
    }
}

// function render() {
//     if (!canvas.value) return;

//     const ctx = canvas.value.getContext('2d');
//     if (!ctx) return;

//     ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

//     ctx.fillStyle = 'black';
//     ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);

//     if (!props.gameState) return;

//     const { board, current } = props.gameState;
//     for (let y = 0; y < board.length; y++) {
//         const row = board[y];
//         for (let x = 0; x < row.length; x++) {
//             const cell = row[x];
//             if (cell === null) continue;

//             ctx.fillStyle = colors[cell];
//             ctx.fillRect(x * cellSize, (boardHeight - y - 1) * cellSize, cellSize, cellSize);
//         }
//     }

//     const pieceMatrix = getPieceMatrix(current.piece, current.rotation);
//     for (let y = 0; y < pieceMatrix.length; y++) {
//         const row = pieceMatrix[y];
//         for (let x = 0; x < row.length; x++) {
//             const cell = row[x];
//             if (cell === null) continue;

//             ctx.fillStyle = colors[current.piece];
//             ctx.fillRect((current.x + x) * cellSize, (y + boardHeight - current.y - 1) * cellSize, cellSize, cellSize);
//         }
//     }
// }


watch(() => props.gameState, render);
</script>

<template></template>