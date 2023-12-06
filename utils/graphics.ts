import { getPieceMatrix, type PublicGameState } from 'libtris';
import * as PIXI from 'pixi.js';
import type { PieceData } from 'libtris'

export const CELL_SIZE = 32;
const BOARD_HEIGHT = 21;
const PIECE_BORDER_SIZE = 4;

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
    width: 10 * CELL_SIZE,
    height: 21 * CELL_SIZE,
};

const QUEUE_DIMENSIONS = {
    x: BOARD_DIMENSIONS.x + BOARD_DIMENSIONS.width + 20,
    y: 0,
    width: 200,
    height: BOARD_DIMENSIONS.height,
};


export type PlayerGraphics = {
    mainContainer: PIXI.Container;
    held: {
        container: PIXI.Container;
        graphics: PIXI.Container;
    };
    board: {
        container: PIXI.Container;
        graphics: PIXI.Container;
        effects: PIXI.Container;
    };
    queue: {
        container: PIXI.Container;
        graphics: PIXI.Container;
    };
};
export function renderPlayers(pixiApp: PIXI.Application, playersContainer: PIXI.Container, players: PublicPlayerData[]) {
    playersContainer.removeChildren();

    const allPlayerGraphics: Map<string, PlayerGraphics> = new Map();
    for (const [index, player] of players.entries()) {
        const mainContainer = new PIXI.Container();

        const heldContainer = new PIXI.Container();
        heldContainer.sortableChildren = true;
        const heldGraphics = new PIXI.Container();
        heldContainer.x = HELD_DIMENSIONS.x;
        heldContainer.y = HELD_DIMENSIONS.y;
        heldContainer.addChild(heldGraphics);
        mainContainer.addChild(heldContainer);

        const boardContainer = new PIXI.Container();
        boardContainer.sortableChildren = true;
        const boardGraphics = new PIXI.Container();
        boardGraphics.sortableChildren = true;
        const boardEffects = new PIXI.Container();
        boardEffects.zIndex = -1;
        boardContainer.x = BOARD_DIMENSIONS.x;
        boardContainer.y = BOARD_DIMENSIONS.y;
        boardContainer.addChild(boardGraphics);
        boardContainer.addChild(boardEffects);
        mainContainer.addChild(boardContainer);

        const queueContainer = new PIXI.Container();
        queueContainer.sortableChildren = true;
        const queueGraphics = new PIXI.Container();
        queueContainer.x = QUEUE_DIMENSIONS.x;
        queueContainer.y = QUEUE_DIMENSIONS.y;
        queueContainer.addChild(queueGraphics);
        mainContainer.addChild(queueContainer);

        const heldBg = new PIXI.Graphics();
        heldBg.beginFill(0x000000, 0.25);
        heldBg.drawRect(0, 0, HELD_DIMENSIONS.width, HELD_DIMENSIONS.height);
        heldBg.zIndex = -1;
        heldContainer.addChild(heldBg);

        const heldText = new PIXI.Text('[held]', {
            fill: 0xFFFFFF,
            fontSize: 32,
            fontFamily: 'Fira Mono',
        });
        heldText.resolution = 4;
        heldText.x = HELD_DIMENSIONS.width / 2 - heldText.width / 2;
        heldText.y = 24;
        heldContainer.addChild(heldText);

        const boardBg = new PIXI.Graphics();
        boardBg.beginFill(0x000000, 0.5);
        boardBg.drawRect(0, 0, BOARD_DIMENSIONS.width, BOARD_DIMENSIONS.height);
        boardBg.zIndex = -2;
        boardContainer.addChild(boardBg);

        const queueBg = new PIXI.Graphics();
        queueBg.beginFill(0x000000, 0.25);
        queueBg.drawRect(0, 0, QUEUE_DIMENSIONS.width, QUEUE_DIMENSIONS.height);
        queueBg.zIndex = -1;
        queueContainer.addChild(queueBg);

        const queueText = new PIXI.Text('[queue]', {
            fill: 0xFFFFFF,
            fontSize: 32,
            fontFamily: 'Fira Mono',
        });
        queueText.resolution = 4;
        queueText.x = QUEUE_DIMENSIONS.width / 2 - queueText.width / 2;
        queueText.y = 24;
        queueContainer.addChild(queueText);

        playersContainer.addChild(mainContainer);

        const playerGraphics: PlayerGraphics = {
            mainContainer,
            held: {
                container: heldContainer,
                graphics: heldGraphics,
            },
            board: {
                container: boardContainer,
                graphics: boardGraphics,
                effects: boardEffects,
            },
            queue: {
                container: queueContainer,
                graphics: queueGraphics,
            },
        };

        renderState(playerGraphics, player.gameState);

        if (index === 0) {
            mainContainer.x = CONTAINER_OFFSET.x;
            mainContainer.y = CONTAINER_OFFSET.y;
        } else if (index === 1) {
            mainContainer.x = pixiApp.screen.width - CONTAINER_OFFSET.x - mainContainer.width;
            mainContainer.y = CONTAINER_OFFSET.y;
        }

        allPlayerGraphics.set(player.sessionId, playerGraphics);
    }

    return allPlayerGraphics;
}

type Block = "I" | "J" | "L" | "O" | "S" | "T" | "Z" | "G" | null;

const PIECE_COLORS = {
    "G": "#8a8a8a",
    "Z": "#ff004d",
    "L": "#f69504",
    "O": "#eee114",
    "S": "#00e436",
    "I": "#29adff",
    "J": "#2b5ae5",
    "T": "#c22fa1",
}

export function renderBlock(matrix: Block[][], x: number, y: number) {
    const row = matrix[y];
    const cell = matrix[y][x];
    if (cell === null) return null;

    const cellGraphics = new PIXI.Graphics();
    cellGraphics.beginFill(PIECE_COLORS[cell], 0.5);
    cellGraphics.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
    cellGraphics.endFill();

    cellGraphics.beginFill(PIECE_COLORS[cell]);
    const topCell = y - 1 >= 0 ? matrix[y - 1][x] : null;
    const bottomCell = y + 1 < matrix.length ? matrix[y + 1][x] : null;
    const leftCell = x - 1 >= 0 ? matrix[y][x - 1] : null;
    const rightCell = x + 1 < row.length ? matrix[y][x + 1] : null;
    if (topCell !== cell) {
        cellGraphics.drawRect(0, 0, CELL_SIZE, PIECE_BORDER_SIZE);
    }
    if (bottomCell !== cell) {
        cellGraphics.drawRect(0, CELL_SIZE - PIECE_BORDER_SIZE, CELL_SIZE, PIECE_BORDER_SIZE);
    }
    if (leftCell !== cell) {
        cellGraphics.drawRect(0, 0, PIECE_BORDER_SIZE, CELL_SIZE);
    }
    if (rightCell !== cell) {
        cellGraphics.drawRect(CELL_SIZE - PIECE_BORDER_SIZE, 0, PIECE_BORDER_SIZE, CELL_SIZE);
    }

    const topLeftCell = y - 1 >= 0 && x - 1 >= 0 ? matrix[y - 1][x - 1] : null;
    const topRightCell = y - 1 >= 0 && x + 1 < row.length ? matrix[y - 1][x + 1] : null;
    const bottomLeftCell = y + 1 < matrix.length && x - 1 >= 0 ? matrix[y + 1][x - 1] : null;
    const bottomRightCell = y + 1 < matrix.length && x + 1 < row.length ? matrix[y + 1][x + 1] : null;

    if (topCell && leftCell && topLeftCell !== cell) {
        cellGraphics.drawRect(0, 0, PIECE_BORDER_SIZE, PIECE_BORDER_SIZE);
    }

    if (topCell && rightCell && topRightCell !== cell) {
        cellGraphics.drawRect(CELL_SIZE - PIECE_BORDER_SIZE, 0, PIECE_BORDER_SIZE, PIECE_BORDER_SIZE);
    }

    if (bottomCell && leftCell && bottomLeftCell !== cell) {
        cellGraphics.drawRect(0, CELL_SIZE - PIECE_BORDER_SIZE, PIECE_BORDER_SIZE, PIECE_BORDER_SIZE);
    }

    if (bottomCell && rightCell && bottomRightCell !== cell) {
        cellGraphics.drawRect(CELL_SIZE - PIECE_BORDER_SIZE, CELL_SIZE - PIECE_BORDER_SIZE, PIECE_BORDER_SIZE, PIECE_BORDER_SIZE);
    }

    return cellGraphics;
}

export function renderState(playerGraphics: PlayerGraphics, gameState: PublicGameState | null) {
    const { held: heldRenderer, board: boardRenderer, queue: queueRenderer } = playerGraphics;

    heldRenderer.graphics.removeChildren();
    boardRenderer.graphics.removeChildren();
    queueRenderer.graphics.removeChildren();

    if (gameState === null) return;

    const damageBar = new PIXI.Graphics();
    damageBar.beginFill(0xff0000, 0.5);
    damageBar.drawRect(0, 0, 8, CELL_SIZE * gameState.garbageQueued);
    damageBar.zIndex = 2;
    damageBar.y = (BOARD_HEIGHT - gameState.garbageQueued) * CELL_SIZE;
    boardRenderer.graphics.addChild(damageBar);

    // Render Board
    const { board, current, queue, held } = gameState;
    const reversedBoard = board.toReversed();
    for (let y = 0; y < reversedBoard.length; y++) {
        const row = reversedBoard[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            const graphics = renderBlock(reversedBoard, x, y);

            if (graphics) {
                graphics.x = x * CELL_SIZE;
                graphics.y = (y + (BOARD_HEIGHT - board.length)) * CELL_SIZE;
                boardRenderer.graphics.addChild(graphics);
            }
        }
    }

    // Render Current Piece
    const pieceMatrix = getPieceMatrix(current.piece, current.rotation);
    for (let y = 0; y < pieceMatrix.length; y++) {
        const row = pieceMatrix[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            const graphics = renderBlock(pieceMatrix, x, y);

            if (graphics) {
                graphics.x = (current.x + x) * CELL_SIZE;
                graphics.y = (y + BOARD_HEIGHT - current.y - 1) * CELL_SIZE;
                boardRenderer.graphics.addChild(graphics);
            }
        }
    }

    // Render Held Piece
    if (held !== null) {
        const heldMatrix = getPieceMatrix(held, 0);
        const heldPieceContainer = new PIXI.Container();

        for (let y = 0; y < heldMatrix.length; y++) {
            const row = heldMatrix[y];
            for (let x = 0; x < row.length; x++) {
                const cell = row[x];
                if (cell === null) continue;

                const graphics = renderBlock(heldMatrix, x, y);
                if (!graphics) continue;

                graphics.x = x * CELL_SIZE;
                graphics.y = y * CELL_SIZE;
                heldPieceContainer.addChild(graphics);
            }
        }

        heldPieceContainer.x = HELD_DIMENSIONS.width / 2 - heldPieceContainer.width / 2;
        heldPieceContainer.y = 96;
        if (held === 'I') heldPieceContainer.y -= CELL_SIZE / 2;

        heldRenderer.graphics.addChild(heldPieceContainer);
    }

    // Render Queue
    for (const [index, piece] of queue.entries()) {
        const pieceMatrix = getPieceMatrix(piece, 0);
        const pieceContainer = new PIXI.Container();

        for (let y = 0; y < pieceMatrix.length; y++) {
            const row = pieceMatrix[y];
            for (let x = 0; x < row.length; x++) {
                const cell = row[x];
                if (cell === null) continue;

                const graphics = renderBlock(pieceMatrix, x, y);

                if (graphics) {
                    graphics.x = x * CELL_SIZE;
                    graphics.y = y * CELL_SIZE;
                    pieceContainer.addChild(graphics);
                }
            }
        }

        pieceContainer.y = index * 3 * CELL_SIZE + 96;
        pieceContainer.x = queueRenderer.container.width / 2 - pieceContainer.width / 2;
        if (piece === 'I') pieceContainer.y -= CELL_SIZE / 2;

        queueRenderer.graphics.addChild(pieceContainer);
    }
}

// import placedEffect from "@/public/images/placedEffect.png";
import { ease } from 'pixi-ease';
export function renderPlacedEffect(playerGraphics: PlayerGraphics, piece: PieceData) {
    const effectsContainer = playerGraphics.board.effects;

    const pieceMatrix = getPieceMatrix(piece.piece, piece.rotation);
    for (let y = 0; y < pieceMatrix.length; y++) {
        const row = pieceMatrix[y];
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (cell === null) continue;

            if (y > 0 && pieceMatrix[y - 1][x] !== null) continue;

            // const effectSprite = new PIXI.Sprite(PIXI.Texture.from(placedEffect));
            // effectSprite.tint = parseInt(PIECE_COLORS[cell].replace('#', '0x'));
            const effectSprite = new PIXI.Graphics();
            effectSprite.beginFill(parseInt(PIECE_COLORS[cell].replace('#', '0x')), 0.2);
            effectSprite.drawRect(0, 0, CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
            effectSprite.endFill();

            // effectSprite.x = 0;
            effectSprite.y = 0;
            effectSprite.x = (piece.x + x) * CELL_SIZE;
            // effectSprite.y = (y + BOARD_HEIGHT - piece.y - 5) * CELL_SIZE;

            effectsContainer.addChild(effectSprite);

            const fade = ease.add(
                effectSprite,
                { alpha: 0 },
                { duration: 250, ease: "easeOutQuad" }
            );

            fade.on("complete", () => {
                effectsContainer.removeChild(effectSprite);
            });
        }
    }
}

function randRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

const PIXEL_SIZE = 12;
export function renderClearEffect(playerGraphics: PlayerGraphics, lines: {
    height: number;
    blocks: Block[];
}[]) {
    const effectsContainer = playerGraphics.board.effects;

    for (const line of lines) {
        const { height: y, blocks } = line;

        for (let x = 0; x < blocks.length; x++) {
            const cell = blocks[x];
            if (cell === null) continue;

            const effectSprite = new PIXI.Graphics();
            effectSprite.beginFill(parseInt(PIECE_COLORS[cell].replace('#', '0x')), 0.5);
            effectSprite.drawRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
            effectSprite.endFill();

            const xRange = [0, CELL_SIZE - PIXEL_SIZE];
            const yRange = [0, CELL_SIZE - PIXEL_SIZE];

            const startX = randRange(xRange[0], xRange[1]) + x * CELL_SIZE;
            const startY = randRange(yRange[0], yRange[1]) + (BOARD_HEIGHT - y - 1) * CELL_SIZE;
            effectSprite.x = startX;
            effectSprite.y = startY;

            const randomDirection = Math.random() * Math.PI * 2;
            const distance = randRange(0, 32);
            const targetX = startX + Math.cos(randomDirection) * distance;
            const targetY = startY + Math.sin(randomDirection) * distance;

            effectsContainer.addChild(effectSprite);

            const fade = ease.add(
                effectSprite,
                { alpha: 0, x: targetX, y: targetY },
                { duration: 750, ease: "easeOutQuad" }
            );

            fade.on("complete", () => {
                effectsContainer.removeChild(effectSprite);
            });
        }
    }
}

export function renderAttackEffect(playerGraphics: PlayerGraphics, piece: PieceData, damage: number) {
    const effectsContainer = playerGraphics.board.effects;

    const pieceMatrix = getPieceMatrix(piece.piece, piece.rotation);
    const x = pieceMatrix[0].length / 2;
    const y = pieceMatrix.length / 2;

    const effectSprite = new PIXI.Text(`+${damage}`, {
        fill: 0xFFFFFF,
        fontSize: 32,
        fontFamily: 'Fira Mono',
    });

    effectSprite.resolution = 4;

    effectSprite.x = (piece.x + x) * CELL_SIZE - effectSprite.width / 2;
    effectSprite.y = (BOARD_HEIGHT - piece.y - y + 1) * CELL_SIZE - effectSprite.height / 2;

    effectsContainer.addChild(effectSprite);

    const fade = ease.add(
        effectSprite,
        { alpha: 0, y: effectSprite.y - 32 },
        { duration: 750, ease: "easeOutQuad" }
    );

    fade.on("complete", () => {
        effectsContainer.removeChild(effectSprite);
    });
}